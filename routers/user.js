import express from "express";
import { verifyToken, userExist, verifyAdminStatus } from "../middlewares";
import {
  getUserInvestmentsById,
  updateUserById,
  getUserById,
  getUserTransactionsById,
  verifyUserIdentity,
  getUserTransactionMetrics,
  getAllUsers
} from "../controllers/user";
import { uploadFile } from "../utils/file-handlers";

const userRouter = express.Router();

userRouter
  .post("/verify", verifyToken, userExist, verifyUserIdentity)
  .get("/:userId", verifyToken, userExist, getUserById)
  .get("/:userId/investments", verifyToken, userExist, getUserInvestmentsById)
  .get("/:userId/transactions", verifyToken, userExist, getUserTransactionsById)
  .get(
    "/:userId/transaction-metrics",
    verifyToken,
    userExist,
    getUserTransactionMetrics
  )
  .get("/", verifyToken, userExist, verifyAdminStatus, getAllUsers)
  .put("/:userId", verifyToken, uploadFile(), updateUserById);

export default userRouter;
