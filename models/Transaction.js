import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ["deposit", "withdrawal"],
      required:
        "Transaction deposit is required. Expect either deposit or withdrawal"
    },
    status: {
      type: String,
      enum: ["processing", "approved", "rejected"],
      required:
        "Transaction status is required. Expect either processing, approved or rejected"
    },
    amount: {
      type: Number,
      required: "Transaction amount required"
    },
    user: {
      type: String,
      ref: "user",
      required: "Transaction user id is required"
    },
    investment: {
      type: String,
      ref: "investment",
      required: "Transaction investment id is required."
    }
  },
  {
    collection: "transaction",
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
      }
    }
  }
);

export default mongoose.model("transaction", schema);
