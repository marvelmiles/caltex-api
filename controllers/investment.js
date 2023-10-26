import Investment from "../models/Investment";
import { createSuccessBody } from "../utils/normalizers";
import {
  validateAccBalanace,
  debitUserAcc,
  rewardReferrals
} from "../utils/transaction";
import { console500MSG } from "../utils/error";
import {
  HTTP_CODE_DEBIT_ERROR,
  HTTP_CODE_REWARD_ERROR
} from "../config/constants";

export const setupUserInvestment = async (req, res, next) => {
  try {
    console.log(req.body);

    await validateAccBalanace(
      req.user.id,
      req.body.amount,
      "You don't have sufficient funds to invest with us!"
    );

    req.body.user = req.user.id;

    const investment = new Investment(req.body);

    res.json(
      createSuccessBody({
        message: "Thank you for investing with us!",
        data: await (await investment.save()).populate("user")
      })
    );

    let crediting = false;

    try {
      await debitUserAcc(
        investment.user,
        investment.amount,
        undefined,
        investment._id
      );

      crediting = true;

      // reward referral
      await rewardReferrals(investment, req);
    } catch (err) {
      console500MSG(
        err,
        crediting ? HTTP_CODE_REWARD_ERROR : HTTP_CODE_DEBIT_ERROR
      );
    }
  } catch (err) {
    next(err);
  }
};

export const getInvestmentById = async (req, res, next) => {
  try {
    res.json(
      createSuccessBody({
        data: await Investment.findById(req.params.investmentId).populate(
          "user"
        )
      })
    );
  } catch (err) {
    next(err);
  }
};
