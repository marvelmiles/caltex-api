import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    payment: {
      type: String,
      required: "Transaction payment id is required"
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
    description: String,
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
    email: String,
    currencyType: {
      type: String,
      enum: ["fiat", "crypto"],
      default: "fiat"
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

// Pre-save middleware

schema.pre("validate", async function(next) {
  try {
    if (this.isModified("type") || this.isNew) {
      this.type = {
        payment_intent: "deposit"
      }[this.type];
    }

    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("transaction", schema);
