import Post from "../models/Post";
import { getAll } from "../utils";
import { deleteFirebaseFile } from "../utils/file-handlers";
import { createSuccessBody } from "../utils/normalizers";

export const createPost = async (req, res, next) => {
  try {
    if (req.file) req.body.coverImage = req.file.publicUrl;

    req.body.author = req.user.id;

    const post = await (await new Post(req.body).save()).populate("author");

    res.json(
      createSuccessBody({
        data: post,
      })
    );
  } catch (err) {
    next(err);
  }
};

export const getPostFeed = async (req, res, next) => {
  try {
    res.json(
      createSuccessBody({
        data: await getAll({
          model: Post,
          query: req.query,
          lookups: [
            {
              from: "user",
              localField: "author",
            },
          ],
        }),
      })
    );
  } catch (err) {
    next(err);
  }
};

export const getPostById = async (req, res, next) => {
  try {
    res.json(
      createSuccessBody({
        data: await Post.findById(req.params.postId),
      })
    );
  } catch (err) {
    next(err);
  }
};

export const deletePostById = async (req, res, next) => {
  try {
    const { coverImage } =
      (await Post.findByIdAndDelete({
        _id: req.params.postId,
      })) || {};

    res.json(createSuccessBody({ message: "Deleted post successfully!" }));

    coverImage && deleteFirebaseFile(coverImage);
  } catch (err) {
    next(err);
  }
};
