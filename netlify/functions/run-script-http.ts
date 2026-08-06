import { Handler } from '@netlify/functions'
import * as cheerio from 'cheerio'
import {
  AspNetClient,
  extractHiddenFields,
  findSubjectSelectName,
  mapStudentScoreInputs,
  FormFields
} from './lib/aspnetClient'

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
  inputPositions?: number[]
  checkboxPositions?: number[]
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
  const nums = config.checkboxPositions?.length
    ? config.checkboxPositions
    : config.inputPositions || []
  return nums.map((n) => ({ key: `S${n}`, checkSuffix: String(n) }))
}

function checkboxFieldName(suffix: string): string {
  // Header checkboxes: ctl00$PageContent$Check1, CheckM, CheckF, …
  return `ctl00$PageContent$Check${suffix}`
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

    if (!config.targetUrl || !config.subjectValue || !config.groupValue) {
      return {
        statusCode: 400,
        headers: JSON_HEADERS,
        body: JSON.stringify({ error: 'Missing targetUrl, subjectValue, or groupValue' })
      }
    }

    const logs: string[] = []
    const addLog = (message: string) => {
      logs.push(`[${new Date().toISOString()}] ${message}`)
      console.log(message)
    }

    const client = new AspNetClient(addLog)
    const columns = normalizeColumns(config)
    const columnKeys = columns.map((c) => c.key)

    try {
      // --- Login (same as http_login.py) ---
      addLog('HTTP runner: GET login page...')
      let page = await client.get(config.loginUrl)
      if (page.status < 200 || page.status >= 400) {
        throw new Error(`Login page HTTP ${page.status}. SGS may be blocking this host IP.`)
      }

      // Prefer actual SignIn URL after redirects (do not POST to bare /sgs)
      let loginPostUrl = page.url
      if (!page.html.includes('ctl00$PageContent$UserName')) {
        const signInUrl = new URL(
          '/sgs/Security/SignIn.aspx?MasterPage=../Master%20Pages/HorizontalMenu.master&Target=',
          config.loginUrl
        ).toString()
        addLog(`Login form not on ${page.url}; GET ${signInUrl}`)
        page = await client.get(signInUrl)
        loginPostUrl = page.url
      }

      const loginHidden = extractHiddenFields(page.html)
      if (!loginHidden.__VIEWSTATE) {
        throw new Error('No __VIEWSTATE on login page — unexpected HTML or blocked response')
      }
      if (!page.html.includes('ctl00$PageContent$UserName')) {
        throw new Error('Login form fields not found on page')
      }

      addLog(`POST login credentials to ${loginPostUrl}...`)
      page = await client.postForm(loginPostUrl, {
        ...loginHidden,
        __EVENTTARGET: 'ctl00$PageContent$OKButton$_Button',
        __EVENTARGUMENT: '',
        'ctl00$PageContent$UserName': config.username,
        'ctl00$PageContent$Password': config.password,
        'ctl00$PageContent$RememberUserName': 'on'
      })

      const stillOnLogin =
        page.url.includes('SignIn.aspx') && page.html.includes('ctl00$PageContent$UserName')
      if (stillOnLogin) {
        throw new Error('Login failed: still on SignIn page after POST')
      }
      if (client.hasCookie('.ASPXAUTH')) {
        addLog('Login OK (.ASPXAUTH present)')
      } else {
        addLog(`Login OK (session authenticated; landed on ${page.url})`)
      }

      // Dismiss password-change prompt if Cancel / ยกเลิก appears as a postback link
      {
        const $ = cheerio.load(page.html)
        const cancelHref =
          $('a[title="Cancel"], a[title="ยกเลิก"]').attr('href') || ''
        const m = cancelHref.match(/__doPostBack\('([^']+)'(?:,\s*'([^']*)')?/)
        if (m) {
          addLog('Dismissing password change prompt...')
          page = await client.postback(page.url || loginPostUrl, page.html, {
            eventTarget: m[1],
            eventArgument: m[2] ?? '',
            includeAllFormFields: true
          })
        }
      }

      // --- Transcripts grid ---
      addLog(`GET target page: ${config.targetUrl}`)
      page = await client.get(config.targetUrl)
      if (page.status < 200 || page.status >= 400) {
        throw new Error(`Target page HTTP ${page.status}`)
      }

      // Subject
      const subjectName = findSubjectSelectName(page.html)
      if (!subjectName) {
        throw new Error('Subject dropdown not found on transcripts page')
      }
      addLog(`Selecting subject via ${subjectName}=${config.subjectValue}`)
      page = await client.postback(page.url, page.html, {
        eventTarget: subjectName,
        eventArgument: '',
        overrides: { [subjectName]: config.subjectValue },
        includeAllFormFields: true
      })

      // Group
      const groupName = 'ctl00$PageContent$ClassSectionNoFilter'
      addLog(`Selecting group ${config.groupValue}`)
      page = await client.postback(page.url, page.html, {
        eventTarget: groupName,
        eventArgument: '',
        overrides: { [groupName]: config.groupValue },
        includeAllFormFields: true
      })

      // Page size = 25 + Page button
      const pageSizeName = 'ctl00$PageContent$TblTranscriptsPagination$_PageSize'
      const pageBtnTarget = 'ctl00$PageContent$TblTranscriptsPagination$_PageSizeButton'
      addLog('Setting page size 25 and posting Page button...')
      page = await client.postback(page.url, page.html, {
        eventTarget: pageBtnTarget,
        eventArgument: '',
        overrides: { [pageSizeName]: '25' },
        includeAllFormFields: true
      })

      // Map student score inputs from current HTML
      let scoreMap = mapStudentScoreInputs(page.html, columnKeys)
      const foundIds = Object.keys(scoreMap)
      addLog(`Found score inputs for ${foundIds.length} students on page`)
      if (foundIds.length > 0) {
        addLog(`Student IDs on page: ${foundIds.slice(0, 20).join(', ')}${foundIds.length > 20 ? '…' : ''}`)
      }

      const studentIds = Object.keys(config.students)
      if (studentIds.length === 0) {
        throw new Error('No student data provided')
      }

      // Build overrides: checkboxes + scores
      const overrides: FormFields = {}
      for (const col of columns) {
        overrides[checkboxFieldName(col.checkSuffix)] = 'on'
      }

      let filledCount = 0
      for (const studentId of studentIds) {
        const scores = config.students[studentId]
        const mapping = scoreMap[studentId]
        if (!mapping) {
          addLog(`WARNING: student ${studentId} not found on current page HTML`)
          continue
        }
        for (let i = 0; i < columns.length && i < scores.length; i++) {
          const key = columns[i].key
          const inputName = mapping[key]
          if (!inputName) {
            addLog(`WARNING: no input for ${studentId} / ${key}`)
            continue
          }
          overrides[inputName] = String(scores[i])
          filledCount++
          addLog(`  Queue ${studentId} ${key}=${scores[i]} → ${inputName}`)
        }
      }

      if (filledCount === 0) {
        throw new Error(
          'No student score fields matched. Check student IDs match เลขประจำตัว on the grid, and page size includes them.'
        )
      }

      // Save — image button often posts name.x / name.y
      const saveName = 'ctl00$PageContent$TblTranscriptsSaveButton'
      addLog(`POST save (${filledCount} score fields)...`)
      page = await client.postback(page.url, page.html, {
        eventTarget: '',
        eventArgument: '',
        overrides: {
          ...overrides,
          [`${saveName}.x`]: '1',
          [`${saveName}.y`]: '1'
        },
        includeAllFormFields: true
      })

      // Heuristic success: still authenticated and no obvious login redirect
      if (page.html.includes('ctl00$PageContent$UserName') && !page.html.includes('TblTranscripts')) {
        throw new Error('After save, response looks like login page — session may have expired')
      }

      addLog('HTTP runner finished successfully')

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'HTTP script executed successfully',
          logs
        })
      }
    } catch (error: any) {
      addLog(`Error: ${error.message}`)
      return {
        statusCode: 500,
        headers: JSON_HEADERS,
        body: JSON.stringify({
          success: false,
          error: error.message,
          logs
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
