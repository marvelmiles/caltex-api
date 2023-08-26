import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const cwd = process.cwd();

// Read the contents of the directory

const key = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

const files = fs.readdirSync(cwd);

// Print the list of files and folders
console.log("Contents of the current directorys ", process.env, key, files);

const fh = str => {
  const filePath = path.join(process.cwd(), str);

  const exists = fs.existsSync(filePath);
  if (exists) {
    console.log("File exists.");
  } else {
    console.log("File does not exist.");
  }
};

fh("firebase-api-key.text");
fh("firebase-api-key");

export const firebaseCredential = admin.credential.cert({
  type: "service_account",
  project_id: "caltex-api",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCibl3+zGUmgCjf\n8EcEcWYf9E5ovYOnz+c7U1xq2FmnJJHtWSCa+mpwGr6/OZAXevqmqbNoOUU5+wHd\n+r0gL7196vVpmqjGplE6/v3uYLwNyL7tnkvZfMBga16Sxthgfy/1G2SALHXB0U8r\nGUQxjcjZ8KGSgCCTAY/Fk7AqdTQ+enn7rGPfTnastINCw2enEcxUVnd+PPHLzEyl\n0u+soK/URlgt1XaFb0mnvWKsVOM+tgakN/ZNN2bsam6qoiritDjJGaREZifJBFvz\n5f7O+AYYOlJW5dWCmaxLCQpDaB4urM4qRXD7T7uzPtxnB84frVf6SluqvkqVb7Ci\nOZdUUgjjAgMBAAECggEAGPyUXglQOBN39jbuncrZ9GlvFGKu2YY8Yl5o9ZCxfeo8\nvn+66cxCylr648y1kz8aRsANNqe0s/4eY+jZ5hUh97hIp0Wg1+omzcYDBwP/eblb\nUY9LyLmNmGd75WVMTM/T70cW9zafqMCLhqw81siiUJBZMoGeQS740GJvM6DS+Bc9\nBYc+T1fhfZV4Pdt4ucOvx/sFh/mU1XwEQ3QDYMAQCEhVEjr3L3WcDCzBVS75aW8r\n2jdhVH5AfAsFykJCFvFRWpZZkV1pET1UsZUrL5wNG8fxn7iE396zrkrveTZwgyTW\nGd3medX/Ky8dmN1KEb99mSaetUdfjC4FCTGledOXTQKBgQDjnKVffig9Yat9H/UQ\nMtHGssvWivKsmJIw4wel0bVOh/2x0a3fZhFwlDwTRFMnlOtaVzOYSHUGpnhLt7gA\nmFoPm8ChY+mKnc3EfeIg6kB4r57+Zg12BP8rvsUbZtHCQ98PJdj4P8Yh2Ouju7jk\n+EAFEMtIC8tsigCfB6CkFjyN3wKBgQC2sJVJJ4PTqIiQok/Rk3KakddG/t3SS35s\nETNnfq5DuBFpNkEtC4OyNHUlj2Iy5gwaiPBReka2ZiGgMWSgg+7rIbMnEbl1GEKK\nb8JbzDtptdNfbU47f7JOjJRvWML0yz51rVAWD9fWO5+/tbwnQHNLjqWwuvFFol5R\nCwICdCGdfQKBgQDdsL0B/YaEApVdEbtHQ7g+p/cRx9QFd7UsGHRidZb6Hkpi369S\nX7+svzSkL3AupUV2gGiocipJh+qzFQYKzlkpyrIcf4wAjyLTtyiAlqik46kgb5W8\n1bETkoO45LR5WlHwFxT09misnvMkTrsPiRwR0wGr8pD37pIcUvmL2HyyUQKBgCnb\nu9jPHP1aGDBLgE5col2YHOM/ckPE2GqaZlTISdVqT1L0A2r2wG4MZur8N1vCKfPK\nfIWuppUUQZAawRumHw/w4MOK5BtYO6bMhJPT76kA6DVtLgej8o7c1wXMKJ8+EkmU\nNE1Zw/JqJugeE8ZKliAxxvT/YFi8IzAefY9iXHFhAoGAKvh3x/sNQE3lqyuIzWhG\nqlia0oDkK4n2d3H4ykZxBp2oJ34FESlLe6ry6zj9pBiNH1QL4BeDANeM6zKyiOmJ\nMr3zP+0ARkhseOYMnamKb7Xs8YhELQrmW83Yk956pwV5r7aWTKCF3KUnJynZiGUR\nUV7sUBNu+Y6mL446Qt8aq28=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-hocuy@caltex-api.iam.gserviceaccount.com",
  client_id: "113433279036650090499",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-hocuy%40caltex-api.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
});

admin.initializeApp({
  credential: firebaseCredential
});

// export const storage = admin.storage();

export const storage = admin.storage();

export default admin;
