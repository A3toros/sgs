import './nodePolyfills'
import * as cheerio from 'cheerio'
import { CookieJar } from 'tough-cookie'

export type FormFields = Record<string, string>

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * ASP.NET WebForms HTTP client: cookie jar + VIEWSTATE-aware form posts.
 * Pattern matches http_login.py / classic WebForms scraping.
 */
export class AspNetClient {
  readonly jar = new CookieJar()
  private lastUrl = ''

  constructor(
    private readonly addLog: (message: string) => void = () => undefined,
    private readonly userAgent = DEFAULT_UA
  ) {}

  get currentUrl(): string {
    return this.lastUrl
  }

  async get(url: string): Promise<{ status: number; html: string; url: string }> {
    return this.request(url, { method: 'GET' })
  }

  async postForm(
    url: string,
    fields: FormFields
  ): Promise<{ status: number; html: string; url: string }> {
    const body = new URLSearchParams()
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null) continue
      body.append(key, value)
    }
    return this.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    })
  }

  /**
   * Merge hidden ASP.NET fields from html with overrides and optional EVENTTARGET postback.
   */
  async postback(
    url: string,
    html: string,
    options: {
      eventTarget?: string
      eventArgument?: string
      overrides?: FormFields
      includeAllFormFields?: boolean
    } = {}
  ): Promise<{ status: number; html: string; url: string }> {
    const base = options.includeAllFormFields
      ? extractAllFormFields(html)
      : extractHiddenFields(html)

    const fields: FormFields = {
      ...base,
      __EVENTTARGET: options.eventTarget ?? base.__EVENTTARGET ?? '',
      __EVENTARGUMENT: options.eventArgument ?? base.__EVENTARGUMENT ?? '',
      ...(options.overrides || {})
    }

    // Ensure EVENTTARGET wins over empty hidden defaults when provided
    if (options.eventTarget !== undefined) {
      fields.__EVENTTARGET = options.eventTarget
    }
    if (options.eventArgument !== undefined) {
      fields.__EVENTARGUMENT = options.eventArgument
    }

    return this.postForm(url, fields)
  }

  hasCookie(name: string): boolean {
    try {
      const cookies = this.jar.getCookiesSync(this.lastUrl || 'https://sgs.bopp-obec.info/')
      return cookies.some((c) => c.key === name)
    } catch {
      return false
    }
  }

  cookieNames(): string[] {
    try {
      return this.jar
        .getCookiesSync(this.lastUrl || 'https://sgs.bopp-obec.info/')
        .map((c) => c.key)
    } catch {
      return []
    }
  }

  private async request(
    url: string,
    init: RequestInit
  ): Promise<{ status: number; html: string; url: string }> {
    const cookieHeader = await this.jar.getCookieString(url)
    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7',
      ...(init.headers as Record<string, string> | undefined)
    }
    if (cookieHeader) {
      headers.Cookie = cookieHeader
    }
    if (this.lastUrl && init.method === 'POST') {
      headers.Referer = this.lastUrl
      headers.Origin = new URL(url).origin
    }

    this.addLog(`${init.method || 'GET'} ${url}`)
    const res = await fetch(url, {
      ...init,
      headers,
      redirect: 'manual'
    })

    await this.storeCookies(url, res)

    // Follow redirects manually so cookies are preserved
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location')
      if (location) {
        const nextUrl = new URL(location, url).toString()
        // Consume body
        await res.arrayBuffer().catch(() => undefined)
        this.lastUrl = nextUrl
        return this.request(nextUrl, { method: 'GET' })
      }
    }

    const html = await res.text()
    this.lastUrl = url
    return { status: res.status, html, url }
  }

  private async storeCookies(requestUrl: string, res: Response): Promise<void> {
    const anyHeaders = res.headers as Headers & { getSetCookie?: () => string[] }
    const setCookies =
      typeof anyHeaders.getSetCookie === 'function'
        ? anyHeaders.getSetCookie()
        : (() => {
            const single = res.headers.get('set-cookie')
            return single ? [single] : []
          })()

    for (const raw of setCookies) {
      try {
        await this.jar.setCookie(raw, requestUrl)
      } catch {
        // ignore malformed cookies
      }
    }
  }
}

