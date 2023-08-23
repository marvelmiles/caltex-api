import express from "express";
import { verifyToken } from "../middlewares";
import { getInvestments } from "../controllers/user";

const userRouter = express.Router();

userRouter.get("/:userId/investments", verifyToken, getInvestments);

export default userRouter;
