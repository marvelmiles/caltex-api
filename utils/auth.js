import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { setFutureDate } from ".";
import User from "../models/User";
import { createError } from "./error";
import {
  HTTP_401_MSG,
  MSG_INVALID_CREDENTIALS,
  MSG_TOKEN_EXPIRED,
  HTTP_CODE_TOKEN_EXPIRED,
  COOKIE_PWD_RESET
} from "../config/constants";
import { verifyToken, userExist } from "../middlewares";
import { isProdMode } from "./validators";
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
  res.cookie(name, "", { httpOnly: true, expires });
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
  console.log(isProdMode, "is prod mode...");

  res.cookie(
    name,
    jwt.sign({ id: uid }, process.env.JWT_SECRET, {
      expiresIn: duration + type
    }),
    {
      expires,
      httpOnly: true,
      sameSite: isProdMode ? "None" : "Lax", // allow xSite not from clicking link (top level nav)
      secure: isProdMode
    }
  );
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
  else await authUser(user, false);

  hashPrefix = hashPrefix ? `caltex_${hashPrefix}_` : "";

  console.log(
    "prefix found...cookieval...cookiename...",
    user.resetToken.indexOf(hashPrefix) > -1,
    cookieValue,
    hashPrefix
  );

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
      throw createError(MSG_INVALID_CREDENTIALS);
  } else throw createError(err.message, err._statusCode);

  if (time.getTime() <= new Date().getTime())
    throw createError(MSG_TOKEN_EXPIRED, 400, HTTP_CODE_TOKEN_EXPIRED);
};

export const validateTokenBody = (req, withPwd = true) => {
  if (
    !(req.body.token && req.body.email && (withPwd ? req.body.password : true))
  )
    throw `Invalid request body. Expect an email${
      withPwd ? ", password" : ""
    } and a token`;
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

// (async () => {
//   console.log(await generateBcryptHash("@superAdmin1"));
// })();
