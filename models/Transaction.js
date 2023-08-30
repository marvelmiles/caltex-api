import mongoose from "mongoose";
import Investment from "./Investment";

const schema = new mongoose.Schema(
  {
    paymentIntent: {
      type: String,
      required: "Transaction payment intent id is required"
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: "user"
    },
    investment: {
      type: mongoose.Types.ObjectId,
      ref: "investment",
      required: "Transaction investment id is required."
    },
    desc: String,
    currency: {
      type: String,
      default: "usd"
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal"],
      default: "deposit"
    },
    status: {
      type: String,
      enum: ["processing", "approved", "rejected"],
      default: "processing"
    },
    amount: Number,
    email: String
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

// Pre-save middleware

schema.pre("validate", function(next) {
  if (this.isModified("type") || this.isNew) {
    this.type = {
      payment_intent: "deposit"
    }[this.type];
  }
  next();
});

schema.pre("save", async function(next) {
  try {
    if (!this.amount && this.investment) {
      const doc = await Investment.findById(this.investment);
      if (doc) this.amount = doc.amount;
    }
    next();
  } catch (error) {
    return next(error);
  }
});

export default mongoose.model("transaction", schema);
