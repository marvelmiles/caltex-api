import { generateUUID, generateBcryptHash } from "./auth";
import User from "../models/User";

export const serializeUserToken = async (
  user,
  hashPrefix = "",
  milliseconds = Date.now() + 60 * 1000 * 15
) => {
  let token;

  do {
    token = generateUUID(false);
    user.resetToken =
      `${hashPrefix ? `caltex_${hashPrefix}_` : ""}` +
      (await generateBcryptHash(token));

    user.resetDate = new Date(milliseconds);
  } while (
    await User.findOne({
      resetToken: user.resetToken
    })
  );

  console.log("new u token...", token);

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

export const convertExponentToLarge = numIn => {
  // code by Mohsen Alyafei satckoverflow
  // https://stackoverflow.com/questions/18719775/parsing-and-converting-exponential-values-to-decimal-in-javascript

  numIn += ""; // To cater to numric entries
  var sign = ""; // To remember the number sign
  numIn.charAt(0) == "-" && ((numIn = numIn.substring(1)), (sign = "-")); // remove - sign & remember it
  var str = numIn.split(/[eE]/g); // Split numberic string at e or E
  if (str.length < 2) return sign + numIn; // Not an Exponent Number? Exit with orginal Num back
  var power = str[1]; // Get Exponent (Power) (could be + or -)

  var deciSp = (1.1).toLocaleString().substring(1, 2); // Get Deciaml Separator
  str = str[0].split(deciSp); // Split the Base Number into LH and RH at the decimal point
  var baseRH = str[1] || "", // RH Base part. Make sure we have a RH fraction else ""
    baseLH = str[0]; // LH base part.

  if (power >= 0) {
    // ------- Positive Exponents (Process the RH Base Part)
    if (power > baseRH.length) baseRH += "0".repeat(power - baseRH.length); // Pad with "0" at RH
    baseRH = baseRH.slice(0, power) + deciSp + baseRH.slice(power); // Insert decSep at the correct place into RH base
    if (baseRH.charAt(baseRH.length - 1) == deciSp)
      baseRH = baseRH.slice(0, -1); // If decSep at RH end? => remove it
  } else {
    // ------- Negative exponents (Process the LH Base Part)
    num = Math.abs(power) - baseLH.length; // Delta necessary 0's
    if (num > 0) baseLH = "0".repeat(num) + baseLH; // Pad with "0" at LH
    baseLH = baseLH.slice(0, power) + deciSp + baseLH.slice(power); // Insert "." at the correct place into LH base
    if (baseLH.charAt(0) == deciSp) baseLH = "0" + baseLH; // If decSep at LH most? => add "0"
  }
  // Rremove leading and trailing 0's and Return the long number (with sign)
  return sign + (baseLH + baseRH).replace(/^0*(\d+|\d+\.\d+?)\.?0*$/, "$1");
};

export const replaceString = (inputString, oldInput, newInput = "") => {
  const lastIndex = inputString.lastIndexOf(oldInput);

  if (lastIndex !== -1) {
    return (
      inputString.substring(0, lastIndex) +
      newInput +
      inputString.substring(lastIndex + 1)
    );
  }

  return inputString;
};

export const serializeUserRefferalCode = async user => {
  let code;

  do {
    code = generateUUID();
  } while (!!(await User.findOne({ referralCode: code })));

  user.referralCode = code;
};

// (async () => {
//   const users = await User.find({});

//   for (const u of users) {
//     await u.updateOne({
//       referralCode: u.referralCode || (await serializeUserRefferalCode()),
//       referrals: []
//     });
//   }
// })();
