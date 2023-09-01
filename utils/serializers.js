import { generateRandomCode, generateHmac } from "./auth";

export const generateUserToken = (
  user,
  milliseconds = Date.now() + 3600000 // 1 hour
) => {
  const token = generateRandomCode();
  user.resetToken = generateHmac(token);
  user.resetDate = milliseconds;
  return token;
};

export const convertToCamelCase = obj => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertToCamelCase(item));
  }

  const camelObj = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      camelObj[camelKey] = convertToCamelCase(obj[key]);
    }
  }

  return camelObj;
};

export const serializePaymentObject = payment => {
  payment.metadata.investment &&
    (payment.metadata.investment = JSON.parse(payment.metadata.investment));

  payment.metadata.transaction &&
    (payment.metadata.transaction = JSON.parse(payment.metadata.transaction));

  return payment;
};
