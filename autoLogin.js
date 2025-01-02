const { Builder, By, until } = require("selenium-webdriver");
const { totp } = require("otplib");
const fs = require("fs");
async function loginToUpstox() {
  // Configure WebDriver
  const driver = await new Builder().forBrowser("chrome").build();

  try {
    // URL for Upstox login
    const url =
      "https://api-v2.upstox.com/login/authorization/dialog?response_type=code&client_id=0daa59e7-9f62-4555-8fd0-6fbee8da3913&redirect_uri=https://www.unofficed.com/";
    await driver.get(url);

    // Wait for page load
    await driver.wait(async () => {
      const readyState = await driver.executeScript(
        "return document.readyState"
      );
      return readyState === "complete";
    }, 30000);

    // Enter client ID
    const clientId = "9725398019";
    const usernameInputXPath = '//*[@id="mobileNum"]';
    const usernameInputElement = await driver.findElement(
      By.xpath(usernameInputXPath)
    );
    await usernameInputElement.clear();
    await usernameInputElement.sendKeys(clientId);

    // Click "Get OTP" button
    const getOtpButtonXPath = '//*[@id="getOtp"]';
    const getOtpButtonElement = await driver.findElement(
      By.xpath(getOtpButtonXPath)
    );
    await getOtpButtonElement.click();

    // Generate OTP using TOTP
    const clientPass = "2Y7NW7SMVYKTTNLO3AKPDN4SZGGWV75Z";
    const otp = totp.generate(clientPass);

    // Enter OTP
    const continueButtonXPath = '//*[@id="continueBtn"]';
    const continueButtonElement = await driver.wait(
      until.elementLocated(By.xpath(continueButtonXPath)),
      15000
    );

    // Ensure the button is displayed and enabled
    const buttonText = await continueButtonElement.getText();

    if (buttonText === "Continue") {
      console.log("Continue button is visible, proceeding with OTP input.");

      // Wait for OTP input field to appear

      await driver.takeScreenshot().then((image, err) => {
        fs.writeFileSync("screenshot.png", image, "base64");
      });

      const otpInputXPath = '//*[@id="otpNum"]';
      const otpInputElement = await driver.wait(
        until.elementLocated(By.xpath(otpInputXPath)),
        10000
      );

      // Generate OTP using TOTP
      const clientPass = "2Y7NW7SMVYKTTNLO3AKPDN4SZGGWV75Z"; // Replace with actual secret key
      const otp = totp(clientPass);

      // Enter the OTP in the input field
      await otpInputElement.clear();
      await otpInputElement.sendKeys(otp);

      // Click the "Continue" button
      await continueButtonElement.click();
      console.log("OTP entered and submitted successfully!");
    } else {
      console.error("Continue button not found or not ready.");
    }

    const passwordInputXPath = '//*[@id="otpNum"]';
    // const passwordInputElement = await driver.findElement(
    //   By.xpath(passwordInputXPath)
    // );
    const passwordInputElement = await driver.findElement(
      By.xpath(passwordInputXPath)
    );
    await passwordInputElement.clear();
    await passwordInputElement.sendKeys(otp);

    // // Click "Continue" button
    // const continueButtonXPath = '//*[@id="continueBtn"]';
    // const continueButtonElement = await driver.findElement(
    //   By.xpath(continueButtonXPath)
    // );
    // await continueButtonElement.click();

    // // Enter client PIN
    // const clientPin = "903350"; // Replace with the actual client PIN
    // const pinInputXPath = '//*[@id="pinCode"]';
    // const pinInputElement = await driver.findElement(By.xpath(pinInputXPath));
    // await pinInputElement.clear();
    // await pinInputElement.sendKeys(clientPin);

    // // Click "Continue" button after PIN entry
    // const pinContinueButtonXPath = '//*[@id="pinContinueBtn"]';
    // const pinContinueButtonElement = await driver.findElement(
    //   By.xpath(pinContinueButtonXPath)
    // );
    // await pinContinueButtonElement.click();

    // // Wait for URL to change and retrieve the redirected URL
    // const originalUrl = await driver.getCurrentUrl();
    // await driver.wait(until.urlIs(originalUrl), 30000);

    // const redirectedUrl = await driver.getCurrentUrl();
    // const token = redirectedUrl.split("?code=")[1];

    // console.log("Retrieved token:", token);
    // return token;
  } catch (error) {
    console.error("Error during login:", error);
    throw error;
  } finally {
    // Close the browser
    await driver.quit();
  }
}

// Example usage
loginToUpstox()
  .then((token) => {
    console.log("Token:", token);
  })
  .catch((err) => {
    console.error("Failed to retrieve token:", err);
  });
