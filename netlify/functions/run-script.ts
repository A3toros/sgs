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

    // Launch browser
    addLog('Launching browser...')
    
    let browser
    try {
      // Set up Chromium for Netlify environment
      const executablePath = process.env.AWS_REGION 
        ? await chromium.executablePath()
        : undefined // Use local Chrome for development
      
      browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox',
          '--single-process'
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath,
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
        if (okLink) (okLink as HTMLElement).click()
      })
      await page.waitForTimeout(3000)

      // Handle password change prompt if it appears
      try {
        const cancelButton = await page.$('a[title="Cancel"]')
        if (cancelButton) {
          addLog('Dismissing password change prompt...')
          await cancelButton.click()
          await page.waitForTimeout(2000)
        }
      } catch (e) {
        addLog('No password change prompt found')
      }

      // Navigate to target page
      addLog('Navigating to target page...')
      await page.goto(config.targetUrl, { waitUntil: 'networkidle0' })
      await page.waitForTimeout(3000)

      // Select subject
      addLog('Selecting subject...')
      await page.evaluate((subjectValue) => {
        const selects = Array.from(document.querySelectorAll('select'))
        const subjectSelect = selects.find(select => {
          const label = select.previousElementSibling?.textContent || ''
          return label.includes('รายวิชา')
        })
        if (subjectSelect) {
          (subjectSelect as HTMLSelectElement).value = subjectValue
          subjectSelect.dispatchEvent(new Event('change', { bubbles: true }))
        }
      }, config.subjectValue)
      await page.waitForTimeout(3000)

      // Select group
      addLog('Selecting group...')
      await page.select('select[name="ctl00$PageContent$ClassSectionNoFilter"]', config.groupValue)
      await page.waitForTimeout(3000)

      // Click first input before "หน้า" and type 25
      addLog('Setting page input to 25...')
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'))
        const pageInput = inputs.find(input => {
          const nextSibling = input.nextElementSibling?.textContent || ''
          return nextSibling.includes('หน้า')
        })
        if (pageInput) {
          (pageInput as HTMLInputElement).value = '25'
          pageInput.dispatchEvent(new Event('input', { bubbles: true }))
        }
      })
      await page.waitForTimeout(500)

      // Click "หน้า" button
      addLog('Clicking page button...')
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'))
        const pageLink = links.find(link => link.textContent?.includes('หน้า'))
        if (pageLink) (pageLink as HTMLElement).click()
      })
      await page.waitForTimeout(3000)

      // Click checkboxes
      addLog('Clicking checkboxes...')
      const checkboxes = await page.$$('input[type="checkbox"]')
      for (const position of config.checkboxPositions) {
        try {
          if (checkboxes[position - 1]) {
            await checkboxes[position - 1].scrollIntoView()
            await checkboxes[position - 1].click()
            await page.waitForTimeout(500)
            addLog(`Clicked checkbox ${position}`)
          }
        } catch (e: any) {
          addLog(`Error clicking checkbox ${position}: ${e.message}`)
        }
      }

      // Process students
      addLog(`Processing ${Object.keys(config.students).length} students...`)
      for (const [studentId, scores] of Object.entries(config.students)) {
        addLog(`Processing student ${studentId}...`)
        for (let i = 0; i < config.inputPositions.length && i < scores.length; i++) {
          try {
            const pos = config.inputPositions[i]
            await page.evaluate((sid, score, inputPos) => {
              const cells = Array.from(document.querySelectorAll('td'))
              const studentCell = cells.find(cell => cell.textContent?.trim() === sid)
              if (studentCell) {
                const row = studentCell.closest('tr')
                if (row) {
                  const inputs = Array.from(row.querySelectorAll('input'))
                  if (inputs[inputPos - 1]) {
                    (inputs[inputPos - 1] as HTMLInputElement).value = score
                    inputs[inputPos - 1].dispatchEvent(new Event('input', { bubbles: true }))
                  }
                }
              }
            }, studentId, scores[i], pos)
            addLog(`  Filled position ${pos} with ${scores[i]}`)
          } catch (e: any) {
            addLog(`  Error at position ${config.inputPositions[i]}: ${e.message}`)
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
