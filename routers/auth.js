import express from "express";
import {
  signup,
  signin,
  signout,
  recoverPwd,
  verifyUserToken,
  resetPwd,
  refreshToken,
  generateUserToken
} from "../controllers/auth";
import { verifyToken, userExist } from "../middlewares";

const authRouter = express.Router();

authRouter
  .post("/signup", signup)
  .post("/signin", signin)
  .patch("/signout", verifyToken, signout)
  .post("/recover-password", recoverPwd)
  .post("/verify-token", verifyUserToken)
  .post("/reset-password", resetPwd)
  .get("/refresh-token", refreshToken)
  .get("/generate-new-token", userExist, generateUserToken);

export default authRouter;
