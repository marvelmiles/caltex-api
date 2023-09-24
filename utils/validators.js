import mongoose from "mongoose";
import { HTTP_401_MSG } from "../config/constants";
import bcrypt from "bcrypt";
import { createError } from "./error";
import dotenv from "dotenv";

dotenv.config();

export const isProdMode = process.env.NODE_ENV === "production";

export const isEmail = str => {
  return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i.test(
    str
  );
};

export const isObjectId = id => mongoose.isValidObjectId(id);

export const isTodayDate = function(v) {
  const uDate = new Date(v);
  const date = new Date();

  const isT =
    uDate.getFullYear() === date.getFullYear() &&
    uDate.getMonth() >= date.getMonth() &&
    uDate.getDate() >= date.getDate();

  console.log(isT, v, uDate, date, " is today...v...vDate...date");

  return isT;
};

export const isPassword = password => {
  if (password.length < 8) return "Weak";

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/\-|=]/.test(password);

  const mixedCharactersCount = [
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSymbols
  ].filter(Boolean).length;

  if (mixedCharactersCount === 4) return "Strong";
  else if (mixedCharactersCount >= 2) return "Medium";
  else return "Weak";
};

export const validateUserToken = async (user, token) => {
  if (!user || !user.resetToken) throw createError(HTTP_401_MSG, 401);

  const time = new Date(user.resetDate);

  if (!(await bcrypt.compare(token, user.resetToken)))
    throw createError(HTTP_401_MSG, 401);

  if (time.getTime() <= new Date().getTime())
    throw createError("Token expired", 401, "TOKEN_EXPIRED");
};
