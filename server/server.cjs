const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: __dirname + "/.env" });

const User = require("./models/User.cjs");
const Profile = require("./models/Profile.cjs");
const Mentorship = require("./models/Mentorship.cjs");
const Notification = require("./models/Notification.cjs");
const Opportunity = require("./models/Opportunity.cjs");
const Event = require("./models/Event.cjs");
const EventRegistration = require("./models/EventRegistration.cjs");
const EventFeedback = require("./models/EventFeedback.cjs");
const EventFeedbackForm = require("./models/EventFeedbackForm.cjs");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is missing in server/.env");
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((error) => console.error("MongoDB connection error:", error.message));

async function createNotification(userId, title, message, type) {
  try {
    await Notification.create({ user: userId, title, message, type });
  } catch (error) {
    console.error("Notification error:", error.message);
  }
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

function parseEventDateTime(dateValue, timeValue) {
  const datePart = String(dateValue || "").slice(0, 10);
  const timePart = String(timeValue || "").trim();
  if (!datePart || !timePart) return null;

  const match = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  const meridiem = match[4]?.toUpperCase();

  if (minutes > 59 || seconds > 59 ||
      hours < (meridiem ? 1 : 0) ||
      hours > (meridiem ? 12 : 23)) return null;

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const result = new Date(
    `${datePart}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  );
  return Number.isNaN(result.getTime()) ? null : result;
}

function getEventStartDateTime(event) {
  return event ? parseEventDateTime(event.date, event.time) : null;
}

function getEventEndDateTime(event) {
  return event
    ? parseEventDateTime(event.endDate || event.date, event.endTime || event.time)
    : null;
}

app.get("/", (req, res) => {
  res.json({ message: "ReConnect System Backend is running" });
});

// REGISTER
app.post("/api/register", async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ message: "Full name, email, password and role are required." });
    }
    if (!["Student", "Alumni"].includes(role)) {
      return res.status(400).json({ message: "Only Student and Alumni registration is allowed." });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(400).json({ message: "An account with this email already exists." });
    }
    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      role,
      status: "Pending"
    });
    await createNotification(user._id, "Registration Submitted", "Your account is waiting for admin approval.", "ACCOUNT");
    const admins = await User.find({ role: "Admin" });
    for (const admin of admins) {
      await createNotification(admin._id, "New Registration",
        `${user.fullName} registered as ${user.role} and is waiting for approval.`, "ACCOUNT");
    }
    res.status(201).json({
      message: "Registration successful. Your account is waiting for admin approval.",
      user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role, status: user.status }
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Registration failed." });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ message: "Email, password and role are required." });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.role !== role) {
      return res.status(401).json({ message: "Invalid email, password or selected role." });
    }
    if (user.status === "Pending") {
      return res.status(403).json({ message: "Your account is waiting for admin approval." });
    }
    if (user.status === "Rejected") {
      return res.status(403).json({ message: "Your account has been rejected by the admin." });
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }
    res.json({
      message: "Login successful.",
      user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role, status: user.status }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed." });
  }
});

// PROFILE
app.get("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!validId(userId)) return res.status(400).json({ message: "Invalid user ID." });
    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.json({
        userId, phone: "", college: "", branch: "", year: "", skills: "",
        bio: "", company: "", designation: "", profilePicture: ""
      });
    }
    res.json(profile);
  } catch (error) {
    console.error("Profile GET error:", error);
    res.status(500).json({ message: "Unable to load profile." });
  }
});

app.post("/api/profile", async (req, res) => {
  try {
    const {
      userId, phone, college, branch, year, skills, bio,
      company, designation, profilePicture
    } = req.body;
    if (!userId || !validId(userId)) {
      return res.status(400).json({ message: "A valid user ID is required." });
    }
    const profile = await Profile.findOneAndUpdate(
      { userId },
      {
        userId, phone: phone || "", college: college || "", branch: branch || "",
        year: year || "", skills: skills || "", bio: bio || "",
        company: company || "", designation: designation || "",
        profilePicture: profilePicture || ""
      },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ message: "Profile saved successfully.", profile });
  } catch (error) {
    console.error("Profile POST error:", error);
    res.status(500).json({ message: "Unable to save profile." });
  }
});

// ALUMNI DIRECTORY
app.get("/api/alumni", async (req, res) => {
  try {
    const alumni = await User.find({
      role: { $regex: /^Alumni$/i },
      status: { $regex: /^Approved$/i }
    }).select("_id fullName email role status");
    const result = await Promise.all(alumni.map(async (person) => {
      const profile = await Profile.findOne({ userId: person._id });
      return {
        _id: person._id, fullName: person.fullName, email: person.email,
        role: person.role, status: person.status, phone: profile?.phone || "",
        college: profile?.college || "", branch: profile?.branch || "",
        year: profile?.year || "", skills: profile?.skills || "",
        bio: profile?.bio || "", company: profile?.company || "",
        designation: profile?.designation || "", profilePicture: profile?.profilePicture || ""
      };
    }));
    res.json(result);
  } catch (error) {
    console.error("Alumni error:", error);
    res.status(500).json({ message: "Unable to load alumni." });
  }
});

// NOTIFICATIONS
app.get("/api/notifications/:userId", async (req, res) => {
  try {
    if (!validId(req.params.userId)) return res.status(400).json({ message: "Invalid user ID." });
    res.json(await Notification.find({ user: req.params.userId }).sort({ createdAt: -1 }));
  } catch (error) {
    console.error("Notification GET error:", error);
    res.status(500).json({ message: "Unable to load notifications." });
  }
});

app.put("/api/notifications/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: "Unable to update notification." });
  }
});

app.put("/api/notifications/user/:userId/read-all", async (req, res) => {
  try {
    await Notification.updateMany({ user: req.params.userId, read: false }, { read: true });
    res.json({ message: "All notifications marked as read." });
  } catch (error) {
    res.status(500).json({ message: "Unable to update notifications." });
  }
});

// MENTORSHIP
app.post("/api/mentorship", async (req, res) => {
  try {
    const studentId = req.body.studentId || req.body.student;
    const alumniId = req.body.alumniId || req.body.alumni;
    if (!studentId || !alumniId || !validId(studentId) || !validId(alumniId)) {
      return res.status(400).json({ message: "Valid Student ID and Alumni ID are required." });
    }
    const [student, alumni] = await Promise.all([User.findById(studentId), User.findById(alumniId)]);
    if (!student || !alumni) return res.status(404).json({ message: "Student or Alumni not found." });
    if (student.role !== "Student" || alumni.role !== "Alumni") {
      return res.status(400).json({ message: "A student must request mentorship from an alumni." });
    }
    if (await Mentorship.findOne({ studentId, alumniId })) {
      return res.status(400).json({ message: "Mentorship request already exists." });
    }
    const mentorship = await Mentorship.create({ studentId, alumniId, status: "Pending" });
    await createNotification(alumniId, "New Mentorship Request",
      `${student.fullName} has requested mentorship from you.`, "MENTORSHIP_REQUEST");
    for (const admin of await User.find({ role: "Admin" })) {
      await createNotification(admin._id, "New Mentorship Request",
        `${student.fullName} requested mentorship from ${alumni.fullName}.`, "MENTORSHIP_REQUEST");
    }
    res.status(201).json({ message: "Mentorship request sent successfully.", mentorship });
  } catch (error) {
    console.error("Mentorship create error:", error);
    res.status(500).json({ message: "Unable to create mentorship request." });
  }
});

app.get("/api/mentorship/student/:studentId", async (req, res) => {
  try {
    res.json(await Mentorship.find({ studentId: req.params.studentId })
      .populate("studentId", "fullName email").populate("alumniId", "fullName email").sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ message: "Unable to load mentorships." });
  }
});

app.get("/api/mentorship/alumni/:alumniId", async (req, res) => {
  try {
    res.json(await Mentorship.find({ alumniId: req.params.alumniId })
      .populate("studentId", "fullName email").populate("alumniId", "fullName email").sort({ createdAt: -1 }));
  } catch (error) {
    res.status(500).json({ message: "Unable to load mentorships." });
  }
});

app.put("/api/mentorship/:id", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Pending", "Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid mentorship status." });
    }
    const mentorship = await Mentorship.findByIdAndUpdate(req.params.id, { status }, { new: true })
      .populate("studentId", "fullName email").populate("alumniId", "fullName email");
    if (!mentorship) return res.status(404).json({ message: "Mentorship request not found." });
    const title = status === "Accepted" ? "Mentorship Request Accepted"
      : status === "Rejected" ? "Mentorship Request Rejected" : "Mentorship Request Updated";
    const message = status === "Accepted"
      ? `${mentorship.alumniId.fullName} accepted your mentorship request.`
      : status === "Rejected"
        ? `${mentorship.alumniId.fullName} rejected your mentorship request.`
        : "Your mentorship request has been updated.";
    const type = status === "Accepted" ? "MENTORSHIP_APPROVED"
      : status === "Rejected" ? "MENTORSHIP_REJECTED" : "MENTORSHIP_REQUEST";
    await createNotification(mentorship.studentId._id, title, message, type);
    for (const admin of await User.find({ role: "Admin" })) {
      await createNotification(admin._id, title,
        `${mentorship.studentId.fullName} and ${mentorship.alumniId.fullName}: ${status}.`, type);
    }
    res.json({ message: `Mentorship request ${status.toLowerCase()}.`, mentorship });
  } catch (error) {
    console.error("Mentorship update error:", error);
    res.status(500).json({ message: "Unable to update mentorship." });
  }
});

// OPPORTUNITIES
app.get("/api/opportunities", async (req, res) => {
  try {
    res.json(await Opportunity.find().populate("postedBy", "fullName email role").sort({ createdAt: -1 }));
  } catch (error) {
    console.error("Opportunity GET error:", error);
    res.status(500).json({ message: "Unable to load opportunities." });
  }
});

app.post("/api/opportunities", async (req, res) => {
  try {
    const { title, company, type, description, location, link, postedBy } = req.body;
    if (!title || !postedBy || !validId(postedBy)) {
      return res.status(400).json({ message: "Title and a valid poster ID are required." });
    }
    const user = await User.findById(postedBy);
    if (!user || !["Alumni", "Admin"].includes(user.role)) {
      return res.status(403).json({ message: "Only Alumni or Admin can create opportunities." });
    }
    const opportunity = await Opportunity.create({
      title, company: company || "", type: type || "Job", description: description || "",
      location: location || "", link: link || "", postedBy
    });
    const users = await User.find({
      role: { $in: ["Student", "Alumni", "Admin"] }, _id: { $ne: postedBy }
    });
    for (const target of users) {
      await createNotification(target._id, "New Opportunity",
        `${title} has been posted on ReConnect.`, "OPPORTUNITY");
    }
    const populated = await Opportunity.findById(opportunity._id).populate("postedBy", "fullName email role");
    res.status(201).json({ message: "Opportunity created successfully.", opportunity: populated });
  } catch (error) {
    console.error("Opportunity POST error:", error);
    res.status(500).json({ message: "Unable to create opportunity." });
  }
});

// EVENTS - GET AND CREATE
app.get("/api/events", async (req, res) => {
  try {
    res.json(await Event.find().populate("organizer", "fullName email role").sort({ createdAt: -1 }));
  } catch (error) {
    console.error("Event GET error:", error);
    res.status(500).json({ message: "Unable to load events." });
  }
});

app.post("/api/events", async (req, res) => {
  try {
    const { title, description, date, time, endDate, endTime, location, capacity, organizer } = req.body;
    if (!title || !date || !time || !endDate || !endTime || !organizer || !validId(organizer)) {
      return res.status(400).json({
        message: "Title, start date, start time, end date, end time and a valid organizer ID are required."
      });
    }
    const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
    const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
    if (!validDate(date) || !validDate(endDate) || !validTime(time) || !validTime(endTime)) {
      return res.status(400).json({ message: "Please provide valid event dates and times." });
    }
    const startDateTime = new Date(`${date}T${time}:00`);
    const endDateTime = new Date(`${endDate}T${endTime}:00`);
    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      return res.status(400).json({ message: "Please provide valid event dates and times." });
    }
    if (endDateTime <= startDateTime) {
      return res.status(400).json({ message: "The event end date and time must be later than its start." });
    }
    const user = await User.findById(organizer);
    if (!user || !["Alumni", "Admin"].includes(user.role) || (user.status && user.status !== "Approved")) {
      return res.status(403).json({ message: "Only approved Alumni or Admin accounts can create events." });
    }
    const event = await Event.create({
      title: title.trim(), description: description || "", date, time, endDate, endTime,
      location: location || "", capacity: Number(capacity) > 0 ? Number(capacity) : 100, organizer
    });
    const users = await User.find({
      role: { $in: ["Student", "Alumni", "Admin"] }, _id: { $ne: organizer }
    });
    for (const target of users) {
      await createNotification(target._id, "New Event",
        `${title} has been added to ReConnect events.`, "EVENT");
    }
    const populated = await Event.findById(event._id).populate("organizer", "fullName email role");
    res.status(201).json({ message: "Event created successfully.", event: populated });
  } catch (error) {
    console.error("Event POST error:", error);
    res.status(500).json({ message: "Unable to create event." });
  }
});

// STUDENT - REGISTER FOR EVENT (registration closes at event end)
app.post("/api/events/:eventId/register", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { studentId } = req.body;
    if (!validId(eventId) || !validId(studentId)) {
      return res.status(400).json({ message: "Valid event and student IDs are required." });
    }
    const [event, student] = await Promise.all([Event.findById(eventId), User.findById(studentId)]);
    if (!event) return res.status(404).json({ message: "Event not found." });
    if (!student || student.role !== "Student" || student.status !== "Approved") {
      return res.status(403).json({ message: "Only approved students can register for events." });
    }
    const start = getEventStartDateTime(event);
    const end = getEventEndDateTime(event);
    if (!start || !end) return res.status(400).json({ message: "The event start or end date and time is invalid." });
    if (end <= start) return res.status(400).json({ message: "The event end must be after its start." });
    if (new Date() >= end) return res.status(400).json({ message: "This event has ended. Registration is closed." });

    const existing = await EventRegistration.findOne({ eventId, studentId });
    if (existing && existing.status === "Registered") {
      return res.status(409).json({ message: "You are already registered for this event." });
    }
    const count = await EventRegistration.countDocuments({ eventId, status: "Registered" });
    if (count >= Number(event.capacity || 100)) {
      return res.status(400).json({ message: "This event has reached its registration capacity." });
    }
    let registration;
    if (existing) {
      existing.status = "Registered";
      registration = await existing.save();
    } else {
      registration = await EventRegistration.create({ eventId, studentId, status: "Registered" });
    }
    await createNotification(event.organizer, "New Event Registration",
      `${student.fullName} registered for "${event.title}".`, "EVENT_REGISTRATION");
    res.status(201).json({ message: "Successfully registered for the event.", registration });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "You are already registered for this event." });
    console.error("Event registration error:", error);
    res.status(500).json({ message: "Unable to register for this event." });
  }
});

// STUDENT - MY EVENT REGISTRATIONS
async function sendStudentRegistrations(req, res) {
  try {
    const { studentId } = req.params;
    if (!validId(studentId)) return res.status(400).json({ message: "Invalid student ID." });
    const registrations = await EventRegistration.find({ studentId }).populate("eventId").sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    console.error("Student registrations error:", error);
    res.status(500).json({ message: "Unable to load registrations." });
  }
}
app.get("/api/events/registrations/student/:studentId", sendStudentRegistrations);
app.get("/api/events/student/:studentId/registrations", sendStudentRegistrations);

// STUDENT - CANCEL REGISTRATION (keep record for reports)
app.patch("/api/events/:eventId/register/cancel", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { studentId } = req.body;
    if (!validId(eventId) || !validId(studentId)) {
      return res.status(400).json({ message: "Valid event and student IDs are required." });
    }
    const registration = await EventRegistration.findOne({ eventId, studentId, status: "Registered" });
    if (!registration) return res.status(404).json({ message: "Active registration not found." });
    registration.status = "Cancelled";
    await registration.save();
    await createNotification(studentId, "Event Registration Cancelled",
      "Your event registration has been cancelled.", "EVENT_REGISTRATION");
    res.json({ message: "Event registration cancelled successfully.", registration });
  } catch (error) {
    console.error("Cancel registration error:", error);
    res.status(500).json({ message: "Unable to cancel registration." });
  }
});

// FEEDBACK FORMS: students can access published forms regardless of event age.
app.get("/api/events/:eventId/feedback-form", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { organizerId } = req.query;
    if (!validId(eventId)) return res.status(400).json({ message: "Invalid event ID." });
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found." });

    if (organizerId) {
      if (!validId(organizerId)) return res.status(400).json({ message: "Invalid organizer ID." });
      const [organizer, form] = await Promise.all([
        User.findById(organizerId), EventFeedbackForm.findOne({ eventId, organizerId })
      ]);
      if (!organizer || organizer.role !== "Alumni" || organizer.status !== "Approved" ||
          String(event.organizer) !== String(organizer._id)) {
        return res.status(403).json({ message: "Only the approved alumni hosting this event can view its form." });
      }
      if (!form) return res.status(404).json({ message: "Create a feedback form for this event first." });
      return res.json({ form });
    }

    const form = await EventFeedbackForm.findOne({ eventId, status: /^Published$/i });
    if (!form) return res.status(404).json({
      message: "The organizer has not published a feedback form for this event yet."
    });
    res.json({ form });
  } catch (error) {
    console.error("Get feedback form error:", error);
    res.status(500).json({ message: "Unable to load the feedback form." });
  }
});

app.post("/api/events/:eventId/feedback-form", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { organizerId, title, description, questions } = req.body;
    if (!validId(eventId) || !validId(organizerId)) {
      return res.status(400).json({ message: "Valid event and organizer IDs are required." });
    }
    const [event, organizer] = await Promise.all([Event.findById(eventId), User.findById(organizerId)]);
    if (!event) return res.status(404).json({ message: "Event not found." });
    if (!organizer || organizer.role !== "Alumni" ||
        String(event.organizer) !== String(organizer._id) ||
        (organizer.status && organizer.status !== "Approved")) {
      return res.status(403).json({
        message: "Only the approved alumni hosting this event can manage its feedback form."
      });
    }
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Please enter a feedback form title." });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Add at least one feedback question." });
    }
    const cleanedQuestions = [];
    for (const item of questions) {
      const question = String(item.question || "").trim();
      const type = item.type || "text";
      if (!question) return res.status(400).json({ message: "Every question must have question text." });
      if (!["rating", "text"].includes(type)) {
        return res.status(400).json({ message: "Question types must be rating or text." });
      }
      cleanedQuestions.push({ question, type, required: item.required !== false });
    }
    const existing = await EventFeedbackForm.findOne({ eventId });
    if (String(existing?.status || "").toLowerCase() === "published") {
      return res.status(409).json({ message: "This feedback form is already published and cannot be overwritten." });
    }
    const form = await EventFeedbackForm.findOneAndUpdate(
      { eventId },
      { $set: {
        eventId, organizerId: organizer._id, title: String(title).trim(),
        description: String(description || "").trim(), questions: cleanedQuestions, status: "Draft"
      }},
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ message: "Feedback form saved as a draft.", form });
  } catch (error) {
    console.error("Create feedback form error:", error);
    if (error.code === 11000) return res.status(409).json({ message: "A feedback form already exists for this event." });
    res.status(500).json({ message: "Unable to save the feedback form." });
  }
});

app.put("/api/events/:eventId/feedback-form/publish", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { organizerId } = req.body;
    if (!validId(eventId) || !validId(organizerId)) {
      return res.status(400).json({ message: "Valid event and organizer IDs are required." });
    }
    const [event, organizer, form] = await Promise.all([
      Event.findById(eventId), User.findById(organizerId), EventFeedbackForm.findOne({ eventId })
    ]);
    if (!event) return res.status(404).json({ message: "Event not found." });
    if (!form) return res.status(404).json({ message: "Create and save the feedback form before publishing it." });
    if (!organizer || organizer.role !== "Alumni" ||
        String(event.organizer) !== String(organizer._id) ||
        String(form.organizerId) !== String(organizer._id) ||
        (organizer.status && organizer.status !== "Approved")) {
      return res.status(403).json({
        message: "Only the approved alumni hosting this event can publish its feedback form."
      });
    }
    if (!form.questions || form.questions.length === 0) {
      return res.status(400).json({ message: "Add at least one question before publishing." });
    }
    form.status = "Published";
    await form.save();
    res.json({ message: "Feedback form published successfully.", form });
  } catch (error) {
    console.error("Publish feedback form error:", error);
    res.status(500).json({ message: "Unable to publish the feedback form." });
  }
});

// STUDENT - SUBMIT FEEDBACK
// IMPORTANT: There is intentionally NO event-end deadline check here.
// Students can submit feedback any time after the form is published.
app.post("/api/events/:eventId/feedback", async (req, res) => {
  try {
    const { eventId } = req.params;
    const { studentId, answers } = req.body;
    if (!validId(eventId) || !validId(studentId)) {
      return res.status(400).json({ message: "Valid event and student IDs are required." });
    }
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: "Please submit answers to the feedback form." });
    }
    const [event, student, registration, form] = await Promise.all([
      Event.findById(eventId),
      User.findById(studentId),
      EventRegistration.findOne({ eventId, studentId, status: "Registered" }),
      EventFeedbackForm.findOne({ eventId, status: /^Published$/i })
    ]);
    if (!event) return res.status(404).json({ message: "Event not found." });
    if (!student || student.role !== "Student" || student.status !== "Approved") {
      return res.status(403).json({ message: "Only approved students can submit feedback." });
    }
    if (!registration) {
      return res.status(403).json({
        message: "You must be registered for this event and must not have cancelled your registration."
      });
    }
    if (!form) {
      return res.status(404).json({ message: "The organizer has not published a feedback form for this event." });
    }

    // No call to getEventEndDateTime and no date comparison: submissions are not time-limited.
    const existingFeedback = await EventFeedback.findOne({ eventId, studentId });
    if (existingFeedback) {
      return res.status(409).json({ message: "You have already submitted feedback for this event." });
    }
    const questions = form.questions || [];
    const questionIds = new Set(questions.map((question) => String(question._id)));
    for (const answer of answers) {
      if (!answer || !answer.questionId || !questionIds.has(String(answer.questionId))) {
        return res.status(400).json({ message: "One or more answers do not match the published form." });
      }
    }
    const cleanedAnswers = [];
    for (const question of questions) {
      const submitted = answers.find((answer) => String(answer.questionId) === String(question._id));
      const rawValue = submitted?.answer;
      const isEmpty = rawValue === undefined || rawValue === null ||
        (typeof rawValue === "string" && !rawValue.trim());
      if (question.required && isEmpty) {
        return res.status(400).json({ message: `Please answer the required question: ${question.question}` });
      }
      if (isEmpty) continue;
      let cleanedValue;
      if (question.type === "rating") {
        cleanedValue = Number(rawValue);
        if (!Number.isInteger(cleanedValue) || cleanedValue < 1 || cleanedValue > 5) {
          return res.status(400).json({ message: `Select a rating from 1 to 5 for: ${question.question}` });
        }
      } else if (question.type === "text") {
        if (typeof rawValue !== "string") {
          return res.status(400).json({ message: `Enter text for: ${question.question}` });
        }
        cleanedValue = rawValue.trim();
        if (cleanedValue.length > 5000) {
          return res.status(400).json({ message: "A text answer cannot exceed 5000 characters." });
        }
      } else {
        return res.status(400).json({ message: "The form contains an unsupported question type." });
      }
      cleanedAnswers.push({
        questionId: question._id, question: question.question, type: question.type, answer: cleanedValue
      });
    }
    const ratingAnswer = cleanedAnswers.find((answer) => answer.type === "rating");
    const textAnswers = cleanedAnswers.filter((answer) => answer.type === "text")
      .map((answer) => `${answer.question}: ${answer.answer}`);
    const feedback = await EventFeedback.create({
      eventId, studentId, formId: form._id, answers: cleanedAnswers,
      rating: ratingAnswer ? ratingAnswer.answer : undefined,
      comments: textAnswers.join("\n")
    });
    for (const admin of await User.find({ role: "Admin" }).select("_id")) {
      await createNotification(admin._id, "New Student Event Feedback",
        `${student.fullName} submitted feedback for "${event.title}".`, "EVENT_FEEDBACK");
    }
    res.status(201).json({ message: "Thank you! Your feedback has been submitted.", feedback });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "You have already submitted feedback for this event." });
    }
    console.error("Event feedback submission error:", error);
    res.status(500).json({ message: "Unable to submit event feedback." });
  }
});

// STUDENT - GET PREVIOUSLY SUBMITTED FEEDBACK
app.get("/api/events/feedback/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!validId(studentId)) return res.status(400).json({ message: "A valid student ID is required." });
    const feedback = await EventFeedback.find({ studentId })
      .select("eventId studentId formId answers rating comments createdAt updatedAt")
      .sort({ createdAt: -1 }).lean();
    res.status(200).json({ feedback });
  } catch (error) {
    console.error("Fetch student event feedback error:", error);
    res.status(500).json({ message: "Unable to retrieve your submitted feedback." });
  }
});

// ADMIN - ALL EVENT FEEDBACK
app.get("/api/admin/event-feedback", async (req, res) => {
  try {
    const feedback = await EventFeedback.find({})
      .populate("eventId", "title date time endDate endTime")
      .populate("studentId", "fullName email").sort({ createdAt: -1 }).lean();
    const validFeedback = feedback.filter((item) => item.eventId && item.studentId);
    const ratings = validFeedback.map((item) => Number(item.rating))
      .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);
    const averageRating = ratings.length
      ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(2))
      : null;
    res.status(200).json({
      feedback: validFeedback, totalResponses: validFeedback.length,
      ratedResponses: ratings.length, averageRating
    });
  } catch (error) {
    console.error("Admin event feedback report error:", error);
    res.status(500).json({ message: "Unable to load event feedback reports." });
  }
});

// ADMIN - ALL EVENT REPORTS
app.get("/api/admin/reports/events", async (req, res) => {
  try {
    const events = await Event.find().populate("organizer", "fullName email role").sort({ createdAt: -1 });
    const reports = await Promise.all(events.map(async (event) => {
      const [totalRecords, registrations, registeredMembers, feedback] = await Promise.all([
        EventRegistration.countDocuments({ eventId: event._id }),
        EventRegistration.countDocuments({ eventId: event._id, status: "Registered" }),
        EventRegistration.find({ eventId: event._id, status: "Registered" })
          .populate("studentId", "fullName email role")
          .sort({ createdAt: -1 })
          .lean(),
        EventFeedback.find({ eventId: event._id })
      ]);
      const ratings = feedback.map((item) => Number(item.rating))
        .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);
      const averageRating = ratings.length
        ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(2))
        : null;
      return {
        event,
        totalRegistrationRecords: totalRecords,
        registrationCount: registrations,
        cancelledCount: totalRecords - registrations,
        feedbackCount: feedback.length,
        averageRating,
        participants: registeredMembers
          .filter((registration) => registration.studentId)
          .map((registration) => ({
            _id: registration.studentId._id,
            fullName: registration.studentId.fullName || "Unknown student",
            email: registration.studentId.email || "",
            status: registration.status,
            registeredAt: registration.createdAt || null
          }))
      };
    }));
    res.json(reports);
  } catch (error) {
    console.error("All event reports error:", error);
    res.status(500).json({ message: "Unable to generate event reports." });
  }
});


// ALUMNI - REPORTS FOR THEIR EVENTS 
app.get("/api/alumni/:alumniId/reports", async (req, res) => {
  try {
    const { alumniId } = req.params;

    if (!validId(alumniId)) {
      return res.status(400).json({
        message: "A valid alumni ID is required."
      });
    }

    const alumni = await User.findById(alumniId);

    if (!alumni || alumni.role !== "Alumni") {
      return res.status(404).json({
        message: "Alumni account not found."
      });
    }

    // Get only events hosted by this alumni.
    const events = await Event.find({ organizer: alumniId })
      .select(
        "title description date time endDate endTime location capacity organizer"
      )
      .sort({ createdAt: -1 })
      .lean();

    // Build a report for every hosted event.
    const eventsHosted = await Promise.all(
      events.map(async (event) => {
        const eventId = event._id;

        const [
          totalRegistrationRecords,
          registrationCount,
          cancelledCount,
          registrations,
          feedback
        ] = await Promise.all([
          EventRegistration.countDocuments({ eventId }),

          EventRegistration.countDocuments({
            eventId,
            status: "Registered"
          }),

          EventRegistration.countDocuments({
            eventId,
            status: "Cancelled"
          }),

          EventRegistration.find({
            eventId,
            status: "Registered"
          })
            .populate("studentId", "fullName email")
            .sort({ createdAt: -1 })
            .lean(),

          EventFeedback.find({ eventId })
            .populate("studentId", "fullName email")
            .sort({ createdAt: -1 })
            .lean()
        ]);

        // Ignore feedback whose student account no longer exists.
        const validFeedback = feedback.filter(
          (item) => item.studentId
        );

        const ratings = validFeedback
          .map((item) => Number(item.rating))
          .filter(
            (rating) =>
              Number.isFinite(rating) &&
              rating >= 1 &&
              rating <= 5
          );

        const averageRating = ratings.length
          ? Number(
              (
                ratings.reduce((sum, rating) => sum + rating, 0) /
                ratings.length
              ).toFixed(2)
            )
          : null;

        return {
          event,
          registrationCount,
          cancelledCount,
          totalRegistrationRecords,
          feedbackCount: validFeedback.length,
          averageRating,
          ratedResponses: ratings.length,
          attendanceTracked: false,
          participants: registrations
            .filter((registration) => registration.studentId)
            .map((registration) => ({
              _id: registration.studentId._id,
              fullName:
                registration.studentId.fullName || "Unknown student",
              email: registration.studentId.email || "",
              status: registration.status,
              registeredAt: registration.createdAt || null
            })),
          feedback: validFeedback.map((item) => ({
            ...item,
            eventId: String(eventId),
            eventTitle: event.title || "Untitled Event"
          }))
        };
      })
    );

    // Calculate overall statistics for this alumni's events.
    const totalActiveRegistrations = eventsHosted.reduce(
      (sum, report) => sum + report.registrationCount,
      0
    );

    const totalCancelledRegistrations = eventsHosted.reduce(
      (sum, report) => sum + report.cancelledCount,
      0
    );

    const allFeedback = eventsHosted.flatMap(
      (report) => report.feedback
    );

    const allRatings = allFeedback
      .map((item) => Number(item.rating))
      .filter(
        (rating) =>
          Number.isFinite(rating) &&
          rating >= 1 &&
          rating <= 5
      );

    const overallAverageRating = allRatings.length
      ? Number(
          (
            allRatings.reduce((sum, rating) => sum + rating, 0) /
            allRatings.length
          ).toFixed(2)
        )
      : null;

    // Keep the existing response fields for compatibility.
    // Add eventsHosted and summary for AlumniDashboard.jsx.
    res.status(200).json({
      events,
      eventsHosted,
      feedback: allFeedback,
      totalResponses: allFeedback.length,
      ratedResponses: allRatings.length,
      averageRating: overallAverageRating,
      feedbackByEvent: eventsHosted.map((report) => ({
        eventId: report.event._id,
        eventTitle: report.event.title,
        totalResponses: report.feedbackCount,
        ratedResponses: report.ratedResponses,
        averageRating: report.averageRating,
        feedback: report.feedback
      })),
      summary: {
        totalEventsHosted: eventsHosted.length,
        totalActiveRegistrations,
        totalCancelledRegistrations,
        totalFeedbackResponses: allFeedback.length,
        totalRatedResponses: allRatings.length,
        averageRating: overallAverageRating,
        attendanceTracked: false
      }
    });
  } catch (error) {
    console.error("Alumni event reports error:", error);

    res.status(500).json({
      message: "Unable to load alumni event reports."
    });
  }
});


// ADMIN - UPDATE EVENT
app.put("/api/admin/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, time, location, capacity } = req.body;
    if (!validId(id)) return res.status(400).json({ message: "Invalid event ID." });
    if (!title || !date || !time) return res.status(400).json({ message: "Title, date and time are required." });
    const update = {
      title: String(title).trim(), description: String(description || "").trim(),
      date, time, location: String(location || "").trim()
    };
    if (capacity !== undefined) update.capacity = Number(capacity);
    const event = await Event.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate("organizer", "fullName email role");
    if (!event) return res.status(404).json({ message: "Event not found." });
    res.json({ message: "Event updated successfully.", event });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({ message: "Unable to update event." });
  }
});

// ADMIN - STATS
app.get("/api/admin/stats", async (req, res) => {
  try {
    const [totalUsers, students, alumni, pendingApprovals, mentorshipRequests,
      opportunities, events, notifications] = await Promise.all([
      User.countDocuments(), User.countDocuments({ role: "Student" }),
      User.countDocuments({ role: "Alumni" }), User.countDocuments({ status: "Pending" }),
      Mentorship.countDocuments(), Opportunity.countDocuments(), Event.countDocuments(),
      Notification.countDocuments()
    ]);
    res.json({ totalUsers, students, alumni, pendingApprovals, mentorshipRequests, opportunities, events, notifications });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ message: "Unable to load admin statistics." });
  }
});

// ADMIN - USERS
app.get("/api/admin/users", async (req, res) => {
  try {
    res.json(await User.find().select("-password").sort({ createdAt: -1 }));
  } catch (error) {
    console.error("Admin users error:", error);
    res.status(500).json({ message: "Unable to load users." });
  }
});

app.put("/api/admin/users/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid user status." });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    const title = status === "Approved" ? "Account Approved"
      : status === "Rejected" ? "Account Rejected" : "Account Status Updated";
    await createNotification(user._id, title, `Your ReConnect account status is now ${status}.`, "ACCOUNT");
    res.json({ message: `User ${status.toLowerCase()} successfully.`, user });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({ message: "Unable to update user status." });
  }
});

app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.role === "Admin") {
      return res.status(403).json({ message: "Admin accounts cannot be deleted from this dashboard." });
    }
    await Profile.deleteMany({ userId: user._id });
    await Mentorship.deleteMany({ $or: [{ studentId: user._id }, { alumniId: user._id }] });
    await Notification.deleteMany({ user: user._id });
    await Opportunity.deleteMany({ postedBy: user._id });
    const hostedEvents = await Event.find({ organizer: user._id }).select("_id");
    const hostedEventIds = hostedEvents.map((event) => event._id);
    if (hostedEventIds.length) {
      await EventRegistration.deleteMany({ eventId: { $in: hostedEventIds } });
      await EventFeedback.deleteMany({ eventId: { $in: hostedEventIds } });
      await EventFeedbackForm.deleteMany({ eventId: { $in: hostedEventIds } });
      await Event.deleteMany({ organizer: user._id });
    }
    await EventRegistration.deleteMany({ studentId: user._id });
    await EventFeedback.deleteMany({ studentId: user._id });
    await User.findByIdAndDelete(user._id);
    res.json({ message: `${user.fullName} and associated records were deleted successfully.` });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Unable to delete user." });
  }
});

// ADMIN - MENTORSHIPS
app.get("/api/admin/mentorships", async (req, res) => {
  try {
    res.json(await Mentorship.find().populate("studentId", "fullName email role")
      .populate("alumniId", "fullName email role").sort({ createdAt: -1 }));
  } catch (error) {
    console.error("Admin mentorship error:", error);
    res.status(500).json({ message: "Unable to load mentorship requests." });
  }
});

// ADMIN - OPPORTUNITIES
app.get("/api/admin/opportunities", async (req, res) => {
  try {
    res.json(await Opportunity.find().populate("postedBy", "fullName email role").sort({ createdAt: -1 }));
  } catch (error) {
    console.error("Admin opportunities error:", error);
    res.status(500).json({ message: "Unable to load opportunities." });
  }
});

app.delete("/api/admin/opportunities/:id", async (req, res) => {
  try {
    const opportunity = await Opportunity.findByIdAndDelete(req.params.id);
    if (!opportunity) return res.status(404).json({ message: "Opportunity not found." });
    res.json({ message: "Opportunity deleted successfully." });
  } catch (error) {
    console.error("Delete opportunity error:", error);
    res.status(500).json({ message: "Unable to delete opportunity." });
  }
});

// ADMIN - EVENTS
app.get("/api/admin/events", async (req, res) => {
  try {
    res.json(await Event.find().populate("organizer", "fullName email role").sort({ createdAt: -1 }));
  } catch (error) {
    console.error("Admin events error:", error);
    res.status(500).json({ message: "Unable to load events." });
  }
});

// Exactly one event-delete route; associated records are deleted once.
app.delete("/api/admin/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!validId(id)) return res.status(400).json({ message: "Invalid event ID." });
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: "Event not found." });
    await EventRegistration.deleteMany({ eventId: id });
    await EventFeedback.deleteMany({ eventId: id });
    await EventFeedbackForm.deleteMany({ eventId: id });
    await Event.findByIdAndDelete(id);
    res.json({ message: "Event and associated records deleted successfully." });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ message: "Unable to delete event." });
  }
});

// ADMIN - NOTIFICATIONS
app.get("/api/admin/notifications", async (req, res) => {
  try {
    res.json(await Notification.find().populate("user", "fullName email role").sort({ createdAt: -1 }));
  } catch (error) {
    console.error("Admin notifications error:", error);
    res.status(500).json({ message: "Unable to load notifications." });
  }
});

app.delete("/api/admin/notifications/:id", async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found." });
    res.json({ message: "Notification deleted successfully." });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ message: "Unable to delete notification." });
  }
});

app.delete("/api/admin/notifications", async (req, res) => {
  try {
    const result = await Notification.deleteMany({});
    res.json({ message: `${result.deletedCount} notifications deleted successfully.` });
  } catch (error) {
    console.error("Delete all notifications error:", error);
    res.status(500).json({ message: "Unable to delete notifications." });
  }
});

// DEBUG ALUMNI
app.get("/api/debug-alumni", async (req, res) => {
  try {
    res.json(await User.find({ role: { $regex: /alumni/i } }).select("_id fullName email role status"));
  } catch (error) {
    console.error("Debug alumni error:", error);
    res.status(500).json({ message: "Debug failed." });
  }
});

// STUDENT - GET PREVIOUSLY SUBMITTED EVENT FEEDBACK 
app.get("/api/events/feedback/student/:studentId", async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!validId(studentId)) {
      return res.status(400).json({
        message: "A valid student ID is required.",
      });
    }

    const feedback = await EventFeedback.find({ studentId })
      .select("eventId studentId rating comments answers createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ feedback });
  } catch (error) {
    console.error("Student feedback loading error:", error);

    return res.status(500).json({
      message: "Unable to load previously submitted feedback.",
    });
  }
});


app.listen(PORT, () => {
  console.log(`ReConnect backend running on http://localhost:${PORT}`);
});
