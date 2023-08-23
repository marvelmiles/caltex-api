import mongoose from "mongoose";

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
