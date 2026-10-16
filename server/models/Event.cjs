
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    date: {
      type: String,
      required: true
    },

    time: {
      type: String,
      required: true
    },

    // New fields for the actual event ending time.
    // Optional so existing events remain compatible.
    endDate: {
      type: String,
      default: ""
    },

    endTime: {
      type: String,
      default: ""
    },

    location: {
      type: String,
      default: ""
    },

    capacity: {
      type: Number,
      min: 1,
      default: 100
    },

    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Event", eventSchema);
