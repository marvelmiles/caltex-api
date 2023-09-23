import express from "express";
import { verifyToken, userExist } from "../middlewares";
import {
  getUserInvestmentsById,
  updateUserById,
  getUserById,
  getUserTransactionsById,
  verifyUserIdentity,
  getUserTransactionMetrics
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
  .put("/:userId", verifyToken, uploadFile(), updateUserById);

export default userRouter;
