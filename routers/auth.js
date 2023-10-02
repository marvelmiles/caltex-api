import express from "express";
import {
  signup,
  signin,
  signout,
  recoverPwd,
  verifyUserToken,
  resetPwd,
  refreshToken,
  generateUserToken,
  createAdmin
} from "../controllers/auth";
import {
  withAdminAccess,
  verifyToken,
  userExist,
  verifyAdminStatus
} from "../middlewares";

const authRouter = express.Router();

authRouter
  .post("/signup", withAdminAccess, signup)
  .post("/signin", signin)
  .post("/recover-password", recoverPwd)
  .post("/verify-token/:reason", verifyUserToken)
  .post("/reset-password", resetPwd)
  .post("/generate-new-token/:reason", generateUserToken)
  .post("/create-admin", verifyToken, userExist, verifyAdminStatus, createAdmin)
  .get("/refresh-token", refreshToken)
  .patch("/signout", signout);

export default authRouter;
