import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { setFutureDate } from ".";
import User from "../models/User";
import { createError } from "./error";
import { HTTP_401_MSG } from "../config/constants";

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
      httpOnly: true,
      expires
    }
  );
};

export const deleteCookie = (name, res) => {
  const expires = new Date();
  expires.setFullYear(1990);
  res.cookie(name, "", { httpOnly: true, expires });
};

export const authUser = async ({ email, password }) => {
  if (!email && !password) throw "Invalid body. Expect email and password";

  const user = await User.findOne({ email });

  if (!user) throw createError(HTTP_401_MSG, 401);

  if (!(await bcrypt.compare(password, user.password)))
    throw "Invalid credentials!";

  return user;
};
