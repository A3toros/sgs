import { Handler } from '@netlify/functions'
import puppeteer, { Page, Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

interface ScoreColumnPayload {
  key: string
  checkSuffix: string
  label?: string
}

interface ScriptConfig {
  loginUrl: string
  targetUrl: string
  username: string
  password: string
  subjectValue: string
  groupValue: string
  scoreColumns?: ScoreColumnPayload[] | number[]
  inputPositions: number[]
  checkboxPositions: number[]
  students: { [studentId: string]: string[] }
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
} as Record<string, string>

function normalizeColumns(config: ScriptConfig): ScoreColumnPayload[] {
  if (Array.isArray(config.scoreColumns) && config.scoreColumns.length > 0) {
    if (typeof config.scoreColumns[0] === 'number') {
      return (config.scoreColumns as number[]).map((n) => ({
        key: `S${n}`,
        checkSuffix: String(n)
      }))
    }
    return config.scoreColumns as ScoreColumnPayload[]
  }
  const nums = config.checkboxPositions?.length ? config.checkboxPositions : config.inputPositions
  return (nums || []).map((n) => ({ key: `S${n}`, checkSuffix: String(n) }))
}

/** Field name passed to SGS check(this.checked, field) */
function checkFieldName(col: ScoreColumnPayload): string {
  if (col.key === 'Midterm') return 'Midterm'
  if (col.key === 'Final') return 'Final'
  if (col.key.startsWith('S')) return col.key
  return `S${col.checkSuffix}`
}

async function waitForPostback(page: Page, addLog: (m: string) => void, ms = 2000): Promise<void> {
  try {
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle0', timeout: ms + 3000 }).catch(() => null),
      page.waitForTimeout(ms)
    ])
  } catch {
    await page.waitForTimeout(800)
  }
  addLog(`Postback wait done. URL: ${page.url()}`)
}

async function clickOkLogin(page: Page, addLog: (m: string) => void): Promise<void> {
  // Prefer known OK control, then Thai/English link text
  const clicked = await page.evaluate(() => {
    const byId = document.querySelector(
      '#ctl00_PageContent_OKButton__Button, a[id*="OKButton"], input[id*="OKButton"]'
    ) as HTMLElement | null
    if (byId) {
      byId.click()
      return 'OKButton'
    }
    const links = Array.from(document.querySelectorAll('a'))
    const ok = links.find(
      (l) =>
        (l.textContent || '').includes('ตกลง') ||
        (l.getAttribute('title') || '').includes('ตกลง') ||
        (l.textContent || '').trim() === 'OK'
    )
    if (ok) {
      ;(ok as HTMLElement).click()
      return 'text-link'
    }
    return null
  })
  addLog(clicked ? `Login OK clicked via ${clicked}` : 'Login OK control not found')
}

async function dismissPasswordPrompt(page: Page, addLog: (m: string) => void): Promise<void> {
  try {
    const cancel = await page.$('a[title="Cancel"], a[title="ยกเลิก"]')
    if (cancel) {
      await cancel.click()
      await waitForPostback(page, addLog, 1500)
      addLog('Password change prompt dismissed')
    }
  } catch {
    addLog('No password change prompt')
  }
}

async function selectSubject(page: Page, subjectValue: string, addLog: (m: string) => void): Promise<void> {
  // Prefer first select after รายวิชา text; fallback to first non-group select
  const selected = await page.evaluate((value) => {
    const selects = Array.from(document.querySelectorAll('select')) as HTMLSelectElement[]
    let subjectSelect: HTMLSelectElement | null = null
    for (const sel of selects) {
      const prev = (sel.previousElementSibling?.textContent || '') + (sel.parentElement?.textContent || '')
      if (prev.includes('รายวิชา')) {
        subjectSelect = sel
        break
      }
    }
    if (!subjectSelect) {
      subjectSelect =
        selects.find((s) => s.name && !s.name.includes('ClassSectionNoFilter')) || selects[0] || null
    }
    if (!subjectSelect) return false
    subjectSelect.value = value
    subjectSelect.dispatchEvent(new Event('change', { bubbles: true }))
    // ASP.NET often wires onchange to __doPostBack
    if (typeof (window as any).__doPostBack === 'function' && subjectSelect.name) {
      try {
        ;(window as any).__doPostBack(subjectSelect.name, '')
      } catch {
        /* ignore */
      }
    }
    return true
  }, subjectValue)

  if (!selected) throw new Error('Subject dropdown not found')
  addLog(`Selected subject ${subjectValue}`)
  await waitForPostback(page, addLog, 2500)
}

