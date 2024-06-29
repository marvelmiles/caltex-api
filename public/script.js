const url = `${window.baseUrl}/api`;

const data = [
  [
    "Authentication Apis",
    "signup user",
    "post",
    "{ name: String, password: String, username: String, email: String }",
    "{ name: String, password: String, username: String, email: String }",
    `${url}/auth/signup`
  ],
  [
    "",
    "signin user",
    "post",
    "{ password: String, email: String }",
    "{ name: String, password: String, username: String, email: String }",
    `${url}/auth/signin`
  ],
  [
    "",
    "signout user",
    "patch",
    "{ settings:Object}",
    "{ name: String, password: String, username: String, email: String }",
    `${url}/auth/signout`
  ],
  [
    "",
    "recover password",
    "post",
    "{ email:String }",
    "String",
    `${url}/auth/recover-password`
  ],
  [
    "",
    "verify recover password otp",
    "post",
    "{ email: String, token: String}",
    "String",
    `${url}/auth/verify-token`
  ],
  [
    "",
    "reset password",
    "post",
    "{ email: String, password: String}",
    "String",
    `${url}/auth/reset-password`
  ],
  [
    "",
    "set new access token",
    "get",
    "None",
    "String",
    `${url}/auth/refresh-token`
  ],
  [
    "User Apis",
    "get user investments by id",
    "get",
    "None",
    "[investmentObject] (array of investment object)",
    `${url}/users/:userId/investments`
  ],
  [
    "",
    "get user transactions by id",
    "get",
    "None",
    "[transactionObject] (array of transaction object)",
    `${url}/users/:userId/transactions`
  ],
  [
    "",
    "get user by id",
    "get",
    "None",
    `
    {
      surname:String,
      firstname:String,
      username:String,
      email:String,
      photoUrl:String,
      lastLogin:Date,
      isLogin:Boolean,
      provider:String,
      settings:Object,
      address:String,
      zipCode:String,
      country:String
    }
    `,
    `${url}/users/:userId`
  ],
  [
    "",
    "update user by id",
    "put",
    "userObject",
    "userObject",
    `${url}/users/:userId`
  ],
  [
    "",
    "verify user identity",
    "post",
    `
    {
      documentType:String,
      documentNumber:Number
    }
    `,
    `
    {
      documentType:String,
      documentNumber:Number,
      verificationResult:true,
      verificationDate:Date,
      location:{
        latitude:String,
        longitude:String,
        address:{
          street:String,
          city:String,
          state:String,
          zip:Number,
          country:String
        }
      }
    }
      `,
    `${url}/users/verify`
  ],
  [
    "Transaction apis",
    `
    process fiat payment.
    visit ${window.baseUrl}/payment.html for demo preview
    `,
    "post",
    ` 
    {
    paymentMethodId: String (Required),
    amount: Number (Required),
    investmentId:String,
    investment: investmentObject
    }
    `,
    "paymentIntentObject",
    `${url}/transactions/process-fiat-payment`
  ],
  [
    "Transaction apis",
    `
    process crypto payment. 
    `,
    "post",
    ` 
    { 
    amount: Number (Required),
    investmentId:String,
    investment: investmentObject
    }
    `,
    "coinbase Charge object",
    `${url}/transactions/process-fiat-payment`
  ],
  [
    "Investment Apis",
    "setup user investment",
    "post",
    `
  {
      userId:String (Required), 
      amount:Number (Required),
      startDate:Date (Required),
      endDate:Date,
      plan:String ,
      tradeType:String,
      minInvestment:Number,
      maxInvestment: Number,
      withdrawalFeePct:Number,
      roiPct:Number
  }
    `,
    `
    {
      user:userObject, 
      amount:Number,
      startDate:Date,
      endDate:Date,
      plan:String ,
      tradeType:String,
      minInvestment:Number,
      maxInvestment: Number,
      withdrawalFeePct:Number,
      roiPct:Number,
      roi:Number,
      duration:Number,
      totalAmount:Number
    }
    `,
    `${url}/investments/invest`
  ],
  [
    "",
    "get investment by id",
    "get",
    "None",
    "investmentObject",
    `${url}/investments/:investmentId`
  ]
];

const headerRow = document.getElementById("headerRow");
const tableBody = document.getElementById("tableBody");

data.forEach(item => {
  // Create regular rows

  const row = document.createElement("tr");

  for (let i = 0; i < item.length; i++) {
    const value = item[i];

    if (!value) continue;

    if (i === 0) {
      const _row = document.createElement("tr");

      const cell = document.createElement("td");
      cell.textContent = value;
      cell.className = "cell-heading";
      cell.colSpan = 5;
      _row.appendChild(cell);

      tableBody.appendChild(_row);
    } else {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    }
  }

  tableBody.appendChild(row);
});
