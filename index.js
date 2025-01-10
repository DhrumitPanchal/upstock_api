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
env.config();
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server); // Main Socket.IO instance
const port = process.env.PORT || 3000;

// Setup streaming namespace
Initial_Streaming(io);
streaming_user_specific(io);

// Express routes
app.get("/status", (req, res) => {
  res.status(200).send("<h2>API is running...</h2>");
});

app.get("/auth-url", authUrl);

app.get("/", getCode);

app.post("/market-quote", (req, res) => marketQuote(req, res));

// Start the server
loadTokens();
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
