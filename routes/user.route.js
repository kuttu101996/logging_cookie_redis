const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { createClient } = require("redis")
const cookieParser = require("cookie-parser");

const client = createClient({
    url: process.env.redis
});
client.on('error', err => console.log('Redis Client Error', err));

const { User } = require("../models/user.model");
const userRouter = express.Router();

userRouter.get("/", async (req, res) => {
  res.send({ msg: "Users" });
});

userRouter.post("/login", async (req, res) => {
  try {
    const { email, pass } = req.body;
    const user = await User.find({ email });
    if (user.length > 0) {
      bcrypt.compare(pass, user[0].pass, async function (err, result) {
        // result == true
        if (result) {
          var token = jwt.sign({ userID: user[0]._id }, process.env.secretKey, {
            expiresIn: 30000,
          });
          var refreshToken = jwt.sign(
            { userID: user[0]._id },
            process.env.refreshSecret,
            {
              expiresIn: 600,
            }
          );
          res.cookie("token", token);
          res.cookie("refreshToken", refreshToken);
          res.cookie("userID", user[0]._id);
          res.send({msg: "Login Successful", token})
          await client.set('token', token);
          await client.set('refreshToken', refreshToken);
        }
      });
    } else {
      res.send({ msg: "No User Found, Please Register" });
    }
  } catch (err) {
    res.send({ msg: "Error from Catch -> " + err });
  }
});

userRouter.post("/register", async (req, res) => {
  try {
    const { email, name, pass } = req.body;
    const user = await User.find({ email });
    if (user.length == 0) {
      bcrypt.hash(pass, 4, async function (err, hash) {
        if (err) {
          res.send({ msg: "Error While Hashing" });
        } else {
          const adding = new User({ email, pass: hash, name });
          await adding.save();
          res.send({ msg: "reg Success" });
        }
      });
    } else {
      res.send({ msg: "User Exist, Please Login" });
    }
  } catch (err) {
    res.send({ msg: "Catch Block -> " + err });
  }
});

// userRouter.get("/refreshToken", async(req,res)=>{
//     try{

//     }
//     catch(err){

//     }
// })

userRouter.get("/logout", async (req, res) => {
  // const token = req.cookies.token;
  // const refreshToken = req.cookies.refreshToken;

  const token = await client.get('token')
  const refreshToken = await client.get("refreshToken");
  await client.sadd(`blacklist`, token, refreshToken)
  res.send({ msg: "Logout Success" });
});

module.exports = {
  userRouter,
};
