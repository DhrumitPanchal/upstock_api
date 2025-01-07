"use strict";

class MarketDataStreamer {
  constructor(webSocketUrl, instrumentKeys = [], mode = "ltpc") {
    this.webSocketUrl = webSocketUrl;
    this.instrumentKeys = instrumentKeys;
    this.mode = mode;

    // Enum for modes
    this.Mode = Object.freeze({
      LTPC: "ltpc",
      FULL: "full",
    });

    this.subscriptions = {
      [this.Mode.LTPC]: new Set(),
      [this.Mode.FULL]: new Set(),
    };

    // Add initial subscriptions if provided
    instrumentKeys.forEach((key) => this.subscriptions[mode].add(key));
    this.socket = null;
  }

  // Connect to the WebSocket server
  connect() {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.webSocketUrl);

      this.socket.onopen = () => {
        console.log("WebSocket connection established.");
        this._resubscribeAll();
        resolve();
      };

      this.socket.onmessage = (event) => {
        console.log("Received message:", event.data);
      };

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };

      this.socket.onclose = () => {
        console.log("WebSocket connection closed.");
      };
    });
  }

  // Disconnect from the WebSocket server
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this._clearSubscriptions();
    }
  }

  // Subscribe to instruments
  subscribe(instrumentKeys, mode) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("Cannot subscribe: WebSocket not connected.");
      return;
    }

    const payload = {
      action: "subscribe",
      mode,
      instruments: instrumentKeys,
    };

    this.socket.send(JSON.stringify(payload));
    this.subscriptions[mode] = new Set([
      ...this.subscriptions[mode],
      ...instrumentKeys,
    ]);

    console.log(`Subscribed to instruments: ${instrumentKeys.join(", ")}`);
  }

  // Unsubscribe from instruments
  unsubscribe(instrumentKeys) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("Cannot unsubscribe: WebSocket not connected.");
      return;
    }

    const payload = {
      action: "unsubscribe",
      instruments: instrumentKeys,
    };

    this.socket.send(JSON.stringify(payload));
    Object.values(this.subscriptions).forEach((set) => {
      instrumentKeys.forEach((key) => set.delete(key));
    });

    console.log(`Unsubscribed from instruments: ${instrumentKeys.join(", ")}`);
  }

  // Change subscription mode for instruments
  changeMode(instrumentKeys, newMode) {
    const oldMode =
      newMode === this.Mode.LTPC ? this.Mode.FULL : this.Mode.LTPC;

    this.unsubscribe(instrumentKeys);
    this.subscribe(instrumentKeys, newMode);

    console.log(
      `Changed mode for instruments: ${instrumentKeys.join(", ")} to ${newMode}`
    );
  }

  // Resubscribe all instruments after reconnecting
  _resubscribeAll() {
    Object.entries(this.subscriptions).forEach(([mode, keys]) => {
      if (keys.size > 0) {
        this.subscribe(Array.from(keys), mode);
      }
    });
  }

  // Clear all subscriptions
  _clearSubscriptions() {
    this.subscriptions[this.Mode.LTPC].clear();
    this.subscriptions[this.Mode.FULL].clear();
  }
}

// Example usage:
(async () => {
  const streamer = new MarketDataStreamer(
    "wss://example.com/marketdata",
    ["AAPL", "GOOG"],
    "ltpc"
  );

  await streamer.connect();
  streamer.subscribe(["MSFT"], "full");
  streamer.changeMode(["AAPL"], "full");
  streamer.unsubscribe(["GOOG"]);
  streamer.disconnect();
})();
