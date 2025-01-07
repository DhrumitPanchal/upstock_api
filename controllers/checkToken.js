// Function to check if the token is valid
const checkToken = async () => {
  try {
    const res = await axios.post(`${redirectUrl}market-quote`, {
      instrument_key: "NSE_EQ|INE081A01020",
    });
    console.log(res.data);
    return true; // Token is valid
  } catch (error) {
    console.error("Token is invalid or expired:", error.message);
    return false; // Token is invalid
  }
};

module.exports = { checkToken };
