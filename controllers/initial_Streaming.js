const { Server } = require("socket.io");
const UpstoxClient = require("upstox-js-sdk");
const fs = require("fs");
const axios = require("axios");
const env = require("dotenv");

env.config();
const redirectUrl = process.env.REDIRECT_URL;

let accessToken = null;
const tokensFile = "./tokens.json";

// Load tokens from file
const loadTokens = () => {
  if (fs.existsSync(tokensFile)) {
    const tokensData = JSON.parse(fs.readFileSync(tokensFile, "utf8"));
    accessToken = tokensData.accessToken;
    console.log("Tokens loaded from file.");
  }
};
loadTokens();

let streamer = null;
let retryCount = 0;
const MAX_RETRIES = 5;
let latestStockData = {}; // Cache for the latest stock data

// Function to check if the token is valid
const checkToken = async () => {
  try {
    await axios.post(`${redirectUrl}market-quote`, {
      instrument_key: "NSE_EQ|INE081A01020",
    });
    return true; // Token is valid
  } catch (error) {
    console.error("Token is invalid or expired:", error.message);
    return false; // Token is invalid
  }
};

// Initialize the market streamer
const initializeMarketStreamer = async (streamingNamespace) => {
  console.log("Initializing Market Streamer");

  const isTokenValid = await checkToken();
  if (!isTokenValid) {
    streamingNamespace.emit("error", "Token is expired or invalid.");
    return;
  }

  if (!streamer) {
    const defaultClient = UpstoxClient.ApiClient.instance;
    const OAUTH2 = defaultClient.authentications["OAUTH2"];
    OAUTH2.accessToken = accessToken;

    streamer = new UpstoxClient.MarketDataStreamer();

    streamer.on("open", () => {
      console.log("Connected to Upstox WebSocket");
      const keys = [
        "NSE_INDEX|Nifty 50",
        "NSE_INDEX|Nifty Bank",
        "NSE_INDEX|Nifty Fin Service",
        "BSE_INDEX|SENSEX",
        "NSE_INDEX|NIFTY MID SELECT",
        "NSE_INDEX|India VIX",
        "NSE_INDEX|NIFTY TOTAL MKT",
        "NSE_INDEX|Nifty Next 50",
        "NSE_INDEX|Nifty 100",
        "NSE_EQ|INE669E01016",
        "NSE_EQ|INE081A01020",
        "NSE_EQ|INE335Y01020",
        "NSE_EQ|INE758T01015",
      ];
      keys.forEach((key) => streamer.subscribe([key], "full"));
    });

    streamer.on("message", (data) => {
      try {
        const feed = data.toString("utf-8");
        const objectData = JSON.parse(feed);

        latestStockData = objectData;

        // Emit stock data to all connected users in the namespace
        streamingNamespace.emit("stock-data", objectData);
      } catch (err) {
        console.error("Error processing message:", err.message);
      }
    });

    streamer.on("error", (error) => {
      console.error("Streamer error:", error.message);
      if (retryCount < MAX_RETRIES) {
        retryCount++;
        setTimeout(() => {
          handleReconnect();
        }, 5000);
      } else {
        console.error(
          "Maximum retries reached. Stopping reconnection attempts."
        );
      }
    });

    streamer.on("close", () => {
      console.warn("WebSocket disconnected");
      if (retryCount < MAX_RETRIES) {
        setTimeout(() => {
          handleReconnect();
        }, 5000);
      } else {
        console.error("Maximum retries reached. Connection failed.");
      }
    });

    streamer.connect();
  }
};

// Handle reconnection and token refresh
const handleReconnect = () => {
  console.log("Attempting to reconnect...");
  try {
    streamer.connect();
  } catch (error) {
    console.error("Reconnect error:", error.message);
  }
};

// Stop the streamer
const stopMarketStreamer = () => {
  if (streamer) {
    streamer.disconnect();
    streamer = null;
    console.log("Streamer stopped as no users are connected.");
  }
};

// Initial streaming setup
const Initial_Streaming = (io) => {
  const streamingNamespace = io.of("/streaming");

  streamingNamespace.on("connection", (socket) => {
    console.log(`User connected to Initial streaming: ${socket.id}`);

    if (Object.keys(latestStockData).length > 0) {
      socket.emit("stock-data", latestStockData);
    } else {
      socket.emit("info", "No data available yet. Waiting for updates...");
    }
    // Start the streamer if this is the first user
    if (streamingNamespace.sockets.size === 1) {
      initializeMarketStreamer(streamingNamespace);
    }

    socket.on("disconnect", () => {
      console.log(`User disconnected from streaming: ${socket.id}`);

      // Stop the streamer if no users are connected
      if (streamingNamespace.sockets.size === 0) {
        stopMarketStreamer();
      }
    });
  });

  return streamingNamespace;
};

module.exports = Initial_Streaming;
