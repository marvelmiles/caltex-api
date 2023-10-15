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
    walletAddress: {
      type: String,
      required: [
        function() {
          return this.transactionType === "withdrawal";
        },
        "Transaction wallet address is required"
      ]
    },
    rewarded: {
      type: Boolean,
      default: false
    },
    paymentProofUrl: {
      type: String,
      required: [
        function() {
          return this.rewarded ? false : this.type === "deposit";
        },
        "Payment proof is required. Upload a copy of your transaction for confirmation"
      ]
    },
    amount: {
      type: Number,
      required: "Transaction amount is required"
    },
    description: {
      type: "String",
      default: function() {
        return this.rewarded ? "Referral commission" : "";
      }
    },
    investment: {
      type: mongoose.Types.ObjectId,
      ref: "investment"
    },
    status: {
      type: String,
      enum: ["awaiting", "confirmed", "rejected"],
      default: "awaiting"
    },
    localPayment: {
      type: new mongoose.Schema(
        {
          currency: {
            type: String,
            enum: ["USD", "EUR"],
            required: "Local payment currency is required"
          }
        },
        {
          toJSON: {
            transform(doc, ret) {
              delete ret._id;
            }
          }
        }
      ),
      required: "Transaction local payment details is required"
    },
    referree: mongoose.Types.ObjectId
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
