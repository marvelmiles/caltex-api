import express from "express";
import {
  createPayPalOrder,
  capturePayPalOrder,
  createCryptoOrder
} from "../controllers/transaction";

const transactionRouter = express.Router();

transactionRouter
  .post("/create-paypal-order", createPayPalOrder)
  .post("/capture-paypal-order", capturePayPalOrder)
  .post("/create-crypto-order", createCryptoOrder);

export default transactionRouter;
