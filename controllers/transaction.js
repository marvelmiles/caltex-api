import {
  SERVER_ORIGIN,
  HTTP_403_MSG,
  MAIL_CONFIG,
  MAIL_TYPE,
  HTTP_CODE_TRANSACTION_METRICS,
} from "../config/constants";
import Investment from "../models/Investment";
import Transaction from "../models/Transaction";
import mongoose from "mongoose";
import stripeSDK from "stripe";
import coinbaseSDK from "coinbase-commerce-node";
import { convertToCamelCase, createSuccessBody } from "../utils/normalizers";
import { serializePaymentObject } from "../utils/serializers";
import { handlePaymentWebhook } from "../hooks/payment-webhook";
import { createInvestmentDesc } from "../utils/serializers";
import User from "../models/User";
import { getAll } from "../utils";
import { console500MSG, createError } from "../utils/error";
import {
  validateAccBalanace,
  debitUserAcc,
  getCurrencySymbol,
} from "../utils/transaction";
import { sendAdminMail, sendNotificationMail } from "../utils/file-handlers";
import { getUserMetrics } from "../utils/user";

const stripe = stripeSDK(process.env.STRIPE_SECRET_KEY);

coinbaseSDK.Client.init(process.env.COINBASE_API_KEY);

export const updatePaymentIntent = async (intent, data) => {
  if (typeof intent === "string") {
    intent = await stripe.paymentIntents.retrieve(intent);
    const obj = serializePaymentObject({
      metadata: intent.metadata,
    });

    Object.assign(obj.metadata.investment, data.metadata.investment);
    Object.assign(obj.metadata.transaction, data.metadata.transaction);

    intent.metadata = obj.metadata;
  }

  intent.metadata.transaction = JSON.stringify(intent.metadata.transaction);

  intent.metadata.investment = JSON.stringify(intent.metadata.investment);

  await stripe.paymentIntents.update(intent.id, {
    metadata: intent.metadata,
  });
};

export const validateAndSerializeReqBody = async (
  body,
  userId,
  stringifyAll = true
) => {
  body.currency = (body.currency || "usd").toLowerCase();

  body.metadata = {};

  let investment = {};

  if (body.investmentId) {
    investment = await Investment.findById({
      user: userId,
      _id: body.investmentId,
    });
    if (!investment)
      throw "Ivalid body.investmentId. You can't make payment without creating an investment plan";
  } else if (body.investment) {
    if (
      !(
        body.investment.id &&
        body.investment.duration &&
        body.investment.tradeType &&
        body.investment.amount &&
        body.investment.plan
      )
    )
      throw "Invalid body.investment. Investment id, amount, tradeType, plan and duration are required";

    investment = body.investment;
  }

  body.amount = body.amount === undefined ? investment.amount : body.amount;

  if (body.amount === undefined)
    throw "Transaction amount is required when an investment id or object is absent";

  if (body.amount < 1)
    throw `Payment process failed. Expect amount to be in the lowest denomination and must be greater than zero`;

  body.description =
    body.description || (investment.id && createInvestmentDesc(investment));

  body.metadata.user = {
    id: userId,
    email: body.email,
  };

  stringifyAll && (body.metadata.user = JSON.stringify(body.metadata.user));

  const transId = new mongoose.Types.ObjectId();

  body.metadata.transaction = JSON.stringify({
    id: transId,
  });

  body.metadata.investment = JSON.stringify({
    id: investment.id,
  });

  return {
    transId,
    investId: investment.id,
  };
};

const handlePostPaymentIntention = async ({
  investId,
  transId,
  paymentId,
  userId,
  customerId,
  ...rest
}) => {
  if (investId)
    await Investment.updateOne({ _id: investId }, { status: "awaiting" });

  const transaction = new Transaction({
    ...rest,
    _id: transId,
    investment: investId,
    payment: paymentId,
    user: userId,
    customer: customerId,
  });

  await transaction.save();
};

