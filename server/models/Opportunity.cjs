const mongoose = require("mongoose");

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    company: {
      type: String,
      required: true,
      trim: true
    },

    type: {
      type: String,
      enum: [
        "Job",
        "Internship",
        "Scholarship",
        "Other"
      ],
      default: "Job"
    },

    description: {
      type: String,
      default: ""
    },

    location: {
      type: String,
      default: ""
    },

    link: {
      type: String,
      default: ""
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "Opportunity",
  opportunitySchema
);