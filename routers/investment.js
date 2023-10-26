import express from "express";
import { userExist, verifyToken } from "../middlewares";
import {
  setupUserInvestment,
  getInvestmentById
} from "../controllers/investment";

const investmentRouter = express.Router();

investmentRouter
  .post("/invest", verifyToken, userExist, setupUserInvestment)
  .get("/:investmentId", verifyToken, getInvestmentById);

export default investmentRouter;
