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
