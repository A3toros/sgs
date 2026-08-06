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
  const [scoreColumns, setScoreColumns] = useState(
    MODE_CONFIG.midterm.columns.map((c) => ({ ...c, enabled: true }))
  )

  // Apply mode config (targetUrl + S columns) to current teacher config and local state
  const applyMode = (newMode: TranscriptMode) => {
    const modeConf = MODE_CONFIG[newMode]
    setConfig(prev => {
      if (!prev) return prev
      const updated = {
        ...prev,
        targetUrl: modeConf.targetUrl,
        inputPositions: modeConf.inputPositions,
        checkboxPositions: modeConf.checkboxPositions
      }
      updateTeacherConfig(selectedTeacher, {
        targetUrl: modeConf.targetUrl,
        inputPositions: modeConf.inputPositions,
        checkboxPositions: modeConf.checkboxPositions
      })
      return updated
    })
    setScoreColumns(modeConf.columns.map((c) => ({ ...c, enabled: true })))
  }

  // Load teacher config when teacher changes; detect mode from targetUrl
  useEffect(() => {
    const teacherConfig = getTeacherConfig(selectedTeacher)
    if (teacherConfig) {
      setConfig(teacherConfig)
      const isFinals = teacherConfig.targetUrl.includes('Edit-TblTranscripts-Table.aspx') && !teacherConfig.targetUrl.includes('Edit-TblTranscripts1-Table')
      const newMode: TranscriptMode = isFinals ? 'finals' : 'midterm'
      setMode(newMode)
      setScoreColumns(MODE_CONFIG[newMode].columns.map((c) => ({ ...c, enabled: true })))
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

    const activeColumns = scoreColumns.filter(c => c.enabled)
    const columnKeys = activeColumns.map(c => c.key)
    const checkSuffixes = activeColumns.map(c => c.checkSuffix)

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
# Columns: keys and Check{suffix} ids
score_keys = [${columnKeys.map(k => `"${k}"`).join(', ')}]
check_suffixes = [${checkSuffixes.map(s => `"${s}"`).join(', ')}]

students = {
${studentData}
}

def login(driver, wait):
    """Automatically login to the system"""
    print("Starting login process...")

    try:
        driver.get(LOGIN_URL)
        time.sleep(3)
        username_field = wait.until(EC.presence_of_element_located((By.NAME, "ctl00$PageContent$UserName")))
        username_field.clear()
        username_field.send_keys(USERNAME)
        password_field = wait.until(EC.presence_of_element_located((By.NAME, "ctl00$PageContent$Password")))
        password_field.clear()
        password_field.send_keys(PASSWORD)
        time.sleep(1)
        ok_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'ตกลง')] | //a[@title='ตกลง']")))
        ok_button.click()
        time.sleep(3)
        try:
            cancel_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[@title='Cancel'] | //a[contains(text(), 'Cancel')]")))
            cancel_button.click()
            time.sleep(2)
        except:
            pass
    except Exception as e:
        print(f"Login error: {e}")
        raise

def select_subject(driver, wait):
    subject_dropdown = driver.find_element(By.XPATH, "//text()[contains(., 'รายวิชา')]/following::select[1]")
    Select(subject_dropdown).select_by_value(SUBJECT_VALUE)
    time.sleep(3)

def select_group(driver, wait):
    group_dropdown = wait.until(EC.presence_of_element_located((By.NAME, "ctl00$PageContent$ClassSectionNoFilter")))
    Select(group_dropdown).select_by_value(GROUP_VALUE)
    time.sleep(3)

def click_first_input_before_page(driver, wait):
    first_input = driver.find_element(By.XPATH, "//text()[contains(., 'หน้า')]/preceding::input[1]")
    driver.execute_script("arguments[0].scrollIntoView(true);", first_input)
    first_input.click()
    first_input.clear()
    first_input.send_keys("25")
    time.sleep(0.5)

def click_page_button(driver, wait):
    page_button = driver.find_element(By.XPATH, "//a[contains(text(), 'หน้า')]")
    driver.execute_script("arguments[0].scrollIntoView(true);", page_button)
    page_button.click()
    time.sleep(3)

def click_checkboxes(driver):
    print("Clicking column checkboxes...")
    for suffix in check_suffixes:
        try:
            checkbox = driver.find_element(By.ID, f"ctl00_PageContent_Check{suffix}")
            driver.execute_script("arguments[0].removeAttribute('disabled'); arguments[0].scrollIntoView(true);", checkbox)
            time.sleep(0.3)
            if not checkbox.is_selected():
                checkbox.click()
            print(f"Clicked Check{suffix}")
            time.sleep(0.5)
        except Exception as e:
            print(f"Error clicking Check{suffix}: {e}")

def save_transcripts(driver, wait):
    save_button = wait.until(EC.element_to_be_clickable((By.ID, "ctl00_PageContent_TblTranscriptsSaveButton")))
    driver.execute_script("arguments[0].scrollIntoView(true);", save_button)
    save_button.click()
    time.sleep(5)

driver = webdriver.Chrome()
wait = WebDriverWait(driver, 10)

try:
    login(driver, wait)
    driver.get(TARGET_URL)
    time.sleep(3)
    select_subject(driver, wait)
    select_group(driver, wait)
    click_first_input_before_page(driver, wait)
    click_page_button(driver, wait)
    click_checkboxes(driver)

    for student_id, scores in students.items():
        print(f"Processing student {student_id}")
        for i, key in enumerate(score_keys):
            try:
                xpath = f"//td[contains(text(), '{student_id}')]/ancestor::tr[1]//input[contains(@name, '{key}') or contains(@id, '{key}')]"
                inputs = driver.find_elements(By.XPATH, xpath)
                if not inputs:
                    continue
                input_elem = inputs[0]
                input_elem.clear()
                input_elem.send_keys(scores[i])
                print(f"  Filled {key} with {scores[i]}")
            except Exception as e:
                print(f"  Error at {key}: {e}")
        time.sleep(1)

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

    const activeColumns = scoreColumns.filter(c => c.enabled)

    if (Object.keys(config.students).length === 0) {
      alert('❌ No student data found. Please add student data first!')
      return
    }

    if (activeColumns.length === 0) {
      alert('❌ No score columns selected. Please enable at least one column!')
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
      const scriptConfig = {
        loginUrl: config.loginUrl,
        targetUrl: config.targetUrl,
        username: config.username,
        password: config.password,
        subjectValue: config.subjectValue,
        groupValue: config.groupValue,
        mode,
        scoreColumns: activeColumns.map(c => ({ key: c.key, checkSuffix: c.checkSuffix, label: c.label })),
        inputPositions: config.inputPositions,
        checkboxPositions: config.checkboxPositions,
        students: config.students
      }

      // Always use Netlify function (netlify dev proxies this locally; same path in production)
      const apiUrl = '/.netlify/functions/run-script'

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
        errorMessage = 'Failed to connect to the Netlify function. Run "netlify dev" and open http://localhost:8888 (not :3000 alone).'
      } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Network error. Ensure netlify dev is running and you are on the proxy URL (port 8888).'
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
              {mode === 'midterm'
                ? 'Midterm: Edit-TblTranscripts1 — check & fill S1 (30) and Midterm/กลางภาค (20).'
                : 'Finals: Edit-TblTranscripts — check & fill S10 (20), S11 (10), and Final/ปลายภาค (20).'}
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

        {/* Score Columns (check header + fill cells) */}
        <Card className="mb-6">
          <Card.Body>
            <h3 className="text-lg font-semibold mb-4">📝 Score Columns to Check & Fill</h3>
            <p className="text-sm text-gray-500 mb-4">
              {mode === 'midterm'
                ? 'Midterm uses S1 (30) and Midterm/กลางภาค (20).'
                : 'Finals uses S10, S11, and Final/ปลายภาค (shown as 20, 10, 20).'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scoreColumns.map((col, index) => (
                <div key={col.key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-md bg-gray-50">
                  <input
                    type="checkbox"
                    checked={col.enabled}
                    onChange={(e) => {
                      const next = [...scoreColumns]
                      next[index] = { ...next[index], enabled: e.target.checked }
                      setScoreColumns(next)
                      const active = next.filter(c => c.enabled).map(c => parseInt(c.checkSuffix, 10)).filter(n => !Number.isNaN(n))
                      updateTeacherConfig(selectedTeacher, { inputPositions: active, checkboxPositions: active })
                    }}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="text-sm font-semibold">{col.label}</div>
                    <div className="text-xs text-gray-500">{col.key} (Check{col.checkSuffix})</div>
                  </div>
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
              <p className="text-xs text-gray-500 mt-1">
                {mode === 'midterm'
                  ? 'Format: StudentID [Tab] 30-score [Tab] 20-score  (S1 then Midterm/กลางภาค)'
                  : 'Format: StudentID [Tab] 20-score [Tab] 10-score [Tab] 20-score  (S10, S11, Final)'}
              </p>
            </div>
            <Textarea
              label="Student Data (or paste here)"
              value={Object.entries(config.students).map(([id, scores]) =>
                `${id}\t${scores.join('\t')}`
              ).join('\n')}
              onChange={handleStudentDataChange}
              placeholder={mode === 'midterm'
                ? '51706\t24\t5\n51707\t25\t6'
                : '51706\t18\t8\t15'}
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
