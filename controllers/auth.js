import User from "../models/User";
import { createError } from "../utils/error";
import bcrypt from "bcrypt";
import {
  deleteCookie,
  setJWTCookie,
  validateTokenBody,
  validateUserCredentials
} from "../utils/auth";
import {
  CLIENT_ORIGIN,
  HTTP_403_MSG,
  COOKIE_ACC_VERIFIC,
  COOKIE_PWD_RESET,
  COOKIE_ACCESS_TOKEN,
  COOKIE_REFRESH_TOKEN,
  SESSION_COOKIE_DURATION,
  HTTP_401_MSG,
  HTTP_CODE_ACCOUNT_VERIFICATION_ERROR,
  HTTP_CODE_MAIL_ERROR,
  MSG_USER_404,
  COOKIE_TOKEN_VERIFICATION_KEY
} from "../config/constants";
import { sendMail } from "../utils/file-handlers";
import { verifyToken } from "../middlewares";
import { serializeUserToken } from "../utils/serializers";
import { createSuccessBody } from "../utils/normalizers";
import { validateUserToken } from "../utils/auth";
import { updateDoc } from "../utils";

const validateAuthReason = (req, expectMsg, reasonMsg) => {
  const reason = req.params.reason;

  if (!{ account: true, "password-reset": true }[reason])
    throw `Invalid request reason ${reasonMsg ||
      ({ "password-reset": "password reset" }[reason] ||
        reason)}. Expect ${expectMsg}`;

  const cookieKey = {
    account: COOKIE_ACC_VERIFIC,
    "password-reset": COOKIE_PWD_RESET
  }[reason];

  console.log("validte auth reason cookieVal", !!req.cookies[cookieKey]);

  return {
    reason,
    cookieKey,
    cookieValue: req.cookies[cookieKey]
  };
};

const mailVerificationToken = async (
  user,
  res,
  next,
  hashPrefix,
  errMsg,
  successMsg = "Verification token as been sent to your mail!"
) => {
  console.log("mailing...");

  const token = await serializeUserToken(user, hashPrefix);

  sendMail(
    {
      [COOKIE_PWD_RESET]: {
        to: user.email,
        from: "noreply@gmail.com",
        subject: "Caltex account password Reset",
        text: `Your reset code is: ${token}`
      },
      [COOKIE_ACC_VERIFIC]: {
        to: user.email,
        from: "noreply@gmail.com",
        subject: "Caltex account verification",
        text: `
        Welcome to caltex! 🌱 To get started on your financial
        journey, kindly click the link below for OTP verification.
        Your account's security and growth are our top priorities.
        Let's build a prosperous future together! [Verification Link]
        OTP = ${token}
        ${CLIENT_ORIGIN}/auth/token-verification/account
        `
      }
    }[hashPrefix],
    err => {
      if (err)
        next(errMsg ? createError(errMsg, 503, HTTP_CODE_MAIL_ERROR) : err);
      else {
        user.resetDate = Date.now() + 60000;

        user
          .save()
          .then(_ => {
            res.json(
              createSuccessBody({
                message: successMsg
              })
            );
          })
          .catch(_ =>
            next(
              createError(
                "Something went wrong! Failed to generate token.",
                500
              )
            )
          );
      }
    }
  );
};

export const signup = async (req, res, next) => {
  try {
    console.log("signup...");

    let user = await User.findOne({
      $or: [
        {
          email: req.body.email
        },
        {
          username: req.body.username || ""
        }
      ]
    });

    if (user) {
      const emailExist = user.email === req.body.email;

      const nameExist = user.username === req.body.username;

      throw createError(
        `A user with the specified${emailExist ? " email" : ""}${
          nameExist ? ` ${emailExist ? "and username" : "username"}` : ""
        } exist!`
      );
    }

    req.body.photoUrl = req.file?.publicUrl;

    req.body.isAdmin = req.query.admin;

    req.body.isSuperAdmin = !!req.body.cred;

    user = new User(req.body);

    user = await user.save();

    if (req.query.admin)
      res.json(
        createSuccessBody({
          message: req.query.successMsg || "Thank you for signing up!"
        })
      );
    else {
      const io = req.app.get("socketIo");
      io && io.emit("user", user);

      setJWTCookie(COOKIE_ACC_VERIFIC, user.id, res);

      mailVerificationToken(
        user,
        res,
        next,
        COOKIE_ACC_VERIFIC,
        "Account has been created successfully! Encountered an error sending verification code to your mail.",
        `Thank you for signing up${
          req.body.provider
            ? ""
            : ". Please check your email and verify your account"
        }!`
      );
    }
  } catch (err) {
    next(err);
  }
};

export const signin = async (req, res, next) => {
  try {
    console.clear();
    console.log("signing..", req.body);

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

        if (user.accountExpires)
          throw createError(
            "Login access denied. Account is not verified.",
            403,
            HTTP_CODE_ACCOUNT_VERIFICATION_ERROR
          );

        console.log("comparing...");

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

    const expires = new Date();

    expires.setHours(expires.getHours() + 15);

    setJWTCookie(
      COOKIE_ACCESS_TOKEN,
      user.id,
      res,
      SESSION_COOKIE_DURATION.accessToken
    );

    setJWTCookie(
      COOKIE_REFRESH_TOKEN,
      user.id,
      res,
      SESSION_COOKIE_DURATION.refreshToken,
      req.body.rememberMe
    );

    res.json(
      createSuccessBody({
        data: user,
        message: "Signed in successfully"
      })
    );
  } catch (err) {
    next(err);
  }
};

