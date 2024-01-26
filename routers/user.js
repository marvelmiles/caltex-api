import express from "express";
import {
  verifyToken,
  userExist,
  verifyAdminStatus,
  verifyUserIdMatch,
} from "../middlewares";
import {
  getUserInvestmentsById,
  updateUserById,
  getUserById,
  getUserTransactionsById,
  getUserTransactionMetrics,
  getAllUsers,
  deleteUser,
  updateUserKycStatus,
} from "../controllers/user";
import { uploadFile } from "../utils/file-handlers";

const userRouter = express.Router();

userRouter
  .get("/:userId", verifyToken, userExist, getUserById)
  .get("/:userId/investments", verifyToken, userExist, getUserInvestmentsById)
  .get("/:userId/transactions", verifyToken, userExist, getUserTransactionsById)
  .get(
    "/:userId/transaction-metrics",
    verifyToken,
    verifyUserIdMatch,
    userExist,
    getUserTransactionMetrics
  )
  .get("/", verifyToken, userExist, verifyAdminStatus, getAllUsers)
  .put(
    "/:userId",
    verifyToken,
    verifyUserIdMatch,
    uploadFile({ bodySet: "docs" }),
    updateUserById
  )
  .patch(
    "/:userId/kyc/:reason",
    verifyToken,
    verifyAdminStatus,
    updateUserKycStatus
  )
  .delete("/:userId", verifyToken, verifyAdminStatus, deleteUser);

export default userRouter;
