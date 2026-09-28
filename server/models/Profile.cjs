const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    phone: {
      type: String,
      default: ""
    },

    college: {
      type: String,
      default: ""
    },

    branch: {
      type: String,
      default: ""
    },

    year: {
      type: String,
      default: ""
    },

    skills: {
      type: String,
      default: ""
    },

    bio: {
      type: String,
      default: ""
    },

    profilePicture: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Profile", profileSchema);