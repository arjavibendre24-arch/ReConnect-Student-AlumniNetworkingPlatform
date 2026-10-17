
import { useCallback, useEffect, useMemo, useState } from "react";
import "./StudentDashboard.css";

const API = "https://reconnect-system.onrender.com/api";

const getUserId = (user) =>
  user?._id || user?.id || user?.userId || "";

const getEventId = (event) =>
  event?._id || event?.id || "";

const getRelatedId = (value) => {
  if (value && typeof value === "object") {
    return value._id || value.id || value.userId || "";
  }
  return value || "";
};

const formatTime = (value) => {
  if (!value) return "";
  const text = String(value).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return text;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();

  if (minutes > 59 || hours > 23) return text;

  if (meridiem) {
    if (hours < 1 || hours > 12) return text;
    return `${hours}:${String(minutes).padStart(2, "0")} ${meridiem}`;
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${suffix}`;
};

const getEventTime = (event) => {
  const start = event?.time || event?.startTime || event?.eventTime || "";
  const end = event?.endTime || event?.eventEndTime || "";

  if (start && end) {
    return `${formatTime(start)} - ${formatTime(end)}`;
  }

  return start ? formatTime(start) : "Time not specified";
};

const parseLocalDate = (value) => {
  if (!value) return null;

  const text = String(value).trim();
  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoDate) {
    return new Date(
      Number(isoDate[1]),
      Number(isoDate[2]) - 1,
      Number(isoDate[3])
    );
  }

  const slashDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashDate) {
    return new Date(
      Number(slashDate[3]),
      Number(slashDate[1]) - 1,
      Number(slashDate[2])
    );
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

const applyTime = (date, value) => {
  if (!value) return false;

  const match = String(value).trim().match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i
  );

  if (!match) return false;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] || 0);
  const meridiem = match[4]?.toUpperCase();

  if (minutes > 59 || seconds > 59) return false;

  if (meridiem) {
    if (hours < 1 || hours > 12) return false;
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
  } else if (hours > 23) {
    return false;
  }

  date.setHours(hours, minutes, seconds, 0);
  return true;
};

const getEventTiming = (event, now = Date.now()) => {
  const rawStartDate =
    event?.startDate ||
    event?.date ||
    event?.eventDate ||
    event?.endDate ||
    "";

  const rawEndDate =
    event?.endDate ||
    event?.eventEndDate ||
    rawStartDate;

  const timeText = getEventTime(event);

  if (!rawStartDate) {
    return {
      ended: false,
      dateText: "Date not specified",
      timeText,
      validDateTime: false,
    };
  }

  const startDate = parseLocalDate(rawStartDate);
  const endDate = parseLocalDate(rawEndDate);

  if (!startDate || !endDate) {
    return {
      ended: false,
      dateText: String(rawStartDate),
      timeText,
      validDateTime: false,
    };
  }

  const dateText = startDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const endTime =
    event?.endTime || event?.eventEndTime || event?.end_time || "";

  if (endTime) {
    if (!applyTime(endDate, endTime)) {
      return {
        ended: false,
        dateText,
        timeText,
        validDateTime: false,
      };
    }
  } else {
    endDate.setHours(23, 59, 59, 999);
  }

  return {
    ended: now >= endDate.getTime(),
    dateText,
    timeText,
    validDateTime: true,
  };
};

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed.");
  }

  return data;
}

function extractList(data, keys = []) {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return [];
}

function extractRegistrations(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.registrations)) return data.registrations;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.registrations)) return data.data.registrations;
  if (Array.isArray(data?.events)) return data.events;
  return [];
}

// Feedback endpoints can return a direct array or wrap it in one or more
// response objects. Normalize these shapes before checking event IDs.
function extractFeedbackItems(data) {
  if (Array.isArray(data)) return data;
  const possibleArrays = [
    data?.feedback,
    data?.eventFeedback,
    data?.feedbacks,
    data?.submissions,
    data?.data,
    data?.data?.feedback,
    data?.data?.eventFeedback,
    data?.data?.feedbacks,
    data?.data?.submissions,
    data?.result?.feedback,
    data?.result?.feedbacks,
  ];
  return possibleArrays.find(Array.isArray) || [];
}

function getFeedbackEventId(item) {
  const related =
    item?.eventId ??
    item?.event ??
    item?.event_id ??
    item?.eventID ??
    item?.eventDetails ??
    item?.eventDetailsId;
  return getRelatedId(related);
}

export default function StudentDashboard() {
  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [activeSection, setActiveSection] = useState("Dashboard");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [profile, setProfile] = useState({});
  const [alumni, setAlumni] = useState([]);
  const [alumniSearch, setAlumniSearch] = useState("");
  const [mentorships, setMentorships] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    phone: "",
    college: "",
    branch: "",
    year: "",
    skills: "",
    bio: "",
  });

  const [busyEventId, setBusyEventId] = useState("");
  const [feedbackEvent, setFeedbackEvent] = useState(null);
  const [feedbackForm, setFeedbackForm] = useState(null);
  const [feedbackAnswers, setFeedbackAnswers] = useState({});
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [loadingFeedbackForm, setLoadingFeedbackForm] = useState(false);
  const [loadingFeedbackEventId, setLoadingFeedbackEventId] = useState("");

  const [submittedFeedbackIds, setSubmittedFeedbackIds] = useState(
    () => new Set()
  );

  const [endedEventIds, setEndedEventIds] = useState([]);
  const [now, setNow] = useState(() => Date.now());

  const studentId = getUserId(user);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const isEventEnded = (event) =>
    getEventTiming(event, now).ended ||
    endedEventIds.includes(String(getEventId(event)));

  const showMessage = (text) => {
    setMessage(text);
    setError("");
  };

  const showError = (text) => {
    setError(text);
    setMessage("");
  };

  const loadAllData = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const results = await Promise.allSettled([
        apiRequest(`/profile/${studentId}`),
        apiRequest("/alumni"),
        apiRequest(`/mentorship/student/${studentId}`),
        apiRequest("/opportunities"),
        apiRequest("/events"),
        apiRequest(`/events/registrations/student/${studentId}`),
        apiRequest(`/notifications/${studentId}`),
        apiRequest(`/events/feedback/student/${studentId}`),
      ]);

      const valueAt = (index) =>
        results[index].status === "fulfilled"
          ? results[index].value
          : null;

      const profileData = valueAt(0);
      const alumniData = valueAt(1);
      const mentorshipData = valueAt(2);
      const opportunityData = valueAt(3);
      const eventData = valueAt(4);
      const registrationData = valueAt(5);
      const notificationData = valueAt(6);
      const feedbackData = valueAt(7);

      if (profileData) {
        const p = profileData.profile || profileData;
        setProfile(p);
        setProfileForm({
          phone: p.phone || "",
          college: p.college || "",
          branch: p.branch || "",
          year: p.year || "",
          skills: Array.isArray(p.skills)
            ? p.skills.join(", ")
            : p.skills || "",
          bio: p.bio || "",
        });
      }

      setAlumni(
        extractList(alumniData, ["alumni", "users"]).filter(
          (person) =>
            String(person.role || "").toLowerCase() === "alumni"
        )
      );

      setMentorships(
        extractList(mentorshipData, ["requests", "mentorships"])
      );
      setOpportunities(extractList(opportunityData, ["opportunities"]));
      setEvents(extractList(eventData, ["events"]));
      setRegistrations(extractRegistrations(registrationData));
      setNotifications(
        extractList(notificationData, ["notifications"])
      );

      if (feedbackData !== null) {
        const feedbackItems = extractFeedbackItems(feedbackData);
        const feedbackIds = feedbackItems
          .map(getFeedbackEventId)
          .filter(Boolean)
          .map((id) => String(id).trim());

        // Merge IDs instead of replacing local state with an empty set if the
        // API wraps its response differently or returns no matching rows.
        setSubmittedFeedbackIds((previous) => {
          const updated = new Set(previous);
          feedbackIds.forEach((id) => updated.add(id));
          return updated;
        });
      }

      const failed = results.filter(
        (result) => result.status === "rejected"
      );

      if (failed.length) {
        console.warn(
          "Some dashboard data could not be loaded:",
          failed.map((result) => result.reason?.message)
        );
      }
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (!studentId) {
      window.location.href = "/login";
      return;
    }
    loadAllData();
  }, [studentId, loadAllData]);

  const registeredEventIds = useMemo(() => {
    const ids = new Set();

    registrations.forEach((registration) => {
      const eventId = getRelatedId(
        registration.eventId || registration.event
      );

      const registrationStudent = getRelatedId(
        registration.studentId || registration.student
      );

      const sameStudent =
        !registrationStudent ||
        String(registrationStudent) === String(studentId);

      const status = String(registration.status || "Registered")
        .trim()
        .toLowerCase();

      const activeRegistration = [
        "",
        "registered",
        "approved",
        "active",
        "confirmed",
        "attended",
        "completed",
        "checked-in",
      ].includes(status);

      if (eventId && sameStudent && activeRegistration) {
        ids.add(String(eventId));
      }
    });

    return ids;
  }, [registrations, studentId]);

  const filteredAlumni = useMemo(() => {
    const query = alumniSearch.trim().toLowerCase();
    if (!query) return alumni;

    return alumni.filter((person) =>
      [
        person.fullName,
        person.name,
        person.email,
        person.company,
        person.jobTitle,
        person.branch,
        person.college,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [alumni, alumniSearch]);

  const saveProfile = async (event) => {
    event.preventDefault();

    try {
      await apiRequest("/profile", {
        method: "POST",
        body: JSON.stringify({
          userId: studentId,
          ...profileForm,
          skills: profileForm.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean),
        }),
      });

      setEditingProfile(false);
      showMessage("Profile saved successfully.");
      await loadAllData();
    } catch (err) {
      showError(err.message || "Unable to save your profile.");
    }
  };

  const requestMentorship = async (alumniId) => {
    if (!alumniId) {
      showError("Alumni information is missing.");
      return;
    }

    try {
      await apiRequest("/mentorship", {
        method: "POST",
        body: JSON.stringify({ studentId, alumniId }),
      });
      showMessage("Mentorship request sent.");
      await loadAllData();
    } catch (err) {
      showError(err.message || "Unable to send mentorship request.");
    }
  };

  const handleEventRegistration = async (event, action) => {
    const eventId = getEventId(event);

    if (!eventId || !studentId) {
      showError("Event or student information is missing.");
      return;
    }

    if (busyEventId) return;

    if (isEventEnded(event)) {
      setEndedEventIds((previous) =>
        previous.includes(String(eventId))
          ? previous
          : [...previous, String(eventId)]
      );
      showMessage("Event ended. Registration is closed.");
      return;
    }

    setBusyEventId(String(eventId));

    try {
      if (action === "register") {
        await apiRequest(`/events/${eventId}/register`, {
          method: "POST",
          body: JSON.stringify({ studentId }),
        });
        showMessage("You have successfully registered for the event.");
      } else {
        await apiRequest(`/events/${eventId}/register/${studentId}`, {
          method: "DELETE",
        });
        showMessage("Your event registration has been cancelled.");
      }

      await loadAllData();
    } catch (err) {
      const errorMessage = err?.message || "";

      if (
        /event has already passed|date.*passed|past event|event.*ended|registration.*closed|event.*over/i.test(
          errorMessage
        )
      ) {
        setEndedEventIds((previous) =>
          previous.includes(String(eventId))
            ? previous
            : [...previous, String(eventId)]
        );
        showMessage("Event ended. Registration is closed.");
      } else {
        showError(
          errorMessage ||
            (action === "register"
              ? "Unable to register for this event."
              : "Unable to cancel registration.")
        );
      }
    } finally {
      setBusyEventId("");
    }
  };

  const openFeedbackForm = async (event) => {
    const eventId = getEventId(event);

    if (!eventId) {
      showError("Event information is missing.");
      return;
    }

    if (!registeredEventIds.has(String(eventId))) {
      showError(
        "Only students registered for this event can access its feedback form."
      );
      return;
    }

    if (!isEventEnded(event)) {
      showError("Feedback is available after the event has ended.");
      return;
    }

    if (submittedFeedbackIds.has(String(eventId))) {
      showError("You have already submitted feedback for this event.");
      return;
    }

    setLoadingFeedbackForm(true);
    setLoadingFeedbackEventId(String(eventId));
    setMessage("");
    setError("");

    try {
      const result = await apiRequest(
        `/events/${eventId}/feedback-form`
      );

      const form = result.form || result.feedbackForm || result;

      if (
        !form ||
        !Array.isArray(form.questions) ||
        form.questions.length === 0
      ) {
        showError(
          "The organizer has not published a feedback form for this event yet."
        );
        return;
      }

      if (String(form.status || "").toLowerCase() !== "published") {
        showError("The organizer has not published this feedback form yet.");
        return;
      }

      setFeedbackEvent(event);
      setFeedbackForm(form);

      const initialAnswers = {};
      form.questions.forEach((question) => {
        const questionId = String(question._id || question.id || "");
        if (questionId) {
          initialAnswers[questionId] =
            String(question.type).toLowerCase() === "rating" ? "" : "";
        }
      });

      setFeedbackAnswers(initialAnswers);
    } catch (err) {
      showError(
        err.message ||
          "Unable to load the published feedback form. Please try again."
      );
    } finally {
      setLoadingFeedbackForm(false);
      setLoadingFeedbackEventId("");
    }
  };

  const submitEventFeedback = async (event) => {
    const eventId = getEventId(event);

    if (!eventId || !studentId) {
      showError("Event or student information is missing.");
      return;
    }

    if (!registeredEventIds.has(String(eventId))) {
      showError("Only registered students can submit event feedback.");
      return;
    }

    if (!isEventEnded(event)) {
      showError("You can submit feedback only after the event has ended.");
      return;
    }

    if (submittedFeedbackIds.has(String(eventId))) {
      showError("You have already submitted feedback for this event.");
      return;
    }

    if (
      !feedbackForm ||
      !Array.isArray(feedbackForm.questions) ||
      feedbackForm.questions.length === 0
    ) {
      showError("The published feedback form could not be loaded.");
      return;
    }

    for (const question of feedbackForm.questions) {
      const questionId = String(question._id || question.id || "");
      const answer = feedbackAnswers[questionId];

      if (
        question.required !== false &&
        (answer === undefined || String(answer).trim() === "")
      ) {
        showError(`Please answer: ${question.question}`);
        return;
      }

      if (
        String(question.type).toLowerCase() === "rating" &&
        answer !== undefined &&
        answer !== "" &&
        (!Number.isInteger(Number(answer)) ||
          Number(answer) < 1 ||
          Number(answer) > 5)
      ) {
        showError("Ratings must be between 1 and 5.");
        return;
      }
    }

    const answers = feedbackForm.questions
      .filter((question) => {
        const questionId = String(question._id || question.id || "");
        const answer = feedbackAnswers[questionId];
        return answer !== undefined && String(answer).trim() !== "";
      })
      .map((question) => {
        const questionId = String(question._id || question.id || "");
        const isRating =
          String(question.type).toLowerCase() === "rating";

        return {
          questionId,
          answer: isRating
            ? Number(feedbackAnswers[questionId])
            : String(feedbackAnswers[questionId]).trim(),
        };
      });

    setSubmittingFeedback(true);

    try {
      await apiRequest(`/events/${eventId}/feedback`, {
        method: "POST",
        body: JSON.stringify({ studentId, answers }),
      });

      setSubmittedFeedbackIds((previous) => {
        const updated = new Set(previous);
        updated.add(String(eventId));
        return updated;
      });

      showMessage("Thank you! Your event feedback has been submitted.");
      setFeedbackEvent(null);
      setFeedbackForm(null);
      setFeedbackAnswers({});
      await loadAllData();
   
    } catch (err) {
      const errorMessage = err?.message || "";

      if (/already submitted/i.test(errorMessage)) {
        setSubmittedFeedbackIds((previous) => {
          const updated = new Set(previous);
          updated.add(String(eventId));
          return updated;
        });

        showMessage("✓ Feedback has already been submitted for this event.");

        setFeedbackEvent(null);
        setFeedbackForm(null);
        setFeedbackAnswers({});

        await loadAllData();
      } else {
        showError(
          errorMessage ||
            "Unable to submit feedback. Please check the form and try again."
        );
      }
    } finally {
      setSubmittingFeedback(false);
    }
  };


  const logout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const menuItems = [
    "Dashboard",
    "My Profile",
    "Search Alumni",
    "Mentorship",
    "Opportunities",
    "Events",
    "Notifications",
    "Account",
  ];

  const upcomingEvents = events.filter((event) => !isEventEnded(event));

  const quickLinks = [
    { title: "Find Alumni", section: "Search Alumni", icon: "👥", description: "Connect with experienced alumni", tone: "violet" },
    { title: "Mentorship", section: "Mentorship", icon: "🤝", description: "Track your mentorship requests", tone: "blue" },
    { title: "Opportunities", section: "Opportunities", icon: "🚀", description: "Explore jobs and career openings", tone: "orange" },
    { title: "Events", section: "Events", icon: "📅", description: "Join events and share feedback", tone: "green" },
  ];

  const goToSection = (section) => {
    setActiveSection(section);
    setMessage("");
    setError("");
  };

  const renderDashboard = () => (
    <div className="student-home">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <h2>Build connections. <span>Shape your future.</span></h2>
          <p>Welcome back, {user?.fullName || user?.name || "Student"}! Pick up where you left off and make your next opportunity happen.</p>
          <button type="button" className="welcome-cta" onClick={() => goToSection("Search Alumni")}>Explore your network <span>→</span></button>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="orbit orbit-one"></div><div className="orbit orbit-two"></div>
          <div
            className="student-welcome-logo"
            style={{
              width: "120px",
              height: "120px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              background: "transparent",
              border: "none",
              borderRadius: 0,
              color: "#8b5cf6",
              fontFamily: "'Palatino Linotype', 'Book Antiqua', Georgia, serif",
              fontSize: "112px",
              fontWeight: 700,
              fontStyle: "italic",
              lineHeight: 1,
              backgroundImage: "linear-gradient(145deg, #c4b5fd 5%, #7c3aed 48%, #d4a017 95%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 5px 8px rgba(109, 40, 217, 0.24))",
              position: "relative",
              zIndex: 5,
              flexShrink: 0,
            }}
          >
            R
          </div>
          <span className="float-chip chip-one">✦ Learn</span>
          <span className="float-chip chip-two">↗ Grow</span>
          <span className="float-chip chip-three">♡ Connect</span>
        </div>
      </section>

      <div className="section-heading">
        <div><span className="eyebrow">AT A GLANCE</span><h2>Your overview</h2></div>
        <span className="overview-note">Everything you need, in one place</span>
      </div>

      <div className="dashboard-stats">
        <button type="button" className="stat-card stat-violet" onClick={() => goToSection("Search Alumni")}>
          <span className="stat-icon">👥</span><span className="stat-label">Alumni Available</span><strong>{alumni.length}</strong><span className="stat-foot">Explore your network <b>→</b></span>
        </button>
        <button type="button" className="stat-card stat-blue" onClick={() => goToSection("Mentorship")}>
          <span className="stat-icon">🤝</span><span className="stat-label">Mentorship Requests</span><strong>{mentorships.length}</strong><span className="stat-foot">View your requests <b>→</b></span>
        </button>
        <button type="button" className="stat-card stat-orange" onClick={() => goToSection("Opportunities")}>
          <span className="stat-icon">🚀</span><span className="stat-label">Opportunities</span><strong>{opportunities.length}</strong><span className="stat-foot">Find your next step <b>→</b></span>
        </button>
        <button type="button" className="stat-card stat-green" onClick={() => goToSection("Events")}>
          <span className="stat-icon">📅</span><span className="stat-label">Upcoming Events</span><strong>{upcomingEvents.length}</strong><span className="stat-foot">See what's happening <b>→</b></span>
        </button>
      </div>

      <div className="section-heading quick-heading">
        <div><span className="eyebrow">QUICK ACCESS</span><h2>Where would you like to go?</h2></div>
      </div>
      <div className="quick-links-grid">
        {quickLinks.map((link) => (
          <button type="button" key={link.section} className={`quick-link-card quick-${link.tone}`} onClick={() => goToSection(link.section)}>
            <span className="quick-link-icon">{link.icon}</span><span className="quick-link-arrow">↗</span>
            <strong>{link.title}</strong><span>{link.description}</span>
          </button>
        ))}
      </div>

      <div className="section-heading events-heading">
        <div><span className="eyebrow">DON'T MISS OUT</span><h2>Upcoming events</h2></div>
        <button type="button" className="text-link-button" onClick={() => goToSection("Events")}>View all events <span>→</span></button>
      </div>

      {upcomingEvents.length === 0 ? (
        <div className="empty-events-panel"><div className="empty-events-icon">🗓️</div><div><h3>You're all caught up</h3><p>There are no upcoming events right now. Check the Events page again soon for new sessions and opportunities.</p></div><button type="button" onClick={() => goToSection("Events")}>Browse events</button></div>
      ) : (
        <div className="events-grid dashboard-events-grid">
          {upcomingEvents.slice(0, 3).map((event) => {
            const timing = getEventTiming(event, now);
            return (
              <div className="event-card dashboard-event-card" key={getEventId(event)}>
                <div className="event-card-topline"><span className="event-type-pill">COMMUNITY EVENT</span><span className="event-card-symbol">✦</span></div>
                <h3>{event.title || event.name || "Untitled Event"}</h3>
                <p>📅 <span>{timing.dateText}</span></p><p>🕒 <span>{timing.timeText}</span></p><p>📍 <span>{event.location || "Location not specified"}</span></p>
                <button type="button" onClick={() => goToSection("Events")}>View event details <span>→</span></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <>
      <h2>My Profile</h2>

      {!editingProfile ? (
        <div className="profile-card">
          <p><strong>Name:</strong> {user?.fullName || user?.name || "Student"}</p>
          <p><strong>Email:</strong> {user?.email || "Not available"}</p>
          <p><strong>Phone:</strong> {profile.phone || "Not added"}</p>
          <p><strong>College:</strong> {profile.college || "Not added"}</p>
          <p><strong>Branch:</strong> {profile.branch || "Not added"}</p>
          <p><strong>Year:</strong> {profile.year || "Not added"}</p>
          <p>
            <strong>Skills:</strong>{" "}
            {Array.isArray(profile.skills)
              ? profile.skills.join(", ")
              : profile.skills || "Not added"}
          </p>
          <p><strong>Bio:</strong> {profile.bio || "Not added"}</p>
          <button type="button" onClick={() => setEditingProfile(true)}>
            Edit Profile
          </button>
        </div>
      ) : (
        <form className="profile-form" onSubmit={saveProfile}>
          {[
            ["phone", "Phone"],
            ["college", "College"],
            ["branch", "Branch"],
            ["year", "Year"],
            ["skills", "Skills (comma separated)"],
            ["bio", "Bio"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              {key === "bio" ? (
                <textarea
                  value={profileForm[key]}
                  onChange={(e) =>
                    setProfileForm((previous) => ({
                      ...previous,
                      [key]: e.target.value,
                    }))
                  }
                />
              ) : (
                <input
                  value={profileForm[key]}
                  onChange={(e) =>
                    setProfileForm((previous) => ({
                      ...previous,
                      [key]: e.target.value,
                    }))
                  }
                />
              )}
            </label>
          ))}

          <button type="submit">Save Profile</button>
          <button type="button" onClick={() => setEditingProfile(false)}>
            Cancel
          </button>
        </form>
      )}
    </>
  );

  const renderSearchAlumni = () => (
    <>
      <h2>Search Alumni</h2>
      <input
        type="search"
        placeholder="Search by name, company, branch or email..."
        value={alumniSearch}
        onChange={(e) => setAlumniSearch(e.target.value)}
      />

      <div className="alumni-grid">
        {filteredAlumni.map((person) => {
          const alumniId = getUserId(person);

          const existingRequest = mentorships.some((request) => {
            const id = getRelatedId(request.alumniId || request.alumni);
            return (
              String(id) === String(alumniId) &&
              !["rejected", "cancelled", "canceled"].includes(
                String(request.status || "").toLowerCase()
              )
            );
          });

          return (
            <div className="alumni-card" key={alumniId}>
              <h3>{person.fullName || person.name || "Alumni"}</h3>
              <p>{person.email}</p>
              <p>{person.company || person.jobTitle || ""}</p>
              <p>{person.branch || ""}</p>
              <button
                type="button"
                disabled={!alumniId || existingRequest}
                onClick={() => requestMentorship(alumniId)}
              >
                {existingRequest ? "Request Sent" : "Request Mentorship"}
              </button>
            </div>
          );
        })}

        {filteredAlumni.length === 0 && <p>No alumni found.</p>}
      </div>
    </>
  );

  const renderMentorship = () => (
    <>
      <h2>My Mentorship Requests</h2>
      {mentorships.length === 0 ? (
        <p>You have not made any mentorship requests yet.</p>
      ) : (
        <div className="mentorship-list">
          {mentorships.map((request, index) => (
            <div
              className="mentorship-card"
              key={request._id || request.id || index}
            >
              <h3>
                {request.alumniId?.fullName ||
                  request.alumni?.fullName ||
                  request.alumniName ||
                  "Alumni Mentor"}
              </h3>
              <p>Status: {request.status || "Pending"}</p>
              <p>{request.message || ""}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderOpportunities = () => (
    <>
      <h2>Opportunities</h2>
      {opportunities.length === 0 ? (
        <p>No opportunities are available right now.</p>
      ) : (
        <div className="opportunities-grid">
          {opportunities.map((opportunity, index) => (
            <div
              className="opportunity-card"
              key={opportunity._id || opportunity.id || index}
            >
              <h3>{opportunity.title || opportunity.name}</h3>
              <p>{opportunity.company || ""}</p>
              <p>{opportunity.description || ""}</p>

              {(opportunity.date ||
                opportunity.startDate ||
                opportunity.eventDate) && (
                <p>
                  📅 <strong>Date:</strong>{" "}
                  {getEventTiming(opportunity, now).dateText}
                </p>
              )}

              {(opportunity.startTime ||
                opportunity.endTime ||
                opportunity.time ||
                opportunity.eventTime) && (
                <p>
                  🕒 <strong>Time:</strong> {getEventTime(opportunity)}
                </p>
              )}

              <p>{opportunity.location || ""}</p>

              {opportunity.applicationLink && (
                <a
                  href={opportunity.applicationLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Apply Now
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderEvents = () => (
    <>
      <h2>Events</h2>
      <p>
        Register for upcoming events, cancel your registration before
        the event ends, and submit feedback after the event ends.
      </p>

      {events.length === 0 ? (
        <p>No events are available right now.</p>
      ) : (
        <div className="events-grid">
          {events.map((event) => {
            const eventId = getEventId(event);
            const timing = getEventTiming(event, now);
            const eventEnded = isEventEnded(event);
            const isRegistered = registeredEventIds.has(String(eventId));
            const isBusy = busyEventId === String(eventId);
            const hasSubmittedFeedback =
              submittedFeedbackIds.has(String(eventId));
            const isLoadingThisFeedback =
              loadingFeedbackForm &&
              loadingFeedbackEventId === String(eventId);

            return (
              <div className="event-card" key={eventId}>
                <h3>{event.title || event.name || "Untitled Event"}</h3>
                <p>📅 <strong>Date:</strong> {timing.dateText}</p>
                <p>🕒 <strong>Time:</strong> {timing.timeText}</p>
                <p>
                  📍 <strong>Location:</strong>{" "}
                  {event.location || "Not specified"}
                </p>
                <p>{event.description || "No description available."}</p>

                {!eventEnded && isRegistered && (
                  <div className="event-registration-actions">
                    <p className="registered-status">✓ Registered</p>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        handleEventRegistration(event, "cancel")
                      }
                    >
                      {isBusy ? "Please wait..." : "Cancel Registration"}
                    </button>
                  </div>
                )}

                {!eventEnded && !isRegistered && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() =>
                      handleEventRegistration(event, "register")
                    }
                  >
                    {isBusy ? "Please wait..." : "Register for Event"}
                  </button>
                )}

                {eventEnded && (
                  <div className="event-ended">
                    <strong>Event Ended</strong>
                  </div>
                )}

                {/* Feedback option remains visible for registered students. */}
                {isRegistered && (
                  <div className="event-feedback-section">
                    <p>You were registered for this event.</p>

                    {hasSubmittedFeedback ? (
                      <p className="registered-status">
                        ✓ Feedback Submitted
                      </p>
                    ) : (
                      <button
                        type="button"
                        disabled={isLoadingThisFeedback || loadingFeedbackForm}
                        onClick={() => openFeedbackForm(event)}
                      >
                        {isLoadingThisFeedback
                          ? "Loading Feedback Form..."
                          : !eventEnded
                            ? "Feedback Available After Event"
                            : "Give Feedback"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {feedbackEvent && feedbackForm && (
        <div className="feedback-modal-overlay">
          <div className="feedback-modal">
            <h3>{feedbackForm.title || "Event Feedback"}</h3>
            <p>{feedbackEvent.title || feedbackEvent.name || "Event"}</p>

            {feedbackForm.description && <p>{feedbackForm.description}</p>}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitEventFeedback(feedbackEvent);
              }}
            >
              {feedbackForm.questions.map((question, index) => {
                const questionId = String(question._id || question.id || "");
                const isRating =
                  String(question.type).toLowerCase() === "rating";

                return (
                  <div
                    className="feedback-question"
                    key={questionId || index}
                  >
                    <label htmlFor={`feedback-${questionId}`}>
                      {question.question}
                      {question.required !== false ? " *" : ""}
                    </label>

                    {isRating ? (
                      <select
                        id={`feedback-${questionId}`}
                        value={feedbackAnswers[questionId] ?? ""}
                        onChange={(e) =>
                          setFeedbackAnswers((previous) => ({
                            ...previous,
                            [questionId]: e.target.value,
                          }))
                        }
                        required={question.required !== false}
                      >
                        <option value="">Select a rating</option>
                        <option value="5">5 - Excellent</option>
                        <option value="4">4 - Very Good</option>
                        <option value="3">3 - Good</option>
                        <option value="2">2 - Fair</option>
                        <option value="1">1 - Poor</option>
                      </select>
                    ) : (
                      <textarea
                        id={`feedback-${questionId}`}
                        value={feedbackAnswers[questionId] ?? ""}
                        onChange={(e) =>
                          setFeedbackAnswers((previous) => ({
                            ...previous,
                            [questionId]: e.target.value,
                          }))
                        }
                        placeholder="Enter your answer..."
                        required={question.required !== false}
                        rows={3}
                        maxLength={5000}
                      />
                    )}
                  </div>
                );
              })}

              <button type="submit" disabled={submittingFeedback}>
                {submittingFeedback ? "Submitting..." : "Submit Feedback"}
              </button>

              <button
                type="button"
                disabled={submittingFeedback}
                onClick={() => {
                  setFeedbackEvent(null);
                  setFeedbackForm(null);
                  setFeedbackAnswers({});
                }}
              >
                Close
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );

  const renderNotifications = () => (
    <>
      <h2>Notifications</h2>
      {notifications.length === 0 ? (
        <p>You have no notifications.</p>
      ) : (
        <div className="notifications-list">
          {notifications.map((notification, index) => (
            <div
              className="notification-card"
              key={notification._id || notification.id || index}
            >
              <h3>
                {notification.title || notification.type || "Notification"}
              </h3>
              <p>
                {notification.message ||
                  notification.description ||
                  "You have a new notification."}
              </p>
              {notification.createdAt && (
                <small>
                  {new Date(notification.createdAt).toLocaleString("en-IN")}
                </small>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderAccount = () => (
    <>
      <h2>Account</h2>
      <p><strong>Name:</strong> {user?.fullName || user?.name || "Student"}</p>
      <p><strong>Email:</strong> {user?.email || "Not available"}</p>
      <p><strong>Role:</strong> {user?.role || "Student"}</p>
      <button type="button" onClick={logout}>Logout</button>
    </>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "Dashboard":
        return renderDashboard();
      case "My Profile":
        return renderProfile();
      case "Search Alumni":
        return renderSearchAlumni();
      case "Mentorship":
        return renderMentorship();
      case "Opportunities":
        return renderOpportunities();
      case "Events":
        return renderEvents();
      case "Notifications":
        return renderNotifications();
      case "Account":
        return renderAccount();
      default:
        return renderDashboard();
    }
  };

  if (loading) {
    return (
      <div className="student-dashboard">
        <p>Loading student dashboard...</p>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <span className="student-brand-logo" aria-hidden="true">R</span>
          <div className="student-brand-text">
            <h2>ReConnect</h2>
            <p>Student Portal</p>
          </div>
        </div>

        <nav>
          {menuItems.map((item) => (
            <button
              type="button"
              key={item}
              className={
                activeSection === item
                  ? "sidebar-menu-item active"
                  : "sidebar-menu-item"
              }
              onClick={() => {
                setActiveSection(item);
                setMessage("");
                setError("");
              }}
            >
              <span className="menu-item-icon">{{"Dashboard":"⌂","My Profile":"◉","Search Alumni":"♧","Mentorship":"♡","Opportunities":"✦","Events":"▦","Notifications":"♢","Account":"⚙"}[item]}</span>
              <span>{item}</span>
              {activeSection === item && <span className="menu-active-dot" />}
            </button>
          ))}
        </nav>

        <button type="button" className="sidebar-logout" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>
              {activeSection === "Dashboard" ? "Your Student Community" : activeSection}
            </h1>
            <p>Welcome back, {user?.fullName || user?.name || "Student"}!</p>
          </div>

          <button type="button" onClick={loadAllData} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {message && (
          <div className="dashboard-message success" role="status">
            {message}
          </div>
        )}

        {error && (
          <div className="dashboard-message error" role="alert">
            {error}
          </div>
        )}

        <section className="dashboard-content">
          {renderContent()}
        </section>
      </main>
    </div>
  );
}
