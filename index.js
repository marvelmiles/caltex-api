import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import socket from "./socket";
import { CLIENT_ORIGIN, SERVER_ORIGIN } from "./config/constants";
import authRouter from "./routers/auth";
import { createError } from "./utils/error";
import { deleteFile } from "./utils/file-handlers";
import investmentRouter from "./routers/investment";
import userRouter from "./routers/user";
import transactionRouter from "./routers/transaction";
import queryType from "query-types";
import { isProdMode } from "./utils/validators";
import timeout from "connect-timeout";
import { errHandler } from "./middlewares";

// CONFIGURATIONS

dotenv.config();
const app = express();

// MIDDLEWARES

app
  .use(cookieParser())
  .use(
    cors({
      optionsSuccessStatus: 200,
      credentials: true,
      origin: (origin = "", callback) => {
        console.log(origin, "origin");
        const allowedOrigins = [CLIENT_ORIGIN, SERVER_ORIGIN];

        if (!origin || true || allowedOrigins.includes(origin)) {
          callback(null, true); // Allow the request
        } else {
          callback(createError(`${origin} not allowed by CORS`, 403)); // Deny the request
        }
      }
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
  .use(express.static("public"))
  .use(timeout("60s"));

// ROUTES

app
  .use("/api/auth", authRouter)
  .use("/api/investments", investmentRouter)
  .use("/api/users", userRouter)
  .use("/api/transactions", transactionRouter);

app.use(errHandler);

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
