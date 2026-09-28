
import React, { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

const initialProfile = {
  phone: "",
  college: "",
  branch: "",
  year: "",
  skills: "",
  bio: ""
};

const initialEvent = {
  title: "",
  description: "",
  date: "",
  time: "",
  location: ""
};

const initialOpportunity = {
  title: "",
  company: "",
  type: "Job",
  description: "",
  location: "",
  link: ""
};

const navItems = [
  { name: "Dashboard", icon: "⌂" },
  { name: "My Profile", icon: "♙" },
  { name: "Mentorship", icon: "♧" },
  { name: "Opportunities", icon: "▣" },
  { name: "Events", icon: "▦" },
  { name: "Notifications", icon: "♢" },
  { name: "Account", icon: "⚙" }
];

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fc",
    color: "#18243b",
    fontFamily: "Inter, Arial, sans-serif"
  },
  sidebar: {
    position: "fixed",
    inset: "0 auto 0 0",
    width: "250px",
    background: "#fff",
    borderRight: "1px solid #e8edf5",
    padding: "24px 16px",
    display: "flex",
    flexDirection: "column",
    zIndex: 5,
    boxSizing: "border-box"
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "11px",
    padding: "5px 10px 28px"
  },
  brandIcon: {
    width: "42px",
    height: "42px",
    borderRadius: "14px",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontSize: "23px",
    fontWeight: 800,
    background: "linear-gradient(135deg,#3978f6,#7956e8)"
  },
  brandName: {
    fontSize: "21px",
    fontWeight: 800,
    letterSpacing: "-.5px",
    color: "#1e2b48"
  },
  navLabel: {
    color: "#9aa5b8",
    fontSize: "11px",
    fontWeight: 800,
    letterSpacing: "1.2px",
    padding: "0 12px",
    margin: "5px 0 12px"
  },
  main: {
    marginLeft: "250px",
    padding: "28px 34px 50px",
    maxWidth: "1600px",
    boxSizing: "border-box"
  },
  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "24px",
    flexWrap: "wrap"
  },
  card: {
    background: "#fff",
    border: "1px solid #edf0f6",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 5px 22px rgba(27,46,89,.045)",
    marginBottom: "20px",
    minWidth: 0
  },
  heading: {
    fontSize: "23px",
    fontWeight: 800,
    letterSpacing: "-.5px",
    margin: "0 0 7px",
    color: "#1c2944"
  },
  muted: {
    color: "#7b879b",
    fontSize: "14px",
    lineHeight: 1.65
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #dfe5ef",
    borderRadius: "10px",
    background: "#fff",
    color: "#24324b",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    marginTop: "7px"
  },
  label: {
    display: "block",
    color: "#485671",
    fontWeight: 700,
    fontSize: "13px",
    marginBottom: "15px"
  },
  primary: {
    border: 0,
    borderRadius: "10px",
    padding: "12px 18px",
    background: "linear-gradient(135deg,#3978f6,#7257e8)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 5px 12px rgba(75,101,230,.18)"
  },
  secondary: {
    border: "1px solid #dce5f4",
    borderRadius: "10px",
    padding: "10px 15px",
    background: "#f7f9ff",
    color: "#4263b4",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer"
  },
  danger: {
    border: "1px solid #ffd9df",
    borderRadius: "10px",
    padding: "10px 15px",
    background: "#fff3f4",
    color: "#c43c52",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer"
  }
};

function getUserId(currentUser) {
  return currentUser?._id || currentUser?.id || currentUser?.userId || null;
}

function getList(data, key) {
  return Array.isArray(data) ? data : data?.[key] || [];
}

function formatDate(date) {
  if (!date) return "Date not specified";
  const parsed = new Date(date + "T00:00:00");
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
}

function Field({ label, name, value, onChange, placeholder, type = "text", required = false }) {
  return (
    <label style={styles.label}>
      {label}
      <input
        style={styles.input}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder || label}
        required={required}
      />
    </label>
  );
}

function EmptyState({ title, description }) {
  return (
    <div style={{ ...styles.card, textAlign: "center", padding: "38px 20px" }}>
      <div style={{ fontSize: "32px", marginBottom: "10px" }}>✦</div>
      <h3 style={{ margin: "0 0 7px", color: "#273653" }}>{title}</h3>
      <p style={{ ...styles.muted, margin: 0 }}>{description}</p>
    </div>
  );
}

