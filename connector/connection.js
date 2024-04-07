require("dotenv").config();
const mysql = require("mysql");

const db = mysql.createPool({
  connectionLimit: 10,
  host: "localhost",
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB,
  port: 3306,
});

const testConnection = () => {
  db.getConnection((err, connection) => {
    if (err) {
      console.error("Database connection error:", err);
      return;
    }
    console.log("Connected to MySQL database successfully!");
    connection.release();
  });
};
module.exports = { db, testConnection };