export const signout = async (req, res, next) => {
  try {
    console.log("signout...", req.body);

    verifyToken(req, { hasForbidden: true, message: HTTP_401_MSG });

    deleteCookie(COOKIE_ACCESS_TOKEN, res);
    deleteCookie(COOKIE_REFRESH_TOKEN, res);

    res.json(createSuccessBody({ message: "You just got signed out!" }));

    const user = await User.findById(req.user.id);

    await user.updateOne({
      isLogin: false,
      settings: {
        ...user.settings,
        ...req.body.settings
      }
    });
  } catch (err) {
    next(err);
  }
};

export const recoverPwd = async (req, res, next) => {
  try {
    const user = await User.findOne({
      email: req.body.email
    });

    if (!user) throw createError(MSG_USER_404, 403);

    if (req.cookies[COOKIE_PWD_RESET])
      verifyToken(req, {
        cookieKey: COOKIE_PWD_RESET,
        hasForbidden: true
      });
    else setJWTCookie(COOKIE_PWD_RESET, user.id, res);

    await mailVerificationToken(user, res, next, COOKIE_PWD_RESET);
  } catch (err) {
    if (req.cookies[COOKIE_PWD_RESET]) deleteCookie(COOKIE_PWD_RESET, res);

    next(err);
  }
};

export const verifyUserToken = async (req, res, next) => {
  try {
    console.log(req.body, "toen ver");

    const { reason, cookieKey, cookieValue } = validateAuthReason(
      req,
      "/auth/verify-token/<account>"
    );

    !cookieValue && validateTokenBody(req);

    const query = {
      email: req.body.email
    };

    switch (reason) {
      case "account":
        query.accountExpires = { $ne: null };
        break;
      default:
        break;
    }

    const user = await User.findOne(query);

    console.log("user...", !!user);

    if (!user) throw createError(HTTP_401_MSG, 403);

    req.body.resetToken = user.resetToken;
    req.body.resetDate = user.resetDate;

    await validateUserToken(req.body, req.body.token, cookieKey, cookieValue);

    const update = {
      resetToken: "",
      resetDate: null
    };

    switch (reason) {
      case "account":
        update.accountExpires = null;
        break;
      case "password-reset":
        setJWTCookie(
          COOKIE_TOKEN_VERIFICATION_KEY,
          user.id,
          res,
          SESSION_COOKIE_DURATION.shortLived
        );
        break;
      default:
        break;
    }

    await user.updateOne(update);

    deleteCookie(cookieKey, res);

    res.json(
      createSuccessBody({
        message: "Verification code has been verified"
      })
    );
  } catch (err) {
    next(err);
  }
};

export const resetPwd = async (req, res, next) => {
  try {
    const cookieValue = req.cookies[COOKIE_PWD_RESET];

    console.log("reset-pwd... body...cookieVal...", req.body, !!cookieValue);

    !cookieValue && validateTokenBody(req);

    await validateUserCredentials(req, COOKIE_PWD_RESET, false);

    if (req.user.provider)
      throw createError(
        `Failed to reset password. Account is registered under a third party provider`
      );

    if (!req.cookies[COOKIE_TOKEN_VERIFICATION_KEY])
      await validateUserToken(
        req.user,
        req.body.token,
        COOKIE_PWD_RESET,
        cookieValue
      );

    await updateDoc(req.user, {
      password: req.body.password,
      resetDate: null,
      resetToken: ""
    });

    deleteCookie(COOKIE_PWD_RESET, res);
    deleteCookie(COOKIE_TOKEN_VERIFICATION_KEY, res);

    res.json(
      createSuccessBody({
        message: "Password reset successful"
      })
    );
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    verifyToken(req, {
      cookieKey: COOKIE_REFRESH_TOKEN
    });

    if (req.user) {
      const user = await User.findById(req.user.id);

      if (!user || user.accountExpires) throw createError(HTTP_403_MSG, 403);

      setJWTCookie(
        COOKIE_ACCESS_TOKEN,
        req.user.id,
        res,
        SESSION_COOKIE_DURATION.accessToken
      );
    } else throw createError(HTTP_403_MSG, 403);

    res.json(createSuccessBody({ message: "Token refreshed" }));
  } catch (err) {
    next(err);
  }
};

export const generateUserToken = async (req, res, next) => {
  try {
    console.log("gen new toke...", req.params.reason, req.body);

    const allowedReason = "<account|password-reset>";

    const { cookieKey, reason } = validateAuthReason(
      req,
      `/auth/generate-new-token/${allowedReason}`
    );

    await validateUserCredentials(req, cookieKey, reason !== "password-reset");

    switch (reason) {
      case "account":
        if (!req.user.accountExpires)
          throw createError("Account has been verified!", 403);
        break;
    }

    await mailVerificationToken(req.user, res, next, cookieKey);
  } catch (err) {
    next(err);
  }
};

export const createAdmin = async (req, res, next) => {
  try {
    req.query.admin = true;
    req.query.successMsg = `Admin ${req.body.username ||
      req.body.firstname} as been created succcessfully!`;

    signup(req, res, next);
  } catch (err) {
    next(err);
  }
};
