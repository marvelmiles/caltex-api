import { generateRandomCode, generateBcryptHash } from "./auth";
import User from "../models/User";

export const serializeUserToken = async (
  user,
  milliseconds = Date.now() + 60000 // 60 secs
) => {
  let token;

  do {
    token = generateRandomCode();
    user.resetToken = await generateBcryptHash(token);
    user.resetDate = milliseconds;
  } while (
    await User.findOne({
      resetToken: user.resetToken
    })
  );

  return token;
};

export const serializePaymentObject = payment => {
  payment.metadata.investment &&
    (payment.metadata.investment = JSON.parse(payment.metadata.investment));

  payment.metadata.transaction &&
    (payment.metadata.transaction = JSON.parse(payment.metadata.transaction));

  return payment;
};

export const createInvestmentDesc = investment =>
  investment
    ? `Caltex ${investment.duration} day${investment.duration > 1 ? "s" : ""} ${
        investment.tradeType
      } ${investment.plan} plan investment`
    : "";

export const createInEqualityQuery = (
  str,
  key,
  query = {},
  castFn = Number
) => {
  let index = 0;
  const op =
    { ">": ">", "<": "<" }[str[0]] + (str[1] === "=" ? (index = 2) && "=" : "");

  str = str.slice(index);

  str = castFn.name === "Date" ? new castFn(str) : castFn(str);

  switch (op) {
    case ">":
      query[key] = { $gt: str };
      break;
    case ">=":
      query[key] = { $gte: str };
      break;
    case "<":
      query[key] = { $lt: str };
      break;
    case "<=":
      query[key] = { $lte: str };
      break;
    default:
      query[key] = str;
      break;
  }

  return query;
};
