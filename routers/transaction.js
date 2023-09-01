import express from "express";
import {
  captureStipeWebhook,
  processFiatPayment,
  processCryptoPayment,
  captureCoinbaseWebhook
} from "../controllers/transaction";

const transactionRouter = express.Router();

transactionRouter
  .post("/process-fiat-payment", processFiatPayment)
  .post("/webhooks/stripe", captureStipeWebhook)
  .post("/process-crypto-payment", processCryptoPayment)
  .post("/webhooks/coinbase", captureCoinbaseWebhook);

export default transactionRouter;
