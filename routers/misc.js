import express from "express";
import { search } from "../controllers/misc";

const miscRouter = express.Router();

miscRouter.get("/search", search);

export default miscRouter;
