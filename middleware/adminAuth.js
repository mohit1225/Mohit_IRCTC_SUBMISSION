// Importing required modules
require("dotenv").config();
var express = require("express");
const app = express();
var cookieParser = require("cookie-parser");

// Using cookie-parser middleware
app.use(cookieParser());

// Middleware function for admin authentication
const adminAuth = (req, res, next) => {
  try {
    // Retrieving API key from request headers
    const receivedKey = req.headers["api-key"];
    
    // Checking if API key matches with the stored API key
    if (receivedKey && receivedKey === process.env.APIKEY) {
      // Proceeding to the next middleware if authentication succeeds
      next();
    } else {
      // Sending 401 status with error message for unauthorized access
      res.status(401).json({ error: "Unauthorized access" });
    }
  } catch (err) {
    // Handling any errors occurred during authentication
    console.log(err);
    res.status(401).send("Error in Logging");
  }
};

// Exporting adminAuth middleware for use in other modules
module.exports = adminAuth;
