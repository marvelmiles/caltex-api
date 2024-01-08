// using schema path set for validation and updating because updateOne
// pre middleware lacks this.invalidate and throwing error crash the server

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import socket from "./socket";
import { CLIENT_ORIGIN, SERVER_ORIGIN } from "./config/constants";
import authRouter from "./routers/auth";
import { createError } from "./utils/error";
import investmentRouter from "./routers/investment";
import userRouter from "./routers/user";
import transactionRouter from "./routers/transaction";
import queryType from "query-types";
import { isProdMode } from "./utils/validators";
import timeout from "connect-timeout";
import { errHandler } from "./middlewares";
import miscRouter from "./routers/misc";

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
        const allowedOrigins = [
          CLIENT_ORIGIN.toLowerCase(),
          SERVER_ORIGIN.toLowerCase(),
        ];

        console.log(origin, allowedOrigins, isProdMode, "origin prodeMode");

        if (!origin || allowedOrigins.includes(origin.toLowerCase()))
          callback(null, true);
        else callback(createError(`${origin} not allowed by CORS`, 403));
      },
    })
  )
  .use(
    express.json({
      limit: "200mb",
      extended: true,
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
  .use("/api/transactions", transactionRouter)
  .use("/api", miscRouter);

// MONGOOSE SETUP

console.log(
  process.env[isProdMode ? "MONGODB_PROD_URI" : "MONGODB_DEV_URI"],
  process.env.MONGODB_PROD_URI
);

mongoose
  .connect(process.env[isProdMode ? "MONGODB_PROD_URI" : "MONGODB_DEV_URI"], {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    socket(app);
  })
  .catch((err) =>
    console.log(
      `[SERVER_ERROR: DB_CONNECT_ERR] ${
        err.message
      } did not connect at ${new Date()}`
    )
  );

app.use(errHandler);
