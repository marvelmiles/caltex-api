import mongoose from "mongoose";
import { setFutureDate, getDaysDifference } from "../utils";
import { isTodayDate } from "../utils/validators";

const schema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Types.ObjectId,
      required: "User id is required",
      ref: "user"
    },

    amount: {
      type: Number,
      required: "Amount to invest is required",
      validate: {
        validator: function(v) {
          if (v === Infinity) return false;
          return v >= this.minInvestment && v <= this.maxInvestment;
        },
        message: function(props, doc) {
          return `Investment amount must be an integer between ${
            doc.minInvestment
          } and ${
            doc.maxInvestment === Infinity ? "Unlimited" : doc.maxInvestment
          }`;
        }
      }
    },
    startDate: {
      type: Date,
      required: "Investment start date is required",
      validate: {
        validator: isTodayDate,
        message:
          "Invalid date. Expect investment start date to be set to a future or current time epoch"
      }
    },
    endDate: {
      type: Date,
      validate: {
        validator: function(v) {
          const uDate = new Date(v);
          const sDate = new Date(this.startDate);

          const uM = uDate.getMonth();

          const sM = sDate.getMonth();

          return (
            uDate.getFullYear() >= sDate.getFullYear() &&
            (uM > sM || (uM === sM && uDate.getDate() - 1 >= sDate.getDate()))
          );
        },
        message:
          "Invalid date. Expect end date to be at least a day ahead of start date"
      },
      set(v) {
        if (this.startDate && v)
          this.duration = getDaysDifference(this.startDate, new Date(v));

        return v;
      },
      default: setFutureDate(14)
    },
    plan: {
      type: String,
      default: "starter",
      enum: ["starter", "master", "professional"]
    },
    tradeType: {
      type: String,
      enum: ["forex", "crypto"],
      default: "forex"
    },
    minInvestment: {
      type: Number,
      default: function() {
        if (this.tradeType === "crypto") {
          switch (this.plan) {
            case "master":
              return 101000;
            case "professional":
              return 16000;
            default:
              return 300;
          }
        } else {
          switch (this.plan) {
            case "master":
              return 51000;
            case "professional":
              return 11000;
            default:
              return 100;
          }
        }
      }
    },
    maxInvestment: {
      type: Number,
      default: function() {
        if (this.tradeType === "crypto") {
          switch (this.plan) {
            case "master":
              return Infinity;
            case "professional":
              return 101000;
            default:
              return 15000;
          }
        } else {
          switch (this.plan) {
            case "master":
              return 100000;
            case "professional":
              return 50000;
            default:
              return 10000;
          }
        }
      }
    },
    withdrawalFeePct: {
      type: Number,
      default: function() {
        if (this.tradeType === "crypto") {
          switch (this.plan) {
            case "master":
              return 10;
            case "professional":
              return 10;
            default:
              return 5;
          }
        } else {
          switch (this.plan) {
            case "master":
              return 5;
            case "professional":
              return 7;
            default:
              return 10;
          }
        }
      }
    },
    duration: {
      type: Number,
      default: function() {
        if (this.tradeType === "crypto") {
          switch (this.plan) {
            case "master":
              return 30;
            case "professional":
              return 20;
            default:
              return 10;
          }
        } else {
          switch (this.plan) {
            case "master":
              return 21;
            case "professional":
              return 14;
            default:
              return 7;
          }
        }
      }
    },
    roiPct: {
      type: Number,
      default: function() {
        if (this.tradeType === "crypto") {
          switch (this.plan) {
            case "master":
              return 4.0;
            case "professional":
              return 3.5;
            default:
              return 3.0;
          }
        } else return 2.5;
      }
    }
  },
  {
    collection: "investment",
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
      }
    }
  }
);

schema.virtual("userId").set(function(v) {
  this.user = v;
});

schema.virtual("roi").get(function() {
  if (this.amount && this.roiPct) return (this.roiPct / 100) * this.amount;
});

schema.virtual("totalAmount").get(function() {
  if (this.roi && this.amount) return this.amount + this.roi;
});

export default mongoose.model("investment", schema);
