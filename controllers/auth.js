import User from "../models/User";
import { createError } from "../utils/error";
import bcrypt from "bcrypt";
import {
  deleteCookie,
  setJWTCookie,
  validateTokenBody,
  validateUserCredentials,
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
  HTTP_CODE_MAIL_ERROR,
  HTTP_CODE_UNVERIFIED_EMAIL,
  MSG_ACCOUNT_DISABLED,
  HTTP_CODE_ACCOUNT_DISABLED,
} from "../config/constants";
import {
  readTemplateFile,
  sendMail,
  sendNotificationMail,
} from "../utils/file-handlers";
import { verifyToken } from "../middlewares";
import {
  serializeUserToken,
  serializeUserRefferalCode,
} from "../utils/serializers";
import { createSuccessBody } from "../utils/normalizers";
import { validateUserToken } from "../utils/auth";
import { updateDoc } from "../utils";

const validateAuthReason = (req, expectMsg, reasonMsg) => {
  const reason = req.params.reason;

  if (!{ account: true, "password-reset": true }[reason])
    throw `Invalid request reason ${
      reasonMsg || { "password-reset": "password reset" }[reason] || reason
    }. Expect ${expectMsg}`;

  const cookieKey = {
    account: COOKIE_ACC_VERIFIC,
    "password-reset": COOKIE_PWD_RESET,
  }[reason];

  console.log("validte auth reason cookieVal", !!req.cookies[cookieKey]);

  return {
    reason,
    cookieKey,
    cookieValue: req.cookies[cookieKey],
  };
};

const mailVerificationToken = async (
  user,
  res,
  hashPrefix,
  errMsg,
  successMsg = "Verification token as been sent to your mail!"
) =>
  new Promise((resolve, reject) => {
    console.log("mailing....");

    const expires = Date.now() + 60 * 1000 * 15;

    serializeUserToken(user, hashPrefix, expires)
      .then((token) => {
        const isPwd = hashPrefix === COOKIE_PWD_RESET;

        const route = `${CLIENT_ORIGIN}/auth/token-verification`;

        const postRoute = `${user.id}`;

        const mailStr = readTemplateFile(
          isPwd ? "pwdReset" : "accVerification",
          {
            token,
            fullname: user.fullname,
            verifyLink: isPwd
              ? `${route}/password/${postRoute}`
              : `${route}/account/${postRoute}`,
          }
        );

        const mailOptions = {
          to: user.email,
          subject: isPwd
            ? "Caltex account password Reset"
            : "Caltex account verification",
          html: mailStr,
          text: mailStr,
        };

        sendMail(mailOptions, (err) => {
          if (err)
            reject(
              errMsg ? createError(errMsg, 503, HTTP_CODE_MAIL_ERROR) : err
            );
          else {
            user.resetDate = expires;

            user
              .save()
              .then((_) => {
                res.json(
                  createSuccessBody({
                    message: successMsg,
                  })
                );

                resolve(successMsg);
              })
              .catch((_) =>
                reject(
                  createError(
                    "Something went wrong! Failed to save token.",
                    500
                  )
                )
              );
          }
        });
      })
      .catch((err) => reject(err));
  });

export const signup = async (req, res, next) => {
  try {
    console.log("signup...", req.body, req.query);

    let user = await User.findOne({
      $or: [
        {
          email: req.body.email,
        },
        {
          username: req.body.username || "",
        },
      ],
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
          referralCode: req.body.referralCode,
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
          data: req.query.successMsg ? user : undefined,
        })
      );
    else {
      const io = req.app.get("socketIo");
      io && io.emit("user", user);

      await mailVerificationToken(
        user,
        res,
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
          username: req.body.placeholder || req.body.username || "",
        },
      ],
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

    if (user.accountExpires && user.expired)
      throw createError(MSG_ACCOUNT_DISABLED, 403, HTTP_CODE_ACCOUNT_DISABLED);

    user = await User.findByIdAndUpdate(
      { _id: user.id },
      {
        isLogin: true,
      },
      { new: true }
    );

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
            ),
          },
        },
        message: "Signed in successfully",
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
        settings: req.body.settings,
      }));
  } catch (err) {
    console.log(err.message);
    next(err);
  }
};

export const recoverPwd = (req, res, next) => {
  // using 307 indicate a temp redirect which preserve original
  // request method
  try {
    if (!req.body.email) throw "Invalid body. Expect body.email";

    return res.redirect(307, "generate-new-token/password-reset");
  } catch (err) {
    next(err);
  }
};

export const verifyUserToken = async (req, res, next) => {
  try {
    console.log(req.body, req.originalUrl, !!req.cookies, "toen ver..");

    const { reason, cookieKey, cookieValue } = validateAuthReason(
      req,
      "/auth/verify-token/<account>"
    );

    !cookieValue && validateTokenBody(req, false);

    console.log(
      "verification has user...cookie...cookVal...",
      !!req.user,
      !!req.cookies,
      !!cookieValue
    );

    await validateUserCredentials(
      req,
      cookieKey,
      reason === "account" ? { accountExpires: { $ne: null } } : undefined
    );

    req.body.resetToken = req.user.resetToken;
    req.body.resetDate = req.user.resetDate;

    await validateUserToken(req.user, req.body.token, cookieKey);

    const update = {
      resetToken: "",
      resetDate: null,
    };

    switch (reason) {
      case "account":
        update.accountExpires = null;
        update.verifiedAt = new Date();
        break;
      case "password-reset":
        setJWTCookie(
          COOKIE_PWD_RESET,
          req.user.id,
          res,
          SESSION_COOKIE_DURATION.accessToken
        );
        break;
      default:
        break;
    }

    await req.user.updateOne(update);

    res.json(
      createSuccessBody({
        message: "Verification code has been verified",
      })
    );

    if (reason === "account")
      sendNotificationMail(req.user.email, {
        mailOpts: {
          subject: "Caltex Account Verification",
        },
        tempOpts: {
          fullname: req.user.fullname,
          text: "We are pleased to confirm that your account has been successfully verified.",
        },
      });
  } catch (err) {
    console.log(err.message, "...");
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

    !cookieValue && validateTokenBody(req);

    await validateUserCredentials(req, COOKIE_PWD_RESET);

    if (req.user.provider)
      throw createError(
        `Failed to reset password. Account is registered under a third party provider`
      );

    if (!cookieValue)
      await validateUserToken(req.user, req.body.token, COOKIE_PWD_RESET);

    await updateDoc(req.user, {
      password: req.body.password,
      resetDate: null,
      resetToken: "",
    });

    deleteCookie(COOKIE_PWD_RESET, res);

    res.json(
      createSuccessBody({
        message: "Password reset successful",
      })
    );
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    verifyToken(req, {
      cookieKey: COOKIE_REFRESH_TOKEN,
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

    await validateUserCredentials(req, cookieKey);

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

    await mailVerificationToken(req.user, res, cookieKey);
  } catch (err) {
    next(err);
  }
};

export const createAdmin = async (req, res, next) => {
  try {
    console.log("creating admn...");

    req.body.admin = true;
    req.query.successMsg = `Admin ${
      req.body.username || req.body.firstname
    } as been created succcessfully!`;
    signup(req, res, next);
  } catch (err) {
    next(err);
  }
};
