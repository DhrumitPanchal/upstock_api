const { initializeMarketStreamer } = require("./upstockStriming");

const stock_data_steaming = async (req, res, token) => {
  const { keys, socketId } = req.body; // Array of instrument keys passed from the app
  if (!keys || keys.length === 0) {
    return res.status(400).send("No instrument keys provided.");
  }

  if (!token) {
    return res.status(400).send("Access token not found.");
  }
  try {
    initializeMarketStreamer(keys, socketId, token);
    res.send("Market streamer for multiple stocks started.");
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { stock_data_steaming };
