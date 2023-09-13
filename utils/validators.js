import mongoose from "mongoose";
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
  return (
    uDate.getFullYear() === date.getFullYear() &&
    uDate.getMonth() >= date.getMonth() &&
    uDate.getDate() >= date.getDate()
  );
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
