export const createObjBody = obj => {
  switch (obj.object) {
    case "payment_intent":
      return {
        id: obj.id,
        amountReceived: obj.amount_received,
        amount: obj.amount,
        desc: obj.description,
        clientSecret: obj.client_secret,
        currency: obj.currency,
        created: obj.created
      };
    default:
      return {};
  }
};
