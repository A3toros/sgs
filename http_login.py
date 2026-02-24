import requests
from bs4 import BeautifulSoup
import sys

# Configuration
LOGIN_URL = "https://sgs.bopp-obec.info/sgs"
USERNAME = "1010335002949"
PASSWORD = "15102523"

def extract_viewstate(html):
    soup = BeautifulSoup(html, 'html.parser')
    viewstate = soup.find('input', {'name': '__VIEWSTATE'})
    viewstategenerator = soup.find('input', {'name': '__VIEWSTATEGENERATOR'})
    return viewstate['value'] if viewstate else None, viewstategenerator['value'] if viewstategenerator else None

def login():
    session = requests.Session()

    # Step 1: GET the login page
    print("Getting login page...")
    response = session.get(LOGIN_URL)
    if response.status_code != 200:
        print(f"Failed to get login page: {response.status_code}")
        return False

    # Extract __VIEWSTATE and __VIEWSTATEGENERATOR
    viewstate, viewstategenerator = extract_viewstate(response.text)
    if not viewstate or not viewstategenerator:
        print("Failed to extract VIEWSTATE")
        return False

    print("Extracted VIEWSTATE and VIEWSTATEGENERATOR")

    # Step 2: Prepare the login payload
    payload = {
        "__VIEWSTATE": viewstate,
        "__VIEWSTATEGENERATOR": viewstategenerator,
        "__EVENTTARGET": "ctl00$PageContent$OKButton$_Button",
        "__EVENTARGUMENT": "",
        "ctl00$PageContent$UserName": USERNAME,
        "ctl00$PageContent$Password": PASSWORD,
        "ctl00$PageContent$RememberUserName": "on",
    }

    # Step 3: POST the login
    print("Posting login...")
    response = session.post(LOGIN_URL, data=payload)
    if response.status_code != 200:
        print(f"Login POST failed: {response.status_code}")
        return False

    # Step 4: Check for authentication cookie
    if '.ASPXAUTH' not in session.cookies:
        print("Login failed: No .ASPXAUTH cookie found")
        return False

    print("Login successful! .ASPXAUTH cookie set")

    # Step 5: Extract new VIEWSTATE from the response (if needed for next actions)
    new_viewstate, new_viewstategenerator = extract_viewstate(response.text)
    if new_viewstate:
        print("New VIEWSTATE extracted for next requests")

    return True

if __name__ == "__main__":
    success = login()
    if success:
        print("Login process completed successfully")
    else:
        print("Login failed")
        sys.exit(1)