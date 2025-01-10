const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();
const id = process.env.TOKEN_ID;
const backendUrl = process.env.SERVER_URL;

const getToken = async () => {
  try {
    const response = await axios.post(`${backendUrl}/get-upstock-token`, {
      id,
    });
    console.log("token loaded successfully");
    return response.data.token;
  } catch (error) {
    console.error("Error fetching token:", error.message);
  }
};

module.exports = {
  getToken,
};
