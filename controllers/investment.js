import Investment from "../models/Investment";

export const setupUserInvestment = async (req, res, next) => {
  try {
    req.body.user = req.user.id;

    const investment = new Investment(req.body);

    res.json({
      success: true,
      data: await investment.save()
    });
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
