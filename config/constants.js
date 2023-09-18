import { isProdMode } from "../utils/validators";

export const CLIENT_ORIGIN = isProdMode
  ? "https://stupendous-sorbet-26cfc4.netlify.app"
  : "http://localhost:3000";

export const HTTP_401_MSG = "Authorization credentials is invalid";

export const HTTP_403_MSG = "Access is forbidden";

export const MAIL_USER = "marvellousabidemi2@gmail.com";

export const FIREBASE_BUCKET_NAME = "gs://caltex-api.appspot.com/";

export const SERVER_ORIGIN = isProdMode
  ? "https://caltex-api.onrender.com"
  : "http://localhost:8080";

export const COOKIE_PWD_RESET = "pwd_reset";

export const COOKIE_ACC_VERIFIC = "acc_verification";

export const COOKIE_ACCESS_TOKEN = "access_token";

export const COOKIE_REFRESH_TOKEN = "refresh_token";

export const SESSION_COOKIE_DURATION = {
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

export const HTTP_CODE_ACCOUNT_VERIFICATION_ERROR =
  "ACCOUNT_VERIFICATION_ERROR";

export const HTTP_CODE_MAIL_ERROR = "MAIL_ERROR";
