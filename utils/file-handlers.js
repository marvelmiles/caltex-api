import nodemailer from "nodemailer";
import { MAIL_USER, FIREBASE_BUCKET_NAME } from "../config/constants";
import multer from "multer";
import { v4 as uniq } from "uuid";
import { storage } from "../config/firebase";
import { createError, console500MSG } from "./error";
import path from "path";

export const deleteFile = async () => {
  try {
  } catch (err) {}
};

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
  transporter.sendMail(mailOptions, (err, info) => {
    if (err)
      console.warn(
        `[SERVER_WARN: ${mailOptions.subject ||
          "MAIL"}] Encountered an error sending mail to ${
          mailOptions.to
        } at ${new Date()}`
      );
    cb(err, info);
  });
};

export const uploadFile = (
  config = { dirPath: "", type: "", single: "", defaultFieldName: "" }
) => {
  config = {
    dirPath: "avatars",
    type: "image",
    single: true,
    defaultFieldName: "avatar",
    ...config
  };
  return [
    (req, res, next) => {
      try {
        return multer({
          storage: new multer.memoryStorage()
        })[config.single ? "single" : "array"](
          req.query.fieldName || config.defaultFieldName,
          Number(req.query.maxUpload) || 1
        )(req, res, next);
      } catch (err) {
        next(err);
      }
    },
    async (req, res, next) => {
      try {
        if (req.file) req.file = await uploadToFirebase(req.file, config);
        else if (req.files) {
          const errs = [];
          for (let i = 0; i < req.files.length; i++) {
            let file;
            try {
              file = req.files[i];
              req.files[i] = await uploadToFirebase(file, config);
            } catch (err) {
              if (req.query.withBatchFailure === "true")
                errs.push(createError(err));
              else throw err;
            }
          }

          if (errs.length) {
            const err = {
              name: "FILE_UPLOAD_ERROR",
              message: `${errs.length > 1 ? "Batch" : "File"} upload failed`,
              details: errs,
              status: 409
            };
            console500MSG(err);
            throw err;
          }
        }
        next();
      } catch (err) {
        next(err);
      }
    }
  ];
};

export const uploadToFirebase = (file, config) =>
  new Promise((resolve, reject) => {
    if (file.mimetype.indexOf(config.type) === -1)
      return reject(`File mimetype ${file.mimetype} not supported`);

    if (!file.buffer)
      return reject(
        createError(`File content is either damaged or corrupt`, 409)
      );

    const filename =
      `${config.dirPath ? config.dirPath + "/" : ""}caltex-${(file.fieldname ||
        config.defaultFieldName ||
        config.dirPath ||
        config.type) + "-"}` +
      uniq() +
      path.extname(file.originalname);

    const bucket = storage.bucket(FIREBASE_BUCKET_NAME);
    const fileRef = bucket.file(filename);

    const streamConfig = {
      metadata: {
        contentType: file.mimetype
      }
    };

    const outstream = fileRef.createWriteStream(streamConfig);

    const handleError = err => reject(err);

    const handleSuccess = () => {
      file.filename = filename;
      fileRef
        .makePublic()
        .then(() => {
          file.publicUrl = fileRef.publicUrl();
          resolve(file);
        })
        .catch(handleError);
    };

    outstream.on("error", handleError);
    outstream.on("finish", handleSuccess);

    outstream.write(file.buffer);
    outstream.end();
  });
