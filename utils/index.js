import { createLookupPipeline } from "./normalizers";

export const setFutureDate = days => {
  return new Date(new Date().getTime() + days * 86400000);
};

export const getDaysDifference = (startDate, endDate) => {
  const utcStartDate = new Date(startDate.toISOString().substring(0, 10));
  const utcEndDate = new Date(endDate.toISOString().substring(0, 10));

  return Math.floor((utcEndDate - utcStartDate) / (1000 * 60 * 60 * 24));
};

export const getAll = async ({
  model,
  match = {},
  lookups = [],
  query = {}
}) => {
  let { limit = 20 } = query;

  limit = Number(limit) || 20;

  let pipeline = [
    {
      $match: match
    }
  ];

  const addFields = {
    id: "$_id"
  };

  const unsetProject = {
    _id: 0
  };

  for (let i = 0; i < lookups.length; i++) {
    const lookup = lookups[i];
    const path = `${lookup.from}._id`;

    unsetProject[path] = 0;
    addFields[`${lookup.from}.id`] = `$${path}`;

    const pipe = createLookupPipeline(lookup);

    if (i === 0) pipeline = pipeline.concat(pipe);
    else {
      pipeline.splice(pipeline.length - 2, 0, pipe[0]);

      Object.assign(pipeline[pipeline.length - 1].$match, pipe[2].$match);
      Object.assign(
        pipeline[pipeline.length - 2].$addFields,
        pipe[1].$addFields
      );
    }
  }

  pipeline.splice(
    pipeline.length,
    0,
    {
      $addFields: addFields
    },
    {
      $project: unsetProject
    },
    {
      $facet: {
        data: [{ $limit: limit }],
        totalCount: [{ $count: "count" }]
      }
    },
    { $unwind: "$totalCount" },
    {
      $project: {
        data: 1,
        totalCount: "$totalCount.count"
      }
    }
  );

  const { data, totalCount } = (await model.aggregate(pipeline))[0] || {
    data: [],
    totalCount: 0
  };
  return {
    success: true,
    paging: {
      totalCount
    },
    data
  };
};
