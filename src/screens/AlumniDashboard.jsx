import React, { useEffect, useState } from "react";

const API = "https://reconnect-system.onrender.com/api";

function AlumniDashboard() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [events, setEvents] = useState([]);
  const [mentorships, setMentorships] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reports, setReports] = useState([]);
  const [studentFeedback, setStudentFeedback] = useState([]);
  const [reportSummary, setReportSummary] = useState({});
  const [reportLoading, setReportLoading] = useState(false);
  const [feedbackForms, setFeedbackForms] = useState({});
  const [feedbackFormLoading, setFeedbackFormLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [feedbackQuestion, setFeedbackQuestion] = useState("");
  const [feedbackQuestionType, setFeedbackQuestionType] = useState("rating");
  const [feedbackFormTitle, setFeedbackFormTitle] = useState("");
  const [feedbackFormDescription, setFeedbackFormDescription] = useState("");

  const [profile, setProfile] = useState({
    phone: "",
    college: "",
    branch: "",
    year: "",
    skills: "",
    bio: ""
  });

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    endDate: "",
    endTime: "",
    location: ""
  });

  const [opportunityForm, setOpportunityForm] = useState({
    title: "",
    company: "",
    type: "Job",
    description: "",
    location: "",
    link: ""
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const getUserId = (currentUser) =>
    currentUser?._id || currentUser?.id || currentUser?.userId || null;

  const getId = (value) => {
    if (value && typeof value === "object") {
      return value._id || value.id || "";
    }
    return value || "";
  };

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const readResponse = async (response) => {
    return response.json().catch(() => ({}));
  };

  const formatDate = (value) => {
    if (!value) return "Date not specified";

    const text = String(value);
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
      return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      ).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? text
      : date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });
  };

  const formatTime = (value) => {
    if (!value) return "Time not specified";

    const match = String(value)
      .trim()
      .match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

    if (match) {
      return new Date(
        2000,
        0,
        1,
        Number(match[1]),
        Number(match[2])
      ).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit"
      });
    }

    return String(value);
  };

  const getEventEnd = (event) => {
    const dateValue = event?.endDate || event?.date;
    const timeValue = event?.endTime || event?.time || "23:59";

    if (!dateValue) return null;

    const dateMatch = String(dateValue)
      .slice(0, 10)
      .match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (!dateMatch) return null;

    const timeMatch = String(timeValue)
      .trim()
      .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);

    let hours = 23;
    let minutes = 59;

    if (timeMatch) {
      hours = Number(timeMatch[1]);
      minutes = Number(timeMatch[2]);

      const meridiem = timeMatch[3]?.toUpperCase();

      if (meridiem === "PM" && hours !== 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;
    }

    return new Date(
      Number(dateMatch[1]),
      Number(dateMatch[2]) - 1,
      Number(dateMatch[3]),
      hours,
      minutes
    );
  };

  const isEventEnded = (event) => {
    const end = getEventEnd(event);
    return end ? Date.now() >= end.getTime() : false;
  };

  const getOwnEvents = (eventList = events) => {
    const currentId = String(getUserId(user) || "");

    return eventList.filter(
      (event) => String(getId(event.organizer)) === currentId
    );
  };

  // Authenticate the logged-in user.
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        window.location.href = "/login";
        return;
      }

      const parsedUser = JSON.parse(savedUser);

      if (!getUserId(parsedUser) || parsedUser.role !== "Alumni") {
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      setUser(parsedUser);
    } catch (error) {
      console.error("User data error:", error);
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const id = getUserId(user);

    loadProfile(id);
    loadMentorships(id);
    loadNotifications(id);
    loadEvents();
    loadOpportunities();
    loadEventReports(id);
  }, [user]);

  // PROFILE
  const loadProfile = async (id) => {
    try {
      const response = await fetch(`${API}/profile/${id}`);
      if (!response.ok) return;

      const data = await readResponse(response);
      const item = data.profile || data;

      setProfile({
        phone: item.phone || "",
        college: item.college || "",
        branch: item.branch || "",
        year: item.year || "",
        skills: Array.isArray(item.skills)
          ? item.skills.join(", ")
          : item.skills || "",
        bio: item.bio || ""
      });
    } catch (error) {
      console.error("Profile loading error:", error);
    }
  };

  const handleProfileChange = (event) => {
    setProfile((old) => ({
      ...old,
      [event.target.name]: event.target.value
    }));
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${API}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: getUserId(user),
          ...profile
        })
      });

      const data = await readResponse(response);

      if (!response.ok) {
        showMessage(data.message || "Unable to save profile.", "error");
        return;
      }

      showMessage("Profile saved successfully.");
      await loadProfile(getUserId(user));
    } catch (error) {
      console.error("Save profile error:", error);
      showMessage("Cannot connect to the server.", "error");
    } finally {
      setLoading(false);
    }
  };

  // MENTORSHIP
  const loadMentorships = async (id) => {
    try {
      const response = await fetch(`${API}/mentorship/alumni/${id}`);
      if (!response.ok) return;

      const data = await readResponse(response);

      setMentorships(
        Array.isArray(data) ? data : data.mentorships || []
      );
    } catch (error) {
      console.error("Mentorship loading error:", error);
    }
  };

  const updateMentorship = async (mentorshipId, status) => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${API}/mentorship/${mentorshipId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      const data = await readResponse(response);

      if (!response.ok) {
        showMessage(data.message || "Unable to update mentorship.", "error");
        return;
      }

      showMessage(`Mentorship request ${status.toLowerCase()}.`);

      await Promise.all([
        loadMentorships(getUserId(user)),
        loadNotifications(getUserId(user))
      ]);
    } catch (error) {
      console.error("Mentorship update error:", error);
      showMessage("Cannot connect to the server.", "error");
    } finally {
      setLoading(false);
    }
  };

  // OPPORTUNITIES
  const loadOpportunities = async () => {
    try {
      const response = await fetch(`${API}/opportunities`);
      if (!response.ok) return;

      const data = await readResponse(response);

      setOpportunities(
        Array.isArray(data) ? data : data.opportunities || []
      );
    } catch (error) {
      console.error("Opportunity loading error:", error);
    }
  };

  const handleOpportunityChange = (event) => {
    setOpportunityForm((old) => ({
      ...old,
      [event.target.name]: event.target.value
    }));
  };

  const handleCreateOpportunity = async (event) => {
    event.preventDefault();

    if (
      !opportunityForm.title.trim() ||
      !opportunityForm.company.trim()
    ) {
      showMessage(
        "Opportunity title and company name are required.",
        "error"
      );
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${API}/opportunities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...opportunityForm,
          title: opportunityForm.title.trim(),
          company: opportunityForm.company.trim(),
          postedBy: getUserId(user)
        })
      });

      const data = await readResponse(response);

      if (!response.ok) {
        showMessage(
          data.message || "Unable to create opportunity.",
          "error"
        );
        return;
      }

      showMessage("Opportunity posted successfully.");

      setOpportunityForm({
        title: "",
        company: "",
        type: "Job",
        description: "",
        location: "",
        link: ""
      });

      await Promise.all([
        loadOpportunities(),
        loadNotifications(getUserId(user))
      ]);
    } catch (error) {
      console.error("Create opportunity error:", error);
      showMessage("Cannot connect to the server.", "error");
    } finally {
      setLoading(false);
    }
  };

  // EVENTS
  const loadEvents = async () => {
    try {
      const response = await fetch(`${API}/events`);
      if (!response.ok) return;

      const data = await readResponse(response);
      const loadedEvents = Array.isArray(data)
        ? data
        : data.events || [];

      setEvents(loadedEvents);

      const currentId = String(getUserId(user) || "");

      const ownEvents = loadedEvents.filter(
        (event) => String(getId(event.organizer)) === currentId
      );

      // Load forms independently. Never update the currently selected
      // form title unless the user selects that event.
      await Promise.all(
        ownEvents.map((event) =>
          loadFeedbackForm(event._id || event.id, false)
        )
      );
    } catch (error) {
      console.error("Event loading error:", error);
    }
  };

  const handleEventChange = (event) => {
    setEventForm((old) => ({
      ...old,
      [event.target.name]: event.target.value
    }));
  };

  const handleHostEvent = async (event) => {
    event.preventDefault();

    if (
      !eventForm.title.trim() ||
      !eventForm.date ||
      !eventForm.time ||
      !eventForm.endDate ||
      !eventForm.endTime
    ) {
      showMessage(
        "Complete all required event date and time fields.",
        "error"
      );
      return;
    }

    const start = new Date(`${eventForm.date}T${eventForm.time}`);
    const end = new Date(`${eventForm.endDate}T${eventForm.endTime}`);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      showMessage("The event end must be after its start.", "error");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${API}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventForm,
          title: eventForm.title.trim(),
          organizer: getUserId(user)
        })
      });

      const data = await readResponse(response);

      if (!response.ok) {
        showMessage(data.message || "Unable to create event.", "error");
        return;
      }

      showMessage("Event hosted successfully.");

      setEventForm({
        title: "",
        description: "",
        date: "",
        time: "",
        endDate: "",
        endTime: "",
        location: ""
      });

      await Promise.all([
        loadEvents(),
        loadEventReports(getUserId(user)),
        loadNotifications(getUserId(user))
      ]);
    } catch (error) {
      console.error("Host event error:", error);
      showMessage("Cannot connect to the server.", "error");
    } finally {
      setLoading(false);
    }
  };

  // FEEDBACK FORMS
  const loadFeedbackForm = async (eventId, updateEditor = true) => {
    if (!eventId || !user) return;

    try {
      const response = await fetch(
        `${API}/events/${eventId}/feedback-form?organizerId=${encodeURIComponent(
          getUserId(user)
        )}`
      );

      const data = await readResponse(response);

      if (response.status === 404) {
        setFeedbackForms((old) => ({
          ...old,
          [eventId]: old[eventId] || null
        }));

        if (updateEditor && selectedEventId === eventId) {
          const existing = feedbackForms[eventId];

          setFeedbackFormTitle(existing?.title || "");
          setFeedbackFormDescription(existing?.description || "");
        }

        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load feedback form."
        );
      }

      const form = data.form || data.feedbackForm || data;

      setFeedbackForms((old) => ({
        ...old,
        [eventId]: form
      }));

      // Only update the editor for the currently selected event.
      if (updateEditor && selectedEventId === eventId) {
        setFeedbackFormTitle(form.title || "");
        setFeedbackFormDescription(form.description || "");
      }
    } catch (error) {
      console.error("Feedback form loading error:", error);
    }
  };

  const selectFeedbackEvent = async (eventId) => {
    setSelectedEventId(eventId);
    setFeedbackQuestion("");
    setMessage("");

    const existing = feedbackForms[eventId];

    setFeedbackFormTitle(existing?.title || "");
    setFeedbackFormDescription(existing?.description || "");

    if (eventId) {
      await loadFeedbackForm(eventId, false);

      // Read the latest form after loading. This prevents one event's
      // form details from being used when editing a different event.
      setFeedbackForms((old) => {
        const form = old[eventId];

        setFeedbackFormTitle(form?.title || "");
        setFeedbackFormDescription(form?.description || "");

        return old;
      });
    }
  };

  const saveFeedbackForm = async (event) => {
    event.preventDefault();

    if (!selectedEventId) {
      showMessage("Select an event first.", "error");
      return;
    }

    if (!feedbackFormTitle.trim()) {
      showMessage("Enter a feedback form title.", "error");
      return;
    }

    const existingForm = feedbackForms[selectedEventId];

    if (existingForm?.status === "Published") {
      showMessage("This feedback form is already published.", "error");
      return;
    }

    const questions = existingForm?.questions || [];

    if (questions.length === 0) {
      showMessage("Add at least one feedback question.", "error");
      return;
    }

    try {
      setFeedbackFormLoading(true);
      setMessage("");

      const response = await fetch(
        `${API}/events/${selectedEventId}/feedback-form`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizerId: getUserId(user),
            title: feedbackFormTitle.trim(),
            description: feedbackFormDescription.trim(),
            questions: questions.map((question) => ({
              question: question.question,
              type: question.type,
              required: question.required !== false
            }))
          })
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        showMessage(
          data.message || "Unable to save feedback form.",
          "error"
        );
        return;
      }

      const savedForm = data.form || data.feedbackForm || data;

      setFeedbackForms((old) => ({
        ...old,
        [selectedEventId]: {
          ...savedForm,
          title: savedForm.title || feedbackFormTitle.trim(),
          description:
            savedForm.description ?? feedbackFormDescription.trim(),
          questions: savedForm.questions || questions,
          status: savedForm.status || "Draft"
        }
      }));

      showMessage("Feedback form saved as a draft.");
    } catch (error) {
      console.error("Save feedback form error:", error);
      showMessage("Cannot connect to the server.", "error");
    } finally {
      setFeedbackFormLoading(false);
    }
  };

  const addFeedbackQuestion = () => {
    if (!selectedEventId) {
      showMessage("Select an event first.", "error");
      return;
    }

    if (!feedbackQuestion.trim()) {
      showMessage("Enter a question before adding it.", "error");
      return;
    }

    const currentForm = feedbackForms[selectedEventId];

    if (currentForm?.status === "Published") {
      showMessage("Published forms cannot be edited.", "error");
      return;
    }

    setFeedbackForms((old) => {
      const form = old[selectedEventId] || {};

      return {
        ...old,
        [selectedEventId]: {
          ...form,
          title: feedbackFormTitle,
          description: feedbackFormDescription,
          status: "Draft",
          questions: [
            ...(form.questions || []),
            {
              question: feedbackQuestion.trim(),
              type: feedbackQuestionType,
              required: true
            }
          ]
        }
      };
    });

    setFeedbackQuestion("");
    showMessage("Question added. Save the form to keep your changes.");
  };

  const removeFeedbackQuestion = (index) => {
    const currentForm = feedbackForms[selectedEventId];

    if (!currentForm || currentForm.status === "Published") return;

    setFeedbackForms((old) => ({
      ...old,
      [selectedEventId]: {
        ...currentForm,
        questions: currentForm.questions.filter((_, i) => i !== index)
      }
    }));
  };

  const publishFeedbackForm = async () => {
    if (!selectedEventId) {
      showMessage("Select an event first.", "error");
      return;
    }

    const form = feedbackForms[selectedEventId];

    if (!form || !form.questions?.length) {
      showMessage(
        "Save a feedback form with at least one question first.",
        "error"
      );
      return;
    }

    try {
      setFeedbackFormLoading(true);
      setMessage("");

      const response = await fetch(
        `${API}/events/${selectedEventId}/feedback-form/publish`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizerId: getUserId(user)
          })
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        showMessage(
          data.message || "Unable to publish feedback form.",
          "error"
        );
        return;
      }

      const publishedForm = data.form || data.feedbackForm || {};

      setFeedbackForms((old) => ({
        ...old,
        [selectedEventId]: {
          ...old[selectedEventId],
          ...publishedForm,
          status: publishedForm.status || "Published"
        }
      }));

      showMessage("Feedback form published successfully.");
    } catch (error) {
      console.error("Publish feedback form error:", error);
      showMessage("Cannot connect to the server.", "error");
    } finally {
      setFeedbackFormLoading(false);
    }
  };

  // EVENT REPORTS
  const loadEventReports = async (id) => {
    if (!id) return;

    try {
      setReportLoading(true);

      const response = await fetch(`${API}/alumni/${id}/reports`);
      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load event reports."
        );
      }

      const eventReports = Array.isArray(data.eventsHosted)
        ? data.eventsHosted
        : [];

      setReports(eventReports);
      setReportSummary(data.summary || {});

      const allFeedback = eventReports.flatMap((report) => {
        const event = report.event || {};
        const eventId = String(event._id || event.id || "");

        return (Array.isArray(report.feedback) ? report.feedback : []).map(
          (feedback) => ({
            ...feedback,
            eventId,
            eventTitle: event.title || "Untitled Event"
          })
        );
      });

      setStudentFeedback(allFeedback);
    } catch (error) {
      console.error("Event reports loading error:", error);
      // Keep the previous report data on a network/server failure.
      showMessage(
        error.message || "Unable to load event reports.",
        "error"
      );
    } finally {
      setReportLoading(false);
    }
  };

  // NOTIFICATIONS
  const loadNotifications = async (id) => {
    if (!id) return;

    try {
      setNotificationLoading(true);

      const response = await fetch(`${API}/notifications/${id}`);

      if (!response.ok) {
        console.error("Notification request failed:", response.status);
        return;
      }

      const data = await readResponse(response);

      setNotifications(
        Array.isArray(data) ? data : data.notifications || []
      );
    } catch (error) {
      console.error("Notification loading error:", error);
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };



const openSection = (section) => {
  setActiveSection(section);
  setMessage("");

  const id = getUserId(user);

  switch (section) {
    case "Dashboard":
      break;

    case "My Profile":
      if (id) loadProfile(id);
      break;

    case "Mentorship":
      if (id) loadMentorships(id);
      break;

    case "Opportunities":
      loadOpportunities();
      break;

    case "Events":
    case "Feedback Forms":
      loadEvents();
      break;

    case "Event Reports":
      if (id) loadEventReports(id);
      break;

    case "Notifications":
      if (id) loadNotifications(id);
      break;

    case "Account":
      break;

    default:
      console.warn("Unknown alumni section:", section);
  }
};


  // STYLES
  const pageStyle = {
    minHeight: "100vh",
    background: "#f5f7fc",
    display: "flex"
  };

  const sidebarStyle = {
    width: "252px",
    background: "#111b35",
    color: "white",
    padding: "25px 15px",
    boxSizing: "border-box",
    minHeight: "100vh",
    position: "fixed",
    left: 0,
    top: 0,
    overflowY: "auto"
  };

  const contentStyle = {
    marginLeft: "252px",
    width: "calc(100% - 252px)",
    padding: "30px",
    boxSizing: "border-box"
  };

  const cardStyle = {
    background: "white",
    padding: "25px",
    borderRadius: "18px",
    marginBottom: "20px",
    border: "1px solid #e8edf6",
    boxShadow: "0 8px 30px rgba(31,45,85,0.055)"
  };

  const inputStyle = {
    width: "100%",
    padding: "11px",
    marginTop: "6px",
    marginBottom: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    boxSizing: "border-box",
    fontSize: "14px"
  };

  const primaryButton = {
    padding: "11px 20px",
    background: "#5855df",
    color: "white",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "14px"
  };

  const dangerButton = {
    padding: "9px 15px",
    background: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  };

  const sectionButtonStyle = (item) => ({
    width: "100%",
    padding: "12px",
    marginBottom: "8px",
    border: "none",
    borderRadius: "11px",
    textAlign: "left",
    cursor: "pointer",
    background: activeSection === item ? "#5558db" : "transparent",
    color: "white",
    fontSize: "14px"
  });

  const ownEvents = getOwnEvents();

  const totalFeedback = studentFeedback.length;

  const ratings = studentFeedback
    .map((item) => Number(item.rating))
    .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);

  const calculatedAverageRating = ratings.length
    ? (
        ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      ).toFixed(2)
    : null;

  const menuItems = [
    "Dashboard",
    "My Profile",
    "Mentorship",
    "Opportunities",
    "Events",
    "Feedback Forms",
    "Event Reports",
    "Notifications",
    "Account"
  ];

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px"
        }}
      >
        Loading ReConnect...
      </div>
    );
  }

  return (
    <div className="alumni-shell" style={pageStyle}>

      <style>{`
        .alumni-shell { font-family: Inter, "Segoe UI", Arial, sans-serif; color: #182744; }
        .alumni-shell * { box-sizing: border-box; }
        .alumni-shell aside { box-shadow: 8px 0 35px rgba(12,23,54,.07); z-index: 3; }
        .alumni-shell aside > h2 { font-size: 27px; letter-spacing: -.9px; }
        .alumni-shell aside > p { letter-spacing: 1.2px; text-transform: uppercase; font-size: 11px; }
        .alumni-shell aside > button { transition: background .2s, transform .2s; font-weight: 600; }
        .alumni-shell aside > button:hover { background: #303d62 !important; transform: translateX(3px); }
        .alumni-shell aside > button[style*="85, 88, 219"]:hover { background: #5558db !important; }
        .alumni-shell main { max-width: 1700px; }
     
        .alumni-shell main h2 { letter-spacing: -.5px; }
        .alumni-shell main > div > h2 { font-size: 23px; margin: 26px 0 18px; }
        .alumni-shell input, .alumni-shell select, .alumni-shell textarea { transition: border-color .2s, box-shadow .2s; background: #fff; }
        .alumni-shell input:focus, .alumni-shell select:focus, .alumni-shell textarea:focus { outline: none; border-color: #7772e8 !important; box-shadow: 0 0 0 3px #7772e820; }
        .alumni-shell button { transition: filter .2s, transform .2s; }
        .alumni-shell main button:hover:not(:disabled) { filter: brightness(.95); transform: translateY(-1px); }
        .alumni-shell main button:disabled { opacity: .6; cursor: not-allowed; }
        .alumni-shell .alumni-metrics > div { margin-bottom: 0 !important; min-height: 165px; position: relative; overflow: hidden; border-top: 4px solid var(--metric-accent,#595bdc) !important; }
        .alumni-shell .alumni-metrics > div::after { content: ""; position: absolute; width: 110px; height: 110px; border-radius: 50%; background: var(--metric-tint,#f1f1ff); right: -55px; bottom: -55px; }
        .alumni-shell .alumni-metrics h3 { font-size: 13px; color: #65728c; margin: 0 0 14px; }
        .alumni-shell .alumni-metrics h2 { font-size: 38px; font-weight: 800; margin: 0 0 8px; color: #1b2a48; }
        .alumni-shell .alumni-metrics p { font-size: 12px; color: #8490a4; margin: 0; }
        .alumni-shell .alumni-welcome { margin-top: 24px; padding: 30px !important; background: linear-gradient(125deg,#fff,#f7f7ff) !important; }
        .alumni-shell .alumni-welcome h2 { font-size: 23px; }
        .alumni-shell .alumni-welcome p { max-width: 780px; line-height: 1.8; color: #65728c; }
        @media (max-width: 850px) { .alumni-shell aside { width: 200px !important; } .alumni-shell main { margin-left: 200px !important; width: calc(100% - 200px) !important; padding: 18px !important; } }
        @media (max-width: 600px) { .alumni-shell { display: block !important; } .alumni-shell aside { position: relative !important; width: 100% !important; min-height: 0 !important; max-height: 280px; } .alumni-shell main { margin-left: 0 !important; width: 100% !important; } }
      `}</style>

      <aside style={sidebarStyle}>
        <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
          ReConnect
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#cbd5e1",
            marginBottom: "25px"
          }}
        >
          Alumni Portal
        </p>

      
{menuItems.map((item) => (
  <button
    key={item}
    type="button"
    className={activeSection === item ? "active" : ""}
    onClick={() => openSection(item)}
    style={{
      display: "flex",
      alignItems: "center",
      width: "100%",
      padding: "12px 14px",
      marginBottom: "5px",
      border: "none",
      borderRadius: "12px",
      textAlign: "left",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: 600,
      fontFamily: "inherit",
      background: activeSection === item ? "#5558db" : "transparent",
      color: activeSection === item ? "#ffffff" : "#aab5d6",
      boxShadow:
        activeSection === item ? "0 8px 20px rgba(85,88,219,.35)" : "none"
    }}
  >
    {item}
  </button>
))}

        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "20px",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            background: "#dc3545",
            color: "white",
            fontSize: "14px"
          }}
        >
          Logout
        </button>
      </aside>

      <style>{`
        .alumni-premium-hero{position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:center;justify-content:space-between;min-height:300px;padding:42px 46px;margin-bottom:28px;border-radius:24px;background:linear-gradient(115deg,#172a6c 0%,#3f48c7 48%,#7554d9 100%);color:#fff;box-shadow:0 22px 46px rgba(49,64,158,.2)}
        .alumni-premium-hero:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 74% 20%,rgba(255,255,255,.14),transparent 38%);pointer-events:none}
        .alumni-hero-copy{position:relative;z-index:2;max-width:590px}
        .alumni-hero-eyebrow{display:inline-flex;align-items:center;gap:9px;padding:7px 13px;border:1px solid rgba(255,255,255,.25);border-radius:50px;background:rgba(255,255,255,.1);font-size:10px;font-weight:800;letter-spacing:1.7px;color:#e7eaff;margin-bottom:22px}
        .alumni-live-dot{width:7px;height:7px;background:#6cf2d1;border-radius:50%;box-shadow:0 0 0 4px rgba(108,242,209,.16)}
        .alumni-hero-copy h1{font-size:clamp(29px,3.1vw,45px);line-height:1.13;letter-spacing:-1.6px;margin:0 0 16px;font-weight:850;color:white}
        .alumni-hero-copy h1 span{color:#d5d2ff}
        .alumni-hero-copy p{font-size:14px;line-height:1.85;color:#e1e7ff;max-width:530px;margin:0 0 24px}
        .alumni-hero-actions{display:flex;gap:12px;flex-wrap:wrap}
        .alumni-hero-actions button{border-radius:11px;padding:12px 17px;font-size:12px;font-weight:800;cursor:pointer;transition:transform .2s,background .2s}
        .alumni-hero-actions button:hover{transform:translateY(-2px)}
        .alumni-hero-actions button span{margin-left:12px}
        .alumni-hero-primary{background:#fff;color:#333fa6;border:1px solid white}
        .alumni-hero-secondary{background:rgba(255,255,255,.1);color:white;border:1px solid rgba(255,255,255,.35)}
        .alumni-hero-secondary:hover{background:rgba(255,255,255,.2)}
        .alumni-hero-visual{position:relative;width:300px;height:245px;flex-shrink:0;z-index:1}
        .alumni-glow{position:absolute;border-radius:50%;background:rgba(255,255,255,.08)}
        .alumni-glow-one{width:270px;height:270px;top:-30px;left:25px}.alumni-glow-two{width:190px;height:190px;top:10px;left:65px;border:1px solid rgba(255,255,255,.2)}
        .alumni-orbit-ring{position:absolute;left:25px;top:35px;width:275px;height:160px;border:1px solid rgba(255,255,255,.24);border-radius:50%;transform:rotate(-29deg)}
        .alumni-center-mark{position:absolute;left:112px;top:63px;width:112px;height:112px;display:grid;place-items:center;border-radius:30px;transform:rotate(-9deg);background:linear-gradient(145deg,rgba(255,255,255,.33),rgba(255,255,255,.09));border:1px solid rgba(255,255,255,.38);box-shadow:0 18px 38px rgba(14,23,94,.2);font-size:68px;font-weight:900}
        .alumni-center-mark span{position:absolute;font-size:21px;right:11px;top:5px;color:#f6d895}
        .alumni-float-tag{position:absolute;padding:10px 13px;border-radius:12px;background:rgba(255,255,255,.95);color:#35428c;font-size:11px;font-weight:800;box-shadow:0 12px 30px rgba(10,19,77,.18);white-space:nowrap}
        .alumni-float-one{left:0;top:28px}.alumni-float-two{right:-4px;bottom:13px}
        @media(max-width:1100px){.alumni-hero-visual{width:210px;transform:scale(.8);transform-origin:center right}.alumni-premium-hero{padding:32px}}
        @media(max-width:760px){.alumni-premium-hero{min-height:0;padding:28px 22px}.alumni-hero-visual{display:none}.alumni-hero-copy h1{font-size:30px}.alumni-hero-actions button{width:100%;justify-content:space-between;display:flex}}
      `}</style>
      
      <main style={contentStyle}>
        {activeSection === "Dashboard" && (
        <section className="alumni-premium-hero" aria-label="Alumni welcome">
          <div className="alumni-hero-copy">
            <div className="alumni-hero-eyebrow"><span className="alumni-live-dot" /> RECONNECT · ALUMNI PORTAL</div>
            <h1>Welcome back,<br /><span>{user.fullName || "Alumni"}!</span></h1>
            <p>Your experience can open doors. Mentor students, share career opportunities, and build a stronger alumni community.</p>
            <div className="alumni-hero-actions">
              <button type="button" className="alumni-hero-primary" onClick={() => openSection("Mentorship")}>Explore mentorship <span>↗</span></button>
              <button type="button" className="alumni-hero-secondary" onClick={() => openSection("Opportunities")}>Share an opportunity <span>→</span></button>
            </div>
          </div>
          <div className="alumni-hero-visual" aria-hidden="true">
            <div className="alumni-glow alumni-glow-one" />
            <div className="alumni-glow alumni-glow-two" />
            <div className="alumni-orbit-ring" />
            <div className="alumni-center-mark">R<span>✦</span></div>
            <div className="alumni-float-tag alumni-float-one">✦ &nbsp; Inspire growth</div>
            <div className="alumni-float-tag alumni-float-two">↗ &nbsp; Build connections</div>
                   </div>
        </section>
        )}

        {message && (
          <div
            role="status"
            style={{
              background: messageType === "error" ? "#fee2e2" : "#e8f5e9",
              color: messageType === "error" ? "#991b1b" : "#2e7d32",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px"
            }}
          >
            {message}
          </div>
        )}

        {/* DASHBOARD */}
        {activeSection === "Dashboard" && (
          <div>
            <div
              className="alumni-metrics"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "18px"
              }}
            >
              {[
                ["Mentorship", mentorships.length, "Student requests", "Mentorship"],
                ["Opportunities", opportunities.length, "Available opportunities", "Opportunities"],
                ["Events Hosted", ownEvents.length, "Your events", "Events"],
                ["Student Feedback", totalFeedback, "Submitted responses", "Event Reports"],
                ["Notifications", notifications.length, "Account updates", "Notifications"]
      ].map(([title, count, description, targetSection], index) => {
  const accent = ["#555de3", "#8a5be0", "#10a788", "#e89b43", "#0e9cb7"][index];

  return (
    <button
      key={title}
      type="button"
      onClick={() => openSection(targetSection)}
      aria-label={`Open ${targetSection}: ${title}, ${count}`}
      style={{
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        minHeight: "180px",
        marginBottom: 0,
        width: "100%",
        textAlign: "left",
        fontFamily: "inherit",
        color: "inherit",
        cursor: "pointer",
        appearance: "none",
        WebkitAppearance: "none",
        borderTop: `4px solid ${accent}`,
        transition: "transform .18s ease, box-shadow .18s ease"
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = "translateY(-3px)";
        event.currentTarget.style.boxShadow = "0 12px 32px rgba(31,45,85,0.12)";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = "translateY(0)";
        event.currentTarget.style.boxShadow = cardStyle.boxShadow;
      }}
    >
      <h3 style={{ margin: "0 0 12px", fontSize: "13px", color: "#65728c" }}>
        {title}
      </h3>
      <h2 style={{ margin: "0 0 6px", fontSize: "38px", fontWeight: 800, color: "#1b2a48" }}>
        {count}
      </h2>
      <p style={{ margin: 0, fontSize: "12px", color: "#8490a4" }}>
        {description}
      </p>

      <span
        aria-hidden="true"
        style={{
          marginTop: "auto",
          alignSelf: "flex-end",
          width: "34px",
          height: "34px",
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          background: accent + "22",
          color: accent,
          fontSize: "18px",
          fontWeight: 700
        }}
      >
        →
      </span>
    </button>
  );
})}
            </div>

            <div className="alumni-welcome" style={cardStyle}>
              <h2>Welcome to ReConnect</h2>
              <p>
                Support students through mentorship, career opportunities
                and events. Create a feedback form for each event and publish
                it so registered students can respond after the event ends.
              </p>
              <button
                type="button"
                style={primaryButton}
                onClick={() => openSection("Feedback Forms")}
              >
                Manage Feedback Forms
              </button>
            </div>
          </div>
        )}

        {/* PROFILE */}
        {activeSection === "My Profile" && (
          <div>
            <h2>My Profile</h2>

            <div style={cardStyle}>
              <h3>Basic Information</h3>
              <p><strong>Name:</strong> {user.fullName}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
            </div>

            <div style={cardStyle}>
              <h3>Update Profile</h3>

              <form onSubmit={handleSaveProfile}>
                {[
                  ["phone", "Phone"],
                  ["college", "College"],
                  ["branch", "Branch"],
                  ["year", "Graduation Year"],
                  ["skills", "Skills"]
                ].map(([name, label]) => (
                  <label
                    key={name}
                    style={{ display: "block", marginBottom: "8px" }}
                  >
                    {label}
                    <input
                      name={name}
                      value={profile[name]}
                      onChange={handleProfileChange}
                      placeholder={
                        name === "skills" ? "Java, Python, React..." : ""
                      }
                      style={inputStyle}
                    />
                  </label>
                ))}

                <label>
                  Bio
                  <textarea
                    name="bio"
                    value={profile.bio}
                    onChange={handleProfileChange}
                    rows="5"
                    style={inputStyle}
                  />
                </label>

                <button
                  type="submit"
                  style={primaryButton}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Profile"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MENTORSHIP */}
        {activeSection === "Mentorship" && (
          <div>
            <h2>Mentorship Requests</h2>

            {mentorships.length === 0 ? (
              <div style={cardStyle}>
                <h3>No Mentorship Requests</h3>
                <p>Students have not sent any mentorship requests yet.</p>
              </div>
            ) : (
              mentorships.map((request) => (
                <div key={request._id} style={cardStyle}>
                  <h3>🤝 Mentorship Request</h3>
                  <p>
                    <strong>Student:</strong>{" "}
                    {request.studentId?.fullName || "Student"}
                  </p>
                  <p>
                    <strong>Email:</strong>{" "}
                    {request.studentId?.email || "Not available"}
                  </p>
                  <p><strong>Status:</strong> {request.status}</p>

                  {request.status === "Pending" && (
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        type="button"
                        style={primaryButton}
                        disabled={loading}
                        onClick={() =>
                          updateMentorship(request._id, "Accepted")
                        }
                      >
                        Accept
                      </button>

                      <button
                        type="button"
                        style={dangerButton}
                        disabled={loading}
                        onClick={() =>
                          updateMentorship(request._id, "Rejected")
                        }
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* OPPORTUNITIES */}
        {activeSection === "Opportunities" && (
          <div>
            <h2>Opportunities</h2>

            <div style={cardStyle}>
              <h3>Share an Opportunity</h3>

              <form onSubmit={handleCreateOpportunity}>
                <input
                  name="title"
                  value={opportunityForm.title}
                  onChange={handleOpportunityChange}
                  placeholder="Opportunity title"
                  required
                  style={inputStyle}
                />

                <input
                  name="company"
                  value={opportunityForm.company}
                  onChange={handleOpportunityChange}
                  placeholder="Company name"
                  required
                  style={inputStyle}
                />

                <select
                  name="type"
                  value={opportunityForm.type}
                  onChange={handleOpportunityChange}
                  style={inputStyle}
                >
                  <option value="Job">Job</option>
                  <option value="Internship">Internship</option>
                  <option value="Scholarship">Scholarship</option>
                  <option value="Other">Other</option>
                </select>

                <textarea
                  name="description"
                  value={opportunityForm.description}
                  onChange={handleOpportunityChange}
                  placeholder="Description"
                  rows="4"
                  style={inputStyle}
                />

                <input
                  name="location"
                  value={opportunityForm.location}
                  onChange={handleOpportunityChange}
                  placeholder="Location / Remote"
                  style={inputStyle}
                />

                <input
                  name="link"
                  value={opportunityForm.link}
                  onChange={handleOpportunityChange}
                  placeholder="Application link"
                  style={inputStyle}
                />

                <button
                  type="submit"
                  style={primaryButton}
                  disabled={loading}
                >
                  {loading ? "Posting..." : "Post Opportunity"}
                </button>
              </form>
            </div>

            <h3>Available Opportunities</h3>

            {opportunities.length === 0 ? (
              <div style={cardStyle}>No opportunities available.</div>
            ) : (
              opportunities.map((item) => (
                <div key={item._id || item.id} style={cardStyle}>
                  <h3>{item.title}</h3>
                  <p>
                    <strong>Company:</strong>{" "}
                    {item.company || "Not specified"}
                  </p>
                  <p>
                    <strong>Type:</strong> {item.type || "Not specified"}
                  </p>
                  <p>{item.description || "No description."}</p>
                  <p>
                    <strong>Location:</strong>{" "}
                    {item.location || "Not specified"}
                  </p>

                  {item.link && (
                    <p>
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Apply / View Opportunity
                      </a>
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* EVENTS */}
        {activeSection === "Events" && (
          <div>
            <h2>Events</h2>

            <div style={cardStyle}>
              <h3>Host an Event</h3>

              <form onSubmit={handleHostEvent}>
                <input
                  name="title"
                  value={eventForm.title}
                  onChange={handleEventChange}
                  placeholder="Event title"
                  required
                  style={inputStyle}
                />

                <textarea
                  name="description"
                  value={eventForm.description}
                  onChange={handleEventChange}
                  placeholder="Event description"
                  rows="4"
                  style={inputStyle}
                />

                <label>
                  Start Date
                  <input
                    type="date"
                    name="date"
                    value={eventForm.date}
                    onChange={handleEventChange}
                    required
                    style={inputStyle}
                  />
                </label>

                <label>
                  Start Time
                  <input
                    type="time"
                    name="time"
                    value={eventForm.time}
                    onChange={handleEventChange}
                    required
                    style={inputStyle}
                  />
                </label>

                <label>
                  End Date
                  <input
                    type="date"
                    name="endDate"
                    value={eventForm.endDate}
                    min={eventForm.date || undefined}
                    onChange={handleEventChange}
                    required
                    style={inputStyle}
                  />
                </label>

                <label>
                  End Time
                  <input
                    type="time"
                    name="endTime"
                    value={eventForm.endTime}
                    onChange={handleEventChange}
                    required
                    style={inputStyle}
                  />
                </label>

                <input
                  name="location"
                  value={eventForm.location}
                  onChange={handleEventChange}
                  placeholder="Event location"
                  style={inputStyle}
                />

                <button
                  type="submit"
                  style={primaryButton}
                  disabled={loading}
                >
                  {loading ? "Hosting..." : "Host Event"}
                </button>
              </form>
            </div>

            <h3>Events Hosted / Available</h3>

            {events.length === 0 ? (
              <div style={cardStyle}>No events available.</div>
            ) : (
              events.map((event) => (
                <div key={event._id || event.id} style={cardStyle}>
                  <h3>{event.title}</h3>
                  <p>{event.description || "No description."}</p>
                  <p>
                    <strong>Start:</strong> {formatDate(event.date)} at{" "}
                    {formatTime(event.time)}
                  </p>
                  <p>
                    <strong>End:</strong>{" "}
                    {formatDate(event.endDate || event.date)} at{" "}
                    {formatTime(event.endTime || event.time)}
                  </p>
                  <p>
                    <strong>Location:</strong>{" "}
                    {event.location || "Not specified"}
                  </p>
                  <p>
                    <strong>Organizer:</strong>{" "}
                    {event.organizer?.fullName || "Alumni"}
                  </p>

                  <span
                    style={{
                      display: "inline-block",
                      padding: "6px 10px",
                      borderRadius: "20px",
                      background: isEventEnded(event)
                        ? "#fee2e2"
                        : "#dcfce7",
                      color: isEventEnded(event)
                        ? "#991b1b"
                        : "#166534",
                      fontSize: "13px",
                      fontWeight: 600
                    }}
                  >
                    {isEventEnded(event)
                      ? "Event Ended"
                      : "Upcoming Event"}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* FEEDBACK FORMS */}
        {activeSection === "Feedback Forms" && (
          <div>
            <h2>Feedback Forms</h2>

            <p style={{ color: "#64748b" }}>
              Select an event, create its questions, save the form, and publish
              it. Students who registered can submit their responses after the
              event ends.
            </p>

            <div style={cardStyle}>
              <label>
                Select Your Event
                <select
                  value={selectedEventId}
                  onChange={(event) =>
                    selectFeedbackEvent(event.target.value)
                  }
                  style={inputStyle}
                  required
                >
                  <option value="">-- Select an event --</option>

                  {ownEvents.map((event) => (
                    <option
                      key={event._id || event.id}
                      value={event._id || event.id}
                    >
                      {event.title} ({formatDate(event.date)})
                    </option>
                  ))}
                </select>
              </label>

              {!ownEvents.length && (
                <p>Host an event before creating its feedback form.</p>
              )}
            </div>

            {selectedEventId && (
              <>
                <div style={cardStyle}>
                  <h3>Create / Edit Feedback Form</h3>

                  <form onSubmit={saveFeedbackForm}>
                    <label>
                      Form Title
                      <input
                        value={feedbackFormTitle}
                        onChange={(event) =>
                          setFeedbackFormTitle(event.target.value)
                        }
                        placeholder="e.g. Workshop Feedback"
                        required
                        disabled={
                          feedbackForms[selectedEventId]?.status ===
                          "Published"
                        }
                        style={inputStyle}
                      />
                    </label>

                    <label>
                      Description
                      <textarea
                        value={feedbackFormDescription}
                        onChange={(event) =>
                          setFeedbackFormDescription(event.target.value)
                        }
                        placeholder="Tell students what this form is for"
                        rows="3"
                        disabled={
                          feedbackForms[selectedEventId]?.status ===
                          "Published"
                        }
                        style={inputStyle}
                      />
                    </label>

                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "16px",
                        marginBottom: "16px"
                      }}
                    >
                      <h4>Add a Question</h4>

                      <input
                        value={feedbackQuestion}
                        onChange={(event) =>
                          setFeedbackQuestion(event.target.value)
                        }
                        placeholder="Enter your question"
                        disabled={
                          feedbackForms[selectedEventId]?.status ===
                          "Published"
                        }
                        style={inputStyle}
                      />

                      <select
                        value={feedbackQuestionType}
                        onChange={(event) =>
                          setFeedbackQuestionType(event.target.value)
                        }
                        disabled={
                          feedbackForms[selectedEventId]?.status ===
                          "Published"
                        }
                        style={inputStyle}
                      >
                        <option value="rating">Rating (1–5)</option>
                        <option value="text">Written answer</option>
                      </select>

                      <button
                        type="button"
                        style={primaryButton}
                        disabled={
                          feedbackFormLoading ||
                          feedbackForms[selectedEventId]?.status ===
                            "Published"
                        }
                        onClick={addFeedbackQuestion}
                      >
                        Add Question
                      </button>
                    </div>

                    <h4>Questions</h4>

                    {(feedbackForms[selectedEventId]?.questions || [])
                      .length === 0 ? (
                      <p>No questions added yet.</p>
                    ) : (
                      feedbackForms[selectedEventId].questions.map(
                        (question, index) => (
                          <div
                            key={question._id || question.id || index}
                            style={{
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              padding: "12px",
                              marginBottom: "10px"
                            }}
                          >
                            <p>
                              <strong>
                                {index + 1}. {question.question}
                              </strong>
                            </p>

                            <p
                              style={{
                                color: "#64748b",
                                marginBottom: 0
                              }}
                            >
                              Type:{" "}
                              {question.type === "rating"
                                ? "Rating (1–5)"
                                : "Written answer"}
                            </p>

                            {feedbackForms[selectedEventId]?.status !==
                              "Published" && (
                              <button
                                type="button"
                                style={{
                                  ...dangerButton,
                                  marginTop: "10px"
                                }}
                                onClick={() =>
                                  removeFeedbackQuestion(index)
                                }
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        )
                      )
                    )}

                    <p>
                      <strong>Status:</strong>{" "}
                      {feedbackForms[selectedEventId]?.status || "Not saved"}
                    </p>

                    <button
                      type="submit"
                      style={primaryButton}
                      disabled={
                        feedbackFormLoading ||
                        feedbackForms[selectedEventId]?.status === "Published"
                      }
                    >
                      {feedbackFormLoading
                        ? "Saving..."
                        : "Save Feedback Form"}
                    </button>

                    <button
                      type="button"
                      style={{
                        ...primaryButton,
                        marginLeft: "10px",
                        background: "#15803d"
                      }}
                      disabled={
                        feedbackFormLoading ||
                        feedbackForms[selectedEventId]?.status === "Published"
                      }
                      onClick={publishFeedbackForm}
                    >
                      {feedbackFormLoading
                        ? "Please wait..."
                        : feedbackForms[selectedEventId]?.status ===
                          "Published"
                        ? "Published"
                        : "Publish Form"}
                    </button>
                  </form>
                </div>

                {feedbackForms[selectedEventId]?.status === "Published" && (
                  <div style={{ ...cardStyle, background: "#dcfce7" }}>
                    <strong>Feedback form published.</strong>
                    <p>
                      Students can see this form for this event and submit it
                      after the event ends, subject to registration.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* EVENT REPORTS */}
        {activeSection === "Event Reports" && (
          <div>
            <h2>Event Reports & Student Feedback</h2>

            <p style={{ color: "#64748b" }}>
              Reports contain feedback actually submitted by students for
              events hosted by your account.
            </p>

            <button
              type="button"
              style={{ ...primaryButton, marginBottom: "20px" }}
              disabled={reportLoading}
              onClick={() => loadEventReports(getUserId(user))}
            >
              {reportLoading ? "Refreshing..." : "Refresh Reports"}
            </button>

            {reportLoading ? (
              <div style={cardStyle}>Loading event reports...</div>
            ) : reports.length === 0 ? (
              <div style={cardStyle}>
                <h3>No Hosted Event Reports</h3>
                <p>
                  Host an event first, then return here to view its report.
                </p>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "16px"
                  }}
                >
                  {[
                    [
                      "Events Hosted",
                      reportSummary.totalEventsHosted ?? reports.length
                    ],
                    [
                      "Active Registrations",
                      reportSummary.totalActiveRegistrations ??
                        reports.reduce(
                          (sum, item) =>
                            sum + Number(item.registrationCount || 0),
                          0
                        )
                    ],
                    ["Student Feedback", totalFeedback],
                    [
                      "Average Rating",
                      calculatedAverageRating === null
                        ? "No ratings yet"
                        : `${calculatedAverageRating} / 5`
                    ]
                  ].map(([title, value]) => (
                    <div key={title} style={cardStyle}>
                      <p style={{ color: "#64748b", marginTop: 0 }}>
                        {title}
                      </p>
                      <h2 style={{ marginBottom: 0 }}>{value}</h2>
                    </div>
                  ))}
                </div>

                {reports.map((report, index) => {
                  const event = report.event || {};
                  const eventId = String(event._id || event.id || "");

                  const matchingFeedback = studentFeedback.filter(
                    (item) => String(item.eventId || "") === eventId
                  );

                  const eventRatings = matchingFeedback
                    .map((item) => Number(item.rating))
                    .filter(
                      (rating) =>
                        Number.isFinite(rating) &&
                        rating >= 1 &&
                        rating <= 5
                    );

                  const eventAverage = eventRatings.length
                    ? (
                        eventRatings.reduce(
                          (sum, rating) => sum + rating,
                          0
                        ) / eventRatings.length
                      ).toFixed(2)
                    : null;

                  return (
                    <div key={eventId || index} style={cardStyle}>
                      <h3 style={{ marginTop: 0 }}>
                        {event.title || "Untitled Event"}
                      </h3>

                      <p>
                        <strong>Start:</strong> {formatDate(event.date)} at{" "}
                        {formatTime(event.time)}
                      </p>

                      <p>
                        <strong>End:</strong>{" "}
                        {formatDate(event.endDate || event.date)} at{" "}
                        {formatTime(event.endTime || event.time)}
                      </p>

                      <p>
                        <strong>Location:</strong>{" "}
                        {event.location || "Not specified"}
                      </p>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(150px, 1fr))",
                          gap: "12px",
                          margin: "18px 0"
                        }}
                      >
                        {[
                          [
                            "Active Registrations",
                            report.registrationCount ?? 0
                          ],
                          [
                            "Cancelled Registrations",
                            report.cancelledCount ?? 0
                          ],
                          ["Feedback Count", matchingFeedback.length],
                          [
                            "Average Rating",
                            eventAverage === null
                              ? "No ratings yet"
                              : `${eventAverage} / 5`
                          ]
                        ].map(([title, value]) => (
                          <div
                            key={title}
                            style={{
                              background: "#f1f5f9",
                              padding: "15px",
                              borderRadius: "8px"
                            }}
                          >
                            <strong>{title}</strong>
                            <h2 style={{ marginBottom: 0 }}>{value}</h2>
                          </div>
                        ))}
                      </div>

                      <h4>Student Ratings & Comments</h4>

                      {matchingFeedback.length === 0 ? (
                        <div
                          style={{
                            background: "#f8fafc",
                            padding: "16px",
                            borderRadius: "8px",
                            color: "#64748b"
                          }}
                        >
                          No student feedback is available for this event yet.
                        </div>
                      ) : (
                        matchingFeedback.map((feedback, feedbackIndex) => (
                          <div
                            key={
                              feedback._id ||
                              `${eventId}-${feedbackIndex}`
                            }
                            style={{
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              padding: "15px",
                              marginBottom: "12px",
                              background: "#f8fafc"
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "8px"
                              }}
                            >
                              <strong>
                                {feedback.studentId?.fullName || "Student"}
                              </strong>

                              {Number(feedback.rating) >= 1 &&
                                Number(feedback.rating) <= 5 && (
                                  <span
                                    style={{
                                      color: "#b45309",
                                      fontWeight: 700
                                    }}
                                  >
                                    {"★".repeat(Number(feedback.rating))}
                                    {"☆".repeat(
                                      5 - Number(feedback.rating)
                                    )}{" "}
                                    ({feedback.rating}/5)
                                  </span>
                                )}
                            </div>

                            {feedback.comments && (
                              <p style={{ whiteSpace: "pre-wrap" }}>
                                {feedback.comments}
                              </p>
                            )}

                            {Array.isArray(feedback.answers) &&
                              feedback.answers.map((answer, answerIndex) => (
                                <p key={answer._id || answerIndex}>
                                  <strong>
                                    {answer.question || "Answer"}:
                                  </strong>{" "}
                                  {String(answer.answer ?? "")}
                                </p>
                              ))}

                            {feedback.createdAt && (
                              <small style={{ color: "#64748b" }}>
                                Submitted:{" "}
                                {new Date(
                                  feedback.createdAt
                                ).toLocaleString()}
                              </small>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* NOTIFICATIONS */}
        {activeSection === "Notifications" && (
          <div>
            <h2>Notifications</h2>

            {notificationLoading ? (
              <div style={cardStyle}>Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div style={cardStyle}>
                <h3>🔔 No Notifications</h3>
                <p>You don't have any notifications yet.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id || notification.id}
                  style={{
                    ...cardStyle,
                    borderLeft: notification.read
                      ? "4px solid #cbd5e1"
                      : "4px solid #2563eb"
                  }}
                >
                  <h3>{notification.title || "🔔 Notification"}</h3>
                  <p>{notification.message}</p>

                  {notification.createdAt && (
                    <small>
                      {new Date(notification.createdAt).toLocaleString()}
                    </small>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ACCOUNT */}
        {activeSection === "Account" && (
          <div>
            <h2>Account</h2>

            <div style={cardStyle}>
              <h3>Account Information</h3>
              <p><strong>Name:</strong> {user.fullName}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {user.role}</p>
            </div>

            <div style={cardStyle}>
              <h3>Logout</h3>
              <p>Logout from your ReConnect Alumni account.</p>
              <button
                type="button"
                onClick={handleLogout}
                style={dangerButton}
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AlumniDashboard;