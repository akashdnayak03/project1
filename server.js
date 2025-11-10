const express = require("express");
const app = express();
const port = 3000;
const sql = require("mysql2");
const path = require("path");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const cors = require("cors");
const session = require("express-session");
require("dotenv").config();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 10 * 60 * 1000 },
  })
);

const db = sql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) throw err;
  console.log("Connected to database");
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/login", (req, res) => {
  const { name, password } = req.body;
  console.log(name, password);
  const query = "select * from student where name = ? and password = ?";
  db.query(query, [name, password], (err, result) => {
    if (err) throw err;
    console.log(result);
    if (result.length > 0) {
      res.json({ status: "succuss", message: "Login successful" });
    } else {
      res.json({ status: "error", message: "Invalid username or password" });
    }
  });
});

app.get("/get-otp", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signin.html"));
});

let otps = {};

app.post("/get-otp", async (req, res) => {
  const { email } = req.body;
  console.log(email);
  const otp = crypto.randomInt(10000, 99999);
  console.log(otp);
  const time = Date.now() + 5 * 60 * 1000;
  otps[email] = { otp, time };

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "akashdnayak31@gmail.com",
      pass: "gjsw qahk njvg xemr",
    },
  });

  try {
    await transporter.sendMail({
      from: "akashdnayak31@gmail.com",
      to: email,
      subject: "OTP to SignIn for MCE",
      text: `your otp is : ${otp}`,
    });
    res.json({
      status: "succuss",
      message: "OTP sent Successfully valied only 5 min",
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Unabel to send OTP" });
  }
});

app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  console.log(email, otp);
  const data = otps[email];
  if (!data) {
    console.log("Please request for OTP again");
    return res.json({
      status: "fail",
      message: "Please request for OTP again",
    });
  }
  if (data.otp === parseInt(otp) && data.time > Date.now()) {
    console.log("OTP verified successfully");
    res.json({ status: "succuss", message: "OTP verified successfully" });
  } else {
    console.log("Invalid OTP");
    res.json({ status: "fail", message: "Invalid OTP" });
  }
});

function checkVerified(req, res, next) {
  console.log("Session data:", req.session);
  if (!req.session.varified) {
    console.log("Access denied — user not verified.");
    return res
      .status(403)
      .send("Access denied. Please verify your email first.");
  }
  next();
}

app.get("/register", checkVerified, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

app.post("/register", checkVerified, (req, res) => {
  const { name, USN, password, email } = req.body;
  const query =
    "insert into student (name, USN, password,email) values (?, ?, ?,?)";
  db.query(query, [name, USN, password, email], (err, result) => {
    if (err) {
      console.log(err);
      return res.json({ status: "error", message: "Unable to register" });
    }
    if (result.code === "ER_DUP_ENTRY") {
      return res.json({ status: "error", message: "User already registered" });
    }
    if (result.affectedRows > 0) {
      res.json({ status: "success", message: "Registered Successfully" });
      console.log(result);
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
