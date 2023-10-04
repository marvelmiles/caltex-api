import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: "Transaction user id is required"
    },
    paymentType: {
      type: String,
      enum: ["fiat", "crypto"],
      required: "Transaction payment type is required",
      default: "fiat"
    },
    currency: {
      type: String,
      required: [
        function() {
          return this.paymentType === "crypto";
        },
        "Transaction currency is required."
      ]
    },
    paymentProofUrl: {
      type: String,
      required:
        "Payment proof is required. Upload a copy of your transaction for confirmation"
    },
    amount: {
      type: Number
    },
    description: String,
    investment: {
      type: mongoose.Types.ObjectId,
      ref: "investment"
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal"],
      default: "deposit"
    },
    status: {
      type: String,
      enum: ["awaiting", "confirmed", "rejected"],
      default: "awaiting"
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
