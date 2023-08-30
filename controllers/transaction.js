import { COINGATE_BASE_URL, SERVER_DOMAIN } from "../config/constants";
import stripeModule from "stripe";
import { isObject } from "util";
import Investment from "../models/Investment";
import Transaction from "../models/Transaction";
import mongoose from "mongoose";
import { createObjBody } from "../utils/serializers";
import User from "../models/User";

const stripe = stripeModule(process.env.STRIPE_SECRET_KEY);

const serializePaymentIntent = intent => {
  intent.metadata.investment = JSON.parse(intent.metadata.investment);
  intent.metadata.transaction = JSON.parse(intent.metadata.transaction);
  return intent;
};

export const updatePaymentIntent = async (intent, data) => {
  if (typeof intent === "string") {
    intent = await stripe.paymentIntents.retrieve(intent);
    const obj = serializePaymentIntent({
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

export const createCryptoOrder = async (req, res, next) => {
  try {
    const url = "http://localhost:8080/api/transactions";
    console.log("creating...");

    const expire = new Date();

    expire.setMinutes(expire.getMinutes() + 20);

    let response = await fetch(`${COINGATE_BASE_URL}/orders/94314/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.COIN_GATE_TOKEN}`
      },
      body: JSON.stringify({
        title: "Order #9995" + Date.now(),
        price_amount: "1149",
        price_currency: "EUR",
        receive_currency: "EUR",
        callback_url: "http://localhost:8080/callback",
        success_url: "http://localhost:8080/success",
        cancel_url: "http://localhost:8080/cancel",
        order_id: "94313", //Date.now() + "",
        description: "new one",
        pay_amount: "50",
        pay_currency: "ETH",
        expire_at: expire
      })
    });

    response = await response.json();
    console.log(response);
    res.json(response);
  } catch (err) {
    next(err);
  }
};

export const captureCryptoOrder = async (req, res, next) => {
  try {
    const response = await fetch(
      `${COINGATE_BASE_URL}/orders/${req.params.orderId}/checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.COIN_GATE_TOKEN}`
        },
        body: JSON.stringify({
          pay_currency: "BTC",
          pay_method: "crypto"
          // platform_id: "2"
        })
      }
    );
    console.log(req.params, response?.json);
    res.json(await response.json());
  } catch (err) {
    next(err);
  }
};

export const processPayment = async (req, res, next) => {
  try {
    console.log("proces pay ", req.body);

    if (req.body.amount < 100) throw "Payment process failed. Invalid amount";

    if (!isObject(req.body.metadata))
      throw "Invalid body expect payment metadata";

    let { investment } = req.body.metadata;

    if (!isObject(investment)) {
      if (process.env.NODE_ENV === "production" && false)
        throw "Invalid body metadata. Expect investment object";
      else {
        investment = {
          id: (await Investment.aggregate([
            { $sample: { size: 1 } }
          ]))[0]?._id.toString()
        };
      }
    }

    const transId = new mongoose.Types.ObjectId();

    req.body.metadata.transaction = JSON.stringify({
      id: transId
    });

    req.body.metadata.investment = JSON.stringify(investment);

    let intent = await stripe.paymentIntents.create({
      amount: req.body.amount, // Amount in currency minimum e.g cent
      currency: req.body.currency || "usd",
      payment_method: req.body.paymentMethodId,
      description: req.body.desc,
      receipt_email: req.body.email,
      automatic_payment_methods: {
        enabled: true,
        ...req.body["automatic_payment_methods"]
      },
      metadata: req.body.metadata
    });

    if (investment.id)
      await Investment.updateOne(
        { _id: investment.id },
        { status: "awaiting" }
      );

    const transaction = new Transaction({
      _id: transId,
      investment: investment.id,
      paymentIntent: intent.id,
      desc: intent.desc,
      currency: intent.currency,
      type: intent.object,
      amount: intent.amount,
      email: req.body.email,
      user: (await User.aggregate([{ $sample: { size: 1 } }]))[0]?._id
    });

    await transaction.save();

    console.log("confirming paym...");

    res.json({
      success: true,
      data: createObjBody(
        await stripe.paymentIntents.confirm(intent.id, {
          return_url: `${SERVER_DOMAIN}/api/transactions/success.html`,
          receipt_email: req.body.email
        })
      )
    });
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

    console.log("capture webhook...", req.body.type, intent.id);

    switch (req.body.type) {
      case "charge.succeeded":
        const pay = await stripe.paymentIntents.retrieve(intent.payment_intent);

        serializePaymentIntent(pay);

        await Transaction.updateOne(
          {
            _id: pay.metadata.transaction.id
          },
          { status: "approved" }
        );

        await Investment.updateOne(
          {
            _id: pay.metadata.investment.id
          },
          { status: "invested" }
        );
        break;
      default:
        break;
    }

    res.json({
      received: true
    });
  } catch (err) {
    next(err);
  }
};
