const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User.cjs");
const Profile = require("./models/Profile.cjs");
const Mentorship = require("./models/Mentorship.cjs");
const Notification = require("./models/Notification.cjs");
const Opportunity = require("./models/Opportunity.cjs");
const Event = require("./models/Event.cjs");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is missing in server/.env");
  process.exit(1);
}

// ======================================================
// DATABASE CONNECTION
// ======================================================

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error.message);
  });

// ======================================================
// BASIC ROUTE
// ======================================================

app.get("/", (req, res) => {
  res.json({
    message: "ReConnect System Backend is running"
  });
});

// ======================================================
// HELPER - CREATE NOTIFICATION
// ======================================================

async function createNotification(userId, title, message, type) {
  try {
    await Notification.create({
      user: userId,
      title,
      message,
      type
    });
  } catch (error) {
    console.error("Notification error:", error.message);
  }
}

// ======================================================
// REGISTER
// ======================================================

app.post("/api/register", async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      role
    } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({
        message:
          "Full name, email, password and role are required."
      });
    }

    if (!["Student", "Alumni"].includes(role)) {
      return res.status(400).json({
        message:
          "Only Student and Alumni registration is allowed."
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          "An account with this email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      status: "Pending"
    });

    await createNotification(
      user._id,
      "Registration Submitted",
      "Your ReConnect account has been submitted for admin approval.",
      "ACCOUNT"
    );

    const admins = await User.find({
      role: "Admin"
    });

    for (const admin of admins) {
      await createNotification(
        admin._id,
        "New Registration",
        `${user.fullName} registered as ${user.role} and is waiting for approval.`,
        "ACCOUNT"
      );
    }

    res.status(201).json({
      message:
        "Registration successful. Your account is waiting for admin approval.",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      message: "Registration failed."
    });
  }
});

// ======================================================
// LOGIN
// ======================================================

app.post("/api/login", async (req, res) => {
  try {
    const {
      email,
      password,
      role
    } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        message:
          "Email, password and role are required."
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim()
    });

    if (!user) {
      return res.status(401).json({
        message:
          "Invalid email or password."
      });
    }

    if (user.role !== role) {
      return res.status(401).json({
        message:
          "Selected role does not match this account."
      });
    }

    if (user.status === "Pending") {
      return res.status(403).json({
        message:
          "Your account is waiting for admin approval."
      });
    }

    if (user.status === "Rejected") {
      return res.status(403).json({
        message:
          "Your account has been rejected by the admin."
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message:
          "Invalid email or password."
      });
    }

    res.json({
      message: "Login successful.",
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed."
    });
  }
});

// ======================================================
// PROFILE - GET
// ======================================================

app.get("/api/profile/:userId", async (req, res) => {
  try {
    const profile = await Profile.findOne({
      userId: req.params.userId
    });

    if (!profile) {
      return res.json({
        userId: req.params.userId,
        phone: "",
        college: "",
        branch: "",
        year: "",
        skills: "",
        bio: "",
        company: "",
        designation: "",
        profilePicture: ""
      });
    }

    res.json(profile);
  } catch (error) {
    console.error("Profile GET error:", error);

    res.status(500).json({
      message: "Unable to load profile."
    });
  }
});

// ======================================================
// PROFILE - CREATE / UPDATE
// ======================================================

app.post("/api/profile", async (req, res) => {
  try {
    const {
      userId,
      phone,
      college,
      branch,
      year,
      skills,
      bio,
      company,
      designation,
      profilePicture
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required."
      });
    }

    const profile = await Profile.findOneAndUpdate(
      { userId },
      {
        userId,
        phone: phone || "",
        college: college || "",
        branch: branch || "",
        year: year || "",
        skills: skills || "",
        bio: bio || "",
        company: company || "",
        designation: designation || "",
        profilePicture: profilePicture || ""
      },
      {
        new: true,
        upsert: true
      }
    );

    res.json({
      message: "Profile saved successfully.",
      profile
    });
  } catch (error) {
    console.error("Profile POST error:", error);

    res.status(500).json({
      message: "Unable to save profile."
    });
  }
});

