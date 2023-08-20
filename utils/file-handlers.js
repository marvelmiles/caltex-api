import nodemailer from "nodemailer";
import { MAIL_USER } from "../constants";

export const deleteFile = async () => {};

export const sendMail = (
  mailOptions,
  cb,
  service = "Gmail",
  user = MAIL_USER,
  pass = process.env.MAIL_PWD
) => {
  const transporter = nodemailer.createTransport({
    service,
    auth: {
      user,
      pass
    }
  });
  transporter.sendMail(mailOptions, cb);
};
