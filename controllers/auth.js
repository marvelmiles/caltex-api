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
  COOKIE_TOKEN_VERIFICATION_KEY,
  HTTP_CODE_UNVERIFIED_EMAIL
} from "../config/constants";
import { sendMail } from "../utils/file-handlers";
import { verifyToken } from "../middlewares";
import {
  serializeUserToken,
  serializeUserRefferalCode
} from "../utils/serializers";
import { createSuccessBody } from "../utils/normalizers";
import { validateUserToken } from "../utils/auth";
import { updateDoc } from "../utils";
import mongoose from "mongoose";
import Transaction from "../models/Transaction";
import ejs from "ejs";
import fs from "fs";
import path from "path";
import { isProdMode } from "../utils/validators";

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

  const expires = Date.now() + 60 * 1000 * 5;

  const token = await serializeUserToken(user, hashPrefix, expires);

  const isPwd = hashPrefix === COOKIE_PWD_RESET;

  const template = fs.readFileSync(
    path.resolve(
      process.cwd(),
      `templates/${isPwd ? "pwdReset" : "accVerification"}Template.ejs`
    ),
    "utf-8"
  );

  const route = `${CLIENT_ORIGIN}/auth/token-verification`;

  const props = {
    token,
    fullname: `${user.fullname} ${user.lastname}`,
    primaryColor: "rgba(18, 14, 251, 1)",
    secondaryColor: "rgba(12, 9, 175, 1)"
  };

  const searchParams = `token=${token}&email=${user.email}`;

  sendMail(
    {
      [COOKIE_PWD_RESET]: {
        to: user.email,
        from: "noreply@gmail.com",
        subject: "Caltex account password Reset",
        html:
          isPwd &&
          ejs.render(template, {
            ...props,
            verifyLink: `${route}/password?${searchParams}`
          })
      },
      [COOKIE_ACC_VERIFIC]: {
        to: user.email,
        from: "noreply@gmail.com",
        subject: "Caltex account verification",
        html:
          !isPwd &&
          ejs.render(template, {
            ...props,
            verifyLink: `${route}/account?${searchParams}`
          })
      }
    }[hashPrefix],
    err => {
      if (err)
        next(errMsg ? createError(errMsg, 503, HTTP_CODE_MAIL_ERROR) : err);
      else {
        user.resetDate = expires;

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
    console.log("signup...", req.body, req.query);

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

    req.body.isSuperAdmin = !!req.body.cred;

    req.body.isAdmin = req.body.isSuperAdmin || req.body.admin;

    req.body.settings = {};

    const _referrals = [];

    const isAdmin = req.body.isSuperAdmin || req.body.admin;

    if (req.body.referralCode) {
      const { referrals, _id } =
        (await User.findOne({
          referralCode: req.body.referralCode
        })) || {};

      if (referrals) {
        _referrals.push(_id);

        if (referrals[0]) _referrals.push(referrals[0]);

        if (referrals[1]) _referrals.push(referrals[1]);
      }
    }

    await serializeUserRefferalCode(req.body);

    req.body.referrals = _referrals;

    user = new User(req.body);

    user = await user.save();

    if (isAdmin)
      res.json(
        createSuccessBody({
          message: req.query.successMsg || "Thank you for signing up!",
          data: req.query.successMsg ? user : undefined
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

    res.json(
      createSuccessBody({
        data: {
          user,
          tokens: {
            accessToken: setJWTCookie(
              COOKIE_ACCESS_TOKEN,
              user.id,
              res,
              SESSION_COOKIE_DURATION.accessToken,
              req.body.rememberMe
            ),
            refreshToken: setJWTCookie(
              COOKIE_REFRESH_TOKEN,
              user.id,
              res,
              SESSION_COOKIE_DURATION.refreshToken,
              req.body.rememberMe
            )
          }
        },
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

    user &&
      (await user.updateOne({
        isLogin: false,
        settings: req.body.settings
      }));
  } catch (err) {
    console.log(err.message);
    next(err);
  }
};

export const recoverPwd = (req, res) => {
  // using 307 indicate a temp redirect which preserve original
  // request method
  return res.redirect(307, "generate-new-token/password-reset");
};

export const verifyUserToken = async (req, res, next) => {
  try {
    console.log(req.body, req.originalUrl, "toen ver");

    const { reason, cookieKey, cookieValue } = validateAuthReason(
      req,
      "/auth/verify-token/<account>"
    );

    !cookieValue && validateTokenBody(req, false);

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

    console.log("verification has user...", !!user);

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
          COOKIE_PWD_RESET,
          user.id,
          res,
          SESSION_COOKIE_DURATION.shortLived
        );
        break;
      default:
        break;
    }

    await user.updateOne(update);

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

    console.log(
      "reset-pwd... body...cookieVal...",
      req.body,
      !!cookieValue,
      req.cookies
    );

    if (cookieValue) req.body.token = "000000";

    validateTokenBody(req);

    await validateUserCredentials(req, COOKIE_PWD_RESET, false);

    if (req.user.provider)
      throw createError(
        `Failed to reset password. Account is registered under a third party provider`
      );

    if (!cookieValue)
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

    await validateUserCredentials(req, cookieKey, false);

    switch (reason) {
      case "account":
        if (!req.user.accountExpires)
          throw createError("Account has been verified!", 403);
        break;
      case "password-reset":
        if (req.user.accountExpires)
          throw createError(
            "Unable to process or generate verification token for an unverified account!",
            428,
            HTTP_CODE_UNVERIFIED_EMAIL
          );
        break;
    }

    await mailVerificationToken(req.user, res, next, cookieKey);
  } catch (err) {
    next(err);
  }
};

export const createAdmin = async (req, res, next) => {
  try {
    console.log("creating admn...");

    req.body.admin = true;
    req.query.successMsg = `Admin ${req.body.username ||
      req.body.firstname} as been created succcessfully!`;
    signup(req, res, next);
  } catch (err) {
    next(err);
  }
};
