import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { setFutureDate } from ".";
import User from "../models/User";
import { createError } from "./error";
import {
  HTTP_401_MSG,
  MSG_INVALID_VERIFICATION_TOKEN,
  MSG_TOKEN_EXPIRED,
  HTTP_CODE_TOKEN_EXPIRED,
  cookieConfig
} from "../config/constants";
import { verifyToken, userExist } from "../middlewares";
import ShortUniqId from "short-unique-id";

export const generateUUID = (mixed = true, length = mixed ? 10 : 6) => {
  if (mixed) {
    const { randomUUID } = new ShortUniqId({ length });
    return randomUUID();
  }

  return Math.floor(100000 + Math.random() * 900000);
};

export const generateBcryptHash = async (str = "", rounds = 10) => {
  return await bcrypt.hash(str + "", await bcrypt.genSalt(rounds));
};

export const deleteCookie = (name, res) => {
  const expires = new Date();
  expires.setFullYear(1990);
  res.cookie(name, "", { ...cookieConfig, expires });
};

export const setJWTCookie = (name, uid, res, time = {}, withExtend) => {
  deleteCookie(name, res);

  let { duration = 1, extend, type = "h" } = time;
  duration = withExtend ? extend : duration;

  let expires = new Date();

  switch (type) {
    case "h":
      expires.setHours(expires.getHours() + duration);
      break;
    case "d":
      expires = setFutureDate(duration);
      break;
    case "m":
      expires.setMinutes(expires.getMinutes() + duration);
      break;
  }

  const token = jwt.sign({ id: uid }, process.env.JWT_SECRET, {
    expiresIn: duration + type
  });

  res.cookie(name, token, {
    ...cookieConfig,
    expires
  });

  return token;
};

export const validateUserToken = async (user, token, hashPrefix) => {
  if (!user || !user.resetToken) throw createError(HTTP_401_MSG);

  const time = new Date(user.resetDate);

  const err = {
    _statusCode: 428,
    message: "Please request a new token before proceeding"
  };

  hashPrefix = hashPrefix ? `caltex_${hashPrefix}_` : "";

  let slice = false;

  if (
    user.resetToken &&
    (hashPrefix ? (slice = user.resetToken.indexOf(hashPrefix) > -1) : true)
  ) {
    if (
      !(await bcrypt.compare(
        token || "",
        (slice ? user.resetToken.slice(hashPrefix.length) : user.resetToken) ||
          ""
      ))
    )
      throw createError(MSG_INVALID_VERIFICATION_TOKEN);
  } else throw createError(err.message, err._statusCode);

  if (time.getTime() <= new Date().getTime())
    throw createError(MSG_TOKEN_EXPIRED, 400, HTTP_CODE_TOKEN_EXPIRED);
};

export const validateTokenBody = req => {
  if (!(req.body.token && req.body.userId))
    throw `Invalid request body. Expect a user id and a token`;
};

export const validateUserCredentials = async (req, cookieKey, userMatch) => {
  const cookieValue = req.cookies[cookieKey];

  const config = {
    message: HTTP_401_MSG,
    code: 403,
    match: userMatch
  };

  if (cookieValue) {
    verifyToken(cookieValue, { hasForbidden: true });
    await userExist(req, config);
  } else await userExist(req, config);
};

// (async () => {
//   console.log(await generateBcryptHash("@superAdmin1"));
// })();
