import dotenv from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import connectDB from "./config/db.js";

// auth imports
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

import { Strategy as GoogleStrategy } from "passport-google-oauth20";

dotenv.config();
const app = express();

const saltRounds = 11;

connectDB();

// Session Configuration
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// initialize passport
app.use(passport.initialize());
app.use(passport.session());

// schema
const userSchema = new mongoose.Schema(
  {
    username: { type: String },
    password: { type: String },
    googleId: { type: String },
  },
  {
    timestamps: true,
  }
);

// model
const User = new mongoose.model("user", userSchema);

// middleware

app.use((req, res, next) => {
  console.log(req.isAuthenticated());
  next();
});

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// passport local strategy
passport.use(
  new LocalStrategy(async (username, password, cb) => {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        return cb(null, false, { message: "Incorrect username." });
      }

      const result = bcrypt.compare(password, user.password);

      if (!result) {
        return cb(null, false, { message: "Incorrect password." });
      }

      return cb(null, user);
    } catch (err) {
      return cb(err);
    }
  })
);

// passport google  strategy

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/success",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            username: profile.displayName,
            googleId: profile.id,
          });
        }

        return cb(null, user);
      } catch (err) {
        return cb(err, false);
      }
    }
  )
);

// serialize User
passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
  try {
    const user = await User.findById(id);
    cb(null, user);
  } catch (err) {
    done(err);
  }
});

// routes

// home

app.route("/").get((req, res) => {
  res.render("home");
});

// login

app.route("/login").get((req, res) => {
  res.render("login");
});
app.route("/login").post(
  passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
    failureFlash: "true",
  })
);

app
  .route("/auth/google")
  .get(passport.authenticate("google", { scope: ["profile"] }));

app
  .route("/auth/google/success")
  .get(
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/secrets");
    }
  );

// register

app.route("/register").get((req, res) => {
  res.render("register");
});

app.route("/register").post(async (req, res, next) => {
  const { username, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.find({ username });
    console.log(existingUser);

    if (existingUser.length > 0) {
      res.redirect("/login");
      return;
    }

    const hash = await bcrypt.hash(password, saltRounds);
    console.log(hash);

    const newUser = new User({
      username,
      password: hash,
    });

    await newUser.save();

    req.login(newUser, (err) => {
      if (err) {
        console.log(err);
        return;
      } else {
        res.redirect("/secrets");
      }
    });
  } catch (err) {
    console.log(err);
    res.redirect("/register");
  }
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (!err) {
      res.redirect("/");
    }
  });
});

app.listen(process.env.PORT, () => {
  console.log("Server started on port :", process.env.PORT);
});
