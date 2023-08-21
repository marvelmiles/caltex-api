const data = [
  [
    "Authentication Api",
    "post",
    "{ name: String, password: String, username: String, email: String }",
    "{ name: String, password: String, username: String, email: String }",
    "http://localhost:8080/api/auth/signup",
    "400"
  ]
];

const headerRow = document.getElementById("headerRow");
const tableBody = document.getElementById("tableBody");

data.forEach(item => {
  // Create regular rows

  const row = document.createElement("tr");

  for (let i = 0; i < item.length; i++) {
    const value = item[i];
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
