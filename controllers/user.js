import Investment from "../models/Investment";
import User from "../models/User";
import Transaction from "../models/Transaction";
import { createInEqualityQuery } from "../utils/serializers";
import { getAll } from "../utils";
import { getUserMetrics } from "../utils/user";
import { v4 as uniq } from "uuid";
import { createSuccessBody } from "../utils/normalizers";
import mongoose from "mongoose";
import { createError } from "../utils/error";
import {
  HTTP_403_MSG,
  MSG_USER_404,
  HTTP_CODE_ACCOUNT_VERIFICATION_ERROR,
} from "../config/constants";
import { sendNotificationMail } from "../utils/file-handlers";

export const getUserInvestmentsById = async (req, res, next) => {
  try {
    const match = {
      user: req.user._id,
    };

    res.json(
      createSuccessBody({
        message: "Request succssful",
        data: await getAll({
          model: Investment,
          match,
          lookups: [
            {
              from: "user",
            },
          ],
        }),
      })
    );
  } catch (err) {
    next(err);
  }
};

export const updateUserById = async (req, res, next) => {
  try {
    const uid = req.params.userId;

    if (req.file?.publicUrl) req.body.photoUrl = req.file.publicUrl;

    for (const key in req.body.kycIds) {
      req.body[`kycIds.${key}`] = {
        id: req.body.kycIds[key],
        status: "awaiting",
      };
    }

    for (const key in req.body.docs) {
      if (key === "avatar") continue;

      const [parent, child] = key.split("-");

      req.body[`kycDocs.${parent}.${child}`] = req.body.docs[key];
      req.body[`kycDocs.${parent}.status`] = "awaiting";
    }

    delete req.body.kycIds;
    delete req.body.docs;

    for (const key in req.body.address) {
      req.body[`address.${key}`] = req.body.address[key];
    }

    if (req.body.phone) {
      if (Array.isArray(req.body.phone))
        req.body.$addToSet = {
          phone: { $each: req.body.phone },
        };
      else if (typeof req.body.phone === "string")
        req.body.$addToSet = {
          phone: req.body.phone,
        };
      else throw "Invalid body.phone expect an array or string";

      delete req.body.phone;
    }

    for (const key of [
      "resetToken",
      "resetDate",
      "provider",
      "accountExpires",
      "isAdmin",
      "isSuperAdmin",
      "password",
      "lastLogin",
      "ids",
      "address",
    ]) {
      delete req.body[key];
    }

    const user = await User.findByIdAndUpdate(uid, req.body, { new: true });

    if (!user) throw "User doesn't exist";

    res.json(
      createSuccessBody({
        message: `Profile updated successfully`,
        data: user,
      })
    );
  } catch (err) {
    next(err);
  }
};

export const getUserById = (req, res, next) => {
  try {
    res.json(
      createSuccessBody({ message: "Request successful", data: req.user })
    );
  } catch (err) {
    next(err);
  }
};

export const getUserTransactionsById = async (req, res, next) => {
  try {
    console.log("get u trans...");

    let {
      gteDate,
      gteUpdatedAt,
      transactionType,
      status,
      amount,
      plan,
      paymentType,
      roi,
      totalAmount,
      gteAmount,
    } = req.query;

    const match = {
        user: req.user._id,
      },
      investmentQuery = {};

    if (gteDate)
      match.createdAt = {
        $gte: new Date(gteDate),
      };

    if (req.query.lteDate) {
      match.createdAt = {
        $lte: new Date(req.query.lteDate),
      };
    }

    if (gteUpdatedAt)
      match.updatedAt = {
        $gte: new Date(gteUpdatedAt),
      };

    if (amount) match.amount = amount;

    if (gteAmount)
      match.amount = {
        $gte: gteAmount,
      };

    transactionType && (match.transactionType = transactionType);

    paymentType && (match.paymentType = paymentType);

    status && (match.status = status);

    plan && (investmentQuery.plan = plan);

    roi && createInEqualityQuery(roi, "roi", investmentQuery);

    totalAmount &&
      createInEqualityQuery(totalAmount, "totalAmount", investmentQuery);

    res.json(
      createSuccessBody({
        message: "Request successful",
        data: await getAll({
          model: Transaction,
          match,
          query: req.query,
        }),
      })
    );
  } catch (err) {
    next(err);
  }
};