/** Extract __VIEWSTATE and other __* hidden fields. */
export function extractHiddenFields(html: string): FormFields {
  const $ = cheerio.load(html)
  const fields: FormFields = {}
  $('input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name')
    if (!name) return
    fields[name] = $(el).attr('value') ?? ''
  })
  return fields
}

/** Extract all named input/select values from the main form (for full postbacks). */
export function extractAllFormFields(html: string): FormFields {
  const $ = cheerio.load(html)
  const fields: FormFields = {}

  const form = $('form').first()
  const inputs = form.length ? form.find('input') : $('input')
  const selects = form.length ? form.find('select') : $('select')
  const textareas = form.length ? form.find('textarea') : $('textarea')

  inputs.each((_, el) => {
    const name = $(el).attr('name')
    if (!name) return
    const type = ($(el).attr('type') || 'text').toLowerCase()
    if (type === 'checkbox' || type === 'radio') {
      if ($(el).is(':checked') || $(el).attr('checked') !== undefined) {
        fields[name] = $(el).attr('value') ?? 'on'
      }
      return
    }
    if (type === 'submit' || type === 'image' || type === 'button') return
    fields[name] = $(el).attr('value') ?? ''
  })

  selects.each((_, el) => {
    const name = $(el).attr('name')
    if (!name) return
    const selected = $(el).find('option[selected]').attr('value')
    const first = $(el).find('option').first().attr('value')
    fields[name] = selected ?? first ?? ''
  })

  textareas.each((_, el) => {
    const name = $(el).attr('name')
    if (!name) return
    fields[name] = $(el).text() ?? ''
  })

  return fields
}

/**
 * Find the first <select> whose surrounding text mentions รายวิชา (subject).
 * Falls back to first PageContent select that is not the group/language filter.
 */
export function findSubjectSelectName(html: string): string | null {
  const $ = cheerio.load(html)
  const selects = $('select').toArray()

  const isExcluded = (name: string) =>
    name.includes('ClassSectionNoFilter') ||
    name.includes('LanguageSelector') ||
    name.includes('PageHeader') ||
    name.includes('Pagination')

  for (const el of selects) {
    const name = $(el).attr('name')
    if (!name || isExcluded(name)) continue
    const context =
      ($(el).parent().text() || '') +
      ($(el).prev().text() || '') +
      ($(el).closest('td,div,span,tr').text() || '')
    if (context.includes('รายวิชา')) return name
  }

  for (const el of selects) {
    const name = $(el).attr('name')
    if (name && name.includes('PageContent') && !isExcluded(name)) return name
  }

  for (const el of selects) {
    const name = $(el).attr('name')
    if (name && !isExcluded(name)) return name
  }

  return null
}

/**
 * Map student ID (เลขประจำตัว) → score input names for given column keys (S1, Midterm, …).
 */
export function mapStudentScoreInputs(
  html: string,
  columnKeys: string[]
): Record<string, Record<string, string>> {
  const $ = cheerio.load(html)
  const result: Record<string, Record<string, string>> = {}

  $('tr').each((_, tr) => {
    const cells = $(tr).find('td')
    if (cells.length < 2) return

    // Student ID is typically in a td with only digits (เลขประจำตัว)
    let studentId: string | null = null
    cells.each((__, td) => {
      const text = $(td).text().trim()
      if (/^\d{4,}$/.test(text)) {
        studentId = text
        return false
      }
    })
    if (!studentId) return

    const inputs = $(tr)
      .find('input')
      .toArray()
      .filter((el) => {
        const type = ($(el).attr('type') || 'text').toLowerCase()
        return type !== 'checkbox' && type !== 'hidden' && type !== 'image' && type !== 'submit'
      })

    const mapping: Record<string, string> = {}
    for (const key of columnKeys) {
      const match = inputs.find((el) => {
        const name = $(el).attr('name') || ''
        const id = $(el).attr('id') || ''
        return name.includes(key) || id.includes(key)
      })
      if (match) {
        const name = $(match).attr('name')
        if (name) mapping[key] = name
      }
    }

    if (Object.keys(mapping).length > 0) {
      result[studentId] = mapping
    }
  })

  return result
}
