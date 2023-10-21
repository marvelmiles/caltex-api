import express from "express";
import { search } from "../controllers/misc";
import path from "path";
import fs from "fs";
import ejs from "ejs";

const miscRouter = express.Router();

miscRouter.get("/search", search).get("/template", (req, res) => {
  const isPwd = false;

  const temp = path.resolve(
    process.cwd(),
    `templates/${isPwd ? "pwdReset" : "accVerification"}Template.ejs`
  );

  res.send(
    ejs.render(fs.readFileSync(temp, "utf-8"), {
      fullname:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa aaaaaaaaaaaaaaaaaaaaaaaaaa",
      verifyLink: "httP://LOCAL",
      primaryColor: "rgba(18, 14, 251, 1)",
      secondaryColor: "rgba(12, 9, 175, 1)",
      token: "5678"
    })
  );
});

export default miscRouter;
