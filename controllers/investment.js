import Investment from "../models/Investment";
import { createSuccessBody } from "../utils/normalizers";

export const setupUserInvestment = async (req, res, next) => {
  try {
    console.log(req.body);

    req.body.user = req.user.id;

    const investment = new Investment(req.body);

    res.json(
      createSuccessBody({
        message: "Investment created successfully!",
        data: await investment.save()
      })
    );
  } catch (err) {
    next(err);
  }
};

export const getInvestmentById = async (req, res, next) => {
  try {
    const id = req.params.investmentId.toLowerCase();

    if (id === "invest") return next();

    res.json({
      success: true,
      data: await Investment.findById(id).populate("user")
    });
  } catch (err) {
    next(err);
  }
};
