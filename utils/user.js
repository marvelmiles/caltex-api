import mongoose from "mongoose";
import Transaction from "../models/Transaction";
import { calcSum } from "./transaction";

export const getUserMetrics = async uid => {
  console.log("getting metrics...", uid);

  const transMatch = {
    user: new mongoose.Types.ObjectId(uid),
    transactionType: "deposit"
  };

  const pipeline = [
    {
      $facet: {
        confirmedTransactions: [
          {
            $match: {
              ...transMatch,
              status: "confirmed"
            }
          }
        ],
        awaitingTransactions: [
          {
            $match: {
              ...transMatch,
              status: "awaiting"
            }
          }
        ],
        rejectedTransactions: [
          {
            $match: {
              ...transMatch,
              status: "rejected"
            }
          }
        ]
      }
    }
  ];

  const trans = (await Transaction.aggregate(pipeline))[0];

  const balance = {};

  for (const key in trans) {
    balance[key] = calcSum(trans[key], "amount");
  }

  balance.availableBalance = calcSum(
    trans.confirmedTransactions,
    "availableAmount"
  );

  return {
    balance,
    availBalance: balance.availableBalance
  };
};
