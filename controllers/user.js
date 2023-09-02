import Investment from "../models/Investment";
import User from "../models/User";
import { isObjectId } from "../utils/validators";
import Transaction from "../models/Transaction";
import { createInEqualityQuery } from "../utils/normalizers";
import { getAll } from "../utils";

export const getUserInvestmentsById = async (req, res, next) => {
  try {
    const match = {
      user: req.user._id
    };

    res.json(
      await getAll({
        model: Investment,
        match,
        lookups: [
          {
            from: "user"
          }
        ]
      })
    );
  } catch (err) {
    next(err);
  }
};

export const updateUserById = async (req, res, next) => {
  try {
    const uid = req.params.userId;

    if (!uid || !isObjectId(uid)) throw "Invalid user id";

    const update = {
      $set: req.body,
      photoUrl: req.file?.publicUrl
    };

    delete update.$set.address;
    delete update.$set.password;

    if (req.query.addressIndex)
      update.$set[`address${addressIndex}`] = req.body.address;
    else update.$set.address = req.body.address;

    const user = await User.findByIdAndUpdate(uid, update, { new: true });

    if (!user) throw "User doesn't exist";

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

export const getUserById = (req, res, next) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
};

export const getUserTransactionsById = async (req, res, next) => {
  try {
    let {
      createdAt,
      updatedAt,
      type,
      status,
      amount,
      plan,
      tradeType,
      roi,
      totalAmount
    } = req.query;

    const match = {
        user: req.user._id
      },
      investmentQuery = {};

    createdAt && createInEqualityQuery(createdAt, "createdAt", match, Date);

    updatedAt && createInEqualityQuery(updatedAt, "updatedAt", match, Date);

    amount && createInEqualityQuery(amount, "amount", match, Number);

    type && (match.type = type);

    status && (match.status = status);

    plan && (investmentQuery.plan = plan);

    tradeType && (investmentQuery.tradeType = tradeType);

    roi && createInEqualityQuery(roi, "roi", investmentQuery);

    totalAmount &&
      createInEqualityQuery(totalAmount, "totalAmount", investmentQuery);

    res.json(
      await getAll({
        model: Transaction,
        match,
        lookups: [
          {
            from: "investment",
            strict: true,
            pipeline: [
              {
                $match: investmentQuery
              }
            ]
          },
          {
            from: "user"
          }
        ]
      })
    );
  } catch (err) {
    next(err);
  }
};
