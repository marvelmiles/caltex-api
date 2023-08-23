import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { isEmail } from "../utils/validators";
import { generateBcryptHash } from "../utils/auth";

const schema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: "Your fullname is required"
    },
    username: {
      type: String,
      unique: true,
      message: "Username isn't available"
    },
    email: {
      type: String,
      required: "Your email is required",
      unique: true,
      validate: {
        validator: function(v) {
          return isEmail(v);
        },
        message: props => "Your email address is invalid"
      }
    },
    password: {
      type: String,
      required: "Your password is required",
      validate: {
        validator: function(v) {
          return v.length >= 8;
        },
        message: "Password is shorter than minimum allowed length (8)"
      }
    },
    photoUrl: String,
    lastLogin: Date,
    isLogin: {
      type: Boolean,
      set(v) {
        v && (this.lastLogin = new Date());
        return v;
      }
    },
    provider: String,
    resetToken: String,
    resetDate: Date,
    settings: {
      type: Object
    }
  },
  {
    collection: "user",
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        if (ret.settings) delete ret.settings._id;
      }
    }
  }
);

schema.pre("save", async function(next) {
  if (this.isModified("password") || this.isNew) {
    try {
      if (this.password)
        this.password = await generateBcryptHash(this.password);
    } catch (error) {
      return next(error);
    }
  }
  next();
});

export default mongoose.model("user", schema);
