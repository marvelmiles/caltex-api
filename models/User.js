import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { isEmail } from "../utils/validators";
import { generateBcryptHash } from "../utils/auth";

const schema = new mongoose.Schema(
  {
    displayName: String,
    username: {
      type: String,
      required: "Your username is required",
      unique: true
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
      default: false
    },
    provider: String,
    resetToken: String,
    resetDate: Date,
    settings: {
      type: Object
    },
    emailVerified: {
      type: Boolean,
      default: function() {
        console.log(this, "... this.");
        return !!this.provider;
      }
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
  try {
    if (this.isModified("password") || this.isNew) {
      if (this.password)
        this.password = await generateBcryptHash(this.password);
    }
    next();
  } catch (error) {
    return next(error);
  }
});

export default mongoose.model("user", schema);
