export const CLIENT_ENDPOINT = "http://localhost:8080/client-test.html";

export const COOKIE_VERIFICATION_TOKEN = "verification_access_token";

export const TOKEN_INVALID_MSG = "Authorization credentials is invalid";

export const MAIL_USER = "marvellousabidemi2@gmail.com";

export const FIREBASE_BUCKET_NAME = "gs://caltex-api.appspot.com/";

export const COINGATE_BASE_URL = "https://api-sandbox.coingate.com/v2";

export const SERVER_DOMAIN =
  process.env.NODE_ENV === "production"
    ? "https://caltex-api.onrender.com"
    : "http://localhost:8080";
