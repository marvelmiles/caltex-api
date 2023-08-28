export const createInEqualityQuery = (
  str,
  key,
  query = {},
  castFn = Number
) => {
  let index = 1;
  const op = str[0] + (str[1] === "=" ? "=" && (index = 2) : "");

  str = castFn(str.slice(index));

  switch (op) {
    case ">":
      query[key] = { $gt: str };
      break;
    case ">=":
      query[key] = { $gte: str };
      break;
    case "<":
      query[key] = { $lt: str };
      break;
    case "<=":
      query[key] = { $lte: str };
      break;
    default:
      query[key] = str;
      break;
  }

  return query;
};
