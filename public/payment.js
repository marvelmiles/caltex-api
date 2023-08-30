const msg = document.getElementById("payment-message");

const showMessage = (err, color = "red") => {
  console.log(err);
  msg.parentElement.style.display = "block";
  msg.textContent = typeof err === "string" ? err : err.message;
  msg.style.color = color;
};

const clearMessage = () => {
  msg.parentElement.style.display = "none";
  msg.textContent = "";
};
try {
  clearMessage();
  const stripe = Stripe(
    "pk_test_51Njo5KBLHOVbSsbcuetnlZZSgIXWWjGLvj4zcRATikgfpLeMt70HpBokJVNT4svg5duUfdsjPhsZdLxc4cOFeOB100FaWSCs4x"
  );

  const url = `${window.baseUrl}/api/transactions`;

  const elements = stripe.elements();
  const cardNumber = elements.create("cardNumber", {
    //   hidePostalCode: true
  });

  const cardExpiry = elements.create("cardExpiry", {
    //   hidePostalCode: true
  });
  const cardCvc = elements.create("cardCvc", {
    //   hidePostalCode: true
  });

  cardNumber.mount("#card-number");

  cardExpiry.mount("#card-exp");

  cardCvc.mount("#card-cvc");

  const btn = document.getElementById("submit");

  const resetInputs = () => {
    btn.textContent = "Pay now";
    btn.disabled = false;
  };

  document
    .getElementById("payment-form")
    .addEventListener("submit", async function(e) {
      try {
        clearMessage();
        console.log("submitting...");

        btn.textContent = "processing...";
        btn.disabled = true;

        e.preventDefault();

        const email = document.getElementById("user-email").value;

        const name = document.getElementById("user-name").value;

        const phone = document.getElementById("user-phone").value;

        const desc = document.getElementById("desc").textContent;

        const { paymentMethod, error } = await stripe.createPaymentMethod({
          type: "card",
          card: cardNumber,
          billing_details: {
            email,
            name,
            phone
          }
        });

        console.log(error, paymentMethod);

        if (error) {
          showMessage("Payment Error: " + error.message);
          resetInputs();
          return;
        }

        const response = await fetch(`${url}/process-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            paymentMethodId: paymentMethod.id,
            amount: document.getElementById("amount").value,
            currency: "usd",
            desc,
            email,
            metadata: {}
          })
        });

        const result = await response.json();
        if (!result.success) throw result;

        console.log(result);

        showMessage(
          `Payment successful.${
            email ? " Check your mail for receipt and transaction details" : ""
          }`,
          "green"
        );
      } catch (err) {
        console.log(err, err.message);
        showMessage("Payment error: " + err.message);
      } finally {
        resetInputs();
      }
    });
} catch (err) {
  showMessage("Check network and reload");
}
