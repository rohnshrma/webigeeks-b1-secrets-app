import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import connectDB from "./config/db.js";

dotenv.config();

const app = express();

connectDB();

// schema
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, minLength: 8, unique: true },
    password: { type: String, required: true, minLength: 8 },
  },
  {
    timestamps: true,
  }
);

// model
const User = new mongoose.model("user", userSchema);

// middleware

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// routes

// home

app.route("/").get((req, res) => {
  res.render("home");
});

// login

app.route("/login").get((req, res) => {
  res.render("login");
});
app.route("/login").post(async (req, res) => {
  const { username, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.find({ username });

    console.log(existingUser[0]);

    if (existingUser.length == 0) {
      res.redirect("/register");
    }

    if (existingUser[0].password === password) {
      res.render("secrets");
    } else {
      res.send("invalid password");
    }
  } catch (err) {
    console.log(err);
  }
});

// register

app.route("/register").get((req, res) => {
  res.render("register");
});

app.route("/register").post(async (req, res) => {
  const { username, password } = req.body;

  try {
    const newUser = new User({
      username,
      password,
    });

    await newUser.save();

    console.log("NEWUSER=>", newUser);

    res.render("secrets");
  } catch (err) {
    console.log(err);
    res.redirect("/register");
  }
});

app.listen(process.env.PORT, () => {
  console.log("Server started on port :", process.env.PORT);
});
