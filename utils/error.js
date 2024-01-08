import { HTTP_MULTER_NAME_ERROR } from "../config/constants";

export const invalidate = (msg, path, name = "ValidationError") => {
  const err = new Error();
  err.message = msg;
  err.name = name;
  err.path = path;
  throw err;
};

export const getMongooseErrMsg = (err) => {
  let msg = "";

  const obj = err.errors || {};
  const keys = Object.keys(obj);

  for (let i = 0; i < keys.length; i++) {
    let info = obj[keys[i]];

    // console.log("----", info, typeof info, "-----");
    if (info.properties) {
      const prop = info.properties;
      switch (prop.type) {
        case "minlength":
          info = prop.minlength.message;
          break;
        default:
          info = info.message;
          break;
      }
    }
    if (info.toLowerCase)
      msg += msg
        ? `${i === keys.length - 1 ? " and " : ", "}` + info.toLowerCase()
        : info;
    else msg += err.message;
  }
  return msg || err.message;
};

export const console500MSG = (message, name = "LOG", extraMsg = "") =>
  console.error(
    `[SERVER_ERROR ${message.name} ${name}]: [code:${message.code}]: [type:${
      message.type
    }] [errors:${JSON.stringify(message.errors)}] [details:${JSON.stringify(
      message.details
    )}] ${message.message} ${extraMsg}. URL:${message.url} at ${new Date()}. `
  );

export const createError = (message, status, code) => {
  const err = new Error();

  if (message.statusCode) {
    console500MSG(message);
    return message;
  }

  const setDefault = () => {
    err.message =
      typeof message === "string" || status
        ? message.message || message
        : "Something went wrong!";
    err.statusCode = status || (message.length ? 400 : 500);

    err.code =
      code ||
      {
        401: "UNAUTHORIZED_ACCESS",
        403: "FORBIDDEN_ACCESSS",
        501: "INTERNAL_SERVER_ERROR",
        400: "BAD_REQUEST",
        428: "PRECONDITION_REQUIRED",
        404: "NOT_FOUND",
        409: "RESOURCE_CONFLICTED",
      }[err.statusCode] ||
      message.code ||
      "ERROR_CODE";
  };

  console.log(
    "[SERVER_ERROR: ERORR_INFO]",
    message.type,
    message.name,
    message.code,
    message.message || message,
    message.url,
    "__==__"
  );

  const keyName = (
    message.type ||
    message.name ||
    message.code ||
    ""
  ).toLowerCase();

  switch (keyName) {
    case "mongoservererror":
    case "validationerror":
      err.message = getMongooseErrMsg(message);

      err.statusCode = status || 400;
      err.code = { mongoservererror: "SCHEMA_ERROR" }[keyName];
      break;
    case "casterror":
      err.message = message.message
        .replaceAll(/_id+/g, "id")
        .slice(0, message.message.indexOf(`" for model`));
      err.statusCode = 400;
      break;
    case "customerror":
      err.message = message.message || message;
      err.statusCode = status || 400;
      err.name = message.errName || message.name;
      break;
    case "stripeinvalidrequesterror":
      err.message = message.message || message;
      err.statusCode = message.statusCodeCode || 400;
      err.name = message.type;
      break;
    case "rangeerror":
    case "referenceerror":
    case "multererror":
      switch (message.code && message.code.toLowerCase()) {
        case HTTP_MULTER_NAME_ERROR.toLowerCase():
          err.message = "File field not found!";
          err.statusCode = 400;
          break;
        default:
          setDefault();
          break;
      }
      break;
    case "fetcherror":
    case "econnreset":
      err.message = "Netowrk error. Check connectivity";
      err.statusCode = 504;
      break;
    default:
      const msg = message.message || message || "";
      console.error(
        "error 500... defualting ",
        msg,
        keyName,
        msg.indexOf("getaddrinfo")
      );
      switch (
        (msg.indexOf &&
          msg.toLowerCase().indexOf("getaddrinfo") > -1 &&
          "econnection") ||
        keyName
      ) {
        case "edns":
        case "econnection":
        case "enotfound":
        case "esocket":
        case "stripeconnectionerror":
          err.message = "Something went wrong or check network";
          err.statusCode = 504;
          break;
        case 11000:
        default:
          setDefault();
          break;
      }
      break;
  }

  if (err.statusCode === 500) console500MSG(message);

  err.status = err.statusCode;
  err.success = false;
  err.details = message.details;
  err.timestamp = new Date().toISOString();
  err.code = code || err.code || message.name || "ERROR";

  return err;
};
