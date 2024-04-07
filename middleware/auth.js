// Importing required modules and packages
require("dotenv").config();
var express = require("express");
const app = express();
var cookieParser = require("cookie-parser");
var jwt = require("jsonwebtoken");

// Initializing middleware
app.use(cookieParser());

// Authentication middleware function
const auth = (req, res, next) => {
  try {
    // Extracting token from Authorization header
    const token = req.headers["authorization"].split(" ")[1];
    console.log(req.headers["authorization"]);
    // Verifying user token
    const verifyUser = jwt.verify(token, process.env.JWT_KEY);
    next();
  } catch (err) {
    console.log(err);
    res.status(401).send("Try Logging in again");
  }
};

// Exporting authentication middleware for use in other modules
module.exports = auth;
