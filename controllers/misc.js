import { getAll } from "../utils";
import User from "../models/User";
import { verifyToken } from "../middlewares";
import mongoose from "mongoose";
import { isObject } from "../utils/validators";
import qs from "qs";
import queryType from "query-types";
import { createError } from "../utils/error";

export const search = async (req, res, next) => {
  try {
    const result = {};

    const search = req.query.q
      ? {
          $regex: req.query.q,
          $options: "i"
        }
      : {
          $ne: undefined
        };

    if (req.query.withUser !== undefined) {
      try {
        verifyToken(req);
      } catch (err) {
        if (req.query.withAuth) throw err;
      }
    }

    const required = {};

    const conditions = [];

    const queryFillMatch = (queryObj = req.query, condProps = []) => {
      if (queryObj.admin !== undefined) required.isAdmin = queryObj.admin;

      if (isObject(queryObj.required)) {
        for (let key in queryObj.required) {
          if (key === "_id") continue;

          let v = queryObj.required[key];

          if (isObject(v)) {
            for (const _key in v) {
              v = v[_key];
              key = `${key}.${_key}`;
            }
          }

          required[{ admin: "isAdmin" }[key] || key] =
            v === "search" ? search : v;
        }
      }

      if (typeof queryObj.conditions === "string") {
        for (const key of queryObj.conditions.split(",")) {
          if (key === "_id") continue;

          conditions.push({
            [key]: search
          });
        }
      }

      for (const key of condProps) {
        if (isObject(queryObj[key]))
          for (const _key in queryObj[key]) {
            const v = queryObj[key][_key];

            conditions.splice(conditions.length, 0, {
              [`${key}.${_key}`]: v === "search" ? search : v
            });
          }
      }
    };

    queryFillMatch();

    const isObj = isObject(req.query.select);

    const select = isObj
      ? Object.keys(req.query.select)
      : (req.query.select || "").split(" ");

    for (const key of select.length ? select : ["users"]) {
      if (isObj) {
        let v = req.query.select[key];

        if (typeof v !== "string") {
          throw createError(
            `Invalid search param expect select.${key} to be a key value pair of type string`
          );
        }

        v = v.replace(/\|/g, "&");
        const obj = qs.parse(v);

        queryFillMatch(obj, ["address"]);
      }

      let match = {
        ...required,
        $or: conditions.length
          ? conditions
          : [
              {
                firstname: search
              },
              {
                lastname: search
              },
              {
                username: search
              },
              {
                email: search
              }
            ]
      };

      match = isObj ? queryType.parseValue(match) : match;

      switch (key) {
        case "users":
          match = {
            ...match,
            _id: {
              $ne:
                req.query.withUser === false
                  ? new mongoose.Types.ObjectId(req.user?.id)
                  : undefined
            }
          };

          result.users = await getAll({
            match,
            model: User,
            query: req.query
          });
          continue;
        default:
          result[key] = {
            data: [],
            paging: {
              nextCursor: null,
              totalCount: 0
            }
          };
          continue;
      }
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
};
