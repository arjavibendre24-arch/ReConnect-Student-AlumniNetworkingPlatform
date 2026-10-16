
const mongoose = require("mongoose");

const eventRegistrationSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["Registered", "Cancelled"],
      default: "Registered"
    }
  },
  { timestamps: true }
);

eventRegistrationSchema.index(
  { eventId: 1, studentId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "EventRegistration",
  eventRegistrationSchema
);
