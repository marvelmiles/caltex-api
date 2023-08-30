import express from "express";
import { verifyToken, userExist } from "../middlewares";
import {
  getUserInvestmentsById,
  updateUser,
  getUserById,
  getUserTransactionsById
} from "../controllers/user";
import { uploadFile } from "../utils/file-handlers";

const userRouter = express.Router();

userRouter
  .get("/:userId", verifyToken, userExist, getUserById)
  .get("/:userId/investments", verifyToken, userExist, getUserInvestmentsById)
  .get("/:userId/transactions", verifyToken, userExist, getUserTransactionsById)
  .put("/:userId", verifyToken, uploadFile(), updateUser);

export default userRouter;
