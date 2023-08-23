import Investment from "../models/Investment";

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
