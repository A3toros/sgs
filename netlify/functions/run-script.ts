import { Handler } from '@netlify/functions'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

// Ensure the function returns proper JSON headers

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
  /** Preferred: columns with key + Check suffix (e.g. S10 / "10", Final / "F") */
  scoreColumns?: ScoreColumnPayload[] | number[]
  inputPositions: number[]
  checkboxPositions: number[]
  students: { [studentId: string]: string[] }
}

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

export const handler: Handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      } as Record<string, string>,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const config: ScriptConfig = JSON.parse(event.body || '{}')

    // Validate config
    if (!config.loginUrl || !config.username || !config.password) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        } as Record<string, string>,
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        } as Record<string, string>,
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

      // Click score-column header checkboxes (Check1, Check10, CheckF, etc.)
      const columns = normalizeColumns(config)

      addLog(`Clicking column checkboxes: ${columns.map(c => c.key).join(', ')}...`)
      for (const col of columns) {
        try {
          const checkbox = await page.$(`#ctl00_PageContent_Check${col.checkSuffix}`)
          if (checkbox) {
            await checkbox.evaluate((el: Element) => {
              el.removeAttribute('disabled')
              const parent = el.parentElement
              if (parent) parent.removeAttribute('disabled')
              ;(el as HTMLElement).scrollIntoView({ block: 'center' })
            })
            const alreadyChecked = await page.evaluate((el) => (el as HTMLInputElement).checked, checkbox)
            if (!alreadyChecked) {
              await checkbox.click()
            }
            await page.waitForTimeout(500)
            addLog(`Clicked Check${col.checkSuffix} (${col.key})`)
          } else {
            addLog(`Checkbox Check${col.checkSuffix} not found`)
          }
        } catch (e: any) {
          addLog(`Error clicking Check${col.checkSuffix}: ${e.message}`)
        }
      }

      // Process students — fill each column input in the student row
      addLog(`Processing ${Object.keys(config.students).length} students...`)
      for (const [studentId, scores] of Object.entries(config.students)) {
        addLog(`Processing student ${studentId}...`)
        for (let i = 0; i < columns.length && i < scores.length; i++) {
          try {
            const col = columns[i]
            const filled = await page.evaluate((sid, score, key) => {
              const cells = Array.from(document.querySelectorAll('td'))
              const studentCell = cells.find(cell => cell.textContent?.trim() === sid)
              if (!studentCell) return false
              const row = studentCell.closest('tr')
              if (!row) return false

              const byName = row.querySelectorAll(
                `input[name*="${key}"], input[id*="${key}"]`
              )
              let input: HTMLInputElement | null = null
              if (byName.length > 0) {
                input = Array.from(byName).find(
                  (el) => (el as HTMLInputElement).type !== 'checkbox' && (el as HTMLInputElement).type !== 'hidden'
                ) as HTMLInputElement || null
              }
              if (!input) return false
              input.removeAttribute('disabled')
              input.value = score
              input.dispatchEvent(new Event('input', { bubbles: true }))
              input.dispatchEvent(new Event('change', { bubbles: true }))
              return true
            }, studentId, scores[i], col.key)

            if (filled) {
              addLog(`  Filled ${col.key} (${col.label || col.key}) with ${scores[i]}`)
            } else {
              addLog(`  Could not find ${col.key} input for student ${studentId}`)
            }
          } catch (e: any) {
            addLog(`  Error at ${columns[i].key}: ${e.message}`)
          }
        }
        await page.waitForTimeout(500)
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        } as Record<string, string>,
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        } as Record<string, string>,
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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      } as Record<string, string>,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    }
  }
}
