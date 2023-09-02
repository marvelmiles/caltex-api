const stripe = Stripe(
  "pk_test_51Njo5KBLHOVbSsbcuetnlZZSgIXWWjGLvj4zcRATikgfpLeMt70HpBokJVNT4svg5duUfdsjPhsZdLxc4cOFeOB100FaWSCs4x"
);

const msg = document.getElementById("payment-message");

const headers = {
  "Content-Type": "application/json"
};

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

  const url = `${window.API_ENDPOINT}/transactions`;

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

  const paymentEmail = document.getElementById("user-email");

  const paymentName = document.getElementById("user-name");

  const paymentAmount = document.getElementById("amount");

  const investDesc = document.getElementById("invest-desc");

  const resetInputs = () => {
    btn.textContent = "Pay now";
    btn.disabled = false;
  };

  let investmentId;

  console.log(window.API_ENDPOINT, window.baseUrl, "--");

  document
    .getElementById("signin-form")
    .addEventListener("submit", async function(e) {
      try {
        console.log("submit signin...");
        e.preventDefault();
        let user = await fetch(`${window.API_ENDPOINT}/auth/signin`, {
          headers,
          method: "POST",
          body: JSON.stringify({
            email: document.getElementById("signin-email").value,
            password: document.getElementById("signin-password").value
          })
        });

        user = await user.json();

        console.log(user);

        if (user.success === false) throw user;

        let invest = await fetch(`${window.API_ENDPOINT}/investments/invest`, {
          headers,
          method: "POST",
          body: JSON.stringify({
            amount: paymentAmount.value,
            startDate: new Date()
          })
        });

        invest = await invest.json();

        console.log(invest);

        if (invest.success === false) throw invest;

        invest = invest.data;

        investmentId = invest.id;

        investDesc.textContent =
          "Investment description: " + invest.description;

        user = user.data;

        paymentEmail.value = user.email;

        if (user.lastname)
          paymentName.value = user.firstname + " " + user.lastname;

        showMessage("Signin successful", "green");
      } catch (err) {
        console.log(err);
        showMessage("Login error: " + err.message);
      }
    });

  document
    .getElementById("payment-form")
    .addEventListener("submit", async function(e) {
      try {
        clearMessage();
        console.log("submitting payment...");

        btn.textContent = "processing...";
        btn.disabled = true;

        e.preventDefault();

        const email = paymentEmail.value;

        const name = paymentName.value;

        const description = investDesc.textContent;

        const { paymentMethod, error } = await stripe.createPaymentMethod({
          type: "card",
          card: cardNumber,
          billing_details: {
            email,
            name
          }
        });

        console.log(error, paymentMethod);

        if (error) {
          showMessage("Payment Error: " + error.message);
          resetInputs();
          return;
        }
        console.log(paymentAmount.value, " amoutn ");
        const response = await fetch(`${url}/process-fiat-payment`, {
          headers,
          method: "POST",
          body: JSON.stringify({
            investmentId,
            amount: paymentAmount.value,
            paymentMethodId: paymentMethod.id,
            currency: "usd",
            description,
            email
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
        console.log(err);
        showMessage("Payment error: " + err.message);
      } finally {
        resetInputs();
      }
    });
} catch (err) {
  showMessage("Check network and reload");
}
