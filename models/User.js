import mongoose from "mongoose";
import { isEmail } from "../utils/validators";
import { generateBcryptHash } from "../utils/auth";

const schema = new mongoose.Schema(
  {
    surname: {
      type: String,
      required: "Your surname is required"
    },
    firstname: {
      type: String,
      required: "Your firstname is required"
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
        message: "Your email address is invalid"
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
    },
    address: {
      type: [String],
      default: []
    },
    zipCode: String,
    country: String
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
        delete ret.resetToken;
        delete ret.resetDate;

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
