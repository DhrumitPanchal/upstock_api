// const axios = require("axios");
// const UpstoxClient = require("upstox-js-sdk");
// const express = require("express");
// const cors = require("cors");
// const { Server } = require("socket.io");
// const http = require("http");
// const app = express();
// const env = require("dotenv");

// env.config();

// // Set up HTTP server and Socket.IO
// const server = http.createServer(app);
// const io = new Server(server);

// const client_id = process.env.CLIENT_ID;
// const redirect_uri = process.env.REDIRECT_URL;
// const client_secret = process.env.CLIENT_SECRETE;

// let accessToken =
//   "eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiIyTUNFVDUiLCJqdGkiOiI2NzZlNzU5Njk5NDFiOTFkODMxZWM2YzEiLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaWF0IjoxNzM1MjkyMzEwLCJpc3MiOiJ1ZGFwaS1nYXRld2F5LXNlcnZpY2UiLCJleHAiOjE3MzUzMzY4MDB9.huqzimixTJeFHwARLRHZ1WhDnyczZ8bSW51tA4VsqaQj"; // To store the access token
// let refreshToken = null; // To store the refresh token

// app.use(cors());
// app.use(express.json());

// // Refresh access token function
// const refreshAccessToken = async () => {
//   try {
//     if (!refreshToken) {
//       console.error("Refresh token not available.");
//       return;
//     }

//     const data = new URLSearchParams({
//       client_id,
//       client_secret,
//       redirect_uri,
//       grant_type: "refresh_token",
//       refresh_token: refreshToken,
//     });

//     const response = await axios.post(
//       "https://api.upstox.com/v2/login/authorization/token",
//       data.toString(),
//       {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//       }
//     );

//     const { access_token, refresh_token } = response.data;
//     accessToken = access_token;
//     refreshToken = refresh_token;

//     console.log("Access token refreshed successfully.");
//   } catch (error) {
//     console.error("Error refreshing access token:", error.message);
//   }
// };

// // Route to initialize authentication
// app.get("/auth-url", async (req, res) => {
//   const url = `https://api.upstox.com/v2/login/authorization/dialog?client_id=${client_id}&redirect_uri=${encodeURIComponent(
//     redirect_uri
//   )}&response_type=code`;

//   res.redirect(url);
// });

// // Callback route to exchange authorization code for tokens
// app.get("/", async (req, res) => {
//   const code = req.query.code;
//   if (!code) {
//     return res.status(400).send("Authorization code not found.");
//   }

//   const data = new URLSearchParams({
//     code,
//     client_id,
//     client_secret,
//     redirect_uri,
//     grant_type: "authorization_code",
//   });

//   try {
//     const response = await axios.post(
//       "https://api.upstox.com/v2/login/authorization/token",
//       data.toString(),
//       {
//         headers: {
//           "Content-Type": "application/x-www-form-urlencoded",
//         },
//       }
//     );

//     const { access_token, refresh_token } = response.data;
//     accessToken = access_token;
//     refreshToken = refresh_token;

//     console.log("Tokens obtained:", { accessToken, refreshToken });

//     res.json({ access_token, refresh_token });
//   } catch (error) {
//     console.error(
//       "Error exchanging authorization code for tokens:",
//       error.message
//     );
//     res.status(500).send("Error exchanging authorization code for tokens.");
//   }
// });

// // Real-time WebSocket integration with Upstox
// const initializeMarketStreamer = () => {
//   if (!accessToken) {
//     console.error("Access token not available.");
//     return;
//   }

//   const defaultClient = UpstoxClient.ApiClient.instance;
//   const OAUTH2 = defaultClient.authentications["OAUTH2"];
//   OAUTH2.accessToken = accessToken;

//   const streamer = new UpstoxClient.MarketDataStreamer();

//   streamer.connect();

//   // Handle WebSocket events
//   let subscribedKeys = new Set();

//   streamer.on("open", () => {
//     console.log("Connected to Upstox WebSocket.");

//     const keys = ["NSE_EQ|INE758E01017"];
//     keys.forEach((key) => {
//       if (!subscribedKeys.has(key)) {
//         subscribedKeys.add(key);
//         streamer.subscribe([key], "full");
//       }
//     });
//   });

//   streamer.on("message", (data) => {
//     const feed = data.toString("utf-8");
//     const objectData = JSON.parse(feed);

//     const timestampMs = Number(objectData?.currentTs);
//     const currentDate = new Date(timestampMs);
//     const currentMinute = currentDate.getMinutes();

//     // Emit data to connected clients
//     io.emit("stock-data", objectData);
//   });

//   streamer.on("close", () => {
//     console.log("WebSocket disconnected, reconnecting...");
//   });
// };

// // Endpoint to start market streamer
// app.get("/start-streamer", async (req, res) => {
//   if (!accessToken) {
//     return res.status(400).send("Access token not found.");
//   }

