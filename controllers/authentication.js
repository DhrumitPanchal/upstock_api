const env = require("dotenv");
let accessToken = require("../index");
const fs = require("fs");
const axios = require("axios");
const tokensFile = "./tokens.json"; // Path to store tokens controllers

env.config();

const client_id = process.env.CLIENT_ID;
const redirect_uri = process.env.REDIRECT_URL;
const client_secret = process.env.CLIENT_SECRETE;

const authUrl = async (req, res) => {
  const url = `https://api.upstox.com/v2/login/authorization/dialog?client_id=${client_id}&redirect_uri=${encodeURIComponent(
    redirect_uri
  )}&response_type=code`;

  res.redirect(url);
};

const saveTokens = (token) => {
  let tokensData = { accessToken: token };
  fs.writeFileSync(tokensFile, JSON.stringify(tokensData), "utf8");
  console.log("Tokens saved to file.");
};

const getCode = async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("Authorization code not found.");
  }

  const data = new URLSearchParams({
    code,
    client_id,
    client_secret,
    redirect_uri,
    grant_type: "authorization_code",
  });

  try {
    const response = await axios.post(
      "https://api.upstox.com/v2/login/authorization/token",
      data.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    let { access_token } = response.data;

    if (!access_token) {
      return res.status(500).send("Tokens not received.");
    }
    console.log(access_token);
    accessToken = access_token;

    // Save the tokens to file
    saveTokens(access_token);

    console.log("Tokens obtained:", { accessToken });
    return accessToken;
  } catch (error) {
    console.error(
      "Error exchanging authorization code for tokens:",
      error.message
    );
    res.status(500).send("Error exchanging authorization code for tokens.");
  }
};

module.exports = { authUrl, getCode };
