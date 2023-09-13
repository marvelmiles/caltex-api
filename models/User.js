import mongoose from "mongoose";
import { isEmail, isPassword } from "../utils/validators";
import { generateBcryptHash, generateHmac } from "../utils/auth";

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
          if (v.length < 8) {
            this.invalidate(
              "password",
              "Password is shorter than minimum allowed length (8)"
            );
            return false;
          }

          const status = isPassword(v);

          if (status === "Weak")
            return this.invalidate("passowrd", "Password strength is weak");

          return true;
        },
        message: () => undefined
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

const preMiddleware = async function(next) {
  try {
    const update = this.getUpdate ? this.getUpdate() : {};

    if (!update.$set) update.$set = {};

    if (this.password && (this.isModified("password") || this.isNew))
      this.password = await generateBcryptHash(this.password);

    if (update.isLogin) update.$set.lastLogin = new Date();
    else if (this.isLogin && (this.isModified("isLogin") || this.isNew))
      this.lastLogin = new Date();

    next();
  } catch (error) {
    return next(error);
  }
  next();
};

schema.pre("findOneAndUpdate", preMiddleware);
schema.pre("updateOne", preMiddleware);
schema.pre("save", preMiddleware);

export default mongoose.model("user", schema);
