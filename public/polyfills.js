function isLocalhost(hostname = window.location.hostname) {
  hostname = hostname.toLowerCase();

  if (hostname === "localhost") return true;

  // Define an array of common domain extensions
  const domainExtensions = ["com", "net", "org", "edu"];

  for (const extension of domainExtensions) {
    if (hostname.endsWith(`.${extension}`)) {
      return false;
    }
  }

  return true;
}

window.baseUrl = isLocalhost()
  ? "http://localhost:8080"
  : "https://caltex-api.onrender.com";

window.API_ENDPOINT = window.location.origin + "/api";
