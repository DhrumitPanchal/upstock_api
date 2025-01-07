const axios = require("axios");

const marketQuote = async (req, res, token) => {
  const { instrument_key } = req.body;
  console.log("instrument_key is : " + instrument_key);
  // const accessToken = await loadTokens();
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
        Authorization: `Bearer ${token}`,
      };

      // Make the API call
      const response = await axios.get(url, { headers });

      // Extract the relevant data for the current key
      const Symbol = Object.keys(response?.data?.data)[0];
      const symbolData = response.data?.data?.[Symbol];

      if (symbolData) {
        results.push({
          instrument_key: key,
          symbol: Symbol,
          data: symbolData,
        });
      } else {
        results.push({
          instrument_key: key,
          error: "No data available for this instrument key",
        });
      }
    }
    const data = {
      open: results[0]?.data?.ohlc?.open,
      close: results[0]?.data?.ohlc?.close,
      high: results[0]?.data?.ohlc?.high,
      low: results[0]?.data?.ohlc?.low,
      volume: results[0]?.data?.volume,
      last_price: results[0]?.data?.last_price,
    };
    res.status(200).json({ results: data });
  } catch (error) {
    console.error("Error fetching market quotes:", error.message);
    res
      .status(500)
      .json({ error: "Error fetching market quotes", details: error.message });
  }
};

module.exports = { marketQuote };
