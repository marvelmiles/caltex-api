export const createInEqualityQuery = (
  str,
  key,
  query = {},
  castFn = Number
) => {
  let index = 0;
  const op =
    { ">": ">", "<": "<" }[str[0]] + (str[1] === "=" ? (index = 2) && "=" : "");

  str = str.slice(index);

  str = castFn.name === "Date" ? new castFn(str) : castFn(str);

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

export const createLookupPipeline = ({
  from,
  localField,
  foreignField = "_id",
  as: lookupAs,
  strict,
  ...lookup
}) => {
  from = lookup.from || from;
  localField = localField || from;
  lookupAs = lookupAs || from;

  return [
    {
      $lookup: {
        from,
        localField,
        foreignField,
        as: lookupAs,
        ...lookup
      }
    },
    {
      $addFields: {
        [lookupAs]: { $arrayElemAt: [`$${lookupAs}`, 0] }
      }
    },
    {
      $match: strict
        ? {
            [lookupAs]: { $ne: null, $exists: true }
          }
        : {}
    }
  ];
};
