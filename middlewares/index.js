import jwt from "jsonwebtoken";
import { createError } from "../utils/error";
import { TOKEN_INVALID_MSG } from "../constants";
import User from "../models/User";
import { isObjectId } from "../utils/validators";

export const verifyToken = (req, res = {}, next) => {
  const { applyRefresh, cookieKey = "access_token" } = res;
  const rToken = req.cookies.refresh_token
    ? JSON.parse(req.cookies.refresh_token)
    : undefined;

  const token = applyRefresh ? rToken?.jwt : req.cookies[cookieKey];

  const status = applyRefresh ? 403 : 401;
  const throwErr = next === undefined;

  if (!token) {
    const err = createError(TOKEN_INVALID_MSG, status);
    if (throwErr) throw err;
    else next(err);
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      err = createError(
        applyRefresh ? HTTP_403_MSG : TOKEN_INVALID_MSG,
        status
      );
      if (throwErr) throw err;
      else next(err);
      return;
    }
    req.user = user;
    req.body && delete req.body._id;
    !throwErr && next();
  });
};

export const userExist = async (req, res, next) => {
  try {
    const uid = req.body.userId;

    if (!uid || !isObjectId(uid)) throw "Invalid user id";

    if (!(await User.findById(uid))) throw "User doesn't exist";

    next();
  } catch (err) {
    next(err);
  }
};
