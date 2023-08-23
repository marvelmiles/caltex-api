import express from "express";
import { userExist, verifyToken } from "../middlewares";
import {
  setupUserInvestment,
  getInvestmentById
} from "../controllers/investment";

const investmentRouter = express.Router();

investmentRouter
  .post("/invest", userExist, verifyToken, setupUserInvestment)
  .get("/:investmentId", verifyToken, getInvestmentById);

export default investmentRouter;
