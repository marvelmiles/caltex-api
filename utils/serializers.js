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

export const createObjBody = obj => {
  switch (obj.object) {
    case "payment_intent":
      return {
        id: obj.id,
        amountReceived: obj.amount_received,
        amount: obj.amount,
        desc: obj.description,
        clientSecret: obj.client_secret,
        currency: obj.currency,
        created: obj.created
      };
    default:
      return {};
  }
};