async function selectGroup(page: Page, groupValue: string, addLog: (m: string) => void): Promise<void> {
  const name = 'ctl00$PageContent$ClassSectionNoFilter'
  const el = await page.$(`select[name="${name}"]`)
  if (!el) throw new Error('Group dropdown not found')

  await Promise.all([
    page.select(`select[name="${name}"]`, groupValue).catch(async () => {
      await page.evaluate(
        (n, v) => {
          const sel = document.querySelector(`select[name="${n}"]`) as HTMLSelectElement | null
          if (!sel) return
          sel.value = v
          sel.dispatchEvent(new Event('change', { bubbles: true }))
          if (typeof (window as any).__doPostBack === 'function') {
            ;(window as any).__doPostBack(n, '')
          }
        },
        name,
        groupValue
      )
    }),
    waitForPostback(page, addLog, 2500)
  ])
  addLog(`Selected group ${groupValue}`)
}

async function setPageSizeAndGo(page: Page, addLog: (m: string) => void): Promise<void> {
  const pageSizeId = '#ctl00_PageContent_TblTranscriptsPagination__PageSize'
  const pageBtnId = '#ctl00_PageContent_TblTranscriptsPagination__PageSizeButton'

  const sizeInput = await page.$(pageSizeId)
  if (sizeInput) {
    await sizeInput.click({ clickCount: 3 })
    await page.keyboard.type('25', { delay: 20 })
    addLog('Set PageSize to 25')
  } else {
    addLog('PageSize input not found — trying fallback')
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input')) as HTMLInputElement[]
      const pageInput = inputs.find((input) => {
        const near =
          (input.nextElementSibling?.textContent || '') +
          (input.parentElement?.textContent || '')
        return near.includes('หน้า') || near.includes('Page')
      })
      if (pageInput) {
        pageInput.value = '25'
        pageInput.dispatchEvent(new Event('input', { bubbles: true }))
        pageInput.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })
  }

  const pageBtn = await page.$(pageBtnId)
  if (pageBtn) {
    await Promise.all([pageBtn.click(), waitForPostback(page, addLog, 2500)])
    addLog('Clicked PageSizeButton')
    return
  }

  const fallback = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'))
    const btn = links.find((l) => {
      const t = (l.textContent || '').trim()
      return t === 'หน้า' || t === 'Page' || t.includes('หน้า')
    })
    if (btn) {
      ;(btn as HTMLElement).click()
      return true
    }
    return false
  })
  if (fallback) {
    await waitForPostback(page, addLog, 2500)
    addLog('Clicked page button via text fallback')
  } else {
    addLog('WARNING: Page button not found')
  }
}

async function enableScoreColumns(
  page: Page,
  columns: ScoreColumnPayload[],
  addLog: (m: string) => void
): Promise<void> {
  for (const col of columns) {
    const field = checkFieldName(col)
    const checkId = `ctl00_PageContent_Check${col.checkSuffix}`

    const result = await page.evaluate(
      (id, fieldName) => {
        const checkbox = document.getElementById(id) as HTMLInputElement | null
        if (!checkbox) return { ok: false, reason: 'not-found' }

        checkbox.removeAttribute('disabled')
        const parent = checkbox.parentElement
        if (parent) parent.removeAttribute('disabled')

        // Prefer site helper that unlocks row inputs
        const checkFn = (window as any).check
        if (typeof checkFn === 'function') {
          try {
            checkFn(true, fieldName)
            checkbox.checked = true
            return { ok: true, reason: 'check()' }
          } catch {
            /* fall through */
          }
        }

        if (!checkbox.checked) {
          checkbox.click()
        }
        checkbox.checked = true
        checkbox.dispatchEvent(new Event('click', { bubbles: true }))
        checkbox.dispatchEvent(new Event('change', { bubbles: true }))
        return { ok: true, reason: 'click' }
      },
      checkId,
      field
    )

    if (result.ok) {
      addLog(`Enabled ${col.key} via Check${col.checkSuffix} (${result.reason})`)
    } else {
      addLog(`WARNING: Checkbox Check${col.checkSuffix} not found`)
    }
    await page.waitForTimeout(300)
  }
}

