import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { setFutureDate } from ".";
import User from "../models/User";
import { createError } from "./error";
import {
  HTTP_401_MSG,
  MSG_INVALID_CREDENTIALS,
  MSG_TOKEN_EXPIRED,
  HTTP_CODE_TOKEN_EXPIRED
} from "../config/constants";
import { verifyToken, userExist } from "../middlewares";
import { v4 } from "uuid";

export const generateUniqStr = () =>
  crypto.randomBytes(16).toString("hex") + Date.now() + v4();

export const generateRandomCode = () =>
  Math.floor(100000 + Math.random() * 900000);

export const generateBcryptHash = async (str = "", rounds = 10) => {
  return await bcrypt.hash(str + "", await bcrypt.genSalt(rounds));
};

// need this function because i want same hash for a string
export const generateHmac = (input, secret = process.env.JWT_SECRET) => {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(input + "");
  return hmac.digest("hex");
};

export const setJWTCookie = (name, uid, res, time = {}, withExtend) => {
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

  res.cookie(
    name,
    jwt.sign({ id: uid }, process.env.JWT_SECRET, {
      expiresIn: duration + type
    }),
    {
      expires,
      httpOnly: true,
      sameSite: "Lax" // allow xSite not from clicking link (top level nav)
      // secure: true
    }
  );
};

export const deleteCookie = (name, res) => {
  const expires = new Date();
  expires.setFullYear(1990);
  res.cookie(name, "", { httpOnly: true, expires });
};

export const authUser = async ({ email, password }, strict) => {
  if (!(email && (strict ? password : true)))
    throw `Invalid body. Expect email${
      strict ? " and password" : ""
    } in request body`;

  const user = await User.findOne({ email });

  if (!user) throw createError(HTTP_401_MSG, 403);

  if (strict)
    if (!(await bcrypt.compare(password, user.password)))
      throw "Invalid credentials!";

  return user;
};

export const validateUserToken = async (
  user,
  token,
  hashPrefix,
  cookieValue
) => {
  if (!user || !user.resetToken) throw createError(HTTP_401_MSG);

  const time = new Date(user.resetDate);

  const err = {
    _statusCode: 428,
    message: "Please request a new token before proceeding"
  };

  if (cookieValue) await verifyToken(cookieValue, err);
  else await authUser(user, hashPrefix !== "pwd_reset");

  hashPrefix = hashPrefix ? `caltex_${hashPrefix}_` : "";

  console.log("refix found...", user.resetToken.indexOf(hashPrefix) > -1);

  let slice = false;

  if (
    user.resetToken &&
    (hashPrefix ? (slice = user.resetToken.indexOf(hashPrefix) > -1) : true)
  ) {
    if (
      !(await bcrypt.compare(
        token,
        slice ? user.resetToken.slice(hashPrefix.length) : user.resetToken
      ))
    )
      throw createError(MSG_INVALID_CREDENTIALS);
  } else throw createError(err.message, err._statusCode);

  if (time.getTime() <= new Date().getTime())
    throw createError(MSG_TOKEN_EXPIRED, 400, HTTP_CODE_TOKEN_EXPIRED);
};

export const validateTokenBody = req => {
  if (!(req.body.token && req.body.email && req.body.password))
    throw "Invalid request body. Expect an email, password and a token";
};

export const validateUserCredentials = async (
  req,
  cookieKey,
  strict = true
) => {
  const cookieValue = req.cookies[cookieKey];

  if (cookieValue) {
    verifyToken(cookieValue, { hasForbidden: true });

    await userExist(req);
  } else req.user = await authUser(req.body, strict);
};
