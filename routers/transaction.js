import express from "express";
import {
  captureStipeWebhook,
  processFiatPayment,
  processCryptoPayment,
  captureCoinbaseWebhook,
  recordCrypoPayment
} from "../controllers/transaction";
import { verifyToken, userExist } from "../middlewares";
import { uploadFile } from "../utils/file-handlers";

const transactionRouter = express.Router();

transactionRouter
  .post("/process-fiat-payment", verifyToken, userExist, processFiatPayment)
  .post("/webhooks/stripe", captureStipeWebhook)
  .post("/process-crypto-payment", verifyToken, userExist, processCryptoPayment)
  .post("/webhooks/coinbase", captureCoinbaseWebhook)
  .post(
    "/record-crypto-payment",
    verifyToken,
    userExist,
    uploadFile({
      dirPath: "transactions/crypto",
      defaultFieldName: "payment-proof"
    }),
    recordCrypoPayment
  );

export default transactionRouter;
