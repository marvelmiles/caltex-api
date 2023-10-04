import { SERVER_ORIGIN } from "../config/constants";
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
import axios from "axios";
import { getAll } from "../utils";

const stripe = stripeSDK(process.env.STRIPE_SECRET_KEY);

coinbaseSDK.Client.init(process.env.COINBASE_API_KEY);

export const updatePaymentIntent = async (intent, data) => {
  if (typeof intent === "string") {
    intent = await stripe.paymentIntents.retrieve(intent);
    const obj = serializePaymentObject({
      metadata: intent.metadata
    });

    Object.assign(obj.metadata.investment, data.metadata.investment);
    Object.assign(obj.metadata.transaction, data.metadata.transaction);

    intent.metadata = obj.metadata;
  }

  intent.metadata.transaction = JSON.stringify(intent.metadata.transaction);

  intent.metadata.investment = JSON.stringify(intent.metadata.investment);

  await stripe.paymentIntents.update(intent.id, {
    metadata: intent.metadata
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
      _id: body.investmentId
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
    email: body.email
  };

  stringifyAll && (body.metadata.user = JSON.stringify(body.metadata.user));

  const transId = new mongoose.Types.ObjectId();

  body.metadata.transaction = JSON.stringify({
    id: transId
  });

  body.metadata.investment = JSON.stringify({
    id: investment.id
  });

  return {
    transId,
    investId: investment.id
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
    customer: customerId
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
        (await stripe.customers.create({
          address: req.user.address.line1 && req.user.address,
          email: req.user.email,
          name: req.user.fullname,
          payment_method: req.body.paymentMethodId,
          phone: req.user.phone[0]
        })).id);

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
        ...req.body["automatic_payment_methods"]
      },
      metadata: req.body.metadata
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
      customerId: customerId
    });

    console.log("confirming paym...");

    res.json(
      createSuccessBody({
        message: `Deposit of ${amount}.00 ${req.body.currency} was successful!`,
        data: convertToCamelCase(
          await stripe.paymentIntents.confirm(intent.id, {
            return_url: `${SERVER_ORIGIN}/api/transactions/success.html`,
            receipt_email: req.body.email
          })
        )
      })
    );

    updateUser &&
      User.updateOne(
        {
          _id: req.user.id
        },
        {
          [`ids.stripe`]: customerId
        }
      )
        .then(data => data)
        .catch(err =>
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
      object: req.body.object
    });

    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET
    });

    // event is rep as req.body
    stripe.webhooks.constructEvent(
      payload,
      header,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const intent = req.body.data.object;

    handlePaymentWebhook(req.body, res, async reason => {
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
          currency: req.body.currency
        },
        pricing_type: "fixed_price",
        metadata: req.body.metadata
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
      userId: req.user.id
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

    await handlePaymentWebhook(event, res, reason => {
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
    console.log("recoding trans...");
    req.body.user = req.user.id;
    req.body.paymentProofUrl = req.file?.publicUrl;

    const trans = await new Transaction(req.body).save();

    res.json(
      createSuccessBody({
        data: trans,
        message: "Transaction dtails received. Please await confirmation!"
      })
    );
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
        $gte: new Date(req.query.gteDate)
      };
    }

    if (req.query.required) {
      Object.assign(match, req.query.required);
    }

    res.json(
      createSuccessBody({
        data: await getAll({
          match,
          model: Transaction,
          query: req.query
        })
      })
    );
  } catch (err) {
    next(err);
  }
};

export const confirmTransaction = async (req, res, next) => {
  try {
    const trans = await Transaction.findByIdAndUpdate(
      req.params.transId,
      {
        status: "confirmed"
      },
      { new: true }
    );

    res.json(
      createSuccessBody({
        data: trans
      })
    );
  } catch (err) {
    next(err);
  }
};

export const requestWithdraw = (req, res, next) => {};
