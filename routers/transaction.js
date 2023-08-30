import express from "express";
import {
  createCryptoOrder,
  captureCryptoOrder,
  captureStipeWebhook,
  processPayment
} from "../controllers/transaction";

const transactionRouter = express.Router();

transactionRouter
  .use("/success.html", express.static("public/success.html"))
  .use("/cancel.html", express.static("public/cancel.html"))
  .post("/process-payment", processPayment)
  .post("/stripe-webhook", captureStipeWebhook)
  .post("/create-crypto-order", createCryptoOrder)
  .post("/orders/:orderId/capture-crypto-order", captureCryptoOrder);

export default transactionRouter;
