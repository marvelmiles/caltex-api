import User from "../models/User";
import { createError } from "../utils/error";
import bcrypt from "bcrypt";
import {
  setSessionCookies,
  generateRandomCode,
  generateHmac,
  generateBcryptHash
} from "../utils/auth";
import jwt from "jsonwebtoken";
import { COOKIE_PWD_RESET_KEY, TOKEN_INVALID_MSG } from "../config/constants";
import { sendMail } from "../utils/file-handlers";
import { verifyToken } from "../middlewares";

export const signup = async (req, res, next) => {
  try {
    let user = await User.findOne({
      $or: [{ username: req.body.username }, { email: req.body.email }]
    });

    if (user)
      throw createError("A user with the specified username or email exist");

    req.body.photoUrl = req.file?.publicUrl;

    user = await new User(req.body).save();

    const io = req.app.get("socketIo");
    io && io.emit("user", user);

    res.json({
      success: true,
      data: "Thank you for signing up. You can signin!"
    });
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
        if (!(await bcrypt.compare(req.body.password, user.password || "")))
          throw createError("Email or password is incorrect");
        break;
    }
    user = await User.findByIdAndUpdate(
      { _id: user.id },
      {
        isLogin: true
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

    const resetToken = generateRandomCode();

    user.resetToken = generateHmac(resetToken);
    user.resetDate = Date.now() + 3600000; // 1 hour

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
    const user = await User.findOne({
      email: req.body.email,
      resetToken: generateHmac(req.body.token),
      resetDate: { $gt: Date.now() }
    });

    if (!user) return res.json(TOKEN_INVALID_MSG);

    res.cookie(
      COOKIE_PWD_RESET_KEY,
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

    res.cookie(COOKIE_PWD_RESET_KEY, "", { httpOnly: true, expires });

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
