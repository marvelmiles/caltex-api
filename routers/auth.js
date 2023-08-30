import express from "express";
import {
  signup,
  signin,
  signout,
  recoverPwd,
  verifyUserToken,
  resetPwd,
  refreshToken
} from "../controllers/auth";
import { verifyToken } from "../middlewares";
import { COOKIE_VERIFICATION_TOKEN } from "../constants";

const authRouter = express.Router();

authRouter
  .post("/signup", signup)
  .post("/signin", signin)
  .patch("/signout", verifyToken, signout)
  .post("/recover-password", recoverPwd)
  .post("/verify-token", verifyUserToken)
  .post(
    "/reset-password",
    (req, res, next) =>
      verifyToken(req, { cookieKey: COOKIE_VERIFICATION_TOKEN }, next),
    resetPwd
  )
  .get("/refresh-token", refreshToken);

export default authRouter;