// ======================================================
// ALUMNI
// ======================================================

app.get("/api/alumni", async (req, res) => {
  try {
    console.log("Loading approved alumni...");

    /*
      FIX:
      Use case-insensitive matching for role and status.
      This allows:
      Alumni / alumni / ALUMNI
      Approved / approved / APPROVED
    */

    const alumni = await User.find({
      role: {
        $regex: /^Alumni$/i
      },
      status: {
        $regex: /^Approved$/i
      }
    }).select(
      "_id fullName email role status"
    );

    console.log(
      "Approved alumni found:",
      alumni.length
    );

    const result = [];

    for (const alumniUser of alumni) {
      const profile = await Profile.findOne({
        userId: alumniUser._id
      });

      result.push({
        _id: alumniUser._id,
        fullName: alumniUser.fullName,
        email: alumniUser.email,
        role: alumniUser.role,
        status: alumniUser.status,

        phone: profile?.phone || "",
        college: profile?.college || "",
        branch: profile?.branch || "",
        year: profile?.year || "",
        skills: profile?.skills || "",
        bio: profile?.bio || "",
        company: profile?.company || "",
        designation: profile?.designation || "",
        profilePicture:
          profile?.profilePicture || ""
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Alumni error:", error);

    res.status(500).json({
      message: "Unable to load alumni."
    });
  }
});

// ======================================================
// NOTIFICATIONS - USER
// ======================================================

app.get(
  "/api/notifications/:userId",
  async (req, res) => {
    try {
      const notifications =
        await Notification.find({
          user: req.params.userId
        }).sort({
          createdAt: -1
        });

      res.json(notifications);
    } catch (error) {
      console.error(
        "Notification GET error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load notifications."
      });
    }
  }
);

// ======================================================
// MARK ONE NOTIFICATION READ
// ======================================================

app.put(
  "/api/notifications/:id/read",
  async (req, res) => {
    try {
      const notification =
        await Notification.findByIdAndUpdate(
          req.params.id,
          { read: true },
          { new: true }
        );

      if (!notification) {
        return res.status(404).json({
          message:
            "Notification not found."
        });
      }

      res.json(notification);
    } catch (error) {
      res.status(500).json({
        message:
          "Unable to update notification."
      });
    }
  }
);

// ======================================================
// MARK ALL NOTIFICATIONS READ
// ======================================================

app.put(
  "/api/notifications/user/:userId/read-all",
  async (req, res) => {
    try {
      await Notification.updateMany(
        {
          user: req.params.userId,
          read: false
        },
        {
          read: true
        }
      );

      res.json({
        message:
          "All notifications marked as read."
      });
    } catch (error) {
      res.status(500).json({
        message:
          "Unable to update notifications."
      });
    }
  }
);

// ======================================================
// MENTORSHIP - CREATE REQUEST
// ======================================================

app.post(
  "/api/mentorship",
  async (req, res) => {
    try {
      const studentId =
        req.body.studentId ||
        req.body.student;

      const alumniId =
        req.body.alumniId ||
        req.body.alumni;

      if (!studentId || !alumniId) {
        return res.status(400).json({
          message:
            "Student ID and Alumni ID are required."
        });
      }

      const student =
        await User.findById(studentId);

      const alumni =
        await User.findById(alumniId);

      if (!student || !alumni) {
        return res.status(404).json({
          message:
            "Student or Alumni not found."
        });
      }

      if (student.role !== "Student") {
        return res.status(400).json({
          message:
            "Only students can request mentorship."
        });
      }

      if (alumni.role !== "Alumni") {
        return res.status(400).json({
          message:
            "Selected user is not an alumni."
        });
      }

      const existing =
        await Mentorship.findOne({
          studentId,
          alumniId
        });

      if (existing) {
        return res.status(400).json({
          message:
            "Mentorship request already exists."
        });
      }

      const mentorship =
        await Mentorship.create({
          studentId,
          alumniId,
          status: "Pending"
        });

      await createNotification(
        alumniId,
        "New Mentorship Request",
        `${student.fullName} has requested mentorship from you.`,
        "MENTORSHIP_REQUEST"
      );

      const admins =
        await User.find({
          role: "Admin"
        });

      for (const admin of admins) {
        await createNotification(
          admin._id,
          "New Mentorship Request",
          `${student.fullName} requested mentorship from ${alumni.fullName}.`,
          "MENTORSHIP_REQUEST"
        );
      }

      res.status(201).json({
        message:
          "Mentorship request sent successfully.",
        mentorship
      });
    } catch (error) {
      console.error(
        "Mentorship create error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to create mentorship request."
      });
    }
  }
);

// ======================================================
// STUDENT MENTORSHIPS
// ======================================================

app.get(
  "/api/mentorship/student/:studentId",
  async (req, res) => {
    try {
      const mentorships =
        await Mentorship.find({
          studentId:
            req.params.studentId
        })
          .populate(
            "studentId",
            "fullName email"
          )
          .populate(
            "alumniId",
            "fullName email"
          )
          .sort({
            createdAt: -1
          });

      res.json(mentorships);
    } catch (error) {
      res.status(500).json({
        message:
          "Unable to load mentorships."
      });
    }
  }
);

// ======================================================
// ALUMNI MENTORSHIPS
// ======================================================

app.get(
  "/api/mentorship/alumni/:alumniId",
  async (req, res) => {
    try {
      const mentorships =
        await Mentorship.find({
          alumniId:
            req.params.alumniId
        })
          .populate(
            "studentId",
            "fullName email"
          )
          .populate(
            "alumniId",
            "fullName email"
          )
          .sort({
            createdAt: -1
          });

      res.json(mentorships);
    } catch (error) {
      res.status(500).json({
        message:
          "Unable to load mentorships."
      });
    }
  }
);

// ======================================================
// UPDATE MENTORSHIP STATUS
// ======================================================

app.put(
  "/api/mentorship/:id",
  async (req, res) => {
    try {
      const { status } = req.body;

      if (
        ![
          "Pending",
          "Accepted",
          "Rejected"
        ].includes(status)
      ) {
        return res.status(400).json({
          message:
            "Invalid mentorship status."
        });
      }

      const mentorship =
        await Mentorship.findByIdAndUpdate(
          req.params.id,
          { status },
          { new: true }
        )
          .populate(
            "studentId",
            "fullName email"
          )
          .populate(
            "alumniId",
            "fullName email"
          );

      if (!mentorship) {
        return res.status(404).json({
          message:
            "Mentorship request not found."
        });
      }

      let notificationType =
        "MENTORSHIP_REQUEST";

      let title =
        "Mentorship Request Updated";

      let message =
        "Your mentorship request has been updated.";

      if (status === "Accepted") {
        notificationType =
          "MENTORSHIP_APPROVED";

        title =
          "Mentorship Request Accepted";

        message =
          `${mentorship.alumniId.fullName} accepted your mentorship request.`;
      }

      if (status === "Rejected") {
        notificationType =
          "MENTORSHIP_REJECTED";

        title =
          "Mentorship Request Rejected";

        message =
          `${mentorship.alumniId.fullName} rejected your mentorship request.`;
      }

      await createNotification(
        mentorship.studentId._id,
        title,
        message,
        notificationType
      );

      const admins =
        await User.find({
          role: "Admin"
        });

      for (const admin of admins) {
        await createNotification(
          admin._id,
          title,
          `${mentorship.studentId.fullName} and ${mentorship.alumniId.fullName}: ${status}.`,
          notificationType
        );
      }

      res.json({
        message:
          `Mentorship request ${status.toLowerCase()}.`,
        mentorship
      });
    } catch (error) {
      console.error(
        "Mentorship update error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to update mentorship."
      });
    }
  }
);

