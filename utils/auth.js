import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";

export const setSessionCookies = async (res, id, rememberMe, accessOnly) => {
  rememberMe = rememberMe === "true";

  const shortT = new Date();
  const longT = new Date();

  if (id) {
    shortT.setMinutes(shortT.getMinutes() + 30);

    if (rememberMe) longT.setDate(longT.getDate() + 28);
    else longT.setHours(longT.getHours() + 6);
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
            expiresIn: "10m"
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
              { expiresIn: "15m" }
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