export const verifyUserIdentity = (req, res, next) => {
  try {
    // this is just a pseudo code and actual api code will be used in production

    const { documentType, documentNumber } = req.body;

    if (!(documentType && documentNumber))
      throw "Document type and document number are required";

    const driverLicenseNumbers = [
      "A123-456-789-012",
      "B987-654-321-098",
      "C567-890-123-456",
      "D321-098-765-432",
      "E678-901-234-567",
    ];

    const passportNumbers = [
      "AB123456",
      "CD987654",
      "EF567890",
      "GH123456",
      "IJ987654",
    ];

    const nationalIDNumbers = [
      "987654321B",
      "987654321",
      "567890123",
      "321098765",
      "678901234",
    ];

    const mockVerification = () => {
      const isVerified = Math.random() > 0.5; // Mock result (true or false)

      function camelToSnake(str) {
        return str.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
      }

      const generateRandomLoc = () => {
        function getRandomAddressInUSA() {
          // Sample data for generating random addresses
          const streetNames = [
            "Main St",
            "Elm St",
            "Oak Ave",
            "Maple Ln",
            "Cedar Dr",
            "Pine Rd",
            "River View Rd",
          ];

          const cities = [
            "New York",
            "Los Angeles",
            "Chicago",
            "Houston",
            "Phoenix",
            "Philadelphia",
            "San Antonio",
            "San Diego",
            "Dallas",
            "San Jose",
          ];

          const states = [
            "Alabama",
            "Alaska",
            "Arizona",
            "Arkansas",
            "California",
            "Colorado",
            "Connecticut",
            "Delaware",
            "Florida",
            "Georgia",
            "Hawaii",
            "Idaho",
            "Illinois",
            "Indiana",
            "Iowa",
            "Kansas",
            "Kentucky",
            "Louisiana",
            "Maine",
            "Maryland",
            "Massachusetts",
            "Michigan",
            "Minnesota",
            "Mississippi",
            "Missouri",
            "Montana",
            "Nebraska",
            "Nevada",
            "New Hampshire",
            "New Jersey",
            "New Mexico",
            "New York",
            "North Carolina",
            "North Dakota",
            "Ohio",
            "Oklahoma",
            "Oregon",
            "Pennsylvania",
            "Rhode Island",
            "South Carolina",
            "South Dakota",
            "Tennessee",
            "Texas",
            "Utah",
            "Vermont",
            "Virginia",
            "Washington",
            "West Virginia",
            "Wisconsin",
            "Wyoming",
          ];

          // Generate random elements for the address
          const randomStreetName =
            streetNames[Math.floor(Math.random() * streetNames.length)];
          const randomCity = cities[Math.floor(Math.random() * cities.length)];
          const randomState = states[Math.floor(Math.random() * states.length)];
          const randomZIPCode = Math.floor(Math.random() * 90000) + 10000; // Generate a 5-digit ZIP code

          // Construct the random address
          const address = {
            street: `${
              Math.floor(Math.random() * 2000) + 1
            } ${randomStreetName}`,
            city: randomCity,
            state: randomState,
            zip: randomZIPCode,
            country: "United States",
          };

          return address;
        }

        const getRandomBoundaries = () => {
          // Define boundaries for latitude and longitude within the USA
          const minLatitude = 24.396308; // Southernmost point in the USA
          const maxLatitude = 49.384358; // Northernmost point in the USA
          const minLongitude = -125.0; // Westernmost point in the USA
          const maxLongitude = -66.93457; // Easternmost point in the USA

          // Generate random latitude within the boundaries
          const latitude =
            Math.random() * (maxLatitude - minLatitude) + minLatitude;

          // Generate random longitude within the boundaries
          const longitude =
            Math.random() * (maxLongitude - minLongitude) + minLongitude;
          return { longitude, latitude };
        };

        const { latitude, longitude } = getRandomBoundaries();

        return {
          latitude,
          longitude,
          address: getRandomAddressInUSA(),
        };
      };

      // Generate a detailed response body
      const response = {
        TransactionRecordID: uniq(),
        RecordStatus: "match",
        DatasourceResults: [],
        uploadedDt: new Date().toISOString(),
        verified: isVerified,
        documentType: camelToSnake(documentType),
        documentNumber: documentNumber,
        verificationResult: isVerified,
        location: generateRandomLoc(),
      };

      return response;
    };

    // Simulate the verification process based on the document type
    let result = null;

    switch (documentType) {
      case "nationalId":
        if (!nationalIDNumbers.includes(documentNumber))
          throw "Invalid national identity number";
        result = mockVerification();
        break;
      case "driverLicense":
        if (!driverLicenseNumbers.includes(documentNumber))
          throw "Invalid national identity number";
        result = mockVerification();
        break;
      case "passport":
        if (!passportNumbers.includes(documentNumber))
          throw "Invalid national identity number";
        result = mockVerification();
        break;
      default:
        res.status(400).json({ error: "Invalid document type" });
        return;
    }

    res.json(
      createSuccessBody({
        message: "Request successful",
        data: result,
      })
    );
  } catch (err) {
    next(err);
  }
};

