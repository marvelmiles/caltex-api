import mongoose from "mongoose";
import dotenv from "dotenv";
import { replaceString } from "./serializers";

dotenv.config();

export const isProdMode = process.env.NODE_ENV === "production";

export const isEmail = str => {
  return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i.test(
    str
  );
};

export const isObjectId = id => mongoose.isObjectIdOrHexString(id);

export const isTodayDate = function(v) {
  const uDate = new Date(v);
  const date = new Date();

  const isT =
    uDate.getFullYear() === date.getFullYear() &&
    uDate.getMonth() >= date.getMonth() &&
    uDate.getDate() >= date.getDate();

  console.log(isT, v, uDate, date, " is today...v...vDate...date");
  console.log(
    uDate.getFullYear(),
    date.getFullYear(),
    uDate.getMonth(),
    date.getMonth(),
    uDate.getDate(),
    date.getDate()
  );
  return isT;
};

export const isPassword = password => {
  if (password.length < 8) return "Weak";

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/\-|=]/.test(password);

  let msg = "";

  if (!hasUpperCase) msg += "Password should contain an uppercase";

  if (!hasLowerCase)
    msg += msg.length ? ", lowercase" : "Password should contain a lowercase";

  if (!hasNumbers)
    msg += msg.length ? ", number" : "Passwrod should contain a number";

  if (!hasSymbols)
    msg += msg.length ? ", symbol" : "Password should contain a symbol";

  if (msg) msg = replaceString(msg, ",", " and a");

  return msg;
};

export const isObject = obj =>
  obj &&
  (typeof obj.toString === "function"
    ? obj.toString() === "[object Object]"
    : typeof obj === "object" && obj.length === undefined);
