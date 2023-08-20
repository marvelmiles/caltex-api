import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import socket from "./socket";
import { CLIENT_ENDPOINT } from "./constants";
import authRouter from "./routers/auth";
import { createError } from "./utils/error";
import { deleteFile } from "./utils/file-handlers";

// CONFIGURATIONS

dotenv.config();
const app = express();

// MIDDLEWARES

app.use(
  cors({
    origin: CLIENT_ENDPOINT,
    optionsSuccessStatus: 200,
    credentials: true
  })
);

app.use(
  express.json({
    limit: "200mb",
    extended: true
  })
);
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// ROUTES

app.use("/api/auth", authRouter);

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

    if (err) res.status(err.status).json(err.message);
  }

  if (req.file) deleteFile(req.file.publicUrl);

  if (req.files)
    for (const { publicUrl } of req.files) {
      deleteFile(publicUrl);
    }
});

// MONGOOSE SETUP

const isProd = process.env.NODE_ENV === "production";

console.log(process.env, isProd, " env....");

mongoose
  .connect(
    process.env[
      process.env.NODE_ENV === "production"
        ? "MONGODB_PROD_URI"
        : "MONGODB_DEV_URI"
    ],
    {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  )
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
