import Investment from "../models/Investment";
import User from "../models/User";
import { isObjectId } from "../utils/validators";
import Transaction from "../models/Transaction";
import { createInEqualityQuery } from "../utils/normalizers";
import { getAll } from "../utils";

export const getUserInvestmentsById = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await Investment.find({
        user: req.params.userId
      })
    });
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
    res.json(req.user);
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

    const query = {},
      investmentQuery = {};

    createdAt && createInEqualityQuery(createdAt, "createdAt", query, Date);

    updatedAt && createInEqualityQuery(updatedAt, "updatedAt", query, Date);

    type && (query.type = type);

    status && (query.status = status);

    amount && createInEqualityQuery(amount, "amount", query, Number);

    plan && (investmentQuery.plan = plan);

    totalAmount &&
      createInEqualityQuery(totalAmount, "totalAmount", investmentQuery);

    tradeType && (investmentQuery.tradeType = tradeType);

    roi && createInEqualityQuery(roi, "roi", investmentQuery);

    res.json(
      await getAll({
        model: Transaction,
        match: query,
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
