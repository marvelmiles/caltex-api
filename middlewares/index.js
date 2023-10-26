import jwt from "jsonwebtoken";
import { createError } from "../utils/error";
import {
  HTTP_403_MSG,
  HTTP_401_MSG,
  COOKIE_REFRESH_TOKEN,
  COOKIE_ACCESS_TOKEN,
  HTTP_CODE_ACCOUNT_VERIFICATION_ERROR,
  MSG_USER_404,
  HTTP_CODE_UNVERIFIED_KYC
} from "../config/constants";
import User from "../models/User";
import { isObjectId, isObject } from "../utils/validators";
import { deleteFirebaseFile } from "../utils/file-handlers";

export const verifyToken = (req, res = {}, next) => {
  console.log(req.cookies, req.originalUrl, " verify token middleware");

  const {
    cookieKey = COOKIE_ACCESS_TOKEN,
    hasForbidden = cookieKey === COOKIE_REFRESH_TOKEN
  } = res;

  const token = typeof req === "string" ? req : req.cookies[cookieKey];

  const throwErr = next === undefined;

  const handleNextErr = () => {
    const err = createError(
      res.message || (hasForbidden ? HTTP_403_MSG : HTTP_401_MSG),
      res._statusCode || (hasForbidden ? 403 : 401)
    );

    if (throwErr) throw err;
    else next(err);
  };

  if (!token) return handleNextErr();

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return handleNextErr();

    console.log("jwt nexting...");

    if (req.originalUrl) {
      req.user = req.user || user;
      req.body && delete req.body._id;
    }

    !throwErr && next();
  });
};

export const userExist = async (req, res, next) => {
  try {
    const match = {};

    const message = createError(
      MSG_USER_404,
      403,
      HTTP_CODE_ACCOUNT_VERIFICATION_ERROR
    );

    const email = req.body.email || req.body.userHolder || req.user?.email;

    const _id =
      req.params.userId ||
      req.body.userId ||
      req.body.userHolder ||
      req.user?.id;

    console.log(_id, email, isObjectId(_id), "user ecist..is_id");

    if (!(_id || email))
      throw "Invalid request. Expect email or id in body or url";

    if (_id) {
      if (!isObjectId(_id)) throw message;
      match._id = _id;
    } else match.email = email;

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

    if (err) res.status(err.statusCode || err.status).json(err);
  }

  if (req.file) deleteFirebaseFile(req.file.publicUrl);

  if (req.files) {
    const deleteFiles = (files = req.files) => {
      for (const { publicUrl } of files) {
        deleteFirebaseFile(publicUrl);
      }
    };

    if (isObject(req.files)) {
      for (const key in req.files) {
        deleteFiles(req.files[key]);
      }
    } else deleteFiles();
  }
};

export const withDevAdminAccess = (req, res, next) => {
  try {
    if (req.body.cred && req.body.cred !== process.env.ADMIN_AUTH_KEY)
      throw createError(HTTP_403_MSG, 403);

    next();
  } catch (err) {
    next(err);
  }
};

export const verifyAdminStatus = async (req, res, next) => {
  try {
    console.log("admin id ", req.user.id);

    if (!req.user.email) req.user = await User.findById(req.user.id);

    if (!req.user?.isAdmin) throw createError(HTTP_403_MSG, 403);

    next();
  } catch (err) {
    next(err);
  }
};

export const verifySuperAdminStatus = async (req, res, next) => {
  try {
    console.log("admin id ", req.user.id);

    if (!req.user.email) req.user = await User.findById(req.user.id);

    if (!(req.user.isAdmin && req.user.isSuperAdmin))
      throw createError(HTTP_403_MSG, 403);

    next();
  } catch (err) {
    next(err);
  }
};

export const verifyUserIdMatch = (req, res, next) => {
  try {
    const uid = req.params.userId;

    console.log(uid, req.user.id, "id match check...");

    if (!uid || !isObjectId(uid)) throw "Invalid user id";

    if (uid !== req.user.id)
      throw createError(
        {
          message: HTTP_403_MSG,
          details: {
            message: "Conflict between authenticated user and request user id"
          }
        },
        403
      );

    next();
  } catch (err) {
    next(err);
  }
};

export const verifyKyc = (req, res, next) => {
  try {
    if (!(Object.keys(req.user.kycDocs).length || Object.keys(req.user.kycIds)))
      throw createError(
        "Invalid request. Your need to complete your profile verification.",
        400,
        HTTP_CODE_UNVERIFIED_KYC
      );

    next();
  } catch (err) {
    next(err);
  }
};
