from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
import time
import sys
sys.stdout.reconfigure(encoding="utf-8")

# Configuration
LOGIN_URL = "https://sgs.bopp-obec.info/sgs"
TARGET_URL = "https://sgs.bopp-obec.info/sgs/TblTranscripts/Edit-TblTranscripts2-Table.aspx"
USERNAME = "1010335002949"
PASSWORD = "15102523"
SUBJECT_VALUE = "8366434"  # Change this to select different subject
GROUP_VALUE = "15"  # Change this to select different group
input_positions = [1, 11]  # Which inputs to fill (1st, 2nd, etc.)
checkbox_positions = [1, 10]  # Which checkboxes to click (1st, 2nd, etc.)

students = {
    "51706": ["24", "5"],
    "51707": ["25", "6"],
    "51708": ["12", "6"],
    "51709": ["26", "8"],
    "51710": ["25", "10"],
    "51711": ["23", "8"],
    "51712": ["13", "6"],
    "51713": ["10", "7"],
    "51714": ["9", "5"],
    "51715": ["11", "7"],
    "51716": ["13", "7"],
    "51717": ["24", "9"],
    "51718": ["25", "6"],
    "51719": ["11", "6"],
    "51720": ["23", "9"],
    "51721": ["16", "8"],
    "51722": ["7", "10"],
    "51723": ["15", "4"],
    "51724": ["13", "9"],
    "51725": ["30", "10"],
    "51726": ["21", "8"],
    "51727": ["30", "10"],
    "51728": ["27", "10"],
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
    driver.quit()