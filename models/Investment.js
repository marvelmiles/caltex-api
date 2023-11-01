import mongoose from "mongoose";
import { setFutureDate, getDaysDifference } from "../utils";
import { isTodayDate } from "../utils/validators";
import {
  createInvestmentDesc,
  convertExponentToLarge
} from "../utils/serializers";
import { formatToDecimalPlace } from "../utils/normalizers";

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
          return v >= this.minAmount && v <= this.maxAmount;
        },
        message: function(props, doc) {
          return `Investment amount must be an integer between ${
            doc.minAmount
          } and ${doc.maxAmount === Infinity ? "Unlimited" : doc.maxAmount}`;
        }
      },
      get(v) {
        return Number(v) || 0;
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
      validate: [
        function(v) {
          console.log(v, "vertyu....");

          if (!this.startDate) return true;

          const uDate = new Date(v);
          const sDate = new Date(this.startDate);

          const uM = uDate.getMonth();

          const sM = sDate.getMonth();

          const uYear = uDate.getFullYear();

          const sYear = sDate.getFullYear();

          return (
            uYear > sYear ||
            (uYear === sYear &&
              (uM > sM ||
                (uM === sM && uDate.getDate() - 1 >= sDate.getDate())))
          );
        },
        "The expected end date should be at least a day ahead of start date"
      ],
      set(v) {
        if (this.startDate && v)
          this.duration = getDaysDifference(
            this.startDate,
            v.toISOString ? v : new Date(Number(v) || v)
          );

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
    paymentType: {
      type: String,
      enum: ["fiat", "crypto"],
      default: "fiat"
    },
    minAmount: {
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
    maxAmount: {
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
              return 3.0;
            case "professional":
              return 2.5;
            default:
              return 2.0;
          }
        } else if (this.tradeType === "forex") {
          switch (this.plan) {
            case "master":
              return 2.0;
            case "professional":
              return 1.5;
            default:
              return 1.0;
          }
        }
      }
    },
    roi: {
      type: Number,
      set(v) {
        if (v && typeof v !== "number") v = Number(v.replace(/,/g, ""));

        return v;
      },
      get(v) {
        if (!v && this.amount && this.roiPct && this.duration)
          v = (this.roiPct / 100) * this.duration;
        return Number(v);
      }
    },
    status: {
      type: String,
      enum: ["new", "invested", "rejected"],
      default: "new"
    },
    description: {
      type: String,
      default: function() {
        return createInvestmentDesc(this);
      }
    },
    matured: {
      type: Boolean,
      default: false
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

schema.index({
  endDate: 1
});

schema.virtual("totalAmount").get(function() {
  if (this.roi && this.amount) {
    return formatToDecimalPlace(this.amount + this.roi, true);
  }
});

export default mongoose.model("investment", schema);
