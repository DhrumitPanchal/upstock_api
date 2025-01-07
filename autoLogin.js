const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

async function loginToUpstox() {
  const bravePath =
    "C:\\Users\\pooja\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
  const options = new chrome.Options()
    .setChromeBinaryPath(bravePath)
    .addArguments(
      "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox" // Added this argument
    );

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    const url =
      "https://api-v2.upstox.com/login/authorization/dialog?response_type=code&client_id=0daa59e7-9f62-4555-8fd0-6fbee8da3913&redirect_uri=https://www.unofficed.com/";
    await driver.get(url);

    // Remove WebDriver flag
    await driver.executeScript(
      "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
    );

    await driver.sleep(3000); // Wait for the page to load

    // Enter mobile number
    const clientId = "9725398019";
    const usernameInputXPath = '//*[@id="mobileNum"]';
    const usernameInputElement = await driver.findElement(
      By.xpath(usernameInputXPath)
    );
    await usernameInputElement.clear();
    await usernameInputElement.sendKeys(clientId);

    // Click "Get OTP"
    const getOtpButtonXPath = '//*[@id="getOtp"]';
    const getOtpButtonElement = await driver.findElement(
      By.xpath(getOtpButtonXPath)
    );
    await getOtpButtonElement.click();

    // Wait for "Continue" button
    const continueButtonXPath = '//*[@id="continueBtn"]';
    const continueButtonElement = await driver.wait(
      until.elementLocated(By.xpath(continueButtonXPath)),
      15000 // Increase timeout to 15 seconds
    );

    // Add another wait to ensure the element is interactable
    await driver.wait(until.elementIsEnabled(continueButtonElement), 5000);

    await continueButtonElement.click();

    console.log("Login process continued successfully!");
  } catch (error) {
    console.error("Error during login:", error);
  } finally {
    await driver.quit();
  }
}

loginToUpstox();