async function fillStudentScores(
  page: Page,
  studentId: string,
  scores: string[],
  columns: ScoreColumnPayload[],
  addLog: (m: string) => void
): Promise<void> {
  for (let i = 0; i < columns.length && i < scores.length; i++) {
    const col = columns[i]
    const score = scores[i]

    const focused = await page.evaluate(
      (sid, key) => {
        const cells = Array.from(document.querySelectorAll('td'))
        const studentCell = cells.find((cell) => cell.textContent?.trim() === sid)
        if (!studentCell) return false
        const row = studentCell.closest('tr')
        if (!row) return false

        const candidates = Array.from(
          row.querySelectorAll(`input[name*="${key}"], input[id*="${key}"]`)
        ) as HTMLInputElement[]
        const input = candidates.find(
          (el) => el.type !== 'checkbox' && el.type !== 'hidden' && el.type !== 'image'
        )
        if (!input) return false

        input.removeAttribute('disabled')
        input.readOnly = false
        input.scrollIntoView({ block: 'center' })
        input.focus()
        input.select()
        return true
      },
      studentId,
      col.key
    )

    if (!focused) {
      addLog(`  Could not find ${col.key} input for student ${studentId}`)
      continue
    }

    try {
      await page.keyboard.press('Backspace')
      await page.keyboard.type(String(score), { delay: 15 })
      await page.keyboard.press('Tab')
      addLog(`  Filled ${col.key} (${col.label || col.key}) with ${score}`)
    } catch (e: any) {
      addLog(`  Error typing ${col.key}: ${e.message}`)
    }
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: JSON_HEADERS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: JSON_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const config: ScriptConfig = JSON.parse(event.body || '{}')

    if (!config.loginUrl || !config.username || !config.password) {
      return {
        statusCode: 400,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: 'Missing required configuration' })
      }
    }

    const logs: string[] = []
    const addLog = (message: string) => {
      logs.push(`[${new Date().toISOString()}] ${message}`)
      console.log(message)
    }

    let browser: Browser | undefined
    let screenshotBase64: string | undefined

    try {
      addLog('Launching browser...')
      const isNetlify = !!(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY || process.env.AWS_REGION)
      const executablePath = isNetlify
        ? await chromium.executablePath()
        : process.env.CHROME_PATH ||
          (process.platform === 'win32'
            ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            : undefined)

      browser = await puppeteer.launch({
        args: [...chromium.args, '--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: chromium.defaultViewport,
        executablePath,
        headless: chromium.headless ?? true,
        ignoreHTTPSErrors: true
      })
      addLog('Browser launched successfully')

      const page = await browser.newPage()
      page.setDefaultTimeout(20000)

      // --- Login ---
      addLog('Navigating to login page...')
      await page.goto(config.loginUrl, { waitUntil: 'networkidle0', timeout: 30000 })
      await page.waitForSelector('input[name="ctl00$PageContent$UserName"]', { timeout: 15000 })

      addLog('Filling login credentials...')
      await page.click('input[name="ctl00$PageContent$UserName"]', { clickCount: 3 })
      await page.type('input[name="ctl00$PageContent$UserName"]', config.username, { delay: 10 })
      await page.click('input[name="ctl00$PageContent$Password"]', { clickCount: 3 })
      await page.type('input[name="ctl00$PageContent$Password"]', config.password, { delay: 10 })

      addLog('Clicking login button...')
      await Promise.all([clickOkLogin(page, addLog), waitForPostback(page, addLog, 3000)])
      await dismissPasswordPrompt(page, addLog)

      // --- Transcripts page ---
      addLog(`Navigating to target page: ${config.targetUrl}`)
      await page.goto(config.targetUrl, { waitUntil: 'networkidle0', timeout: 30000 })

      addLog('Selecting subject...')
      await selectSubject(page, config.subjectValue, addLog)

      addLog('Selecting group...')
      await selectGroup(page, config.groupValue, addLog)

      addLog('Setting page size and clicking Page button...')
      await setPageSizeAndGo(page, addLog)

      const columns = normalizeColumns(config)
      addLog(`Enabling columns: ${columns.map((c) => c.key).join(', ')}`)
      await enableScoreColumns(page, columns, addLog)

      const studentIds = Object.keys(config.students)
      addLog(`Processing ${studentIds.length} students...`)
      for (const studentId of studentIds) {
        addLog(`Processing student ${studentId}...`)
        await fillStudentScores(page, studentId, config.students[studentId], columns, addLog)
      }

      addLog('Saving transcripts...')
      const saveButton = await page.$('#ctl00_PageContent_TblTranscriptsSaveButton')
      if (saveButton) {
        await saveButton.evaluate((el: Element) => (el as HTMLElement).scrollIntoView({ block: 'center' }))
        await Promise.all([saveButton.click(), waitForPostback(page, addLog, 4000)])
        addLog('Save button clicked')
      } else {
        addLog('WARNING: Save button not found')
      }

      addLog('All students processed and saved successfully!')
      await browser.close()

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'Script executed successfully',
          logs
        })
      }
    } catch (error: any) {
      addLog(`Error: ${error.message}`)
      try {
        if (browser) {
          const pages = await browser.pages()
          const page = pages[pages.length - 1]
          if (page) {
            screenshotBase64 = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 40 })
            addLog('Captured failure screenshot')
          }
        }
      } catch {
        /* ignore screenshot errors */
      }
      if (browser) await browser.close().catch(() => undefined)

      return {
        statusCode: 500,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          success: false,
          error: error.message,
          logs,
          screenshot: screenshotBase64
        })
      }
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: JSON_HEADERS,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}
