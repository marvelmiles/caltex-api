import { isProdMode } from "../utils/validators";

export const CLIENT_ORIGIN = isProdMode
  ? "https://stupendous-sorbet-26cfc4.netlify.app"
  : "http://localhost:3000";

export const HTTP_401_MSG = "Authorization credentials is invalid";

export const HTTP_403_MSG = "Access is forbidden";

export const HTTP_CODE_ACCOUNT_VERIFICATION_ERROR =
  "ACCOUNT_VERIFICATION_ERROR";

export const HTTP_CODE_VALIDATION_ERROR = "ValidationError";

export const HTTP_CODE_MAIL_ERROR = "MAIL_ERROR";

export const HTTP_CODE_TOKEN_EXPIRED = "TOKEN_EXPIRED";

export const HTTP_CODE_INSUFFICENT_FUNDS = "INSUFFICIENT_FUNDS";

export const HTTP_CODE_CREDIT_ERROR = "CREDIT_ERROR";

export const HTTP_CODE_DEBIT_ERROR = "DEBIT_ERROR";

export const HTTP_CODE_REWARD_ERROR = "REWARD_ERROR";

export const HTTP_CODE_UNVERIFIED_EMAIL = "UNVERIFIED_EMAIL";

export const MSG_INVALID_CREDENTIALS = "Invalid credentials!";

export const MSG_TOKEN_EXPIRED = "Token expired";

export const MSG_USER_404 = "Account isn't registered with us!";

// "caltextrader@gmail.com";
// "marvellousabidemi2@gmail.com";

export const MAIL_USER = "caltextrader@gmail.com";

export const FIREBASE_BUCKET_NAME = "gs://caltex-api.appspot.com/";

export const SERVER_ORIGIN = isProdMode
  ? "https://caltex-api.onrender.com"
  : "http://localhost:8080";

export const COOKIE_PWD_RESET = "pwd_reset";

export const COOKIE_ACC_VERIFIC = "acc_verification";

export const COOKIE_ACCESS_TOKEN = "access_token";

export const COOKIE_REFRESH_TOKEN = "refresh_token";

export const COOKIE_TOKEN_VERIFICATION_KEY = "token_verification";

export const SESSION_COOKIE_DURATION = {
  shortLived: {
    duration: 5,
    type: "m"
  },
  accessToken: {
    duration: 15,
    type: "h"
  },
  refreshToken: {
    extend: 28,
    duration: 5,
    type: "d"
  }
};

export const MSG_INSUFFICIENT_FUND =
  "Failed to process request. Insufficient funds!";
