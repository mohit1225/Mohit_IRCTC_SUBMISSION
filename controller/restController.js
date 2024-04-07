// Importing required modules and packages
var dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

// Importing authentication middleware and database connection
const auth = require("../middleware/auth");
let { db } = require("../connector/connection");
const adminAuth = require("../middleware/adminAuth");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

// Function to generate unique IDs
const generateId = () => {
  return uuidv4();
};

// Function to create seat numbers based on starting seat number and range
function createSeatNumber(startingSeatNumber, range) {
  const res = [];
  for (let i = 0; i < range; i++) {
    res.push(startingSeatNumber - i);
  }
  return res;
}

// Function to hash passwords using bcrypt
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Sign-up API endpoint
router.post("/signup", async (req, res) => {
  try {
    console.log("API hitting in signup route");

    // Generating user ID
    const user_id = generateId();

    const table = process.env.SQL_USER_TABLE;

    // Creating user data object
    const userData = {
      username: req.body.username,
      email: req.body.email,
      password: await hashPassword(req.body.password),
      user_id: user_id,
    };
    console.log("User Data:", userData);

    // Executing SQL query to insert user data
    const query = `INSERT INTO ${table} SET ?`;
    db.query(query, userData, (error, results) => {
      if (error) {
        console.error("Error executing query:", error);
        return res
          .status(500)
          .json({ error: "An error occurred while processing." });
      }

      console.log("User was created successfully:", results.insertId);
      return res.status(200).json({
        user_id: results.insertId,
        status: "Account created successfully",
      });
    });
  } catch (err) {
    console.error("Error in signup route:", err);
    res.status(500).send("Error while processing your request");
  }
});

// Login API endpoint
router.post("/login", async (req, res) => {
  try {
    console.log("in login try!!");
    const table = process.env.SQL_USER_TABLE;

    var query = `SELECT * from ${table} WHERE (username='${req.body.username}')`;
    console.log("query: ", { query });
    db.query(query, async (error, user) => {
      if (error) throw error;
      else if (user.length === 0) {
        console.log("No data found");
        res.status(401).json({
          status: "Incorrect username/password. Please try again",
        });
      } else {
        const hashedPassword = user[0].password;
        const passwordMatch = await bcrypt.compare(
          req.body.password,
          hashedPassword
        );

        if (passwordMatch) {
          // Generating JWT token
          const token = jwt.sign(
            { username: user[0].username },
            process.env.JWT_KEY,
            {
              expiresIn: "10 minutes",
            }
          );

          // Setting JWT token as a cookie
          res.cookie("jwt", token, {
            expires: new Date(Date.now() + 600000),
            httpOnly: true,
          });

          res.status(200).json({
            user_id: user[0].user_id,
          });
        } else {
          res
            .status(401)
            .send("Incorrect username and/or password. Login Again");
        }
      }
    });
  } catch (err) {
    console.log(err);
    res.status(401).send("Incorrect username and/or password. Login Again");
  }
});

// Admin API to create trains in train table
router.post("/trains/create", adminAuth, async (req, res) => {
  try {
    const train_id = generateId();
    const table = process.env.SQL_TRAIN_TABLE;

    // Creating train information object
    const trainInfo = {
      train_id: train_id,
      train_name: req.body.train_name,
      train_source: req.body.source,
      train_destination: req.body.destination,
      seat_capacity: req.body.seat_capacity,
      arrival_time_at_source: req.body.arrival_time_at_source,
      arrival_time_at_destination: req.body.arrival_time_at_destination,
      available_seats: req.body.seat_capacity,
    };

    var query = `INSERT INTO ${table} SET ?`;

    // Executing SQL query to insert train information
    db.query(query, trainInfo, async (error, results) => {
      if (error) throw error;

      res.status(200).json({
        message: "Train Information was added",
        train_id: train_id,
      });
    });
  } catch (err) {
    console.log(err);
    res.status(401).send("error in trains/create");
  }
});

// Check train availability API endpoint
router.get("/trains/availability", async (req, res) => {
  try {
    const table = process.env.SQL_TRAIN_TABLE;
    const source = req.query.source;
    const destination = req.query.destination;

    var query = `select train_id, train_name, available_seats from ${table} where (train_source = '${source}' and train_destination = '${destination}')`;
    var resData = [];

    db.query(query, async (error, train) => {
      if (error) throw error;
      else if (train.length === 0) {
        console.log("No data found");
        res.status(401).json("no such train found");
      } else {
        for (const item in train) {
          resData.push({
            train_id: item.train_id,
            train_name: item.train_name,
            available_seats: item.available_seats,
          });
        }

        res.status(200).json(train);
      }
    });
  } catch (err) {
    console.log(err);
    res.status(401).send("error in trains/availability");
  }
});

// Book seats in train with train_id API endpoint
router.post("/trains/:train_id/book", auth, async (req, res) => {
  try {
    const train_id = req.params.train_id;
    const book_table = process.env.SQL_TRAIN_BOOK_TABLE;
    const train_table = process.env.SQL_TRAIN_TABLE;

    var query = `select * from ${train_table} where train_id = '${train_id}'`;

    db.query(query, async (error, trains) => {
      if (error) throw error;
      console.log("trains: ", trains);
      if (trains.length == 0) {
        res.status(404).json("No such train found");
      }

      const train = trains[0];
      const book_id = generateId();

      if (train.available_seats >= req.body.no_of_seats) {
        const seats = createSeatNumber(
          train.available_seats,
          req.body.no_of_seats
        );

        console.log(seats.toString());

        const bookingInfo = {
          booking_id: book_id,
          train_id: train.train_id,
          train_name: train.train_name,
          user_id: req.body.user_id,
          no_of_seats: req.body.no_of_seats,
          seat_numbers: `[${seats.toString()}]`,
          arrival_time_at_source: train.arrival_time_at_source,
          arrival_time_at_destination: train.arrival_time_at_destination,
        };

        console.log(bookingInfo);

        query = `INSERT INTO ${book_table} SET ?`;
        var available_seats = train.available_seats - req.body.no_of_seats;

        db.query(query, bookingInfo, async (error, result) => {
          if (error) throw error;

          query = `UPDATE ${train_table} SET available_seats = ${available_seats} where train_id = ${train.train_id}`;

          db.query(query, async (error, results) => {
            if (error) throw error;

            res.status(200).json({
              message: "Seat booked successfully",
              booking_id: result.booking_id,
              seat_numbers: seats,
            });
          });
        });
      } else {
        res.status(404).json(`${train.available_seats} seats are available`);
      }
    });
  } catch (err) {
    console.log(err);
    res.status(401).send("error in trains/create");
  }
});

// See booking details with booking_id API endpoint
router.get("/bookings/:booking_id", auth, async (req, res) => {
  try {
    const book_table = process.env.SQL_TRAIN_BOOK_TABLE;
    const book_id = req.params.booking_id;

    var query = `select * from ${book_table} where booking_id = '${book_id}'`;

    db.query(query, async (error, book) => {
      if (error) throw error;
      else if (book.length === 0) {
        console.log("No such booking found");
        res.status(401).json("no such booking found");
      } else {
        res.status(200).json(book);
      }
    });
  } catch (err) {
    console.log(err);
    res.status(401).send("error in trains/availability");
  }
});

// Exporting router for use in other modules
module.exports = router;
