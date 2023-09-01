window.baseUrl =
  window.location.hostname === "localhost" ||
  window.location.hostname.indexOf("https") === -1
    ? "http://localhost:8080"
    : "https://caltex-api.onrender.com";
