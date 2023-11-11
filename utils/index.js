import { createLookupPipeline } from "./normalizers";
import { SERVER_ORIGIN } from "../config/constants";
import { createError } from "./error";
import { isObject } from "./validators";
import Transaction from "../models/Transaction";
import mongoose from "mongoose";

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
  query = {},
  lookups = [
    {
      from: "user"
    }
  ]
}) => {
  let {
    limit = Infinity,
    cursor = "",
    randomize = false,
    asc = false,
    withEq = false
  } = query;

  limit = limit === Infinity ? Infinity : limit + 1;

  let pipeline = [
    {
      $match: match
    },
    {
      $limit: limit
    }
  ];

  const addFields = {
    id: "$_id"
  };

  const unsetProject = {
    _id: 0,
    password: 0,
    resetToken: 0,
    resetDate: 0,
    "address._id": 0
  };

  if (match._id && !isObject(match._id))
    match._id = {
      $eq: match._id
    };

  if (cursor) {
    cursor = decodeURIComponent(cursor);

    const cursorIdRules = {
      [asc ? (withEq ? "$gte" : "$gt") : withEq ? "$lte" : "$lt"]: cursor
    };

    pipeline.splice(0, 1, {
      $match: {
        ...pipeline[0].$match,
        _id: {
          ...pipeline[0].$match._id,
          ...cursorIdRules
        }
      }
    });
  }

  if (randomize) pipeline.splice(2, 0, { $sample: { size: limit } });

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

  if (!cursor)
    pipeline.splice(pipeline.length, 0, {
      $sort: { _id: asc ? 1 : -1 }
    });

  pipeline.splice(
    pipeline.length,
    0,

    {
      $addFields: addFields
    },
    {
      $project: unsetProject
    }
  );

  const data = await model.aggregate(pipeline);

  cursor = null;

  if (data.length === limit) {
    cursor = data[limit - 1].id;
    data.pop();
  }

  return {
    paging: {
      totalCount: data.length,
      cursor
    },
    data
  };
};

// using this cusotom method bcos for some reason update's middleware
// crash server after invoking an error

export const updateDoc = async (doc, updates) => {
  for (const key in updates) {
    doc[key] = updates[key];
  }

  return await doc.save();
};
