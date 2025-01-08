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
let activeUsers = new Map(); // Map to track active users and their keys
let retryCount = 0;
const MAX_RETRIES = 5;

const checkToken = async () => {
  try {
    const res = await axios.post(`${redirectUrl}market-quote`, {
      instrument_key: "NSE_EQ|INE081A01020",
    });
    return true; // Token is valid
  } catch (error) {
    console.error("Token is invalid or expired:", error.message);
    return false; // Token is invalid
  }
};

// Initialize Market Streamer
const initializeMarketStreamer = async (streamingNamespace) => {
  console.log("Initializing Market Streamer");
  const isTokenValid = await checkToken();
  if (!isTokenValid) {
    // If token is invalid, send a message to the user and do not connect to Upstox
    streamingNamespace.emit("error", "Token is expired or invalid.");
    return;
  }

  if (!streamer) {
    const defaultClient = UpstoxClient.ApiClient.instance;
    const OAUTH2 = defaultClient.authentications["OAUTH2"];
    OAUTH2.accessToken = accessToken;

    streamer = new UpstoxClient.MarketDataStreamer();

    streamer.on("open", () => {
      console.log("Connected to Upstox WebSocket for User specific streaming");
      // When connection is open, subscribe to active users' keys
      activeUsers.forEach((keys, socketId) => {
        keys?.map((item) => {
          // console.log([item]);
          streamer.subscribe([item], "full");
          console.log(`Subscribed to keys for user ${socketId}: ${keys}`);
        });
      });
    });

    streamer.on("message", (data) => {
      try {
        const feed = data.toString("utf-8");
        const objectData = JSON.parse(feed);
        // const key = objectData.instrumentKey;
        // console.log("streaming data ");
        // console.log(objectData);
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
          try {
            streamer.connect();
          } catch (retryError) {
            console.error("Retry error:", retryError.message);
          }
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
          try {
            streamer.connect();
          } catch (reconnectError) {
            console.error("Reconnect error:", reconnectError.message);
          }
        }, 5000);
      } else {
        console.error("Maximum retries reached. Connection failed.");
      }
    });

    streamer.connect();
  }
};

const stopMarketStreamer = () => {
  if (streamer) {
    streamer.disconnect();
    streamer = null;
    console.log("Streamer stopped as no users are connected.");
  }
};

const streaming_user_specific = (io) => {
  const streamingNamespace = io.of("/streaming_user_specific");

  streamingNamespace.on("connection", (socket) => {
    console.log(`User connected to User-specific streaming: ${socket.id}`);

    // Handle subscriptions
    // Handle subscriptions
    socket.on("subscribe", (keys) => {
      if (Array.isArray(keys)) {
        console.log(`User ${socket.id} subscribed to keys: ${keys}`);
        activeUsers.set(socket.id, keys);

        // Start the streamer if this is the first user
        if (activeUsers.size === 1) {
          initializeMarketStreamer(streamingNamespace);
        }

        // Ensure the streamer is initialized before modifying subscriptions
        if (streamer) {
          // Ensure subscriptions object exists
          if (!streamer.subscriptions) {
            streamer.subscriptions = {}; // Initialize subscriptions if not already done
          }
          // Ensure the mode-specific subscription set exists
          if (!streamer.subscriptions["user"]) {
            streamer.subscriptions["user"] = new Set(); // Initialize as a Set
          }

          const currentKeys = streamer.subscriptions["user"];
          keys.forEach((key) => {
            currentKeys.add(key); // Add new keys to the subscription set
          });

          // Subscribe to the updated keys
          try {
            streamer.subscribe(Array.from(currentKeys), "full"); // Convert Set to Array for subscription
            console.log(
              `Subscribed to new keys for user ${socket.id}: ${keys}`
            );
          } catch (err) {
            console.error(
              `Error subscribing user ${socket.id}: ${err.message}`
            );
          }
        } else {
          console.error("Streamer is not initialized. Subscription failed.");
        }
      } else {
        console.error(`Invalid subscription keys from ${socket.id}`);
      }
    });

    // Handle unsubscribes
    socket.on("unsubscribe", () => {
      console.log(`User ${socket.id} unsubscribed`);
      activeUsers.delete(socket.id);

      // Stop the streamer if no users are connected
      if (activeUsers.size === 0) {
        stopMarketStreamer();
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      activeUsers.delete(socket.id);

      // Stop the streamer if no users are connected
      if (activeUsers.size === 0) {
        stopMarketStreamer();
      }
    });
  });

  return streamingNamespace;
};

module.exports = streaming_user_specific;
