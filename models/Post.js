import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: "Post title is required",
    },
    content: {
      type: String,
      required: "Post content is required",
    },
    author: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: "Post author id is required",
    },
    coverImage: {
      type: String,
    },
  },
  { versionKey: false, timestamps: true, collection: "post" }
);

export default mongoose.model("post", schema);
