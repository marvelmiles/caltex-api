import { isProdMode } from "../utils/validators";

export const CLIENT_ENDPOINT = isProdMode
  ? "https://caltex-api.onrender.com"
  : "http://localhost:8080";

export const COOKIE_VERIFICATION_TOKEN = "verification_access_token";

export const TOKEN_INVALID_MSG = "Authorization credentials is invalid";

export const MAIL_USER = "marvellousabidemi2@gmail.com";

export const FIREBASE_BUCKET_NAME = "gs://caltex-api.appspot.com/";

export const SERVER_DOMAIN = isProdMode
  ? "https://caltex-api.onrender.com"
  : "http://localhost:8080";
