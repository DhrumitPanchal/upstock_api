import time
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pyotp

# Initialize undetected_chromedriver
options = uc.ChromeOptions()
# options.add_argument('--no-sandbox')
options.add_argument('--disable-blink-features=AutomationControlled')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--headless=new')  # Use new headless mode for Chrome
options.add_argument('--disable-gpu')
options.add_argument('--start-maximized')
options.add_argument('--disable-extensions')

driver = uc.Chrome(use_subprocess=True)

# Open the URL
url = "https://api-v2.upstox.com/login/authorization/dialog?response_type=code&client_id=0daa59e7-9f62-4555-8fd0-6fbee8da3913&redirect_uri=https://www.unofficed.com/"
driver.get(url)

# Wait for the page to load
def wait_for_page_load(driver, timeout=30):
    WebDriverWait(driver, timeout).until(
        lambda d: d.execute_script('return document.readyState') == 'complete'
    )

wait_for_page_load(driver)

# Interact with the mobile number input 
# field
client_id = '9033505923'
username_input_xpath = '//*[@id="mobileNum"]'

WebDriverWait(driver, 30).until(
    EC.presence_of_element_located((By.XPATH, username_input_xpath))
)
username_input_element = driver.find_element(By.XPATH, username_input_xpath)
time.sleep(2)  # Add delay before typing
username_input_element.clear()
username_input_element.send_keys(client_id)

# Click on the Get OTP button
get_otp_button_xpath = '//*[@id="getOtp"]'
get_otp_button_element = driver.find_element(By.XPATH, get_otp_button_xpath)
get_otp_button_element.click()

# Add a delay to handle OTP submission
time.sleep(5)


# Generate OTP using pyotp
client_pass = 'ETOB3H3RMJ5RQVEFR46D644G2FBARGUL'  # Replace with your TOTP secret
otp = pyotp.TOTP(client_pass).now()

# Wait for the OTP input field and enter OTP
otp_field_xpath = '//*[@id="otpNum"]'
WebDriverWait(driver, 30).until(EC.visibility_of_element_located((By.XPATH, otp_field_xpath)))
otp_field_element = driver.find_element(By.XPATH, otp_field_xpath)
otp_field_element.clear()
otp_field_element.send_keys(otp)

# Click Continue after entering OTP
continue_button_xpath = '//*[@id="continueBtn"]'
continue_button_element = driver.find_element(By.XPATH, continue_button_xpath)
continue_button_element.click()

# Enter PIN
client_pin = "903350"  # Replace with the actual client pin
pin_input_xpath = '//*[@id="pinCode"]'
WebDriverWait(driver, 30).until(EC.visibility_of_element_located((By.XPATH, pin_input_xpath)))
pin_input_element = driver.find_element(By.XPATH, pin_input_xpath)
pin_input_element.clear()
pin_input_element.send_keys(client_pin)

# Click Continue after PIN entry
pin_continue_button_xpath = '//*[@id="pinContinueBtn"]'
pin_continue_button_element = driver.find_element(By.XPATH, pin_continue_button_xpath)
pin_continue_button_element.click()

# Wait for the URL to change
original_url = driver.current_url
WebDriverWait(driver, 30).until(EC.url_changes(original_url))

# Get the redirected URL
redirected_url = driver.current_url
redirected_code = redirected_url.split("?code=")[1]
print("Redirected Code:", redirected_code)

# Close the driver
driver.quit()