// ======================================================
// OPPORTUNITIES - GET
// ======================================================

app.get(
  "/api/opportunities",
  async (req, res) => {
    try {
      const opportunities =
        await Opportunity.find()
          .populate(
            "postedBy",
            "fullName email role"
          )
          .sort({
            createdAt: -1
          });

      res.json(opportunities);
    } catch (error) {
      console.error(
        "Opportunity GET error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load opportunities."
      });
    }
  }
);

// ======================================================
// OPPORTUNITIES - CREATE
// ======================================================

app.post(
  "/api/opportunities",
  async (req, res) => {
    try {
      const {
        title,
        company,
        description,
        postedBy
      } = req.body;

      if (
        !title ||
        !description ||
        !postedBy
      ) {
        return res.status(400).json({
          message:
            "Title, description and postedBy are required."
        });
      }

      const user =
        await User.findById(postedBy);

      if (!user) {
        return res.status(404).json({
          message:
            "User not found."
        });
      }

      if (
        !["Alumni", "Admin"].includes(
          user.role
        )
      ) {
        return res.status(403).json({
          message:
            "Only Alumni or Admin can create opportunities."
        });
      }

      const opportunity =
        await Opportunity.create({
          title,
          company: company || "",
          description,
          postedBy
        });

      const users =
        await User.find({
          role: {
            $in: [
              "Student",
              "Alumni",
              "Admin"
            ]
          },
          _id: {
            $ne: postedBy
          }
        });

      for (const targetUser of users) {
        await createNotification(
          targetUser._id,
          "New Opportunity",
          `${title} has been posted on ReConnect.`,
          "OPPORTUNITY"
        );
      }

      const populated =
        await Opportunity.findById(
          opportunity._id
        ).populate(
          "postedBy",
          "fullName email role"
        );

      res.status(201).json({
        message:
          "Opportunity created successfully.",
        opportunity: populated
      });
    } catch (error) {
      console.error(
        "Opportunity POST error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to create opportunity."
      });
    }
  }
);

