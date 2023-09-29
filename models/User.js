import mongoose from "mongoose";
import { isEmail, isPassword } from "../utils/validators";
import bcrypt from "bcrypt";
import { createError } from "../utils/error";

const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // after 7d

const schema = new mongoose.Schema(
  {
    lastname: {
      type: String,
      required: "Your lastname is required"
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
          console.log("runing val", v, this.invalidate);

          if (v.length < 8) {
            this.invalidate(
              "password",
              "Password is shorter than minimum allowed length (8)"
            );

            return false;
          }

          const status = isPassword(v);

          if (status === "Weak") {
            this.invalidate("passowrd", "Password strength is weak");

            return false;
          }

          return true;
        },
        message: () => undefined
      },
      set(v) {
        return bcrypt.hashSync(v, bcrypt.genSaltSync(10));
      }
    },
    photoUrl: String,
    lastLogin: Date,
    isLogin: {
      type: Boolean,
      default: false,
      set(v) {
        if (v) this.lastLogin = new Date();

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
      type: new mongoose.Schema(
        {
          city: String,
          country: String,
          line1: String,
          line2: String,
          postalCode: String,
          state: String
        },
        {}
      ),
      default: {}
    },
    country: String,
    ids: {
      type: Map,
      of: String,
      default: {}
    },
    phone: [String],
    accountExpires: {
      type: Date,
      expires,
      default: expires
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
        delete ret.resetToken;
        delete ret.resetDate;
        delete ret.address._id;

        if (ret.settings) delete ret.settings._id;
      }
    }
  }
);

schema.virtual("fullname").get(function() {
  return this.firstname + " " + this.lastname;
});

export default mongoose.model("user", schema);
