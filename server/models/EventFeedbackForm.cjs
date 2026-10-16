
const mongoose = require("mongoose");

const feedbackQuestionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["rating", "text"],
      default: "text",
      required: true
    },
    required: {
      type: Boolean,
      default: true
    }
  },
  { _id: true }
);

const eventFeedbackFormSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },

    organizerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: "",
      trim: true
    },

    questions: {
      type: [feedbackQuestionSchema],
      validate: {
        validator: function (questions) {
          return Array.isArray(questions) && questions.length > 0;
        },
        message: "A feedback form must contain at least one question."
      }
    },

    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft"
    }
  },
  { timestamps: true }
);

// One feedback form per event.
eventFeedbackFormSchema.index(
  { eventId: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.EventFeedbackForm ||
  mongoose.model("EventFeedbackForm", eventFeedbackFormSchema);