//   initializeMarketStreamer();
//   res.send("Market streamer started.");
// });

// const generateRandomData = () => {
//   // Check if there are any connected clients
//   if (io.engine.clientsCount === 0) {
//     console.log("No clients connected. Data generation paused.");
//     return;
//   }

//   setInterval(() => {
//     const randomStockData = {
//       data: {
//         price: (Math.random() * 1000).toFixed(2), // Random price between 0 and 1000
//         symbol: "TEST_SYMBOL",
//         timestamp: new Date().toISOString(),
//         volume: Math.floor(Math.random() * 1000),
//         open: Math.floor(Math.random() * 1000),
//         high: Math.floor(Math.random() * 1000),
//         low: Math.floor(Math.random() * 1000), // Random volume between 0 and 1000
//         close: Math.floor(Math.random() * 1000), // Random volume between 0 and 1000
//         flag: Math.floor(Math.random() * 1000), // Random volume between 0 and 1000
//       },
//       message: "Random stock data sent to clients.",
//     };

//     // Emit the data to all connected clients
//     io.emit("random-data", randomStockData);
//     console.log("Sent random data:", randomStockData); // For debugging
//   }, 20000);
// };

// // Route to generate random stock data for testing when market is closed
// app.get("/test-stock-data", (req, res) => {
//   console.log("Request to generate stock data");

//   // Check if there are connected clients before calling generateRandomData
//   if (io.engine.clientsCount > 0) {
//     generateRandomData();
//     res.send("Random stock data generation started.");
//   } else {
//     res.send("No clients connected. Cannot start random data generation.");
//   }
// });

// // Socket.IO connection handler
// io.on("connection", (socket) => {
//   console.log("Client connected:", socket.id);

//   socket.on("disconnect", () => {
//     console.log("Client disconnected:", socket.id);
//   });
// });

// // Refresh access token periodically
// setInterval(refreshAccessToken, 15 * 60 * 1000); // Refresh every 15 minutes

// server.listen(8000, () => {
//   console.log("Server is running on http://localhost:8000");
// });

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
const tokensFile = "./tokens.json"; // Path to store tokens

let accessToken = null;
let refreshToken = null;

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

    if (!access_token || !refresh_token) {
      return res.status(500).send("Tokens not received.");
    }

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
const initializeMarketStreamer = (keys) => {
  if (!accessToken) {
    console.error("Access token not available.");
    return;
  }

  const defaultClient = UpstoxClient.ApiClient.instance;
  const OAUTH2 = defaultClient.authentications["OAUTH2"];
  OAUTH2.accessToken = accessToken;

  const streamer = new UpstoxClient.MarketDataStreamer();

  streamer.connect();

  // Handle WebSocket events
  let subscribedKeys = new Set();

  streamer.on("open", () => {
    console.log("Connected to Upstox WebSocket.");

    keys.forEach((key) => {
      if (!subscribedKeys.has(key)) {
        subscribedKeys.add(key);
        streamer.subscribe([key], "full");
      }
    });
  });

  streamer.on("message", (data) => {
    const feed = data.toString("utf-8");
    const objectData = JSON.parse(feed);

    const timestampMs = Number(objectData?.currentTs);
    const currentDate = new Date(timestampMs);
    const currentMinute = currentDate.getMinutes();

    // Emit data to connected clients
    io.emit("stock-data", objectData);
  });

  streamer.on("close", () => {
    console.log("WebSocket disconnected, reconnecting...");
  });
};

// Endpoint to start market streamer for multiple stock keys
app.post("/start-multiple-stocks", async (req, res) => {
  const { keys } = req.body; // Array of instrument keys passed from the app
  if (!keys || keys.length === 0) {
    return res.status(400).send("No instrument keys provided.");
  }

  if (!accessToken) {
    return res.status(400).send("Access token not found.");
  }

  initializeMarketStreamer(keys);
  res.send("Market streamer for multiple stocks started.");
});

// Endpoint to start market streamer for a single stock key
app.post("/start-single-stock", async (req, res) => {
  const { key } = req.body; // Single instrument key passed from the app
  if (!key) {
    return res.status(400).send("No instrument key provided.");
  }

  if (!accessToken) {
    return res.status(400).send("Access token not found.");
  }

  initializeMarketStreamer([key]);
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
  console.log("Request to generate stock data");

  // Check if there are connected clients before calling generateRandomData
  if (io.engine.clientsCount > 0) {
    generateRandomData();
    res.send("Random stock data generation started.");
  } else {
    res.send("No clients connected. Cannot start random data generation.");
  }
});

// Refresh access token periodically
setInterval(refreshAccessToken, 15 * 60 * 1000); // Refresh every 15 minutes

// Load tokens on server start
loadTokens();

server.listen(8000, () => {
  console.log("Server is running on http://localhost:8000");
});
