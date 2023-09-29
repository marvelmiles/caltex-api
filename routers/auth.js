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

const authRouter = express.Router();

authRouter
  .post("/signup", signup)
  .post("/signin", signin)
  .patch("/signout", signout)
  .post("/recover-password", recoverPwd)
  .post("/verify-token/:reason", verifyUserToken)
  .post("/reset-password", resetPwd)
  .get("/refresh-token", refreshToken)
  .post("/generate-new-token/:reason", generateUserToken);

export default authRouter;
