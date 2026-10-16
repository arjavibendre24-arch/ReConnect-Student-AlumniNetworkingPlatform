
const mongoose = require("mongoose");

const feedbackAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    question: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["rating", "text"],
      required: true
    },
    answer: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  { _id: false }
);

const eventFeedbackSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },

    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EventFeedbackForm",
      default: null
    },

    // Kept for compatibility with existing feedback and reports.
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },

    comments: {
      type: String,
      trim: true,
      default: ""
    },

    answers: {
      type: [feedbackAnswerSchema],
      default: []
    }
  },
  { timestamps: true }
);

eventFeedbackSchema.index(
  { eventId: 1, studentId: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.EventFeedback ||
  mongoose.model("EventFeedback", eventFeedbackSchema);