function AlumniDashboard() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [profile, setProfile] = useState(initialProfile);
  const [events, setEvents] = useState([]);
  const [mentorships, setMentorships] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [eventForm, setEventForm] = useState(initialEvent);
  const [opportunityForm, setOpportunityForm] = useState(initialOpportunity);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [loading, setLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const parsed = JSON.parse(savedUser);
      if (!getUserId(parsed)) {
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }
      if (parsed.role && parsed.role !== "Alumni") {
        window.location.href =
          parsed.role === "Admin" ? "/admin-dashboard" : "/student-dashboard";
        return;
      }
      setUser(parsed);
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
  }, [user]);

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  async function loadProfile(userId) {
    try {
      const response = await fetch(`${API}/profile/${userId}`);
      if (!response.ok) return;
      const data = await response.json();
      const p = data.profile || data;
      setProfile({
        phone: p.phone || "",
        college: p.college || "",
        branch: p.branch || "",
        year: p.year || "",
        skills: p.skills || "",
        bio: p.bio || ""
      });
    } catch (error) {
      console.error("Profile loading error:", error);
    }
  }

  async function loadMentorships(userId) {
    try {
      const response = await fetch(`${API}/mentorship/alumni/${userId}`);
      if (!response.ok) return;
      setMentorships(getList(await response.json(), "mentorships"));
    } catch (error) {
      console.error("Mentorship loading error:", error);
    }
  }

  async function loadNotifications(userId) {
    try {
      setNotificationLoading(true);
      const response = await fetch(`${API}/notifications/${userId}`);
      if (!response.ok) {
        setNotifications([]);
        return;
      }
      setNotifications(getList(await response.json(), "notifications"));
    } catch (error) {
      console.error("Notification loading error:", error);
      setNotifications([]);
    } finally {
      setNotificationLoading(false);
    }
  }

  async function loadEvents() {
    try {
      const response = await fetch(`${API}/events`);
      if (!response.ok) return;
      setEvents(getList(await response.json(), "events"));
    } catch (error) {
      console.error("Event loading error:", error);
    }
  }

  async function loadOpportunities() {
    try {
      const response = await fetch(`${API}/opportunities`);
      if (!response.ok) return;
      setOpportunities(getList(await response.json(), "opportunities"));
    } catch (error) {
      console.error("Opportunity loading error:", error);
    }
  }

  function handleProfileChange(event) {
    setProfile((old) => ({ ...old, [event.target.name]: event.target.value }));
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    const userId = getUserId(user);
    if (!userId) return showMessage("Please login again.", "error");

    try {
      setLoading(true);
      const response = await fetch(`${API}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...profile })
      });
      const data = await response.json();
      if (!response.ok) {
        return showMessage(data.message || "Unable to save profile.", "error");
      }
      showMessage("Your profile has been saved.");
      await loadProfile(userId);
    } catch (error) {
      console.error("Profile save error:", error);
      showMessage("Cannot connect to the server.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function updateMentorship(mentorshipId, status) {
    try {
      setLoading(true);
      const response = await fetch(`${API}/mentorship/${mentorshipId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) {
        return showMessage(data.message || "Unable to update request.", "error");
      }
      showMessage(`Mentorship request ${status.toLowerCase()}.`);
      const id = getUserId(user);
      await loadMentorships(id);
      await loadNotifications(id);
    } catch (error) {
      console.error("Mentorship update error:", error);
      showMessage("Cannot connect to the server.", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleEventChange(event) {
    setEventForm((old) => ({ ...old, [event.target.name]: event.target.value }));
  }

  async function handleHostEvent(event) {
    event.preventDefault();
    const userId = getUserId(user);
    if (!userId) return showMessage("Please login again.", "error");

    try {
      setLoading(true);
      const response = await fetch(`${API}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...eventForm,
          title: eventForm.title.trim(),
          description: eventForm.description.trim(),
          location: eventForm.location.trim(),
          organizer: userId
        })
      });
      const data = await response.json();
      if (!response.ok) {
        return showMessage(data.message || "Unable to host event.", "error");
      }
      showMessage("Event hosted successfully.");
      setEventForm(initialEvent);
      await loadEvents();
      await loadNotifications(userId);
    } catch (error) {
      console.error("Host event error:", error);
      showMessage("Cannot connect to the server.", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleOpportunityChange(event) {
    setOpportunityForm((old) => ({ ...old, [event.target.name]: event.target.value }));
  }

  async function handleCreateOpportunity(event) {
    event.preventDefault();
    const userId = getUserId(user);
    if (!userId) return showMessage("Please login again.", "error");

    try {
      setLoading(true);
      const response = await fetch(`${API}/opportunities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...opportunityForm,
          title: opportunityForm.title.trim(),
          company: opportunityForm.company.trim(),
          description: opportunityForm.description.trim(),
          location: opportunityForm.location.trim(),
          link: opportunityForm.link.trim(),
          postedBy: userId
        })
      });
      const data = await response.json();
      if (!response.ok) {
        return showMessage(data.message || "Unable to post opportunity.", "error");
      }
      showMessage("Opportunity posted successfully.");
      setOpportunityForm(initialOpportunity);
      await loadOpportunities();
      await loadNotifications(userId);
    } catch (error) {
      console.error("Create opportunity error:", error);
      showMessage("Cannot connect to the server.", "error");
    } finally {
      setLoading(false);
    }
  }

  function openSection(section) {
    setActiveSection(section);
    setMessage("");
    setMobileMenu(false);
    const id = getUserId(user);
    if (!id) return;
    if (section === "My Profile") loadProfile(id);
    if (section === "Mentorship") loadMentorships(id);
    if (section === "Notifications") loadNotifications(id);
    if (section === "Events") loadEvents();
    if (section === "Opportunities") loadOpportunities();
  }

  function handleLogout() {
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#65738b" }}>
        Loading ReConnect...
      </div>
    );
  }

  const pendingRequests = mentorships.filter((item) => item.status === "Pending").length;
  const unreadNotifications = notifications.filter((item) => !item.read).length;

  const statCards = [
    { label: "Mentorship Requests", value: mentorships.length, icon: "♧", color: "#3978f6", bg: "#edf4ff" },
    { label: "Opportunities", value: opportunities.length, icon: "▣", color: "#8b5cf6", bg: "#f3edff" },
    { label: "Community Events", value: events.length, icon: "▦", color: "#0eaa88", bg: "#e9faf5" },
    { label: "Notifications", value: unreadNotifications, icon: "♢", color: "#ed9a25", bg: "#fff5e5" }
  ];

  const navButton = (item) => (
    <button
      key={item.name}
      type="button"
      onClick={() => openSection(item.name)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "13px",
        width: "100%",
        padding: "12px 13px",
        marginBottom: "5px",
        border: 0,
        borderRadius: "11px",
        cursor: "pointer",
        textAlign: "left",
        fontSize: "14px",
        fontWeight: activeSection === item.name ? 750 : 600,
        color: activeSection === item.name ? "#4169dc" : "#68758d",
        background: activeSection === item.name ? "#eef3ff" : "transparent"
      }}
    >
      <span style={{ fontSize: "19px", width: "22px", textAlign: "center" }}>{item.icon}</span>
      <span style={{ flex: 1 }}>{item.name}</span>
      {item.name === "Notifications" && unreadNotifications > 0 && (
        <span style={{ background: "#ef5268", color: "#fff", borderRadius: "20px", padding: "2px 7px", fontSize: "11px" }}>
          {unreadNotifications}
        </span>
      )}
    </button>
  );

  const sectionTitle = {
    Dashboard: ["Your alumni space", "Your contributions help students grow. Manage mentorship, opportunities and events from one place."],
    "My Profile": ["My Profile", "Keep your professional and academic information up to date."],
    Mentorship: ["Mentorship Requests", "Review requests and support students on their career journey."],
    Opportunities: ["Career Opportunities", "Share jobs, internships and other opportunities with the community."],
    Events: ["Events & Activities", "Host events and view activities shared with the ReConnect community."],
    Notifications: ["Notifications", "Stay informed about mentorship and community activity."],
    Account: ["Account Settings", "Review your account details and sign out securely."]
  }[activeSection];

  return (
    <div style={styles.page}>
      <style>{`
        * { box-sizing: border-box; }
        button, input, textarea, select { font-family: inherit; }
        button:disabled { opacity: .6; cursor: not-allowed !important; }
        input:focus, textarea:focus, select:focus {
          border-color: #7897f4 !important;
          box-shadow: 0 0 0 3px rgba(72,112,235,.10);
        }
        .alumni-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
        .alumni-form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0 16px; }
        .alumni-nav-toggle { display:none; }
        .alumni-sidebar-overlay { display:none; }
        .alumni-stat { transition:transform .18s ease, box-shadow .18s ease; }
        .alumni-stat:hover { transform:translateY(-3px); box-shadow:0 12px 28px rgba(27,46,89,.09) !important; }
        .alumni-action-row { display:flex; flex-wrap:wrap; gap:9px; }
        @media (max-width:1100px) {
          .alumni-grid { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
          .alumni-main { padding:24px !important; }
        }
        @media (max-width:760px) {
          .alumni-sidebar { transform:translateX(-100%); transition:transform .2s ease; }
          .alumni-sidebar.open { transform:translateX(0); }
          .alumni-main { margin-left:0 !important; width:100% !important; padding:18px 14px 35px !important; }
          .alumni-nav-toggle { display:inline-flex !important; }
          .alumni-sidebar-overlay.open { display:block; position:fixed; inset:0; background:rgba(16,28,52,.38); z-index:4; }
          .alumni-form-grid { grid-template-columns:1fr; }
          .alumni-grid { grid-template-columns:1fr 1fr !important; gap:10px !important; }
          .alumni-hero { padding:23px !important; }
        }
        @media (max-width:420px) {
          .alumni-grid { grid-template-columns:1fr !important; }
        }
      `}</style>

      <div
        className={`alumni-sidebar-overlay ${mobileMenu ? "open" : ""}`}
        onClick={() => setMobileMenu(false)}
      />

      <aside className={`alumni-sidebar ${mobileMenu ? "open" : ""}`} style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>R</div>
          <div>
            <div style={styles.brandName}>ReConnect</div>
            <div style={{ color: "#8b96aa", fontSize: "11px", marginTop: "2px" }}>Alumni Portal</div>
          </div>
        </div>

        <div style={styles.navLabel}>WORKSPACE</div>
        <nav style={{ flex: 1 }}>
          {navItems.map(navButton)}
        </nav>

        <div style={{ borderTop: "1px solid #edf0f6", paddingTop: "17px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 8px 14px" }}>
            <div style={{
              width: "38px", height: "38px", borderRadius: "50%",
              background: "linear-gradient(135deg,#3978f6,#7956e8)",
              display: "grid", placeItems: "center", color: "#fff", fontWeight: 800
            }}>
              {(user.fullName || "A").charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: 750, color: "#293653", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.fullName || "Alumni"}
              </div>
              <div style={{ fontSize: "11px", color: "#929db0", marginTop: "3px" }}>Alumni Member</div>
            </div>
          </div>
          <button type="button" onClick={handleLogout} style={{ ...styles.danger, width: "100%" }}>
            ↪ &nbsp; Sign out
          </button>
        </div>
      </aside>

      <main className="alumni-main" style={{ ...styles.main, width: "calc(100% - 250px)" }}>
        <header style={styles.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              className="alumni-nav-toggle"
              type="button"
              onClick={() => setMobileMenu(true)}
              style={{ ...styles.secondary, fontSize: "19px", padding: "8px 12px" }}
              aria-label="Open navigation"
            >
              ☰
            </button>
            <div>
              <div style={{ fontSize: "12px", color: "#929db0", marginBottom: "4px" }}>ReConnect / Alumni</div>
              <div style={{ fontSize: "19px", fontWeight: 800, color: "#26334e" }}>{activeSection}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={() => openSection("Notifications")}
              style={{ ...styles.secondary, position: "relative", padding: "10px 13px", fontSize: "17px" }}
              aria-label="View notifications"
            >
              ♢
              {unreadNotifications > 0 && (
                <span style={{ position: "absolute", top: "-5px", right: "-5px", width: "10px", height: "10px", borderRadius: "50%", background: "#ef5268", border: "2px solid white" }} />
              )}
            </button>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "13px", fontWeight: 750, color: "#293653" }}>{user.fullName || "Alumni"}</div>
              <div style={{ fontSize: "11px", color: "#929db0" }}>Alumni account</div>
            </div>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "#e8edff", color: "#526bd2", display: "grid", placeItems: "center", fontWeight: 800 }}>
              {(user.fullName || "A").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {message && (
          <div role="status" style={{
            padding: "13px 16px",
            borderRadius: "12px",
            marginBottom: "18px",
            border: `1px solid ${messageType === "error" ? "#ffcbd2" : "#b9ecd5"}`,
            background: messageType === "error" ? "#fff1f2" : "#edfff6",
            color: messageType === "error" ? "#b4233a" : "#14784e",
            fontSize: "14px",
            fontWeight: 600
          }}>
            {message}
            <button type="button" onClick={() => setMessage("")} style={{ float: "right", border: 0, background: "transparent", color: "inherit", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {activeSection === "Dashboard" && (
          <>
            <section className="alumni-hero" style={{
              ...styles.card,
              padding: "31px",
              border: 0,
              color: "#fff",
              background: "linear-gradient(115deg,#3476ed 0%,#5366e8 52%,#8056df 100%)",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{ position: "absolute", width: "230px", height: "230px", borderRadius: "50%", border: "1px solid rgba(255,255,255,.13)", right: "8%", top: "-135px" }} />
              <div style={{ position: "absolute", width: "180px", height: "180px", borderRadius: "50%", background: "rgba(255,255,255,.06)", right: "-35px", bottom: "-100px" }} />
              <div style={{ position: "relative", maxWidth: "700px" }}>
                <div style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "1.4px", opacity: .8, marginBottom: "12px" }}>ALUMNI COMMUNITY</div>
                <h1 style={{ fontSize: "clamp(25px,3vw,34px)", lineHeight: 1.2, margin: "0 0 12px", fontWeight: 850 }}>
                  Welcome back, {user.fullName?.split(" ")[0] || "Alumni"}!
                </h1>
                <p style={{ fontSize: "14px", lineHeight: 1.7, opacity: .91, maxWidth: "610px", margin: "0 0 21px" }}>
                  Your experience can make a difference. Mentor students, share career opportunities and bring the community together through events.
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => openSection("Mentorship")} style={{ ...styles.primary, background: "#fff", color: "#4268d9", boxShadow: "none" }}>
                    View mentorship requests →
                  </button>
                  <button type="button" onClick={() => openSection("My Profile")} style={{ border: "1px solid rgba(255,255,255,.55)", borderRadius: "10px", padding: "11px 16px", background: "rgba(255,255,255,.12)", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                    Update profile
                  </button>
                </div>
              </div>
            </section>

            <div className="alumni-grid" style={{ marginBottom: "22px" }}>
              {statCards.map((stat) => (
                <div className="alumni-stat" key={stat.label} style={{ ...styles.card, marginBottom: 0, padding: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span style={{ fontSize: "12px", color: "#7d899e", fontWeight: 700, lineHeight: 1.4 }}>{stat.label}</span>
                    <span style={{ width: "37px", height: "37px", borderRadius: "12px", background: stat.bg, color: stat.color, display: "grid", placeItems: "center", fontSize: "20px", flexShrink: 0 }}>{stat.icon}</span>
                  </div>
                  <div style={{ fontSize: "29px", fontWeight: 850, letterSpacing: "-1px", color: "#24324c", marginTop: "14px" }}>{stat.value}</div>
                  <div style={{ color: "#9aa5b6", fontSize: "11px", marginTop: "3px" }}>
                    {stat.label === "Mentorship Requests" ? `${pendingRequests} awaiting response` : stat.label === "Notifications" ? "Unread updates" : "Available in community"}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "18px" }}>
              <div style={styles.card}>
                <h2 style={{ ...styles.heading, fontSize: "18px" }}>Quick actions</h2>
                <p style={{ ...styles.muted, marginTop: 0 }}>Continue contributing to your alumni network.</p>
                {[
                  ["♧", "Respond to mentorship", "Review student requests", "Mentorship"],
                  ["▣", "Share an opportunity", "Post a job or internship", "Opportunities"],
                  ["▦", "Host a community event", "Create an alumni activity", "Events"]
                ].map(([icon, title, subtitle, section]) => (
                  <button key={section} type="button" onClick={() => openSection(section)} style={{
                    display: "flex", alignItems: "center", gap: "12px", width: "100%", textAlign: "left",
                    padding: "13px 10px", border: 0, borderTop: "1px solid #f0f2f7", background: "#fff", cursor: "pointer"
                  }}>
                    <span style={{ width: "38px", height: "38px", borderRadius: "11px", background: "#eff3ff", color: "#5874dc", display: "grid", placeItems: "center", fontSize: "20px" }}>{icon}</span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontSize: "13px", fontWeight: 750, color: "#2c3953" }}>{title}</span>
                      <span style={{ display: "block", fontSize: "11px", color: "#8b97aa", marginTop: "4px" }}>{subtitle}</span>
                    </span>
                    <span style={{ color: "#9aa5b6" }}>›</span>
                  </button>
                ))}
              </div>

              <div style={styles.card}>
                <h2 style={{ ...styles.heading, fontSize: "18px" }}>Your community activity</h2>
                <p style={{ ...styles.muted, marginTop: 0 }}>A quick look at the latest items.</p>
                {[
                  { label: "Mentorship requests", value: mentorships.length, color: "#3978f6" },
                  { label: "Opportunities shared", value: opportunities.length, color: "#8b5cf6" },
                  { label: "Events listed", value: events.length, color: "#0eaa88" }
                ].map((item) => (
                  <div key={item.label} style={{ margin: "20px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "13px", fontWeight: 700, marginBottom: "9px" }}>
                      <span style={{ color: "#526078" }}>{item.label}</span>
                      <span style={{ color: item.color }}>{item.value}</span>
                    </div>
                    <div style={{ height: "7px", borderRadius: "20px", background: "#edf0f6", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(item.value * 12, 100)}%`, background: item.color, borderRadius: "20px" }} />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => openSection("Notifications")} style={{ ...styles.secondary, width: "100%", marginTop: "4px" }}>
                  Check notifications →
                </button>
              </div>
            </div>
          </>
        )}

        {activeSection === "My Profile" && (
          <>
            <div style={{ marginBottom: "18px" }}>
              <h1 style={styles.heading}>{sectionTitle[0]}</h1>
              <p style={{ ...styles.muted, margin: 0 }}>{sectionTitle[1]}</p>
            </div>
            <div style={styles.card}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", paddingBottom: "20px", borderBottom: "1px solid #edf0f6", marginBottom: "22px" }}>
                <div style={{ width: "58px", height: "58px", borderRadius: "18px", background: "linear-gradient(135deg,#3978f6,#7956e8)", color: "#fff", display: "grid", placeItems: "center", fontSize: "24px", fontWeight: 800 }}>
                  {(user.fullName || "A").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ margin: "0 0 5px", fontSize: "18px", color: "#26334e" }}>{user.fullName}</h2>
                  <div style={{ color: "#8390a5", fontSize: "13px" }}>{user.email}</div>
                  <span style={{ display: "inline-block", marginTop: "7px", color: "#4770d9", background: "#eef3ff", borderRadius: "20px", padding: "4px 9px", fontSize: "11px", fontWeight: 750 }}>Alumni member</span>
                </div>
              </div>
              <h3 style={{ fontSize: "16px", margin: "0 0 17px", color: "#2b3954" }}>Professional & academic details</h3>
              <form onSubmit={handleSaveProfile}>
                <div className="alumni-form-grid">
                  <Field label="Phone number" name="phone" value={profile.phone} onChange={handleProfileChange} placeholder="Enter phone number" />
                  <Field label="College / University" name="college" value={profile.college} onChange={handleProfileChange} placeholder="Your college" />
                  <Field label="Branch / Department" name="branch" value={profile.branch} onChange={handleProfileChange} placeholder="e.g. Information Technology" />
                  <Field label="Graduation year" name="year" value={profile.year} onChange={handleProfileChange} placeholder="e.g. 2023" />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Skills" name="skills" value={profile.skills} onChange={handleProfileChange} placeholder="e.g. Java, Python, React, Data Analysis" />
                  </div>
                </div>
                <label style={styles.label}>
                  About me
                  <textarea
                    name="bio"
                    rows="5"
                    value={profile.bio}
                    onChange={handleProfileChange}
                    placeholder="Write a short introduction about your experience and interests..."
                    style={{ ...styles.input, resize: "vertical", lineHeight: 1.6 }}
                  />
                </label>
                <button type="submit" disabled={loading} style={styles.primary}>
                  {loading ? "Saving..." : "Save profile"}
                </button>
              </form>
            </div>
          </>
        )}

        {activeSection === "Mentorship" && (
          <>
            <div style={{ marginBottom: "18px" }}>
              <h1 style={styles.heading}>{sectionTitle[0]}</h1>
              <p style={{ ...styles.muted, margin: 0 }}>{sectionTitle[1]}</p>
            </div>
            {mentorships.length === 0 ? (
              <EmptyState title="No mentorship requests yet" description="Student requests will appear here when they connect with you." />
            ) : mentorships.map((request) => (
              <div key={request._id} style={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: "13px", alignItems: "center" }}>
                    <div style={{ width: "45px", height: "45px", borderRadius: "14px", background: "#edf3ff", color: "#4d70d9", display: "grid", placeItems: "center", fontSize: "20px" }}>♙</div>
                    <div>
                      <h3 style={{ margin: "0 0 5px", fontSize: "16px", color: "#293752" }}>{request.studentId?.fullName || "Student"}</h3>
                      <div style={{ color: "#8390a5", fontSize: "13px" }}>{request.studentId?.email || "Email not available"}</div>
                    </div>
                  </div>
                  <span style={{
                    borderRadius: "20px", padding: "6px 11px", fontSize: "11px", fontWeight: 800,
                    background: request.status === "Accepted" ? "#e8f9f0" : request.status === "Rejected" ? "#fff0f1" : "#fff6e7",
                    color: request.status === "Accepted" ? "#16824f" : request.status === "Rejected" ? "#c23c50" : "#a66b12"
                  }}>{request.status || "Pending"}</span>
                </div>
                <div style={{ marginTop: "16px", borderTop: "1px solid #f0f2f7", paddingTop: "14px" }}>
                  <div style={{ color: "#8792a5", fontSize: "12px" }}>Request received</div>
                  <div style={{ color: "#526078", fontSize: "13px", marginTop: "4px" }}>
                    {request.createdAt ? new Date(request.createdAt).toLocaleString() : "Date not available"}
                  </div>
                </div>
                {request.status === "Pending" && (
                  <div className="alumni-action-row" style={{ marginTop: "16px" }}>
                    <button type="button" disabled={loading} onClick={() => updateMentorship(request._id, "Accepted")} style={styles.primary}>Accept request</button>
                    <button type="button" disabled={loading} onClick={() => updateMentorship(request._id, "Rejected")} style={styles.danger}>Decline</button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {activeSection === "Opportunities" && (
          <>
            <div style={{ marginBottom: "18px" }}>
              <h1 style={styles.heading}>{sectionTitle[0]}</h1>
              <p style={{ ...styles.muted, margin: 0 }}>{sectionTitle[1]}</p>
            </div>
            <div style={styles.card}>
              <h2 style={{ ...styles.heading, fontSize: "18px" }}>Post a new opportunity</h2>
              <p style={{ ...styles.muted, marginTop: 0 }}>Provide details so students can learn about the opportunity.</p>
              <form onSubmit={handleCreateOpportunity}>
                <div className="alumni-form-grid">
                  <Field label="Opportunity title" name="title" value={opportunityForm.title} onChange={handleOpportunityChange} placeholder="e.g. Software Developer Intern" required />
                  <Field label="Company" name="company" value={opportunityForm.company} onChange={handleOpportunityChange} placeholder="Company name" required />
                  <label style={styles.label}>
                    Opportunity type
                    <select name="type" value={opportunityForm.type} onChange={handleOpportunityChange} style={styles.input}>
                      <option value="Job">Job</option>
                      <option value="Internship">Internship</option>
                      <option value="Scholarship">Scholarship</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>
                  <Field label="Location" name="location" value={opportunityForm.location} onChange={handleOpportunityChange} placeholder="e.g. Pune / Remote" />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <Field label="Application link" name="link" value={opportunityForm.link} onChange={handleOpportunityChange} placeholder="https://..." />
                  </div>
                </div>
                <label style={styles.label}>
                  Description
                  <textarea name="description" rows="4" value={opportunityForm.description} onChange={handleOpportunityChange} placeholder="Describe the role, requirements and application details..." style={{ ...styles.input, resize: "vertical" }} />
                </label>
                <button type="submit" disabled={loading} style={styles.primary}>{loading ? "Posting..." : "＋ Post opportunity"}</button>
              </form>
            </div>

            <h2 style={{ ...styles.heading, fontSize: "18px", margin: "25px 0 15px" }}>Community opportunities</h2>
            {opportunities.length === 0 ? (
              <EmptyState title="No opportunities available" description="Opportunities posted by alumni will appear here." />
            ) : opportunities.map((item) => (
              <div key={item._id} style={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: "0 0 7px", color: "#293752", fontSize: "17px" }}>{item.title}</h3>
                    <div style={{ color: "#65738b", fontSize: "13px", fontWeight: 650 }}>{item.company || "Company not specified"}</div>
                  </div>
                  <span style={{ alignSelf: "flex-start", padding: "6px 10px", borderRadius: "20px", background: "#f0edff", color: "#7554cb", fontSize: "11px", fontWeight: 800 }}>{item.type || "Opportunity"}</span>
                </div>
                <p style={{ ...styles.muted, margin: "14px 0" }}>{item.description || "No description provided."}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", color: "#77849a", fontSize: "12px", marginBottom: "13px" }}>
                  <span>⌖ {item.location || "Location not specified"}</span>
                  {item.createdAt && <span>◷ {new Date(item.createdAt).toLocaleDateString()}</span>}
                </div>
                {item.link && (
                  <a href={item.link} target="_blank" rel="noreferrer" style={{ display: "inline-block", color: "#426de0", fontSize: "13px", fontWeight: 750, textDecoration: "none" }}>
                    View / Apply ↗
                  </a>
                )}
              </div>
            ))}
            <div style={{ padding: "13px 16px", borderRadius: "12px", background: "#fff8e9", color: "#94651c", fontSize: "12px", border: "1px solid #ffebc2" }}>
              Opportunity removal is managed by the Admin.
            </div>
          </>
        )}

        {activeSection === "Events" && (
          <>
            <div style={{ marginBottom: "18px" }}>
              <h1 style={styles.heading}>{sectionTitle[0]}</h1>
              <p style={{ ...styles.muted, margin: 0 }}>{sectionTitle[1]}</p>
            </div>
            <div style={styles.card}>
              <h2 style={{ ...styles.heading, fontSize: "18px" }}>Host an event</h2>
              <p style={{ ...styles.muted, marginTop: 0 }}>Create a networking, mentoring or alumni community event.</p>
              <form onSubmit={handleHostEvent}>
                <div className="alumni-form-grid">
                  <Field label="Event title" name="title" value={eventForm.title} onChange={handleEventChange} placeholder="Enter event name" required />
                  <Field label="Location" name="location" value={eventForm.location} onChange={handleEventChange} placeholder="Venue or online" />
                  <Field label="Event date" name="date" type="date" value={eventForm.date} onChange={handleEventChange} required />
                  <Field label="Event time" name="time" type="time" value={eventForm.time} onChange={handleEventChange} required />
                </div>
                <label style={styles.label}>
                  Event description
                  <textarea name="description" rows="4" value={eventForm.description} onChange={handleEventChange} placeholder="Share the event agenda and details..." style={{ ...styles.input, resize: "vertical" }} />
                </label>
                <button type="submit" disabled={loading} style={styles.primary}>{loading ? "Creating..." : "＋ Host event"}</button>
              </form>
            </div>

            <h2 style={{ ...styles.heading, fontSize: "18px", margin: "25px 0 15px" }}>Community events</h2>
            {events.length === 0 ? (
              <EmptyState title="No events listed yet" description="Events created by alumni will appear here." />
            ) : events.map((item) => (
              <div key={item._id} style={styles.card}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "15px" }}>
                  <div style={{ minWidth: "61px", padding: "10px 5px", borderRadius: "13px", background: "#eef3ff", textAlign: "center", color: "#4a6bd4" }}>
                    <div style={{ fontSize: "11px", fontWeight: 800 }}>{item.date ? new Date(item.date + "T00:00:00").toLocaleDateString("en-IN", { month: "short" }).toUpperCase() : "EVENT"}</div>
                    <div style={{ fontSize: "22px", fontWeight: 850 }}>{item.date ? new Date(item.date + "T00:00:00").getDate() : "—"}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: "0 0 7px", color: "#293752", fontSize: "17px" }}>{item.title}</h3>
                    <p style={{ ...styles.muted, margin: "0 0 12px" }}>{item.description || "No description provided."}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "12px", color: "#77849a" }}>
                      <span>◷ {item.time || "Time not specified"}</span>
                      <span>⌖ {item.location || "Location not specified"}</span>
                    </div>
                    <div style={{ color: "#8b96a9", fontSize: "12px", marginTop: "10px" }}>Hosted by {item.organizer?.fullName || "Alumni"}</div>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ padding: "13px 16px", borderRadius: "12px", background: "#fff8e9", color: "#94651c", fontSize: "12px", border: "1px solid #ffebc2" }}>
              Event removal is managed by the Admin.
            </div>
          </>
        )}

        {activeSection === "Notifications" && (
          <>
            <div style={{ marginBottom: "18px" }}>
              <h1 style={styles.heading}>{sectionTitle[0]}</h1>
              <p style={{ ...styles.muted, margin: 0 }}>{sectionTitle[1]}</p>
            </div>
            {notificationLoading ? (
              <div style={styles.card}>Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <EmptyState title="You're all caught up" description="New updates and activity notifications will appear here." />
            ) : notifications.map((item) => (
              <div key={item._id} style={{ ...styles.card, borderLeft: `4px solid ${item.read ? "#d8deea" : "#5276e6"}` }}>
                <div style={{ display: "flex", gap: "13px", alignItems: "flex-start" }}>
                  <div style={{ width: "40px", height: "40px", flexShrink: 0, borderRadius: "12px", background: item.read ? "#f1f3f8" : "#edf3ff", display: "grid", placeItems: "center", color: "#5574d8", fontSize: "19px" }}>♢</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                      <h3 style={{ margin: "2px 0 7px", color: "#293752", fontSize: "15px" }}>
                        {item.title || ({
                          MENTORSHIP_REQUEST: "New mentorship request",
                          MENTORSHIP_APPROVED: "Mentorship accepted",
                          MENTORSHIP_REJECTED: "Mentorship update",
                          OPPORTUNITY: "New opportunity",
                          EVENT: "Community event",
                          ACCOUNT: "Account update"
                        }[item.type] || "ReConnect notification")}
                      </h3>
                      {!item.read && <span style={{ color: "#4770d9", fontSize: "11px", fontWeight: 800 }}>NEW</span>}
                    </div>
                    <p style={{ ...styles.muted, margin: "0 0 9px" }}>{item.message}</p>
                    {item.createdAt && <div style={{ color: "#9aa4b5", fontSize: "11px" }}>{new Date(item.createdAt).toLocaleString()}</div>}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {activeSection === "Account" && (
          <>
            <div style={{ marginBottom: "18px" }}>
              <h1 style={styles.heading}>{sectionTitle[0]}</h1>
              <p style={{ ...styles.muted, margin: 0 }}>{sectionTitle[1]}</p>
            </div>
            <div style={styles.card}>
              <div style={{ display: "flex", alignItems: "center", gap: "15px", paddingBottom: "20px", borderBottom: "1px solid #edf0f6" }}>
                <div style={{ width: "60px", height: "60px", borderRadius: "18px", background: "linear-gradient(135deg,#3978f6,#7956e8)", color: "#fff", display: "grid", placeItems: "center", fontSize: "24px", fontWeight: 800 }}>
                  {(user.fullName || "A").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ margin: "0 0 5px", fontSize: "18px", color: "#293752" }}>{user.fullName}</h2>
                  <div style={{ color: "#8390a5", fontSize: "13px" }}>{user.email}</div>
                </div>
              </div>
              <div style={{ padding: "20px 0" }}>
                {[
                  ["Full name", user.fullName || "Not available"],
                  ["Email address", user.email || "Not available"],
                  ["Account role", user.role || "Alumni"],
                  ["Account status", user.status || "Approved"]
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: "15px", padding: "13px 0", borderBottom: "1px solid #f1f3f7", flexWrap: "wrap" }}>
                    <span style={{ color: "#8390a5", fontSize: "13px" }}>{label}</span>
                    <span style={{ color: "#34415b", fontSize: "13px", fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...styles.card, borderColor: "#ffe0e4" }}>
              <h2 style={{ ...styles.heading, fontSize: "18px" }}>Sign out</h2>
              <p style={{ ...styles.muted }}>Sign out of your ReConnect Alumni account on this device.</p>
              <button type="button" onClick={handleLogout} style={styles.danger}>↪ &nbsp; Logout</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AlumniDashboard;