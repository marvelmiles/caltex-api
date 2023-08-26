import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const cwd = process.cwd();

// Read the contents of the directory
fs.readdir(cwd, (err, files) => {
  if (err) {
    console.error("Error reading directory:", err);
    return;
  }

  // Print the list of files and folders
  console.log("Contents of the current directory: ", process.env, files);
  const fh = str => {
    const filePath = path.join(process.cwd(), str);

    fs.exists(filePath, exists => {
      if (exists) {
        console.log("File exists.");
      } else {
        console.log("File does not exist.");
      }
    });
  };

  fh("firebase-api-key.text");
  fh("firebase-api-key");
});

export const firebaseCredential = admin.credential.cert({
  type: "service_account",
  project_id: "caltex-api",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY,
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