export const getUserTransactionMetrics = async (req, res, next) => {
  try {
    res.json(
      createSuccessBody({
        data: await getUserMetrics(req.params.userId),
      })
    );
  } catch (err) {
    next(err);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const match = {
      _id: {
        $ne: req.query.withUser
          ? undefined
          : new mongoose.Types.ObjectId(req.user.id),
      },
    };

    if (req.query.admin !== undefined) match.isAdmin = req.query.admin;

    res.json(
      createSuccessBody({
        data: await getAll({
          match,
          model: User,
          query: req.query,
        }),
      })
    );
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    console.log("will delete ", req.params.userId);

    if (!req.user.isSuperAdmin) throw createError(HTTP_403_MSG, 428);

    const { username, firstname } =
      (await User.findByIdAndDelete(req.params.userId)) || {};

    const u = username || firstname;

    res.json(
      createSuccessBody({
        message: u ? `@${u} has been deleted successfully!` : undefined,
      })
    );
  } catch (err) {
    next(err);
  }
};

export const updateUserKycStatus = async (req, res, next) => {
  try {
    const reason = req.params.reason;

    switch (reason) {
      case "reject":
      case "confirm":
        break;
      default:
        throw createError("Invalid request", 404);
    }

    const user = await User.findById(req.params.userId);

    if (!user)
      throw createError(
        MSG_USER_404,
        403,
        HTTP_CODE_ACCOUNT_VERIFICATION_ERROR
      );

    if (!req.body.kyc)
      throw "Invalid request body. Key value pair kyc is required!";

    const type = req.query.kycType;

    const kyc = req.body.kyc.split(" ");

    const updateStatus = (pathName) => {
      for (const key of kyc) {
        const path = user[pathName];

        if (!path) continue;

        const obj = path[key];

        if (!obj) continue;

        if (obj.status === "awaiting") {
          obj.status = reason + "ed";
        }
      }
    };

    switch (type) {
      case "file":
        updateStatus("kycDocs");
        break;
      case "id":
        updateStatus("kycIds");
        break;
      default:
        throw "Invalid kyc type expect one of <file|id>";
    }

    await user.updateOne({
      kycDocs: user.kycDocs,
      kycIds: user.kycIds,
    });

    res.json(createSuccessBody());

    sendNotificationMail(user.email, {
      mailOpts: {
        subject: "Caltex KYC Verfification",
      },
      tempOpts: {
        fullname: user.fullname,
        text:
          reason === "confirm"
            ? "We are pleased to inform you that your Know Your Customer (KYC) process has been approved at this time."
            : "We regret to inform you that your Know Your Customer (KYC) process has not been approved at this time.",
      },
    });
  } catch (err) {
    next(err);
  }
};

// (async () => {
//   await User.updateMany(
//     {},
//     {
//       kycDocs: { _id: new mongoose.Types.ObjectId() },
//       kycIds: { _id: new mongoose.Types.ObjectId() }
//     }
//   );
// })();
