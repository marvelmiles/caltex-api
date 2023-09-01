import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import socket from "./socket";
import { CLIENT_ENDPOINT } from "./config/constants";
import authRouter from "./routers/auth";
import { createError } from "./utils/error";
import { deleteFile } from "./utils/file-handlers";
import path from "path";
import { fileURLToPath } from "url";
import investmentRouter from "./routers/investment";
import userRouter from "./routers/user";
import transactionRouter from "./routers/transaction";
import queryType from "query-types";

// CONFIGURATIONS

dotenv.config();
const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isProdMode = process.env.NODE_ENV === "production";

// MIDDLEWARES

app
  .use(
    cors({
      origin: isProdMode ? CLIENT_ENDPOINT : "*",
      optionsSuccessStatus: 200,
      credentials: true
    })
  )
  .use(
    express.json({
      limit: "200mb",
      extended: true
    })
  )
  .use(express.urlencoded({ extended: true }))
  .use(queryType.middleware())
  .use(cookieParser())
  .use(express.static("public"));

// ROUTES

app
  .use("/api/auth", authRouter)
  .use("/api/investments", investmentRouter)
  .use("/api/users", userRouter)
  .use("/api/transactions", transactionRouter);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    console.warn(
      "[SERVER_ERROR: HEADER SENT]",
      req.headers.origin,
      req.originalUrl,
      " at ",
      new Date()
    );
  } else {
    err = err.status
      ? err
      : (err.message ? (err.url = req.url || "-") : true) && createError(err);

    if (err) res.status(err.status).json(err);
  }

  if (req.file) deleteFile(req.file.publicUrl);

  if (req.files)
    for (const { publicUrl } of req.files) {
      deleteFile(publicUrl);
    }
});

// MONGOOSE SETUP

mongoose
  .connect(process.env[isProdMode ? "MONGODB_PROD_URI" : "MONGODB_DEV_URI"], {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    socket(app);
  })
  .catch(err =>
    console.log(
      `[SERVER_ERROR: DB_CONNECT_ERR] ${
        err.message
      } did not connect at ${new Date()}`
    )
  );
