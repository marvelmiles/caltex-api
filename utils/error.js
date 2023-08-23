export const getMongooseErrMsg = err => {
  let msg = "";

  const obj = err.errors || {};
  const keys = Object.keys(obj);

  for (let i = 0; i < keys.length; i++) {
    let info = obj[keys[i]];
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

    msg += msg
      ? `${i === keys.length - 1 ? " and" : ","} ` + info.toLowerCase()
      : info;
  }
  return msg;
};

export const createError = (message, status) => {
  if (message.status) return message;

  const err = new Error();

  const setDefault = () => {
    err.message =
      typeof message === "string" ? message : "Something went wrong!";
    err.status = status || (message.length ? 400 : 500);

    err.code = message.length ? "BAD_REQUEST" : "ERROR_CODE";
  };
  console.log(
    message.code,
    message.message || message,
    message.url,
    message.name,
    "---err"
  );
  switch (message.name?.toLowerCase()) {
    case "validationerror":
      err.code = "VALIDATION_ERROR";
      err.message = getMongooseErrMsg(message);

      err.status = status || 400;
      break;
    case "casterror":
      err.message = message.message
        .replaceAll(/_id+/g, "id")
        .slice(0, message.message.indexOf(`" for model`));
      err.status = 400;
      break;
    case "customerror":
      err.message = message.message || message;
      err.status = status || 400;
      break;
    case "rangeerror":
    case "referenceerror":
    case "multererror":
      switch (message.code?.toLowerCase()) {
        case "limit_unexpected_file":
          err.message = "File field not found!";
          err.status = 400;
          break;
        case "11000":
          console.log(message.errors);
        default:
          setDefault();
          break;
      }
      break;
    case "fetcherror":
    case "econnreset":
      err.message = "Netowrk error. Check connectivity";
      err.status = 400;
      break;
    default:
      switch (
        message.code &&
          (message.code.toLowerCase ? message.code.toLowerCase() : message.code)
      ) {
        case "edns":
        case "econnection":
        case "enotfound":
        case "esocket":
          err.message = "Something went wrong or check network";
          err.status = 504;
          break;
        case 11000:

        default:
          setDefault();
          break;
      }
      break;
  }

  if (err.status === 500)
    console.log(
      `[SERVER_ERROR ${message.name || err.name}]: [code:${message.code ||
        err.code}]: ${message.message || err.message}. URL:${
        message.url
      } at ${new Date()}. `
    );

  err.success = false;

  return err;
};
