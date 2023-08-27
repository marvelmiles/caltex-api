import { generatePaymentAccessToken } from "../utils/auth";
import { PAYPAL_CLIENT_ID, PAYPAL_BASE_URL } from "../config/constants";

export const createPayPalOrder = async (req, res, next) => {
  try {
    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await generatePaymentAccessToken(
          `${PAYPAL_BASE_URL}/v1/oauth2/token`,
          {
            auth: Buffer.from(
              PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_SECRET
            ).toString("base64")
          }
        )}`
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: "100.00"
            }
          }
        ]
      })
    });

    res.json({
      sucess: true,
      data: await response.json()
    });
  } catch (err) {
    next(err);
  }
};

export const capturePayPalOrder = async (req, res, next) => {
  try {
    const response = await fetch(
      `${PAYPAL_BASE_URL}/v2/checkout/orders/${req.body.orderID}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await generateAccessToken()}`
        }
      }
    );
    const data = await response.json();
    if (data.details || data.message) throw data;
    return res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};
