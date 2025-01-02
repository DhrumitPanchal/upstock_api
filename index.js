const axios = require("axios");
const UpstoxClient = require("upstox-js-sdk");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const fs = require("fs");
const app = express();
const env = require("dotenv");

env.config();

// Set up HTTP server and Socket.IO
const server = http.createServer(app);
const io = new Server(server);

const client_id = process.env.CLIENT_ID;
const redirect_uri = process.env.REDIRECT_URL;
const client_secret = process.env.CLIENT_SECRETE;
const port = process.env.PORT;
const tokensFile = "./tokens.json"; // Path to store tokens

let accessToken = null;
let refreshToken = null;
let reConnect = 0;

// Read tokens from file if they exist
const loadTokens = () => {
  if (fs.existsSync(tokensFile)) {
    const tokensData = JSON.parse(fs.readFileSync(tokensFile, "utf8"));
    accessToken = tokensData.accessToken;
    refreshToken = tokensData.refreshToken;
    console.log("Tokens loaded from file.");
  }
};

// Write tokens to file
const saveTokens = () => {
  const tokensData = { accessToken, refreshToken };
  fs.writeFileSync(tokensFile, JSON.stringify(tokensData), "utf8");
  console.log("Tokens saved to file.");
};

// Refresh access token function
const refreshAccessToken = async () => {
  try {
    if (!refreshToken) {
      console.error("Refresh token not available.");
      return;
    }

    const data = new URLSearchParams({
      client_id,
      client_secret,
      redirect_uri,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await axios.post(
      "https://api.upstox.com/v2/login/authorization/token",
      data.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token } = response.data;
    accessToken = access_token;
    refreshToken = refresh_token;

    // Save the new tokens to file
    saveTokens();

    console.log("Access token refreshed successfully.");
  } catch (error) {
    console.error("Error refreshing access token:", error.message);
  }
};

app.use(express.json());
// Route to initialize authentication
app.get("/auth-url", async (req, res) => {
  const url = `https://api.upstox.com/v2/login/authorization/dialog?client_id=${client_id}&redirect_uri=${encodeURIComponent(
    redirect_uri
  )}&response_type=code`;

  res.redirect(url);
});

// Callback route to exchange authorization code for tokens
// Callback route to exchange authorization code for tokens
app.get("/", async (req, res) => {
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

    const { access_token, refresh_token } = response.data;

    if (!access_token) {
      return res.status(500).send("Tokens not received.");
    }
    console.log(access_token);
    accessToken = access_token;
    refreshToken = refresh_token;

    // Save the tokens to file
    saveTokens();

    console.log("Tokens obtained:", { accessToken, refreshToken });

    res.json({ access_token, refresh_token });
  } catch (error) {
    console.error(
      "Error exchanging authorization code for tokens:",
      error.message
    );
    res.status(500).send("Error exchanging authorization code for tokens.");
  }
});

// Real-time WebSocket integration with Upstox
const initializeMarketStreamer = (keys, socketId) => {
  try {
    if (!accessToken) {
      console.error("Access token not available.");
      return;
    }

    const defaultClient = UpstoxClient.ApiClient.instance;
    const OAUTH2 = defaultClient.authentications["OAUTH2"];
    OAUTH2.accessToken = accessToken;
    const streamer = new UpstoxClient.MarketDataStreamer();

    // Add error listener to handle connection errors
    streamer.on("error", (error) => {
      console.error("MarketDataStreamer error:", error.message);

      // Retry connection if an error occurs
      setTimeout(() => {
        console.log("Retrying connection...");
        try {
          streamer.connect();
        } catch (retryError) {
          console.error("Error while retrying connection:", retryError.message);
        }
      }, 5000); // Retry after 5 seconds
    });

    streamer.connect();

    // Handle WebSocket events
    let subscribedKeys = new Set();
    let latestData = null; // Store the latest data
    let lastEmitTime = 0; // Track the last emit time

    streamer.on("open", () => {
      console.log("Connected to Upstox WebSocket.");
      console.log("Subscribing to symbols:", keys);

      // Subscribe to keys safely
      try {
        keys.forEach((key) => {
          if (!subscribedKeys.has(key)) {
            subscribedKeys.add(key);
            streamer.subscribe([key], "full");
          }
        });
      } catch (subscribeError) {
        console.error("Error subscribing to symbols:", subscribeError.message);
      }
    });

    streamer.on("message", (data) => {
      try {
        const feed = data.toString("utf-8");
        const objectData = JSON.parse(feed);

        // Store the latest data received
        latestData = objectData;

        const currentTimestamp = Date.now();
        // Check if 5 seconds have passed since the last emit

        lastEmitTime = currentTimestamp;
        io.to(socketId).emit("stock-data", latestData); // Emit the latest data
      } catch (messageError) {
        console.error("Error processing message data:", messageError.message);
      }
    });

    streamer.on("close", () => {
      console.warn("WebSocket disconnected, attempting to reconnect...");
     if(reConnect > 5){
      setTimeout(() => {
        try {
          streamer.connect();
        } catch (reconnectError) {
          reConnect += 1;
          console.error("Error while reconnecting:", reconnectError.message);
        }
      }, 5000);
     } // Reconnect after 5 seconds
    });

    // Catch unexpected exceptions during runtime
    process.on("uncaughtException", (err) => {
      console.error("Uncaught exception:", err.message);
      // Optionally log the stack trace or restart the server
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled promise rejection:", reason);
      // Optionally log and handle cleanup tasks
    });
  } catch (error) {
    console.error("Error initializing MarketDataStreamer:", error.message);
  }
};

// Endpoint to start market streamer for multiple stock keys
app.post("/start-multiple-stocks", async (req, res) => {
  const { keys, socketId } = req.body; // Array of instrument keys passed from the app
  if (!keys || keys.length === 0) {
    return res.status(400).send("No instrument keys provided.");
  }

  if (!accessToken) {
    return res.status(400).send("Access token not found.");
  }
  try {
    initializeMarketStreamer(keys, socketId);
    res.send("Market streamer for multiple stocks started.");
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/apistatus", (req, res) => {
  res.status(200).send("<h2>Api is running...</h2>");
});

// Endpoint to start market streamer for a single stock key
app.post("/start-single-stock", async (req, res) => {
  const { key, socketId } = await req.body; // Single instrument key passed from the app
  console.log("single stock straming -------------------------");
  console.log(key, socketId);
  if (!key) {
    return res.status(400).send("No instrument key provided.");
  }

  if (!accessToken) {
    return res.status(400).send("Access token not found.");
  }

  initializeMarketStreamer([key], socketId);
  res.send(`Market streamer for stock ${key} started.`);
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const generateRandomData = () => {
  // Check if there are any connected clients
  if (io.engine.clientsCount === 0) {
    console.log("No clients connected. Data generation paused.");
    return;
  }

  setInterval(() => {
    const randomStockData = {
      data: {
        price: (Math.random() * 1000).toFixed(2), // Random price between 0 and 1000
        symbol: "TEST_SYMBOL",
        timestamp: new Date().toISOString(),
        volume: Math.floor(Math.random() * 1000),
        open: Math.floor(Math.random() * 1000),
        high: Math.floor(Math.random() * 1000),
        low: Math.floor(Math.random() * 1000), // Random volume between 0 and 1000
        close: Math.floor(Math.random() * 1000), // Random volume between 0 and 1000
        flag: Math.floor(Math.random() * 1000), // Random volume between 0 and 1000
      },
      message: "Random stock data sent to clients.",
    };

    // Emit the data to all connected clients
    io.emit("random-data", randomStockData);
    console.log("Sent random data:", randomStockData); // For debugging
  }, 10000);
};

app.get("/test-stock-data", (req, res) => {
  // Check if there are connected clients before calling generateRandomData
  if (io.engine.clientsCount > 0) {
    generateRandomData();
    res.send("Random stock data generation started.");
  } else {
    res.send("No clients connected. Cannot start random data generation.");
  }
});

app.post("/market-quote", async (req, res) => {
  const { instrument_key } = req.body;

  if (
    !instrument_key ||
    (Array.isArray(instrument_key) && instrument_key.length === 0)
  ) {
    return res.status(400).json({ error: "Instrument key(s) is required" });
  }

  try {
    const keys = Array.isArray(instrument_key)
      ? instrument_key
      : [instrument_key]; // Ensure it's an array
    const results = [];

    for (const key of keys) {
      const url = `https://api.upstox.com/v2/market-quote/quotes?instrument_key=${encodeURIComponent(
        key
      )}`;

      // Set request headers
      const headers = {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      // Make the API call
      const response = await axios.get(url, { headers });
      let Symbol = Object.keys(response?.data?.data);
      // Extract the relevant data for the current key
      const symbolData = response.data?.data?.[Symbol];

      if (symbolData) {
        const extractedData = {
          upperCircuit: symbolData?.upper_circuit_limit,
          lowerCircuit: symbolData?.lower_circuit_limit,
          volume: symbolData?.volume,
          open: symbolData?.ohlc?.open,
          high: symbolData?.ohlc?.high,
          low: symbolData?.ohlc?.low,
          close: symbolData?.ohlc?.close,
          net_change: symbolData?.net_change,
        };
        results.push({ key, data: extractedData });
      } else {
        results.push({ key, error: "No data available for this key" });
      }
    }

    // Send the aggregated response back to the client
    res.json(results);
  } catch (error) {
    // Handle errors
    console.error("Error fetching market quotes:", error.message);
    res.status(500).json({
      error: "Failed to fetch market quotes",
      details: error.message,
    });
  }
});

// Refresh access token periodically
setInterval(refreshAccessToken, 15 * 60 * 1000); // Refresh every 15 minutes

// Load tokens on server start
loadTokens();

server.listen(port, () => {
  console.log("Server is running on http://localhost:" + port);
});
