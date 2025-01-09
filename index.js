const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const fs = require("fs");
const env = require("dotenv");
const { authUrl, getCode } = require("./controllers/authentication");
const { marketQuote } = require("./controllers/marketquote");
const Initial_Streaming = require("./controllers/initial_Streaming");
const streaming_user_specific = require("./controllers/userSpecificStreaming");
const CircularJSON = require("circular-json");
env.config();
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server); // Main Socket.IO instance
const port = process.env.PORT || 3000;

const tokensFile = "./tokens.json";
let accessToken = null;

// Load tokens from file
const loadTokens = () => {
  if (fs.existsSync(tokensFile)) {
    const tokensData = JSON.parse(fs.readFileSync(tokensFile, "utf8"));
    accessToken = tokensData.accessToken;
    console.log("Tokens loaded from file.");
  }
};

// Setup streaming namespace
Initial_Streaming(io);
streaming_user_specific(io);

// Express routes
app.get("/status", (req, res) => {
  res.status(200).send("<h2>API is running...</h2>");
});

app.get("/auth-url", authUrl);

app.get("/", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("Authorization code not found.");
  }
  try {
    accessToken = await getCode(req, res);
    console.log("Access token returned");
    return res.status(200).send(CircularJSON.stringify({ accessToken }));
  } catch (error) {
    console.error("Error obtaining access token:", error.message);
    return res.status(500).json({ error: "Failed to obtain access token" });
  }
});

app.post("/market-quote", (req, res) => marketQuote(req, res, accessToken));

// Start the server
loadTokens();
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
