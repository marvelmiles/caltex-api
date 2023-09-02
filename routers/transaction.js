import express from "express";
import {
  captureStipeWebhook,
  processFiatPayment,
  processCryptoPayment,
  captureCoinbaseWebhook
} from "../controllers/transaction";
import { verifyToken, userExist } from "../middlewares";

const transactionRouter = express.Router();

transactionRouter
  .post("/process-fiat-payment", verifyToken, userExist, processFiatPayment)
  .post("/webhooks/stripe", captureStipeWebhook)
  .post("/process-crypto-payment", verifyToken, userExist, processCryptoPayment)
  .post("/webhooks/coinbase", captureCoinbaseWebhook);

export default transactionRouter;
