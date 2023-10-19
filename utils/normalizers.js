export const convertToCamelCase = obj => {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => convertToCamelCase(item));
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
  from,
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
        ...lookup
      }
    },
    {
      $addFields: {
        [lookupAs]: { $arrayElemAt: [`$${lookupAs}`, 0] },
        id: "$_id"
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

export const createSuccessBody = ({
  data,
  message = "Request was successful",
  format = "json"
}) => {
  switch (format) {
    default:
      return {
        data,
        code: "REQUEST_OK",
        success: true,
        statusCode: 200,
        status: 200,
        message,
        timestamp: new Date().toISOString()
      };
  }
};
