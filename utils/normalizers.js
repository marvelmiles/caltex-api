export const convertToCamelCase = (obj) => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => convertToCamelCase(item));
  }

  const camelObj = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase()
      );
      camelObj[camelKey] = convertToCamelCase(obj[key]);
    }
  }

  return camelObj;
};

export const createLookupPipeline = ({
  from = "user",
  localField,
  foreignField = "_id",
  as: lookupAs,
  strict,
  ...lookup
}) => {
  from = lookup.from || from;
  localField = localField || from;
  lookupAs = lookupAs || localField;

  return [
    {
      $lookup: {
        from,
        localField,
        foreignField,
        as: lookupAs,
        ...lookup,
      },
    },
    {
      $addFields: {
        [lookupAs]: { $arrayElemAt: [`$${lookupAs}`, 0] },
        id: "$_id",
      },
    },
    {
      $match: strict
        ? {
            [lookupAs]: { $ne: null, $exists: true },
          }
        : {},
    },
  ];
};

export const createSuccessBody = (
  config = {
    message: "Request was successful",
    data: {},
    format: "json",
  }
) => {
  const { data, message, format } = config;

  switch (format) {
    default:
      return {
        data,
        code: "REQUEST_OK",
        success: true,
        statusCode: 200,
        status: 200,
        message,
        timestamp: new Date().toISOString(),
      };
  }
};

export const formatToDecimalPlace = (number = 0, toLocale) => {
  number = Number(number) || 0;

  if (number === 0) return "00.00";

  return toLocale ? number.toLocaleString() + ".00" : number.toFixed(2);
};
