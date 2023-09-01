import express from "express";
import {
  captureStipeWebhook,
  processFiatPayment,
  processCryptoPayment,
  captureCoinbaseWebhook
} from "../controllers/transaction";
import { verifyToken } from "../middlewares";

const transactionRouter = express.Router();

transactionRouter
  .post("/process-fiat-payment", verifyToken, processFiatPayment)
  .post("/webhooks/stripe", captureStipeWebhook)
  .post("/process-crypto-payment", verifyToken, processCryptoPayment)
  .post("/webhooks/coinbase", captureCoinbaseWebhook);

export default transactionRouter;
