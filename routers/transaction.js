import express from "express";
import {
  createPayPalOrder,
  capturePayPalOrder
} from "../controllers/transaction";

const transactionRouter = express.Router();

transactionRouter
  .post("/create-paypal-order", createPayPalOrder)
  .post("/capture-paypal-order", capturePayPalOrder);

export default transactionRouter;
