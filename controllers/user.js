import Investment from "../models/Investment";
import User from "../models/User";
import { isObjectId } from "../utils/validators";

export const getInvestments = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await Investment.find({
        user: req.params.userId
      })
    });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const uid = req.params.userId;

    if (!uid || !isObjectId(uid)) throw "Invalid user id";

    const update = {
      $set: req.body,
      photoUrl: req.file?.publicUrl
    };

    delete update.$set.address;
    delete update.$set.password;

    if (req.query.addressIndex)
      update.$set[`address${addressIndex}`] = req.body.address;
    else update.$set.address = req.body.address;

    const user = await User.findByIdAndUpdate(uid, update, { new: true });

    if (!user) throw "User doesn't exist";

    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

export const getUserById = (req, res, next) => {
  try {
    res.json(req.user);
  } catch (err) {
    next(err);
  }
};
