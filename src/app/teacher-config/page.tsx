'use client'

import { useState, useEffect } from 'react'
import { TEACHER_CONFIGS, GROUP_OPTIONS, MODE_OPTIONS, MODE_CONFIG, getTeacherConfig, updateTeacherConfig, getSubjectOptionsForTeacher } from '@/lib/teacherConfigs'
import type { TranscriptMode } from '@/lib/teacherConfigs'
import { TeacherConfig, StudentData } from '@/types'
import { Button, Card, Input, Textarea, Select } from '@/components/ui'

export default function TeacherConfigPage() {
  const [selectedTeacher, setSelectedTeacher] = useState<string>('alex')
  const [mode, setMode] = useState<TranscriptMode>('midterm')
  const [config, setConfig] = useState<TeacherConfig | null>(null)
  const [generatedScript, setGeneratedScript] = useState<string>('')
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [executionLogs, setExecutionLogs] = useState<string[]>([])
  const [inputPositions, setInputPositions] = useState<Array<{position: number, enabled: boolean}>>([
    { position: 1, enabled: true },
    { position: 11, enabled: true },
    { position: 15, enabled: false }
  ])
  const [checkboxPositions, setCheckboxPositions] = useState<Array<{position: number, enabled: boolean}>>([
    { position: 1, enabled: true },
    { position: 10, enabled: true },
    { position: 20, enabled: false }
  ])

  // Apply mode config (targetUrl + positions) to current teacher config and local state
  const applyMode = (newMode: TranscriptMode) => {
    const modeConf = MODE_CONFIG[newMode]
    setConfig(prev => {
      if (!prev) return prev
      const updated = { ...prev, targetUrl: modeConf.targetUrl, inputPositions: modeConf.inputPositions, checkboxPositions: modeConf.checkboxPositions }
      updateTeacherConfig(selectedTeacher, { targetUrl: modeConf.targetUrl, inputPositions: modeConf.inputPositions, checkboxPositions: modeConf.checkboxPositions })
      return updated
    })
    if (newMode === 'midterm') {
      setInputPositions([{ position: 1, enabled: true }, { position: 11, enabled: true }, { position: 15, enabled: false }])
      setCheckboxPositions([{ position: 1, enabled: true }, { position: 10, enabled: true }, { position: 20, enabled: false }])
    } else {
      setInputPositions(modeConf.inputPositions.map((position) => ({ position, enabled: true })))
      setCheckboxPositions(modeConf.checkboxPositions.map((position) => ({ position, enabled: true })))
    }
  }

  // Load teacher config when teacher changes; detect mode from targetUrl and set positions
  useEffect(() => {
    const teacherConfig = getTeacherConfig(selectedTeacher)
    if (teacherConfig) {
      setConfig(teacherConfig)
      const isFinals = teacherConfig.targetUrl.includes('Edit-TblTranscripts-Table.aspx') && !teacherConfig.targetUrl.includes('Edit-TblTranscripts1-Table')
      const newMode: TranscriptMode = isFinals ? 'finals' : 'midterm'
      setMode(newMode)
      if (newMode === 'midterm') {
        setInputPositions([{ position: 1, enabled: true }, { position: 11, enabled: true }, { position: 15, enabled: false }])
        setCheckboxPositions([{ position: 1, enabled: true }, { position: 10, enabled: true }, { position: 20, enabled: false }])
      } else {
        const modeConf = MODE_CONFIG[newMode]
        setInputPositions(modeConf.inputPositions.map((position) => ({ position, enabled: true })))
        setCheckboxPositions(modeConf.checkboxPositions.map((position) => ({ position, enabled: true })))
      }
    }
  }, [selectedTeacher])

  // When mode dropdown changes, apply that mode's config
  const handleModeChange = (value: string) => {
    const newMode = value as TranscriptMode
    setMode(newMode)
    applyMode(newMode)
  }

  const handleConfigChange = (field: keyof TeacherConfig, value: string) => {
    if (!config) return

    const updatedConfig = { ...config, [field]: value }
    setConfig(updatedConfig)
    updateTeacherConfig(selectedTeacher, { [field]: value })
  }

  const handleStudentDataChange = (data: string) => {
    if (!config) return

    const lines = data.trim().split('\n')
    const students: StudentData = {}

    lines.forEach((line) => {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 2) {
        const studentId = parts[0]
        const scores = parts.slice(1)
        students[studentId] = scores
      }
    })

    const updatedConfig = { ...config, students }
    setConfig(updatedConfig)
    updateTeacherConfig(selectedTeacher, { students })
  }

  const generateScript = () => {
    if (!config) return

    const activeInputPositions = inputPositions.filter(p => p.enabled).map(p => p.position)
    const activeCheckboxPositions = checkboxPositions.filter(p => p.enabled).map(p => p.position)

    const studentData = Object.entries(config.students)
      .map(([id, scores]) => `    "${id}": [${scores.map(s => `"${s}"`).join(', ')}]`)
      .join(',\n')

    const script = `from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
import time

# Configuration
LOGIN_URL = "${config.loginUrl}"
TARGET_URL = "${config.targetUrl}"
USERNAME = "${config.username}"
PASSWORD = "${config.password}"
SUBJECT_VALUE = "${config.subjectValue}"
GROUP_VALUE = "${config.groupValue}"
input_positions = [${activeInputPositions.join(', ')}]
checkbox_positions = [${activeCheckboxPositions.join(', ')}]

students = {
${studentData}
}

def login(driver, wait):
    """Automatically login to the system"""
    print("Starting login process...")

    try:
        # Navigate to login page
        driver.get(LOGIN_URL)
        time.sleep(3)
        print(f"Current page title: {driver.title}")
        print(f"Current URL: {driver.current_url}")

        # Find username field by the exact name attribute
        username_field = wait.until(EC.presence_of_element_located((By.NAME, "ctl00$PageContent$UserName")))
        print("Found username field by exact name")

        username_field.clear()
        username_field.send_keys(USERNAME)
        print(f"Username '{USERNAME}' entered successfully")

        # Find password field by the exact name attribute
        password_field = wait.until(EC.presence_of_element_located((By.NAME, "ctl00$PageContent$Password")))
        print("Found password field by exact name")

        password_field.clear()
        password_field.send_keys(PASSWORD)
        print(f"Password entered successfully")

        # Wait a moment for fields to be filled
        time.sleep(1)

        # Find and click the "ตกลง" (OK) button
        ok_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'ตกลง')] | //a[@title='ตกลง']")))
        ok_button.click()
        print("ตกลง (OK) button clicked")

        # Wait for login to complete
        time.sleep(3)
        print("Login completed successfully!")

        # Handle password change prompt if it appears
        try:
            # Look for the Cancel button in password change prompt
            cancel_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[@title='Cancel'] | //a[contains(text(), 'Cancel')]")))
            cancel_button.click()
            print("Password change prompt dismissed - Cancel button clicked")
            time.sleep(2)
        except:
            print("No password change prompt found, continuing...")

    except Exception as e:
        print(f"Login error: {e}")
        # Take a screenshot for debugging
        try:
            driver.save_screenshot("login_error.png")
            print("Screenshot saved as 'login_error.png'")
        except:
            pass
        raise

def select_subject(driver, wait):
    """Select subject from dropdown and wait for page to load"""
    print("Selecting subject from dropdown...")

    try:
        # Find the first select element after "รายวิชา" text
        subject_dropdown = driver.find_element(By.XPATH, "//text()[contains(., 'รายวิชา')]/following::select[1]")

        # Create Select object and select the subject
        select = Select(subject_dropdown)
        select.select_by_value(SUBJECT_VALUE)
        print(f"Selected subject with value: {SUBJECT_VALUE}")

        # Wait for page to reload after selection
        time.sleep(3)
        print("Subject selection completed")

    except Exception as e:
        print(f"Error selecting subject: {e}")
        raise

def select_group(driver, wait):
    """Select group from dropdown and wait for page to load"""
    print("Selecting group from dropdown...")

    try:
        # Find the group dropdown by its exact name attribute
        group_dropdown = wait.until(EC.presence_of_element_located((By.NAME, "ctl00$PageContent$ClassSectionNoFilter")))

        # Create Select object and select the group
        select = Select(group_dropdown)
        select.select_by_value(GROUP_VALUE)
        print(f"Selected group with value: {GROUP_VALUE}")

        # Wait for page to reload after selection
        time.sleep(3)
        print("Group selection completed")

    except Exception as e:
        print(f"Error selecting group: {e}")
        raise

def click_first_input_before_page(driver, wait):
    """Click the first input before 'หน้า' text and type 25"""
    print("Clicking first input before 'หน้า' and typing 25...")

    try:
        # Find the first input element before "หน้า" text
        first_input = driver.find_element(By.XPATH, "//text()[contains(., 'หน้า')]/preceding::input[1]")

        # Scroll to input if needed
        driver.execute_script("arguments[0].scrollIntoView(true);", first_input)
        time.sleep(0.5)

        # Click the input and type 25
        first_input.click()
        first_input.clear()
        first_input.send_keys("25")
        print("Typed 25 in first input before 'หน้า'")
        time.sleep(0.5)

    except Exception as e:
        print(f"Error clicking first input before 'หน้า': {e}")
        raise

def click_page_button(driver, wait):
    """Click the 'หน้า' button"""
    print("Clicking 'หน้า' button...")

    try:
        # Find and click the button with text "หน้า"
        page_button = driver.find_element(By.XPATH, "//a[contains(text(), 'หน้า')]")

        # Scroll to button if needed
        driver.execute_script("arguments[0].scrollIntoView(true);", page_button)
        time.sleep(0.5)

        # Click the button
        page_button.click()
        print("Clicked 'หน้า' button")
        time.sleep(3)  # Wait for page action to complete

    except Exception as e:
        print(f"Error clicking 'หน้า' button: {e}")
        raise

def click_checkboxes(driver):
    """Click the required checkboxes before editing scores"""
    print("Clicking required checkboxes...")

    for position in checkbox_positions:
        try:
            # Find checkbox by position (nth checkbox on the page)
            checkbox = driver.find_element(By.XPATH, f"(//input[@type='checkbox'])[{position}]")

            # Scroll to checkbox if needed
            driver.execute_script("arguments[0].scrollIntoView(true);", checkbox)
            time.sleep(0.5)

            # Click the checkbox
            checkbox.click()
            print(f"Clicked checkbox {position}")
            time.sleep(0.5)

        except Exception as e:
            print(f"Error clicking checkbox {position}: {e}")

def save_transcripts(driver, wait):
    """Click the save button to save all transcript changes"""
    print("Saving all transcript changes...")

    try:
        # Find and click the save button by its ID
        save_button = wait.until(EC.element_to_be_clickable((By.ID, "ctl00_PageContent_TblTranscriptsSaveButton")))

        # Scroll to save button if needed
        driver.execute_script("arguments[0].scrollIntoView(true);", save_button)
        time.sleep(0.5)

        # Click the save button
        save_button.click()
        print("Save button clicked")

        # Wait for save operation to complete
        time.sleep(5)
        print("Transcripts saved successfully!")

    except Exception as e:
        print(f"Error saving transcripts: {e}")
        raise

# Main execution
driver = webdriver.Chrome()
wait = WebDriverWait(driver, 10)

try:
    # Login first
    login(driver, wait)

    # Navigate to target page
    print(f"Navigating to target page: {TARGET_URL}")
    driver.get(TARGET_URL)
    time.sleep(3)

    # Select subject from dropdown
    select_subject(driver, wait)

    # Select group from dropdown
    select_group(driver, wait)

    # Click first input before "หน้า" and type 25
    click_first_input_before_page(driver, wait)

    # Click "หน้า" button
    click_page_button(driver, wait)

    # Click required checkboxes first
    click_checkboxes(driver)

    # Process students
    for student_id, scores in students.items():
        print(f"Processing student {student_id}")
        for i, pos in enumerate(input_positions):
            try:
                xpath = f"//td[contains(text(), '{student_id}')]/following::input[{pos}]"
                input_elem = wait.until(EC.presence_of_element_located((By.XPATH, xpath)))
                input_elem.clear()
                input_elem.send_keys(scores[i])
                print(f"  Filled position {pos} with {scores[i]}")
            except Exception as e:
                print(f"  Error at position {pos}: {e}")
        time.sleep(1)

    # Save all changes
    save_transcripts(driver, wait)

    print("All students processed and saved successfully!")

except Exception as e:
    print(f"Error: {e}")
finally:
    driver.quit()`

    setGeneratedScript(script)
  }

  const run = async () => {
    if (!config) return

    // Validate before running
    const activeInputPositions = inputPositions.filter(p => p.enabled)
    const activeCheckboxPositions = checkboxPositions.filter(p => p.enabled)

    if (Object.keys(config.students).length === 0) {
      alert('❌ No student data found. Please add student data first!')
      return
    }

    if (activeInputPositions.length === 0) {
      alert('❌ No input positions selected. Please enable at least one input position!')
      return
    }

    if (activeCheckboxPositions.length === 0) {
      alert('❌ No checkbox positions selected. Please enable at least one checkbox position!')
      return
    }

    if (!config.username || !config.password) {
      alert('❌ Username or password missing. Please fill in login credentials!')
      return
    }

    if (!config.subjectValue || !config.groupValue) {
      alert('❌ Subject or group value missing. Please select subject and group!')
      return
    }

    setIsRunning(true)
    setExecutionLogs(['Starting script execution...'])

    try {
      const activeInputPos = activeInputPositions.map(p => p.position)
      const activeCheckboxPos = activeCheckboxPositions.map(p => p.position)

      const scriptConfig = {
        loginUrl: config.loginUrl,
        targetUrl: config.targetUrl,
        username: config.username,
        password: config.password,
        subjectValue: config.subjectValue,
        groupValue: config.groupValue,
        inputPositions: activeInputPos,
        checkboxPositions: activeCheckboxPos,
        students: config.students
      }

      // Use Next.js API route for local development, Netlify function for production
      const apiUrl = process.env.NODE_ENV === 'development'
        ? '/api/run-script'
        : '/.netlify/functions/run-script'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scriptConfig)
      })

      // Check if response is valid JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        throw new Error(`Expected JSON response but got: ${text.substring(0, 100)}`)
      }

      const result = await response.json()

      if (result.success) {
        setExecutionLogs(result.logs || ['Script executed successfully!'])
        alert('✅ Script executed successfully! Check the logs below.')
      } else {
        setExecutionLogs(result.logs || [result.error || 'Unknown error occurred'])
        alert(`❌ Error: ${result.error || 'Script execution failed'}`)
      }
    } catch (error: any) {
      let errorMessage = error.message
      
      // Provide more helpful error messages
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Failed to connect to the server. Please make sure:' +
          '\n1. Netlify functions server is running (run "netlify dev" in a separate terminal)' +
          '\n2. You are using the correct URL in the configuration' +
          '\n3. No firewall is blocking the connection to localhost:9999'
      } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Network error. Please check your internet connection and ensure the Netlify functions server is running.'
      }
      
      setExecutionLogs([`Error: ${errorMessage}`])
      alert(`❌ Failed to execute script: ${errorMessage}`)
    } finally {
      setIsRunning(false)
    }
  }

  if (!config) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎯 Teacher Configuration</h1>
          <p className="text-gray-600">Configure and generate Python scripts for teacher data entry</p>
        </div>

        {/* Teacher & Mode Selection */}
        <Card className="mb-6">
          <Card.Body>
            <h3 className="text-lg font-semibold mb-4">👥 Select Teacher & Mode</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Teacher"
                value={selectedTeacher}
                onChange={(value) => setSelectedTeacher(value)}
                options={TEACHER_CONFIGS.map(teacher => ({
                  value: teacher.id,
                  label: teacher.name
                }))}
              />
              <Select
                label="Mode"
                value={mode}
                onChange={handleModeChange}
                options={MODE_OPTIONS}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {mode === 'midterm' ? 'Midterm: target Edit-TblTranscripts1, inputs 1 & 11, checkboxes 1 & 10.' : 'Finals: target Edit-TblTranscripts (no "1"), inputs and checkboxes 5, 6, 8.'}
            </p>
          </Card.Body>
        </Card>

        {/* Script Configuration */}
        <Card className="mb-6">
          <Card.Body>
            <h3 className="text-lg font-semibold mb-4">⚙️ Script Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Login URL"
                value={config.loginUrl}
                onChange={(value) => handleConfigChange('loginUrl', value)}
                placeholder="Enter login URL"
              />
              <Input
                label="Target Page URL"
                value={config.targetUrl}
                onChange={(value) => handleConfigChange('targetUrl', value)}
                placeholder="Enter target page URL"
              />
              <Input
                label="Username"
                value={config.username}
                onChange={(value) => handleConfigChange('username', value)}
                placeholder="Enter username"
              />
              <Input
                label="Password"
                type="password"
                value={config.password}
                onChange={(value) => handleConfigChange('password', value)}
                placeholder="Enter password"
              />
              <Select
                label="Subject Value"
                value={config.subjectValue}
                onChange={(value) => handleConfigChange('subjectValue', value)}
                options={getSubjectOptionsForTeacher(selectedTeacher)}
              />
              <Select
                label="Group Value"
                value={config.groupValue}
                onChange={(value) => handleConfigChange('groupValue', value)}
                options={GROUP_OPTIONS}
              />
            </div>
          </Card.Body>
        </Card>

        {/* Input Positions */}
        <Card className="mb-6">
          <Card.Body>
            <h3 className="text-lg font-semibold mb-4">📝 Input Positions to Fill</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {inputPositions.map((pos, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={pos.enabled}
                    onChange={(e) => {
                      const newPositions = [...inputPositions]
                      newPositions[index].enabled = e.target.checked
                      setInputPositions(newPositions)

                      const activePositions = newPositions.filter(p => p.enabled).map(p => p.position)
                      updateTeacherConfig(selectedTeacher, { inputPositions: activePositions })
                    }}
                    className="w-4 h-4"
                  />
                  <label className="text-sm font-medium">Position</label>
                  <Input
                    type="number"
                    value={pos.position.toString()}
                    onChange={(value) => {
                      const newPositions = [...inputPositions]
                      newPositions[index].position = parseInt(value) || 1
                      setInputPositions(newPositions)

                      const activePositions = newPositions.filter(p => p.enabled).map(p => p.position)
                      updateTeacherConfig(selectedTeacher, { inputPositions: activePositions })
                    }}
                    className="w-20"
                    min="1"
                  />
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>

        {/* Checkbox Positions */}
        <Card className="mb-6">
          <Card.Body>
            <h3 className="text-lg font-semibold mb-4">☑️ Checkbox Positions to Click</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {checkboxPositions.map((pos, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={pos.enabled}
                    onChange={(e) => {
                      const newPositions = [...checkboxPositions]
                      newPositions[index].enabled = e.target.checked
                      setCheckboxPositions(newPositions)

                      const activePositions = newPositions.filter(p => p.enabled).map(p => p.position)
                      updateTeacherConfig(selectedTeacher, { checkboxPositions: activePositions })
                    }}
                    className="w-4 h-4"
                  />
                  <label className="text-sm font-medium">Position</label>
                  <Input
                    type="number"
                    value={pos.position.toString()}
                    onChange={(value) => {
                      const newPositions = [...checkboxPositions]
                      newPositions[index].position = parseInt(value) || 1
                      setCheckboxPositions(newPositions)

                      const activePositions = newPositions.filter(p => p.enabled).map(p => p.position)
                      updateTeacherConfig(selectedTeacher, { checkboxPositions: activePositions })
                    }}
                    className="w-20"
                    min="1"
                  />
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>

        {/* Student Data */}
        <Card className="mb-6">
          <Card.Body>
            <h3 className="text-lg font-semibold mb-4">👥 Student Data</h3>
            <div className="mb-4">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (e) => {
                      const content = e.target?.result as string
                      handleStudentDataChange(content)
                    }
                    reader.readAsText(file)
                  }
                }}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">Format: StudentID [Tab] Score1 [Tab] Score2 [Tab] Score3 (optional)</p>
            </div>
            <Textarea
              label="Student Data (or paste here)"
              value={Object.entries(config.students).map(([id, scores]) =>
                `${id}\t${scores.join('\t')}`
              ).join('\n')}
              onChange={handleStudentDataChange}
              placeholder="Paste student data here or import from file&#10;Format:&#10;51706	24	5&#10;51707	25	6"
              rows={20}
            />
          </Card.Body>
        </Card>

        {/* Action Button */}
        <Card className="mb-6">
          <Card.Body>
            <div className="flex justify-center">
              <Button 
                onClick={run} 
                size="lg" 
                className="px-8 py-3 text-lg"
                disabled={isRunning}
                loading={isRunning}
              >
                {isRunning ? 'Running...' : '▶ Run'}
              </Button>
            </div>
          </Card.Body>
        </Card>

        {/* Execution Logs */}
        {executionLogs.length > 0 && (
          <Card>
            <Card.Body>
              <h3 className="text-lg font-semibold mb-4">📋 Execution Logs</h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto">
                {executionLogs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        )}
      </div>
    </div>
  )
}
