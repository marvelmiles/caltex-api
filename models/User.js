import mongoose from "mongoose";
import { isEmail, isPassword } from "../utils/validators";
import bcrypt from "bcrypt";

const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // after 7d

const withAdminRequiredCheck = function() {
  return !this.isAdmin;
};

const schema = new mongoose.Schema(
  {
    isAdmin: {
      type: Boolean,
      default: false
    },
    isSuperAdmin: {
      type: Boolean,
      default: false
    },
    lastname: {
      type: String,
      required: [withAdminRequiredCheck, "Your lastname is required"]
    },
    firstname: {
      type: String,
      required: [withAdminRequiredCheck, "Your firstname is required"]
    },
    username: {
      type: String,
      unique: true,
      required: [
        function() {
          return this.isAdmin && !this.firstname;
        },
        "Your username or nickname is required"
      ]
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
      set(v) {
        console.log("val set pwd..", v, this.invalidate);

        if (v.length < 8) {
          this.invalidate(
            "password",
            "Password is shorter than minimum allowed length (8)"
          );

          return v;
        }

        const msg = isPassword(v);

        if (msg) {
          this.invalidate("passowrd", msg);

          return v;
        }

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
      default: function() {
        if (this.isAdmin) return;

        return expires;
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
