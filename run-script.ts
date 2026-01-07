import { Handler } from '@netlify/functions'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

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

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const config: ScriptConfig = JSON.parse(event.body || '{}')

    // Validate config
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

    // Launch browser using correct Netlify setup
    addLog('Launching browser...')
    
    let browser
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true
      })
      addLog('Browser launched successfully')

    } catch (browserError: any) {
      addLog(`Failed to launch browser: ${browserError.message}`)
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: `Browser launch failed: ${browserError.message}`,
          logs
        })
      }
    }

    const page = await browser.newPage()

    try {
      // Login
      addLog('Navigating to login page...')
      await page.goto(config.loginUrl, { waitUntil: 'networkidle0' })
      await page.waitForTimeout(3000)

      addLog('Filling login credentials...')
      await page.type('input[name="ctl00$PageContent$UserName"]', config.username)
      await page.type('input[name="ctl00$PageContent$Password"]', config.password)
      await page.waitForTimeout(1000)

      addLog('Clicking login button...')
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'))
        const okLink = links.find(link => link.textContent?.includes('ตกลง'))
        if (okLink) okLink.click()
      })
      await page.waitForTimeout(3000)

      addLog('Login completed successfully!')

      // Handle password change prompt if it appears
      try {
        const cancelButton = await page.$('a[title="Cancel"], a:contains("Cancel")')
        if (cancelButton) {
          await cancelButton.click()
          addLog('Password change prompt dismissed')
          await page.waitForTimeout(2000)
        }
      } catch {
        addLog('No password change prompt found, continuing...')
      }

      // Navigate to target page
      addLog(`Navigating to target page: ${config.targetUrl}`)
      await page.goto(config.targetUrl, { waitUntil: 'networkidle0' })
      await page.waitForTimeout(3000)

      // Select subject from dropdown
      addLog('Selecting subject from dropdown...')
      await page.evaluate((subjectValue: string) => {
        const subjectDropdown = document.querySelector('select[name="ctl00$PageContent$SubjectFilter"]')
        if (subjectDropdown) {
          subjectDropdown.value = subjectValue
          subjectDropdown.dispatchEvent(new Event('change'))
        }
      }, config.subjectValue)
      addLog(`Selected subject with value: ${config.subjectValue}`)
      await page.waitForTimeout(3000)

      // Select group from dropdown
      addLog('Selecting group from dropdown...')
      await page.select('select[name="ctl00$PageContent$ClassSectionNoFilter"]', config.groupValue)
      addLog(`Selected group with value: ${config.groupValue}`)
      await page.waitForTimeout(3000)

      // Click first input before "หน้า" and type 25
      addLog('Clicking first input before page text and typing 25...')
      await page.evaluate(() => {
        const pageText = Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('หน้า'))
        if (pageText) {
          const inputs = document.querySelectorAll('input')
          const firstInput = inputs[inputs.length - 1] // Last input before page text
          if (firstInput) {
            firstInput.click()
            firstInput.value = '25'
            firstInput.dispatchEvent(new Event('input', { bubbles: true }))
          }
        }
      })
      addLog('Typed 25 in first input before page')
      await page.waitForTimeout(500)

      // Click "หน้า" button
      addLog('Clicking page button...')
      await page.click('a:has-text("หน้า")')
      addLog('Clicked page button')
      await page.waitForTimeout(3000)

      // Click required checkboxes
      addLog('Clicking required checkboxes...')
      for (const position of config.checkboxPositions) {
        try {
          await page.evaluate((pos: number) => {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]')
            if (checkboxes[pos - 1]) {
              checkboxes[pos - 1].click()
            }
          }, position)
          addLog(`Clicked checkbox ${position}`)
          await page.waitForTimeout(500)
        } catch (e: any) {
          addLog(`Error clicking checkbox ${position}: ${e.message}`)
        }
      }

      // Process students
      for (const [studentId, scores] of Object.entries(config.students)) {
        addLog(`Processing student ${studentId}`)
        for (let i = 0; i < config.inputPositions.length; i++) {
          const pos = config.inputPositions[i]
          try {
            await page.evaluate((studentId: string, score: string, inputPos: number) => {
              const tds = Array.from(document.querySelectorAll('td'))
              const studentTd = tds.find(td => td.textContent?.includes(studentId))
              if (studentTd) {
                const row = studentTd.closest('tr')
                if (row) {
                  const inputs = row.querySelectorAll('input')
                  if (inputs[inputPos - 1]) {
                    inputs[inputPos - 1].value = score
                    inputs[inputPos - 1].dispatchEvent(new Event('input', { bubbles: true }))
                  }
                }
              }
            }, studentId, scores[i] || '', pos)
            addLog(`  Filled position ${pos} with ${scores[i] || ''}`)
          } catch (e: any) {
            addLog(`  Error at position ${pos}: ${e.message}`)
          }
        }
        await page.waitForTimeout(1000)
      }

      // Save transcripts
      addLog('Saving transcripts...')
      const saveButton = await page.$('#ctl00_PageContent_TblTranscriptsSaveButton')
      if (saveButton) {
        await saveButton.scrollIntoView()
        await saveButton.click()
        await page.waitForTimeout(5000)
      }

      addLog('All students processed and saved successfully!')

      await browser.close()

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Script executed successfully',
          logs
        })
      }
    } catch (error: any) {
      await browser.close()
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
