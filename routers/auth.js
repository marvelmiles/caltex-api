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
  withDevAdminAccess,
  verifyToken,
  userExist,
  verifySuperAdminStatus
} from "../middlewares";

const authRouter = express.Router();

authRouter
  .post("/signup", withDevAdminAccess, signup)
  .post("/signin", signin)
  .post("/recover-password", recoverPwd)
  .post("/verify-token/:reason", verifyUserToken)
  .post("/reset-password", resetPwd)
  .post("/generate-new-token/:reason", generateUserToken)
  .post(
    "/create-admin",
    verifyToken,
    userExist,
    verifySuperAdminStatus,
    createAdmin
  )
  .get("/refresh-token", refreshToken)
  .patch("/signout", signout);

export default authRouter;
