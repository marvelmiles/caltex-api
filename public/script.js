const url = "https://caltex-api.onrender.com/api";

const data = [
  [
    "Authentication Api",
    "post",
    "{ name: String, password: String, username: String, email: String }",
    "{ name: String, password: String, username: String, email: String }",
    `${url}/auth/signup`,
    "400"
  ],
  [
    "",
    "post",
    "{ password: String, email: String }",
    "{ name: String, password: String, username: String, email: String }",
    `${url}/auth/signin`,
    "400"
  ],
  [
    "",
    "patch",
    "{ settings:Object}",
    "{ name: String, password: String, username: String, email: String }",
    `${url}/auth/signout`,
    "400"
  ],
  [
    "",
    "post",
    "{ email:String }",
    "String",
    `${url}/auth/recover-password`,
    "400"
  ],
  [
    "",
    "post",
    "{ email: String, token: String}",
    "String",
    `${url}/auth/verify-token`,
    "400"
  ],
  [
    "",
    "post",
    "{ email: String, password: String}",
    "String",
    `${url}/auth/reset-password`,
    "400"
  ],
  ["", "get", "None", "String", `${url}/auth/refresh-token`, "400"]
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
