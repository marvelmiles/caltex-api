import jwt from "jsonwebtoken";
import { createError } from "../utils/error";
import {
  HTTP_403_MSG,
  HTTP_401_MSG,
  COOKIE_REFRESH_TOKEN,
  COOKIE_ACCESS_TOKEN,
  HTTP_CODE_ACCOUNT_VERIFICATION_ERROR
} from "../config/constants";
import User from "../models/User";
import { isObjectId } from "../utils/validators";

export const verifyToken = (req, res = {}, next) => {
  console.log(req.cookies, req.originalUrl, " verify token");

  const {
    cookieKey = COOKIE_ACCESS_TOKEN,
    hasForbidden = cookieKey === COOKIE_REFRESH_TOKEN
  } = res;

  const token = req.cookies[cookieKey];

  const throwErr = next === undefined;

  const handleNextErr = () => {
    const err = createError(
      hasForbidden ? HTTP_403_MSG : HTTP_401_MSG,
      hasForbidden ? 403 : 401
    );

    if (throwErr) throw err;
    else next(err);
  };

  if (!token) return handleNextErr();

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return handleNextErr();
    
    console.log("nexting...");
    
    req.user = req.user || user;
    req.body && delete req.body._id;
    !throwErr && next();
  });
};

export const userExist = async (req, res, next) => {
  try {
    const match = {};

    const message = createError(
      "Account isn't registered with us!",
      403,
      HTTP_CODE_ACCOUNT_VERIFICATION_ERROR
    );

    const email = req.body.email || req.user?.email;

    const _id = req.params.userId || req.body.userId || req.user?.id;

    if (!(_id || email))
      throw "Invalid request. Expect email or id in body or url";

    if (_id) {
      if (!isObjectId(_id)) throw message;
      match._id = _id;
    } else if (email) match.email = email;
    else {
      match.$or = [
        {
          email: email || req.body.placeholder
        },
        {
          _id: _id || req.body.placeholder
        }
      ];
    }

    if (!(req.user = await User.findOne(match))) throw message;

    if (next) next();
  } catch (err) {
    if (next) next(err);
    else throw err;
  }
};

export const errHandler = (err, req, res, next) => {
  if (res.headersSent) {
    console.warn(
      "[SERVER_ERROR: HEADER SENT]",
      req.headers.origin,
      req.originalUrl,
      " at ",
      new Date()
    );
  } else {
    if (req.timedout)
      err = createError(
        {
          message: err.message,
          code: err.code,
          details: {
            timeout: err.timeout
          }
        },
        err.statusCode
      );

    err = err.statusCode
      ? err
      : (err.message ? (err.url = req.url || "-") : true) && createError(err);

    if (err) res.status(err.statusCode).json(err);
  }

  if (req.file) deleteFile(req.file.publicUrl);

  if (req.files)
    for (const { publicUrl } of req.files) {
      deleteFile(publicUrl);
    }
};