export const processFiatPayment = async (req, res, next) => {
  try {
    console.log("process fiat...", req.body);

    const amount = req.body.amount;

    req.body.email = req.body.email || req.user.email;

    const { transId, investId } = await validateAndSerializeReqBody(
      req.body,
      req.user.id,
      false
    );

    console.log(investId, transId, " id");

    req.query.denomination = req.query.denomination || "note";

    if (req.query.denomination === "note") {
      switch (req.body.currency) {
        default:
          req.body.amount = req.body.amount * 100;
          break;
      }
    }

    let updateUser = false;

    const customerId =
      req.user.ids.stripe ||
      ((updateUser = true) &&
        (
          await stripe.customers.create({
            address: req.user.address.line1 && req.user.address,
            email: req.user.email,
            name: req.user.fullname,
            payment_method: req.body.paymentMethodId,
            phone: req.user.phone[0],
          })
        ).id);

    req.body.metadata.user.stripeId = customerId;

    req.body.metadata.user = JSON.stringify(req.body.metadata.user);

    let intent = await stripe.paymentIntents.create({
      amount: req.body.amount, // Amount in currency minimum e.g cent
      currency: req.body.currency,
      payment_method: req.body.paymentMethodId,
      description: req.body.description,
      receipt_email: req.body.email,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
        ...req.body["automatic_payment_methods"],
      },
      metadata: req.body.metadata,
    });

    await handlePostPaymentIntention({
      transId,
      investId,
      paymentType: "fiat",
      paymentId: intent.id,
      description: intent.description,
      currency: intent.currency,
      email: req.body.email,
      type: intent.object,
      amount: intent.amount,
      userId: req.user.id,
      customerId: customerId,
    });

    console.log("confirming paym...");

    res.json(
      createSuccessBody({
        message: `Deposit of ${amount}.00 ${req.body.currency} was successful!`,
        data: convertToCamelCase(
          await stripe.paymentIntents.confirm(intent.id, {
            return_url: `${SERVER_ORIGIN}/api/transactions/success.html`,
            receipt_email: req.body.email,
          })
        ),
      })
    );

    updateUser &&
      User.updateOne(
        {
          _id: req.user.id,
        },
        {
          [`ids.stripe`]: customerId,
        }
      )
        .then((data) => data)
        .catch((err) =>
          console.log(
            `[SERVER_WARNING: process-fiat-payment]: Failed to update ids.stripe=${customerId} for user ${user.id}`
          )
        );
  } catch (err) {
    console.log(err.message, " process fiat");
    next(err);
  }
};

export const captureStipeWebhook = async (req, res, next) => {
  try {
    const payload = JSON.stringify({
      id: req.body.id,
      object: req.body.object,
    });

    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });

    // event is rep as req.body
    stripe.webhooks.constructEvent(
      payload,
      header,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const intent = req.body.data.object;

    handlePaymentWebhook(req.body, res, async (reason) => {
      switch (reason) {
        case "get-payment-object":
          return await stripe.paymentIntents.retrieve(intent.payment_intent);
        default:
          return;
      }
    });
  } catch (err) {
    next(err);
  }
};

export const processCryptoPayment = async (req, res, next) => {
  try {
    console.log("procesing crypto...");

    req.body.email = req.body.email || req.user.id;

    const { transId, investId } = await validateAndSerializeReqBody(
      req.body,
      req.user.id
    );

    const charge = convertToCamelCase(
      await coinbaseSDK.resources.Charge.create({
        name: "Caltex",
        description: req.body.description,
        local_price: {
          amount: req.body.amount,
          currency: req.body.currency,
        },
        pricing_type: "fixed_price",
        metadata: req.body.metadata,
      })
    );

    console.log("payemnt succesfful...", charge.id);

    await handlePostPaymentIntention({
      transId,
      investId,
      paymentType: "crypto",
      email: req.body.email,
      paymentId: charge.id,
      description: charge.description,
      currency: charge.pricing.local.currency,
      amount: charge.pricing.local.amount,
      user: req.body,
      currencyType: "crypto",
      userId: req.user.id,
    });

    res.json(
      createSuccessBody({ data: charge, message: "Deposit successful!" })
    );
  } catch (err) {
    console.log(err.response?.data || err.message, "...transaction");
    next(err);
  }
};

export const captureCoinbaseWebhook = async (req, res, next) => {
  try {
    console.log("coinbase.....", req.body);

    const event = coinbaseSDK.Webhook.verifyEventBody(
      JSON.stringify(req.body),
      req.headers["x-cc-webhook-signature"],
      process.env.COINBASE_WEBHOOK_SECRET
    );

    await handlePaymentWebhook(event, res, (reason) => {
      switch (reason) {
        case "get-payment-object":
          return event.data;
        default:
          return;
      }
    });
  } catch (err) {
    next(err);
  }
};

export const recordCrypoPayment = async (req, res, next) => {
  try {
    console.log("recoding trans...", req.body);

    req.body.user = req.user.id;
    req.body.paymentProofUrl = req.file?.publicUrl;

    const trans = await (
      await new Transaction(req.body).save()
    ).populate("user");

    res.json(
      createSuccessBody({
        data: trans,
        message:
          "Transaction details has been received. Please await confirmation!",
      })
    );

    sendAdminMail(MAIL_TYPE.trans, trans);
  } catch (err) {
    next(err);
  }
};