// ======================================================
// EVENTS - GET
// ======================================================

app.get(
  "/api/events",
  async (req, res) => {
    try {
      const events =
        await Event.find()
          .populate(
            "organizer",
            "fullName email role"
          )
          .sort({
            createdAt: -1
          });

      res.json(events);
    } catch (error) {
      console.error(
        "Event GET error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load events."
      });
    }
  }
);

// ======================================================
// EVENTS - CREATE
// ======================================================

app.post(
  "/api/events",
  async (req, res) => {
    try {
      const {
        title,
        description,
        date,
        time,
        location,
        organizer
      } = req.body;

      if (
        !title ||
        !date ||
        !time ||
        !organizer
      ) {
        return res.status(400).json({
          message:
            "Title, date, time and organizer are required."
        });
      }

      const user =
        await User.findById(organizer);

      if (!user) {
        return res.status(404).json({
          message:
            "Organizer not found."
        });
      }

      if (
        !["Alumni", "Admin"].includes(
          user.role
        )
      ) {
        return res.status(403).json({
          message:
            "Only Alumni or Admin can create events."
        });
      }

      const event =
        await Event.create({
          title,
          description:
            description || "",
          date,
          time,
          location:
            location || "",
          organizer
        });

      const users =
        await User.find({
          role: {
            $in: [
              "Student",
              "Alumni",
              "Admin"
            ]
          },
          _id: {
            $ne: organizer
          }
        });

      for (const targetUser of users) {
        await createNotification(
          targetUser._id,
          "New Event",
          `${title} has been added to ReConnect events.`,
          "EVENT"
        );
      }

      const populated =
        await Event.findById(
          event._id
        ).populate(
          "organizer",
          "fullName email role"
        );

      res.status(201).json({
        message:
          "Event created successfully.",
        event: populated
      });
    } catch (error) {
      console.error(
        "Event POST error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to create event."
      });
    }
  }
);

