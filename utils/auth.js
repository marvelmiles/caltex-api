import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { setFutureDate } from ".";

export const setSessionCookies = async (res, id, rememberMe, accessOnly) => {
  rememberMe = rememberMe === "true";

  const shortT = new Date();
  let longT = new Date();

  if (id) {
    if (rememberMe || true) shortT.setHours(shortT.getHours() + 15);
    else shortT.setMinutes(shortT.getMinutes() + 15);

    longT = setFutureDate(rememberMe ? 28 : 5);
  } else {
    shortT.setFullYear(1990);
    longT.setFullYear(1990);
  }

  res.cookie(
    "access_token",
    id
      ? jwt.sign(
          {
            id
          },
          process.env.JWT_SECRET,
          {
            expiresIn: rememberMe ? "1h" : "15h"
          }
        )
      : "",
    {
      httpOnly: true,
      expires: shortT
    }
  );

  if (!accessOnly)
    res.cookie(
      "refresh_token",
      id // stringify because of socket.io
        ? JSON.stringify({
            jwt: jwt.sign(
              {
                id
              },
              process.env.JWT_SECRET,
              { expiresIn: rememberMe ? "28d" : "5d" }
            ),
            rememberMe
          })
        : "",
      {
        httpOnly: true,
        expires: longT
      }
    );
};

export const generateRandomCode = () =>
  Math.floor(100000 + Math.random() * 900000);

export const generateBcryptHash = async (str, rounds = 10) => {
  return await bcrypt.hash(str + "", await bcrypt.genSalt(rounds));
};

// need this function because i want same hash for a string
export const generateHmac = (input, secret = process.env.JWT_SECRET) => {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(input + "");
  return hmac.digest("hex");
};

export const generatePaymentAccessToken = async (url, config) => {
  const response = await fetch(url, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${config.auth}`
    }
  });
  const data = await response.json();

  return data.access_token;
};