export const getAllTransactions = async (req, res, next) => {
  try {
    console.log(req.query, "gettting all trans");

    const match = {};

    if (req.query.userId)
      match.user = new mongoose.Types.ObjectId(req.query.userId);

    if (req.query.gteDate) {
      match.createdAt = {
        $gte: new Date(req.query.gteDate),
      };
    }

    if (req.query.lteDate) {
      match.createdAt = {
        $lte: new Date(req.query.lteDate),
      };
    }

    if (req.query.required) {
      Object.assign(match, req.query.required);
    }

    console.log("all trans...", match);

    res.json(
      createSuccessBody({
        data: await getAll({
          match,
          model: Transaction,
          query: req.query,
          lookups: [
            {
              from: "user",
            },
            {
              from: "user",
              localField: "markedBy",
            },
          ],
        }),
      })
    );
  } catch (err) {
    next(err);
  }
};

export const updateTransactionStatus = async (req, res, next) => {
  try {
    console.log("confirming transactions...", req.body);

    if (req.params.status === "awaiting")
      throw createError("Invalid request!", 404);

    let trans = await Transaction.findById(req.params.transId);

    if (!trans)
      throw createError("Invalid request. Transaction not found", 404);

    if (trans.status !== "awaiting")
      throw createError(
        {
          message: `Transaction has been ${trans.status} by ${
            req.user.id === trans.markedBy.toString()
              ? "you"
              : "admin " + req.user.username
          }!`,
          details: {
            message: HTTP_403_MSG,
          },
        },
        409
      );

    const status = req.params.status.toLowerCase();

    if (status === "confirm" && !trans.isDeposit)
      await debitUserAcc(trans.user, trans.amount, trans._id);

    await trans.updateOne({
      markedBy: req.user.id,
      markedAt: new Date(),
      status: status + "ed",
    });

    trans = await Transaction.findById(trans._id);

    trans ? await trans.populate("user markedBy") : trans;

    res.json(
      createSuccessBody({
        data: trans,
      })
    );

    if (trans) {
      const isConfirm = status === "confirm";

      const mailUser = (metrics = {}) => {
        sendNotificationMail(trans.user.email, {
          mailOpts: {
            subject: MAIL_CONFIG.TRANS.subject,
          },
          tempOpts: {
            heading: MAIL_CONFIG.TRANS.heading,
            subText: MAIL_CONFIG.TRANS.subText,
            fullname: trans.user.fullname,
            text: `We ${
              isConfirm ? "are pleased" : "regret"
            } to inform you that your ${trans.transactionType}${
              trans.isDeposit ? "" : " request"
            } of ${getCurrencySymbol(trans.currency)}${trans.amount}${
              trans.isDeposit ? "" : ` on ${trans.createdAt.toLocaleString()}`
            } has been ${
              isConfirm ? `${status}ed successfully` : `${status}ed.`
            }. ${
              trans.isDepsoit
                ? isConfirm
                  ? "Log into your account now and purchase an investment package to start earning with caltex trader. Thanks"
                  : "Funds will be refunded within 5 working days"
                : `Available Balance: $${metrics.availableBalance}`
            }.`,
          },
        });
      };

      getUserMetrics(trans.user.id)
        .then((metrics) => {
          mailUser(metrics);
        })
        .catch((err) => {
          console500MSG(err, HTTP_CODE_TRANSACTION_METRICS);
          mailUser();
        });
    }
  } catch (err) {
    next(err);
  }
};

export const requestWithdraw = async (req, res, next) => {
  try {
    console.log("requesting withdrawal...", req.body);

    req.body.user = req.user.id;
    req.body.transactionType = "withdrawal";

    await validateAccBalanace(req.user.id, req.body.amount);

    const trans = await (
      await new Transaction(req.body).save()
    ).populate("user markedBy");

    res.json(
      createSuccessBody({
        data: trans,
      })
    );

    sendAdminMail(MAIL_TYPE.withdraw, trans);
  } catch (err) {
    next(err);
  }
};

export const getTransactionById = async (req, res, next) => {
  try {
    res.json(
      createSuccessBody({
        data: await Transaction.findById(req.params.transId).populate(
          "user markedBy"
        ),
      })
    );
  } catch (err) {
    next(err);
  }
};

// (async () => {
//   try {
//     const trans = await Transaction.find({});

//     for (const t of trans) {
//       await t.updateOne({
//         metadata: {
//           _id: new mongoose.Types.ObjectId()
//         }
//       });
//     }
//   } catch (err) {}
// })();
