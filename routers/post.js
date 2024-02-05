import express from "express";
import { verifyAdminStatus, verifyToken } from "../middlewares";
import {
  createPost,
  deletePostById,
  getPostById,
  getPostFeed,
} from "../controllers/post";
import { uploadFile } from "../utils/file-handlers";

const postRouter = express.Router();

postRouter
  .post(
    "/new",
    verifyToken,
    verifyAdminStatus,
    uploadFile({
      dirPath: "post-images",
      defaultFieldName: "coverImage",
    }),
    createPost
  )
  .get("/:postId", getPostById)
  .get("/", getPostFeed)
  .delete("/:postId", verifyToken, verifyAdminStatus, deletePostById);

export default postRouter;