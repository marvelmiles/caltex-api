import express from "express";
import {
  captureStipeWebhook,
  processFiatPayment,
  processCryptoPayment,
  captureCoinbaseWebhook,
  recordCrypoPayment,
  getAllTransactions,
  updateTransactionStatus,
  requestWithdraw,
  getTransactionById,
} from "../controllers/transaction";
import {
  verifyToken,
  userExist,
  verifyAdminStatus,
  verifyKyc,
} from "../middlewares";
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
      defaultFieldName: "payment-proof",
    }),
    recordCrypoPayment
  )
  .post(
    "/request-withdrawal",
    verifyToken,
    userExist,
    verifyKyc,
    requestWithdraw
  )
  .get("/:transId", verifyToken, userExist, getTransactionById)
  .get("/", verifyToken, userExist, verifyAdminStatus, getAllTransactions)
  .patch(
    "/:transId/:status",
    verifyToken,
    userExist,
    verifyAdminStatus,
    updateTransactionStatus
  );

export default transactionRouter;
