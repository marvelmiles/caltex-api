import express from "express";
import { verifyToken, userExist } from "../middlewares";
import { getInvestments, updateUser, getUserById } from "../controllers/user";
import { uploadFile } from "../utils/file-handlers";

const userRouter = express.Router();

userRouter
  .get("/:userId", verifyToken, userExist, getUserById)
  .get("/:userId/investments", verifyToken, userExist, getInvestments)
  .put("/:userId", verifyToken, uploadFile(), updateUser);

export default userRouter;
