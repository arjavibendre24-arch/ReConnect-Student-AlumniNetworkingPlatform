const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    title: {
      type: String,
      trim: true,
      default: "ReConnect Notification"
    },

    message: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: [
        "MENTORSHIP_REQUEST",
        "MENTORSHIP_APPROVED",
        "MENTORSHIP_REJECTED",
        "OPPORTUNITY",
        "EVENT",
        "ACCOUNT"
      ],
      required: true
    },

    read: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "Notification",
  notificationSchema
);