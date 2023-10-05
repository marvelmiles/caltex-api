let loading = false;

var configuration = {
  fields: {
    cardNumber: {
      selector: "#cardNumber-container",
      placeholder: "0000  0000  0000  0000",
      styles: {
        fontSize: "16px",
        padding: "0px 0px 0px 10px",
        padding: "0px 0px 0px 10px"
      }
    },
    expirationDate: {
      selector: "#expirationDate-container",
      placeholder: "MM / YY",
      styles: {
        fontSize: "16px",
        padding: "0px 0px 0px 10px",
        padding: "0px 0px 0px 10px"
      }
    },
    cvv: {
      selector: "#cvv-container",
      placeholder: "***",
      styles: {
        fontSize: "16px",
        padding: "0px 0px 0px 10px",
        padding: "0px 0px 0px 10px"
      }
    },
    pin: {
      selector: "#pin-container",
      placeholder: "* * * *",
      styles: {
        fontSize: "16px",
        padding: "0px 0px 0px 10px",
        textAlign: "center"
      }
    },
    otp: {
      selector: "#otp-container",
      placeholder: "* * * * * *",
      styles: {
        fontSize: "16px",
        padding: "0px 0px 0px 10px",
        textAlign: "center"
      }
    }
  },
  cardinal: {
    containerSelector: ".cardinal-container",
    activeClass: "show"
  },
  paymentParameters: {
    amount: 10000,
    currencyCode: "566",
    dateOfPayment: "2019-11-08T00:00:00",
    payableCode: "Default_Payable_MX26070",
    merchantCustomerName: "John Doe",
    merchantCode: "MX26070",
    transactionReference: "isw_hosted_field_test:" + Date.now()
  }
};

let instance;

let payButton = document.getElementById("pay-button");
let continueButton = document.getElementById("continue-button");
let validateButton = document.getElementById("validate-button");

let pinBackButton = document.getElementById("pin-back-button");
let otpBackButton = document.getElementById("otp-back-button");

pinBackButton.addEventListener("click", function() {
  console.log("pay should submit....");
  setActivePage("card-details");
  instance.clearField("pin");
});

otpBackButton.addEventListener("click", function() {
  setActivePage("pin");
  instance.clearField("otp");
});

function callback(createError, hostedFieldsInstance) {
  console.log("cb voked...", hostedFieldsInstance);
  if (createError != null) {
    throw createError;
  }

  instance = hostedFieldsInstance;

  instance.on("focus", function(event) {
    let fieldContainer = document.querySelector(event.selector);
    fieldContainer.style.borderBottomColor = "#a0c8e2";
  });

  instance.on("blur", function(event) {
    let fieldContainer = document.querySelector(event.selector);
    fieldContainer.style.borderBottomColor = "#e4e4e4";
  });

  instance.on("validation", function(event) {});

  instance.on("cardinal-response", handleCardinalValidateResponse);

  payButton.addEventListener("click", function() {
    instance.getBinConfiguration(handleBinConfigResponse);
  });

  continueButton.addEventListener("click", function() {
    instance.makePayment(handlePayResponse);
  });

  validateButton.addEventListener("click", function() {
    instance.validatePayment(handleValidateResponse);
  });
}

isw.hostedFields.create(configuration, callback);

function handleBinConfigResponse(err, response) {
  loading = true;
  if (err != null && err.validationError === true) {
    let fieldContainer = document.getElementById("cardNumber-container");
    fieldContainer.style.borderBottomColor = "#FF0000";
    return;
  }

  if (err != null && err.networkError === true) {
    showNotification(err, null);
    return;
  }

  if (err !== null) {
    showNotification(err, null);
    return;
  }

  if (response.supportsPin) {
    setActivePage("pin");
    return;
  }

  try {
    instance.makePayment(handlePayResponse);
  } catch (err) {
    console.log(err.message);
    console.log(err.response);
    console.log(err);
  }
}

function handlePayResponse(err, response) {
  console.log(err, response);
  loading = false;
  if (err != null && err.validationError === true) {
    showNotification(err, null);
    return;
  }

  if (err != null && err.networkError === true) {
    showNotification(err, null);
    return;
  }

  if (err != null) {
    showNotification(err, null);
    return;
  }

  if (response.requiresCentinelAuthorization === true) {
    setActivePage("cardinal");
    return;
  }

  if (response.responseCode === "T0") {
    setActivePage("otp");
    showNotification(null, response);
    return;
  }
}

function handleValidateResponse(err, response) {
  if (err != null && err.validationError === true) {
    showNotification(err, null);
    return;
  }

  if (err != null && err.networkError === true) {
    showNotification(err, null);
    return;
  }

  if (err != null) {
    showNotification(err, null);
    return;
  }
  console.log("rrrr: ", response);

  if (response) {
    showNotification(null, response);
    return;
  }
}

let alertDiv = document.getElementById("response");
let responseCodeDiv = document.getElementById("response-code");
let responseMessageDiv = document.getElementById("response-message");

function showNotification(error, response) {
  if (response) {
    let responseCode = response.responseCode;
    let responseMessage = response.plainTextSupportMessage;
    if (response.plainTextSupportMessage) {
      setNotificationText(`${responseCode}`, `${responseMessage}`);
    } else {
      setNotificationText(`${responseCode}`, null);
    }

    if (responseCode === "00") {
      setNotificationText(responseCode, "Transaction Successful");
      setActivePage("card-details");
      return;
    }
  } else if (error) {
    alertDiv.classList.add("alertError", true);
    let errorCode = error.responseCode;
    let validationError = error.validationError;
    let networkError = error.networkError;
    if (validationError) {
      setNotificationText(null, `There's Validation Error`);
    }
    if (networkError) {
      setNotificationText(null, `Network Error`);
    }
    if (errorCode) {
      setNotificationText(`${errorCode}`, null);
    }
  }
}

function handleCardinalValidateResponse(err, response) {
  setActivePage("card-details");
}

function setNotificationText(responseCode, responseMessage) {
  responseCodeDiv.innerHTML = responseCode;
  responseMessageDiv.innerHTML = responseMessage;
  alertDiv.classList.add("showNotification");
  setTimeout(function() {
    alertDiv.classList.remove("showNotification", "alertError");
  }, 7000);
}

function setActivePage(pageName) {
  let pages = document.querySelectorAll(".form-page");

  for (let i = 0; i < pages.length; i++) {
    let page = pages[i];
    page.classList.remove("show");
  }

  let activePage = document.querySelector(".form-page." + pageName);
  activePage.classList.add("show");
}

window.onload = function() {
  //display the amount being processed on page
  document.getElementById("amount").innerHTML =
    configuration.paymentParameters.amount / 100;
};
