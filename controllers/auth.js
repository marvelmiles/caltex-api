import User from "../models/User";
import { createError } from "../utils/error";
import bcrypt from "bcrypt";
import {
  setSessionCookies,
  generateHmac,
  generateBcryptHash
} from "../utils/auth";
import jwt from "jsonwebtoken";
import {
  COOKIE_VERIFICATION_TOKEN,
  TOKEN_INVALID_MSG,
  CLIENT_ENDPOINT
} from "../config/constants";
import { sendMail } from "../utils/file-handlers";
import { verifyToken } from "../middlewares";
import { generateUserToken } from "../utils/serializers";

export const signup = async (req, res, next) => {
  try {
    let user = await User.findOne({
      $or: [{ username: req.body.username }, { email: req.body.email }]
    });

    if (user)
      throw createError("A user with the specified username or email exist");

    req.body.photoUrl = req.file?.publicUrl;

    const token = generateUserToken(req.body);

    user = await new User(req.body).save();

    const io = req.app.get("socketIo");
    io && io.emit("user", user);

    const sendBody = () =>
      res.json({
        success: true,
        data: `Thank you for signing up${
          req.body.provider
            ? ""
            : ". Please check your email and verify your account"
        }!`
      });

    if (user.provider) return sendBody();

    sendMail(
      {
        to: req.body.email,
        from: "noreply@gmail.com",
        subject: "Caltex account verification",
        text: `
        Welcome to our caltex! 🌱 To get started on your financial 
        journey, kindly click the link below for OTP verification.
        Your account's security and growth are our top priorities. 
        Let's build a prosperous future together! [Verification Link]
        OTP = ${token}
        ${CLIENT_ENDPOINT}
        `
      },
      err => {
        if (err) next(err);
        else sendBody();
        return;
      }
    );
  } catch (err) {
    next(err);
  }
};

export const signin = async (req, res, next) => {
  try {
    if (
      !(
        !(req.body.placeholder || req.body.email || req.body.username) ||
        req.body.password
      )
    )
      throw "Invalid body request. Expect (placeholder or email or username) and password included";

    const query = {
      $or: [
        { email: req.body.placeholder || req.body.email },
        {
          username: req.body.placeholder || req.body.username
        }
      ]
    };
    let user = await User.findOne(query);

    switch (req.body.provider) {
      case "google":
        if (!user) user = await new User(req.body).save();
        break;
      default:
        if (!user) throw createError("Account is not registered");

        if (!user.emailVerified)
          throw createError("Login access denied. Account is not verified");

        if (!(await bcrypt.compare(req.body.password, user.password || "")))
          throw createError("Email or password is incorrect");
        break;
    }
    user = await User.findByIdAndUpdate(
      { _id: user.id },
      {
        isLogin: true,
        lastLogin: new Date()
      },
      { new: true }
    );
    await setSessionCookies(res, user.id, req.query.rememberMe);
    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

export const signout = async (req, res, next) => {
  try {
    setSessionCookies(res);
    res.json({ success: true, data: "You just got signed out!" });
    const user = await User.findByIdAndUpdate(req.user.id, {
      isLogin: false
    });
    if (user)
      await User.updateOne(
        {
          _id: req.user.id
        },
        {
          settings: {
            ...user.settings,
            ...req.body.settings
          }
        }
      );
  } catch (err) {
    next(err);
  }
};

export const recoverPwd = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({
      email
    });
    if (!user) throw createError("Account isn't registered", 400);

    const resetToken = generateUserToken(user);

    await user.save();

    sendMail(
      {
        to: email,
        from: "noreply@gmail.com",
        subject: "Caltex account password Reset",
        text: `Your reset code is: ${resetToken}`
      },
      err => {
        if (err) {
          return next(err);
        } else {
          return res.json({
            success: true,
            data: "An email has been sent to you"
          });
        }
      }
    );
  } catch (err) {
    next(err);
  }
};

export const verifyUserToken = async (req, res, next) => {
  try {
    req.query.withCookie =
      req.query.withCookie === undefined || req.query.withCookie;

    const user = await User.findOne({
      email: req.body.email,
      resetToken: generateHmac(req.body.token),
      resetDate: { $gt: Date.now() }
    });

    if (!user) throw TOKEN_INVALID_MSG;

    user.resetToken = "";

    if (req.query.withCookie)
      res.cookie(
        COOKIE_VERIFICATION_TOKEN,
        jwt.sign(
          {
            id: user.id
          },
          process.env.JWT_SECRET,
          {
            expiresIn: "1h"
          }
        ),
        {
          httpOnly: true
        }
      );
    else {
      user.resetDate = null;
      user.emailVerified = true;
    }

    await user.save();

    res.json({
      success: true,
      data: "Verification code has been verified"
    });
  } catch (err) {
    next(err);
  }
};

export const resetPwd = async (req, res, next) => {
  try {
    const user = await User.findOne({
      email: req.body.email,
      resetDate: { $gt: Date.now() }
    });

    if (!user) throw createError(TOKEN_INVALID_MSG);

    if (user.provider)
      throw createError(
        `Failed to reset password. Account is registered under a third party provider`
      );

    await user.updateOne({
      password: await generateBcryptHash(req.body.password),
      resetDate: null,
      resetToken: ""
    });

    const expires = new Date();
    expires.setFullYear(1990);

    res.cookie(COOKIE_VERIFICATION_TOKEN, "", { httpOnly: true, expires });

    res.json({
      success: true,
      data: "Password reset successful"
    });
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    verifyToken(req, {
      applyRefresh: true
    });
    if (req.user)
      await setSessionCookies(
        res,
        req.user.id,
        req.cookies.refresh_token.rememberMe,
        true
      );
    else throw createError(`Forbidden access`, 403);
    res.json({
      success: true,
      data: "Token refreshed"
    });
  } catch (err) {
    next(err);
  }
};
