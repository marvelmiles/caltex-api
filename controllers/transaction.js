import { SERVER_DOMAIN } from "../config/constants";
import { isObject } from "util";
import Investment from "../models/Investment";
import Transaction from "../models/Transaction";
import mongoose from "mongoose";
import stripeSDK from "stripe";
import coinbaseSDK from "coinbase-commerce-node";
import {
  convertToCamelCase,
  serializePaymentObject
} from "../utils/serializers";
import { handlePaymentWebhook } from "../hooks/payment-webhook";
import { createInvestmentDesc } from "../utils/serializers";
import User from "../models/User";

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

  let investment;

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
  } else throw "Invalid body. Investment id or investment object is required";

  body.amount = body.amount === undefined ? investment.amount : body.amount;

  if (body.amount === undefined)
    throw "Transaction amount is required when an investment id or object is absent";

  if (body.amount < 1)
    throw `Payment process failed. Expect amount to be in the lowest denomination and must be greater than zero`;

  body.description = body.description || createInvestmentDesc(investment);

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
  description,
  currency,
  currencyType,
  type,
  amount,
  email,
  userId,
  customerId
}) => {
  if (investId)
    await Investment.updateOne({ _id: investId }, { status: "awaiting" });

  const transaction = new Transaction({
    description,
    currency,
    currencyType,
    type,
    amount,
    email,
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
    console.log("process pay ");

    req.body.email = req.body.email || req.user.email;

    const { transId, investId } = await validateAndSerializeReqBody(
      req.body,
      req.user.id,
      false
    );

    req.query.denomination = req.query.denomination || "note";

    if (req.query.denomination === "note") {
      switch (req.body.currency) {
        default:
          // 1cent = $100
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

    res.json({
      success: true,
      data: convertToCamelCase(
        await stripe.paymentIntents.confirm(intent.id, {
          return_url: `${SERVER_DOMAIN}/api/transactions/success.html`,
          receipt_email: req.body.email
        })
      )
    });

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
      email: req.body.email,
      paymentId: charge.id,
      description: charge.description,
      currency: charge.pricing.local.currency,
      amount: charge.pricing.local.amount,
      user: req.body,
      currencyType: "crypto",
      userId: req.user.id
    });

    res.json({
      success: true,
      data: charge
    });
  } catch (err) {
    next(err);
  }
};

export const captureCoinbaseWebhook = async (req, res, next) => {
  try {
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
