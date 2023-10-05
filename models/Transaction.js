import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      ref: "user",
      required: "Transaction user id is required"
    },

    currency: {
      type: String,
      required: "Transaction currency is required."
    },

    paymentType: {
      type: String,
      enum: ["fiat", "crypto"],
      required:
        "Transaction payment type is required. Expect one of <fiat|crypto>"
    },

    transactionType: {
      type: String,
      enum: ["deposit", "withdrawal"],
      default: "deposit"
    },

    paymentProofUrl: {
      type: String,
      required: [
        function() {
          return this.type === "deposit";
        },
        "Payment proof is required. Upload a copy of your transaction for confirmation"
      ]
    },
    amount: {
      type: Number,
      required: [
        function() {
          return !this.paymentProofUrl;
        },
        "Transaction amount is required"
      ]
    },
    description: String,
    investment: {
      type: mongoose.Types.ObjectId,
      ref: "investment"
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

        delete ret._id;
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
