var dotenv = require("dotenv");
dotenv.config();
var express = require("express");
const app = express();
var cors = require("cors");

const apiRoute = require("./controller/restController");
const { testConnection } = require("./connector/connection");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

testConnection();

app.get("/", async (req, res) => {
  res.send("Welcome To IRCTC!!");
});

app.use("/api", apiRoute);

app.listen(8080, () => {
  console.log(`Listening on port ${8080}`);
});