import Investment from "../models/Investment";
import { createSuccessBody } from "../utils/normalizers";
import Transaction from "../models/Transaction";

export const setupUserInvestment = async (req, res, next) => {
  try {
    console.log(req.body);

    req.body.user = req.user.id;

    const investment = new Investment(req.body);

    res.json(
      createSuccessBody({
        message: "Thank you for investing with us!",
        data: await (await investment.save()).populate("user")
      })
    );

    const refs = req.user.referrals;

    for (let i = 0; i < refs.length; i++) {
      const uid = refs[i];

      const pctDefault = {
        starterforex: { 0: 10, 1: 7, 2: 3 }[i],
        professionalforex: { 0: 15, 1: 10, 2: 7 }[i],
        masterforex: { 0: 20, 1: 15, 2: 10 }[i],
        startercrypto: { 0: 5, 1: 5, 2: 5 }[i],
        professionalcrypto: { 0: 10, 1: 10, 2: 10 }[i],
        mastercrypto: { 0: 15, 1: 15, 2: 15 }[i]
      }[investment.plan + investment.tradeType];

      const { pct = pctDefault, amount } = req.query.reward || {};

      try {
        if (
          !!(await Transaction.findOne({
            user: uid,
            referree: investment.user.id
          }))
        )
          continue;

        await new Transaction({
          rewarded: true,
          user: uid,
          currency: "USD",
          amount: amount || (pct / 100) * investment.amount + investment.amount,
          paymentType: "fiat",
          status: "confirmed",
          localPayment: {
            currency: "USD"
          },
          referree: investment.user.id
        }).save();
      } catch (err) {
        console.log(
          `[SERVER_ERROR COMMISION_REWARD]: failed to reward ${uid} from ${
            investment.user.id
          }. [msg: ${err.message}] at ${new Date()}`
        );
      }
    }
  } catch (err) {
    next(err);
  }
};

export const getInvestmentById = async (req, res, next) => {
  try {
    const id = req.params.investmentId.toLowerCase();

    if (id === "invest") return next();

    res.json({
      success: true,
      data: await Investment.findById(id).populate("user")
    });
  } catch (err) {
    next(err);
  }
};
