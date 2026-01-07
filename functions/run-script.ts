// @ts-nocheck
import { Handler } from '@netlify/functions'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

interface ScriptConfig {
  loginUrl: string
  targetUrl: string
  username: string
  password: string
  subjectValue: string
  groupValue: string
  inputPositions: number[]
  checkboxPositions: number[]
  students: { [studentId: string]: string[] }
}

class FormSession {
  private cookies: string[] = []
  private userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

  async get(url: string): Promise<{ html: string; cookies: string[] }> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Cookie': this.cookies.join('; ')
      }
    })

    const html = await response.text()
    
    // Update cookies from response
    const setCookieHeader = response.headers.get('set-cookie')
    if (setCookieHeader) {
      const newCookies = setCookieHeader.split(',').map(c => c.split(';')[0].trim())
      this.cookies = [...this.cookies, ...newCookies]
    }

    return { html, cookies: this.cookies }
  }

  async post(url: string, data: Record<string, string>): Promise<{ html: string; cookies: string[] }> {
    const formData = new URLSearchParams(data)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': this.cookies.join('; '),
        'Referer': url
      },
      body: formData.toString()
    })

    const html = await response.text()
    
    // Update cookies from response
    const setCookieHeader = response.headers.get('set-cookie')
    if (setCookieHeader) {
      const newCookies = setCookieHeader.split(',').map(c => c.split(';')[0].trim())
      this.cookies = [...this.cookies, ...newCookies]
    }

    return { html, cookies: this.cookies }
  }

  extractViewState(html: string): Record<string, string> {
    const $ = cheerio.load(html)
    const viewState: Record<string, string> = {}
    
    // Extract common ASP.NET view state fields
    $('input[type="hidden"]').each((_, element) => {
      const name = $(element).attr('name')
      const value = $(element).attr('value') || ''
      if (name && (name.includes('ViewState') || name.includes('EventValidation') || name.includes('ViewState'))) {
        viewState[name] = value
      }
    })
    
    return viewState
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const config: ScriptConfig = JSON.parse(event.body || '{}')

    if (!config.loginUrl || !config.username || !config.password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required configuration' })
      }
    }

    const logs: string[] = []
    const addLog = (message: string) => {
      logs.push(`[${new Date().toISOString()}] ${message}`)
      console.log(message)
    }

    const session = new FormSession()

    try {
      // Step 1: Get login page and extract form data
      addLog('Fetching login page...')
      const loginPage = await session.get(config.loginUrl)
      const loginViewState = session.extractViewState(loginPage.html)
      addLog('Login page fetched and view state extracted')

      // Step 2: Submit login form
      addLog('Submitting login credentials...')
      const loginData = {
        'ctl00$PageContent$UserName': config.username,
        'ctl00$PageContent$Password': config.password,
        ...loginViewState
      }

      const loginResponse = await session.post(config.loginUrl, loginData)
      addLog('Login submitted successfully')

      // Step 3: Navigate to target page
      addLog(`Navigating to target page: ${config.targetUrl}`)
      const targetPage = await session.get(config.targetUrl)
      const targetViewState = session.extractViewState(targetPage.html)
      addLog('Target page loaded')

      // Step 4: Select subject
      addLog('Selecting subject...')
      const subjectData = {
        'ctl00$PageContent$SubjectFilter': config.subjectValue,
        ...targetViewState
      }
      await session.post(config.targetUrl, subjectData)
      addLog(`Subject selected: ${config.subjectValue}`)

      // Step 5: Select group
      addLog('Selecting group...')
      const groupData = {
        'ctl00$PageContent$ClassSectionNoFilter': config.groupValue,
        ...targetViewState
      }
      await session.post(config.targetUrl, groupData)
      addLog(`Group selected: ${config.groupValue}`)

      // Step 6: Set page size and navigate
      addLog('Setting page size to 25...')
      const pageData = {
        ...targetViewState,
        // Find the input before "หน้า" text and set to 25
        'ctl00$PageContent$PageSize': '25'
      }
      await session.post(config.targetUrl, pageData)
      addLog('Page size set to 25')

      // Step 7: Click page button (if needed)
      addLog('Navigating to specific page...')
      const pageNavData = {
        ...targetViewState,
        'ctl00$PageContent$Pager$ctl00$PageContent$PagerButton': 'หน้า'
      }
      await session.post(config.targetUrl, pageNavData)
      addLog('Page navigation completed')

      // Step 8: Check checkboxes
      addLog('Checking required checkboxes...')
      const checkboxData = {
        ...targetViewState
      }
      
      // Add checkbox selections based on positions
      config.checkboxPositions.forEach((position, index) => {
        checkboxData[`ctl00$PageContent$gvStudents$ctl${index + 2}$CheckBoxSelect`] = 'on'
      })
      
      await session.post(config.targetUrl, checkboxData)
      addLog(`${config.checkboxPositions.length} checkboxes checked`)

      // Step 9: Process students
      addLog('Processing student grades...')
      for (const [studentId, scores] of Object.entries(config.students)) {
        addLog(`Processing student ${studentId}`)
        
        const studentData = {
          ...targetViewState
        }
        
        // Add score inputs based on positions
        config.inputPositions.forEach((position, index) => {
          const score = scores[index] || ''
          // Find the input for this student and position
          studentData[`ctl00$PageContent$gvStudents$ctl${position + 1}$txtScore`] = score
        })
        
        await session.post(config.targetUrl, studentData)
        addLog(`  Student ${studentId} processed`)
      }

      // Step 10: Save all changes
      addLog('Saving all transcript changes...')
      const saveData = {
        ...targetViewState,
        'ctl00$PageContent$TblTranscriptsSaveButton': 'Save'
      }
      
      await session.post(config.targetUrl, saveData)
      addLog('All changes saved successfully!')

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Script executed successfully using HTTP form submission',
          logs
        })
      }

    } catch (error: any) {
      addLog(`Error: ${error.message}`)
      return {
        statusCode: 500,
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
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}