// ======================================================
// ADMIN - STATS
// ======================================================

app.get(
  "/api/admin/stats",
  async (req, res) => {
    try {
      const [
        totalUsers,
        students,
        alumni,
        pendingApprovals,
        mentorshipRequests,
        opportunities,
        events,
        notifications
      ] = await Promise.all([
        User.countDocuments(),

        User.countDocuments({
          role: "Student"
        }),

        User.countDocuments({
          role: "Alumni"
        }),

        User.countDocuments({
          status: "Pending"
        }),

        Mentorship.countDocuments(),

        Opportunity.countDocuments(),

        Event.countDocuments(),

        Notification.countDocuments()
      ]);

      res.json({
        totalUsers,
        students,
        alumni,
        pendingApprovals,
        mentorshipRequests,
        opportunities,
        events,
        notifications
      });
    } catch (error) {
      console.error(
        "Admin stats error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load admin statistics."
      });
    }
  }
);

// ======================================================
// ADMIN - ALL USERS
// ======================================================

app.get(
  "/api/admin/users",
  async (req, res) => {
    try {
      const users =
        await User.find()
          .select("-password")
          .sort({
            createdAt: -1
          });

      res.json(users);
    } catch (error) {
      console.error(
        "Admin users error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load users."
      });
    }
  }
);

// ======================================================
// ADMIN - ALL MENTORSHIPS
// ======================================================

app.get(
  "/api/admin/mentorships",
  async (req, res) => {
    try {
      const mentorships =
        await Mentorship.find()
          .populate(
            "studentId",
            "fullName email role"
          )
          .populate(
            "alumniId",
            "fullName email role"
          )
          .sort({
            createdAt: -1
          });

      res.json(mentorships);
    } catch (error) {
      console.error(
        "Admin mentorship error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load mentorship requests."
      });
    }
  }
);

// ======================================================
// ADMIN - ALL OPPORTUNITIES
// ======================================================

app.get(
  "/api/admin/opportunities",
  async (req, res) => {
    try {
      const opportunities =
        await Opportunity.find()
          .populate(
            "postedBy",
            "fullName email role"
          )
          .sort({
            createdAt: -1
          });

      res.json(opportunities);
    } catch (error) {
      console.error(
        "Admin opportunities error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load opportunities."
      });
    }
  }
);

// ======================================================
// ADMIN - DELETE OPPORTUNITY
// ======================================================

app.delete(
  "/api/admin/opportunities/:id",
  async (req, res) => {
    try {
      const opportunity =
        await Opportunity.findByIdAndDelete(
          req.params.id
        );

      if (!opportunity) {
        return res.status(404).json({
          message:
            "Opportunity not found."
        });
      }

      res.json({
        message:
          "Opportunity deleted successfully."
      });
    } catch (error) {
      console.error(
        "Delete opportunity error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to delete opportunity."
      });
    }
  }
);

// ======================================================
// ADMIN - ALL EVENTS
// ======================================================

app.get(
  "/api/admin/events",
  async (req, res) => {
    try {
      const events =
        await Event.find()
          .populate(
            "organizer",
            "fullName email role"
          )
          .sort({
            createdAt: -1
          });

      res.json(events);
    } catch (error) {
      console.error(
        "Admin events error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load events."
      });
    }
  }
);

// ======================================================
// ADMIN - DELETE EVENT
// ======================================================

app.delete(
  "/api/admin/events/:id",
  async (req, res) => {
    try {
      const event =
        await Event.findByIdAndDelete(
          req.params.id
        );

      if (!event) {
        return res.status(404).json({
          message:
            "Event not found."
        });
      }

      res.json({
        message:
          "Event deleted successfully."
      });
    } catch (error) {
      console.error(
        "Delete event error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to delete event."
      });
    }
  }
);

// ======================================================
// ADMIN - ALL NOTIFICATIONS
// ======================================================

