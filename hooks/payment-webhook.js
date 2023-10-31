import { serializePaymentObject } from "../utils/serializers";
import Transaction from "../models/Transaction";
import Investment from "../models/Investment";

export const handlePaymentWebhook = async (event, res, cb) => {
  console.log("capture webhook...", event.type);

  switch (event.type) {
    case "charge.succeeded":
    case "charge:confirmed":
      const {
        metadata: { transaction = {}, investment = {} }
      } = serializePaymentObject(
        (cb && (await cb("get-payment-object", "succeeded"))) || event
      );

      if (
        await Transaction.findOne({
          _id: transaction.id,
          status: {
            $ne: "approved"
          }
        })
      ) {
        await Transaction.updateOne(
          {
            _id: transaction.id
          },
          { status: "approved" }
        );

        await Investment.updateOne(
          {
            _id: investment.id
          },
          { status: "invested" }
        );
      }
      break;
    default:
      break;
  }

  res.json({
    received: true
  });
};