app.get(
  "/api/admin/notifications",
  async (req, res) => {
    try {
      const notifications =
        await Notification.find()
          .populate(
            "user",
            "fullName email role"
          )
          .sort({
            createdAt: -1
          });

      res.json(notifications);
    } catch (error) {
      console.error(
        "Admin notifications error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load notifications."
      });
    }
  }
);

// ======================================================
// ADMIN - DELETE ONE NOTIFICATION
// ======================================================

app.delete(
  "/api/admin/notifications/:id",
  async (req, res) => {
    try {
      const notification =
        await Notification.findByIdAndDelete(
          req.params.id
        );

      if (!notification) {
        return res.status(404).json({
          message:
            "Notification not found."
        });
      }

      res.json({
        message:
          "Notification deleted successfully."
      });
    } catch (error) {
      console.error(
        "Delete notification error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to delete notification."
      });
    }
  }
);

// ======================================================
// ADMIN - DELETE ALL NOTIFICATIONS
// ======================================================

app.delete(
  "/api/admin/notifications",
  async (req, res) => {
    try {
      const result =
        await Notification.deleteMany({});

      res.json({
        message:
          `${result.deletedCount} notifications deleted successfully.`
      });
    } catch (error) {
      console.error(
        "Delete all notifications error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to delete notifications."
      });
    }
  }
);

// ======================================================
// ADMIN - UPDATE USER STATUS
// ======================================================

app.put(
  "/api/admin/users/:id/status",
  async (req, res) => {
    try {
      const { status } = req.body;

      if (
        ![
          "Pending",
          "Approved",
          "Rejected"
        ].includes(status)
      ) {
        return res.status(400).json({
          message:
            "Invalid user status."
        });
      }

      const user =
        await User.findByIdAndUpdate(
          req.params.id,
          { status },
          {
            new: true
          }
        ).select("-password");

      if (!user) {
        return res.status(404).json({
          message:
            "User not found."
        });
      }

      let title =
        "Account Status Updated";

      let notificationType =
        "ACCOUNT";

      let notificationMessage =
        `Your account status is now ${status}.`;

      if (status === "Approved") {
        title =
          "Account Approved";

        notificationMessage =
          "Your ReConnect account has been approved by the administrator.";
      }

      if (status === "Rejected") {
        title =
          "Account Rejected";

        notificationMessage =
          "Your ReConnect account has been rejected by the administrator.";
      }

      await createNotification(
        user._id,
        title,
        notificationMessage,
        notificationType
      );

      res.json({
        message:
          `User ${status.toLowerCase()} successfully.`,
        user
      });
    } catch (error) {
      console.error(
        "Update user status error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to update user status."
      });
    }
  }
);

// ======================================================
// ADMIN - DELETE USER
// ======================================================

app.delete(
  "/api/admin/users/:id",
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.params.id
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found."
        });
      }

      if (user.role === "Admin") {
        return res.status(403).json({
          message:
            "Admin accounts cannot be deleted from this dashboard."
        });
      }

      await Profile.deleteMany({
        userId: user._id
      });

      await Mentorship.deleteMany({
        $or: [
          {
            studentId: user._id
          },
          {
            alumniId: user._id
          }
        ]
      });

      await Notification.deleteMany({
        user: user._id
      });

      await Opportunity.deleteMany({
        postedBy: user._id
      });

      await Event.deleteMany({
        organizer: user._id
      });

      await User.findByIdAndDelete(
        user._id
      );

      res.json({
        message:
          `${user.fullName} and associated records were deleted successfully.`
      });
    } catch (error) {
      console.error(
        "Delete user error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to delete user."
      });
    }
  }
);

// ======================================================
// START SERVER
// ======================================================

app.get("/api/debug-alumni", async (req, res) => {
  try {
    const users = await User.find({
      role: { $regex: /alumni/i }
    }).select("_id fullName email role status");

    console.log("DEBUG ALUMNI USERS:");
    console.log(users);

    res.json(users);
  } catch (error) {
    console.error("Debug error:", error);

    res.status(500).json({
      message: "Debug failed"
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});