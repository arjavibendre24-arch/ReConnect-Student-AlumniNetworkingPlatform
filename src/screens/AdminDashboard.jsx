
import { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

const sections = [
  { name: "Dashboard", icon: "⌂" },
  { name: "Validate Users", icon: "✓" },
  { name: "Manage Users", icon: "♙" },
  { name: "Mentorship Requests", icon: "◎" },
  { name: "Opportunities", icon: "▣" },
  { name: "Events", icon: "▦" },
  { name: "Notifications", icon: "♧" },
  { name: "Generate Reports", icon: "▤" }
];

const colors = {
  blue: "#4169e1",
  purple: "#7654d6",
  green: "#159c78",
  orange: "#e99536",
  red: "#dc4c58",
  ink: "#202b45",
  muted: "#77839b",
  border: "#e8edf5",
  bg: "#f4f7fc"
};

export default function AdminDashboard() {
  const [section, setSection] = useState("Dashboard");
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [mentorships, setMentorships] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const adminName = storedUser.fullName || "Administrator";

  const card = {
    background: "#fff",
    border: `1px solid ${colors.border}`,
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 5px 22px rgba(35,55,95,.045)"
  };

  const button = {
    border: 0,
    borderRadius: 10,
    padding: "10px 15px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
    transition: "all .2s"
  };

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }
    return data;
  }

  async function loadStats() {
    const data = await request("/admin/stats");
    setStats(data);
  }

  async function loadUsers() {
    const data = await request("/admin/users");
    setUsers(Array.isArray(data) ? data : []);
  }

  async function loadMentorships() {
    const data = await request("/admin/mentorships");
    setMentorships(Array.isArray(data) ? data : []);
  }

  async function loadOpportunities() {
    const data = await request("/admin/opportunities");
    setOpportunities(Array.isArray(data) ? data : []);
  }

  async function loadEvents() {
    const data = await request("/admin/events");
    setEvents(Array.isArray(data) ? data : []);
  }

  async function loadNotifications() {
    const data = await request("/admin/notifications");
    setNotifications(Array.isArray(data) ? data : []);
  }

  async function loadAll() {
    setLoading(true);
    setMessage("");
    try {
      await Promise.all([
        loadStats(),
        loadUsers(),
        loadMentorships(),
        loadOpportunities(),
        loadEvents(),
        loadNotifications()
      ]);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function perform(action, successText) {
    setMessage("");
    try {
      await action();
      setMessage(successText);
      await loadAll();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateStatus(id, status) {
    await perform(
      () => request(`/admin/users/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status })
      }),
      `User ${status.toLowerCase()} successfully.`
    );
  }

  async function deleteItem(path, label) {
    if (!window.confirm(`Are you sure you want to delete ${label}?`)) return;
    await perform(
      () => request(path, { method: "DELETE" }),
      `${label} deleted successfully.`
    );
  }

  function logout() {
    localStorage.removeItem("user");
    window.location.href = "/";
  }

  const filteredUsers = users.filter((user) => {
    const matchesFilter =
      filter === "All" || user.status === filter || user.role === filter;
    const query = search.toLowerCase();
    const matchesSearch =
      !query ||
      user.fullName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  function badge(value) {
    const status = value || "Approved";
    const palette = {
      Pending: ["#fff3d9", "#9b6500"],
      Approved: ["#e2f7ed", "#13764f"],
      Rejected: ["#ffeaec", "#b52d3b"],
      Student: ["#e8efff", "#365bc1"],
      Alumni: ["#f0e9ff", "#7046bd"],
      Admin: ["#e8edf3", "#536176"],
      Accepted: ["#e2f7ed", "#13764f"]
    };
    const [background, color] = palette[status] || ["#edf1f7", "#536176"];
    return (
      <span style={{
        display: "inline-block",
        background,
        color,
        padding: "5px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: "nowrap"
      }}>
        {status}
      </span>
    );
  }

  function statCard(label, value, icon, color, note) {
    return (
      <div style={{
        ...card,
        position: "relative",
        overflow: "hidden",
        minWidth: 0
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10
        }}>
          <span style={{ color: colors.muted, fontSize: 13, fontWeight: 700 }}>
            {label}
          </span>
          <span style={{
            width: 43,
            height: 43,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            background: `${color}18`,
            color,
            fontSize: 22,
            fontWeight: 800
          }}>{icon}</span>
        </div>
        <div style={{
          color: colors.ink,
          fontSize: 31,
          fontWeight: 850,
          marginTop: 15,
          letterSpacing: "-1px"
        }}>{value ?? 0}</div>
        <div style={{ color: colors.muted, fontSize: 12, marginTop: 5 }}>
          {note}
        </div>
        <div style={{
          position: "absolute",
          bottom: -28,
          right: -22,
          width: 90,
          height: 90,
          borderRadius: "50%",
          background: `${color}09`
        }} />
      </div>
    );
  }

  function pageHeading(title, subtitle, action) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 14,
        marginBottom: 23
      }}>
        <div>
          <h1 style={{
            color: colors.ink,
            fontSize: 25,
            margin: "0 0 7px",
            fontWeight: 850
          }}>{title}</h1>
          <p style={{ color: colors.muted, margin: 0, fontSize: 13 }}>
            {subtitle}
          </p>
        </div>
        {action}
      </div>
    );
  }

  function refreshButton(onClick, label = "Refresh") {
    return (
      <button style={{
        ...button,
        color: colors.blue,
        background: "#eaf0ff",
        border: "1px solid #dce6ff"
      }} onClick={onClick}>
        ↻ {label}
      </button>
    );
  }

  function userTable(list, showApproval = false) {
    if (!list.length) {
      return <div style={{ ...card, textAlign: "center", color: colors.muted }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>♙</div>
        No users found.
      </div>;
    }

    return (
      <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              {["User", "Email", "Role", "Status", "Registered", "Actions"].map((heading) =>
                <th key={heading} style={{
                  padding: "15px 16px",
                  textAlign: "left",
                  background: "#f7f9fd",
                  color: colors.muted,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: ".5px",
                  borderBottom: `1px solid ${colors.border}`
                }}>{heading}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {list.map((user) => (
              <tr key={user._id}>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 12,
                      display: "grid", placeItems: "center",
                      background: "#eaf0ff", color: colors.blue,
                      fontWeight: 800
                    }}>{(user.fullName || "U").charAt(0).toUpperCase()}</div>
                    <strong style={{ color: colors.ink }}>{user.fullName}</strong>
                  </div>
                </td>
                <td style={td}>{user.email}</td>
                <td style={td}>{badge(user.role)}</td>
                <td style={td}>{badge(user.status)}</td>
                <td style={td}>{user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "—"}</td>
                <td style={td}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {showApproval && user.status === "Pending" && <>
                      <button style={{ ...button, background: "#e2f7ed", color: "#13764f", padding: "7px 10px" }}
                        onClick={() => updateStatus(user._id, "Approved")}>Approve</button>
                      <button style={{ ...button, background: "#ffeaec", color: "#b52d3b", padding: "7px 10px" }}
                        onClick={() => updateStatus(user._id, "Rejected")}>Reject</button>
                    </>}
                    {user.role !== "Admin" && (
                      <button style={{ ...button, background: "#fff0f1", color: "#b52d3b", padding: "7px 10px" }}
                        onClick={() => deleteItem(`/admin/users/${user._id}`, user.fullName || "this user")}>
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const td = {
    padding: "14px 16px",
    borderBottom: `1px solid ${colors.border}`,
    color: "#536078",
    fontSize: 12,
    verticalAlign: "middle"
  };

  function contentCard(title, children, action) {
    return (
      <div style={{ ...card, marginBottom: 15 }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 17
        }}>
          <h3 style={{ margin: 0, color: colors.ink, fontSize: 16 }}>{title}</h3>
          {action}
        </div>
        {children}
      </div>
    );
  }

  function recordCard(title, details, onDelete, buttonText = "Delete") {
    return (
      <div key={title + details.join("|")} style={{
        ...card,
        padding: 19,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        flexWrap: "wrap"
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={{ margin: "0 0 10px", color: colors.ink, fontSize: 16 }}>{title}</h3>
          {details.map((detail, i) => (
            <p key={i} style={{ color: colors.muted, fontSize: 13, margin: "6px 0", overflowWrap: "anywhere" }}>{detail}</p>
          ))}
        </div>
        <button style={{ ...button, background: "#fff0f1", color: "#b52d3b" }}
          onClick={onDelete}>{buttonText}</button>
      </div>
    );
  }

  function renderSection() {
    if (section === "Dashboard") {
      return <>
        <div style={{
          background: "linear-gradient(115deg,#4169e1,#7654d6)",
          color: "#fff",
          borderRadius: 22,
          padding: "27px 28px",
          marginBottom: 22,
          boxShadow: "0 12px 28px rgba(65,105,225,.18)",
          position: "relative",
          overflow: "hidden"
        }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 12, opacity: .85, marginBottom: 9 }}>ADMINISTRATION PANEL</div>
            <h1 style={{ fontSize: 26, margin: "0 0 9px", fontWeight: 850 }}>
              Welcome back, {adminName}!
            </h1>
            <p style={{ fontSize: 13, opacity: .9, margin: 0, maxWidth: 530, lineHeight: 1.6 }}>
              Manage users, review registrations, and monitor the ReConnect community from one place.
            </p>
          </div>
          <div style={{
            position: "absolute", right: -30, top: -65,
            width: 210, height: 210, border: "35px solid #ffffff16",
            borderRadius: "50%"
          }} />
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
          gap: 15,
          marginBottom: 22
        }}>
          {statCard("Total Users", stats.totalUsers, "♙", colors.blue, "Registered accounts")}
          {statCard("Students", stats.students, "▤", colors.purple, "Student accounts")}
          {statCard("Alumni", stats.alumni, "♧", colors.green, "Alumni accounts")}
          {statCard("Pending Approvals", stats.pendingApprovals, "◷", colors.orange, "Awaiting review")}
          {statCard("Mentorship Requests", stats.mentorshipRequests, "◎", "#0e9bb5", "Requests submitted")}
          {statCard("Opportunities", stats.opportunities, "▣", "#d17a35", "Shared opportunities")}
          {statCard("Events", stats.events, "▦", "#bd5a9b", "Community events")}
          {statCard("Notifications", stats.notifications, "♧", "#64748b", "System notifications")}
        </div>

        <div style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 15 }}>
          <div>
            <h3 style={{ margin: "0 0 5px", color: colors.ink }}>System overview</h3>
            <p style={{ margin: 0, color: colors.muted, fontSize: 13 }}>Refresh the latest platform information.</p>
          </div>
          {refreshButton(loadAll, "Refresh Dashboard")}
        </div>
      </>;
    }

    if (section === "Validate Users") {
      const pending = users.filter(user => user.status === "Pending");
      return <>
        {pageHeading("Validate Users", "Review and approve or reject student and alumni registrations.",
          refreshButton(loadUsers, "Refresh Users"))}
        <div style={{ ...card, marginBottom: 18, background: "#fff9eb", borderColor: "#f6e5bd" }}>
          <strong style={{ color: "#93610a" }}>{pending.length} pending registration(s)</strong>
          <p style={{ color: "#93610a", fontSize: 12, margin: "5px 0 0" }}>Review account details before approving access.</p>
        </div>
        {userTable(pending, true)}
      </>;
    }

    if (section === "Manage Users") {
      return <>
        {pageHeading("Manage Users", "Search, filter, review, and manage registered accounts.",
          refreshButton(loadUsers, "Refresh Users"))}
        <div style={{ ...card, marginBottom: 17, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={inputStyle} />
          <select value={filter} onChange={e => setFilter(e.target.value)} style={inputStyle}>
            {["All", "Student", "Alumni", "Admin", "Pending", "Approved", "Rejected"].map(item =>
              <option key={item}>{item}</option>)}
          </select>
        </div>
        {userTable(filteredUsers)}
      </>;
    }

    if (section === "Mentorship Requests") {
      return <>
        {pageHeading("Mentorship Requests", "Monitor student and alumni mentorship activity.",
          refreshButton(loadMentorships, "Refresh Requests"))}
        {mentorships.length ? (
          <div style={{ display: "grid", gap: 13 }}>
            {mentorships.map(item => (
              <div key={item._id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <h3 style={{ color: colors.ink, margin: "0 0 12px", fontSize: 16 }}>Mentorship connection</h3>
                    <p style={{ color: colors.muted, fontSize: 13 }}>Student: <strong>{item.studentId?.fullName || "Unknown"}</strong></p>
                    <p style={{ color: colors.muted, fontSize: 13 }}>Alumni: <strong>{item.alumniId?.fullName || "Unknown"}</strong></p>
                    <p style={{ color: colors.muted, fontSize: 12 }}>Date: {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}</p>
                  </div>
                  {badge(item.status)}
                </div>
              </div>
            ))}
          </div>
        ) : <div style={card}>No mentorship requests found.</div>}
      </>;
    }

    if (section === "Opportunities") {
      return <>
        {pageHeading("Manage Opportunities", "View and manage opportunities shared on ReConnect.",
          refreshButton(loadOpportunities, "Refresh"))}
        {opportunities.length ? (
          <div style={{ display: "grid", gap: 13 }}>
            {opportunities.map(item => recordCard(
              item.title || "Untitled opportunity",
              [
                `Company: ${item.company || "—"}`,
                `Description: ${item.description || "—"}`,
                `Posted by: ${item.postedBy?.fullName || "Unknown"}`,
                `Posted: ${item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}`
              ],
              () => deleteItem(`/admin/opportunities/${item._id}`, "this opportunity"),
              "Delete Opportunity"
            ))}
          </div>
        ) : <div style={card}>No opportunities found.</div>}
      </>;
    }

    if (section === "Events") {
      return <>
        {pageHeading("Manage Events", "Review and manage events hosted by the ReConnect community.",
          refreshButton(loadEvents, "Refresh"))}
        {events.length ? (
          <div style={{ display: "grid", gap: 13 }}>
            {events.map(item => recordCard(
              item.title || "Untitled event",
              [
                `Description: ${item.description || "—"}`,
                `Date: ${item.date || "—"}   •   Time: ${item.time || "—"}`,
                `Location: ${item.location || "—"}`,
                `Organizer: ${item.organizer?.fullName || "Unknown"}`
              ],
              () => deleteItem(`/admin/events/${item._id}`, "this event"),
              "Delete Event"
            ))}
          </div>
        ) : <div style={card}>No events found.</div>}
      </>;
    }

    if (section === "Notifications") {
      return <>
        {pageHeading("Notifications", "Monitor notifications generated across the platform.",
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {refreshButton(loadNotifications)}
            {notifications.length > 0 && <button style={{ ...button, background: "#fff0f1", color: "#b52d3b" }}
              onClick={() => deleteItem("/admin/notifications", "all notifications")}>Delete All</button>}
          </div>)}
        {notifications.length ? (
          <div style={{ display: "grid", gap: 12 }}>
            {notifications.map(item => (
              <div key={item._id} style={{ ...card, display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <h3 style={{ color: colors.ink, fontSize: 15, margin: "0 0 7px" }}>{item.title || "ReConnect Notification"}</h3>
                  <p style={{ color: colors.muted, fontSize: 13, margin: "0 0 10px" }}>{item.message}</p>
                  <small style={{ color: colors.muted }}>
                    User: {item.user?.fullName || "Unknown"}{" "}
                    • {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                  </small>
                </div>
                <button style={{ ...button, background: "#fff0f1", color: "#b52d3b", alignSelf: "flex-start" }}
                  onClick={() => deleteItem(`/admin/notifications/${item._id}`, "this notification")}>Delete</button>
              </div>
            ))}
          </div>
        ) : <div style={card}>No notifications found.</div>}
      </>;
    }

    if (section === "Generate Reports") {
      const rows = [
        ["Total Users", stats.totalUsers],
        ["Students", stats.students],
        ["Alumni", stats.alumni],
        ["Pending Approvals", stats.pendingApprovals],
        ["Mentorship Requests", stats.mentorshipRequests],
        ["Opportunities", stats.opportunities],
        ["Events", stats.events],
        ["Notifications", stats.notifications]
      ];
      return <>
        {pageHeading("Generate Reports", "View and print a summary of ReConnect system activity.",
          <button style={{ ...button, background: colors.blue, color: "#fff" }} onClick={() => window.print()}>
            Print / Save as PDF
          </button>)}
        <div id="reconnect-report" style={{ ...card, maxWidth: 800, margin: "0 auto" }}>
          <div style={{ textAlign: "center", padding: "12px 0 22px", borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
            <h2 style={{ color: colors.ink, margin: 0 }}>ReConnect System Report</h2>
            <p style={{ color: colors.muted, fontSize: 12 }}>Generated on {new Date().toLocaleString()}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 20 }}>
            {rows.map(([label, value]) => (
              <div key={label} style={{ padding: 16, borderRadius: 13, background: "#f6f8fd", border: `1px solid ${colors.border}` }}>
                <div style={{ color: colors.muted, fontSize: 12 }}>{label}</div>
                <div style={{ color: colors.ink, fontWeight: 850, fontSize: 25, marginTop: 8 }}>{value ?? 0}</div>
              </div>
            ))}
          </div>
          <p style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 25 }}>
            ReConnect • Connecting Students and Alumni
          </p>
        </div>
      </>;
    }
    return null;
  }

  const inputStyle = {
    padding: "11px 13px",
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    background: "#fff",
    color: colors.ink,
    outline: "none",
    fontSize: 13,
    minWidth: 190
  };

  return (
    <div className="admin-shell" style={{
      minHeight: "100vh",
      background: colors.bg,
      color: colors.ink,
      fontFamily: "Inter, Segoe UI, Arial, sans-serif"
    }}>
      <style>{`
        * { box-sizing: border-box; }
        .admin-layout { display:flex; min-height:calc(100vh - 72px); }
        .admin-sidebar {
          width:245px; flex-shrink:0; padding:20px 14px;
          background:#fff; border-right:1px solid ${colors.border};
          display:flex; flex-direction:column; gap:6px;
        }
        .admin-main { flex:1; min-width:0; padding:28px; }
        .admin-nav {
          border:0; border-radius:11px; padding:12px 14px;
          display:flex; align-items:center; gap:12px; text-align:left;
          cursor:pointer; font-size:13px; font-weight:700;
          color:#69758d; background:transparent; width:100%;
        }
        .admin-nav:hover { background:#f2f5ff; color:${colors.blue}; }
        .admin-nav.active {
          background:linear-gradient(100deg,#eaf0ff,#f0ecff);
          color:${colors.blue}; box-shadow:inset 3px 0 ${colors.blue};
        }
        .admin-topbar {
          height:72px; background:#fff; border-bottom:1px solid ${colors.border};
          display:flex; align-items:center; justify-content:space-between;
          padding:0 28px; gap:15px;
        }
        .admin-mobile-title { display:none; }
        .admin-print { }
        @media(max-width:850px) {
          .admin-layout { display:block; }
          .admin-sidebar {
            width:100%; flex-direction:row; overflow-x:auto;
            padding:10px 12px; border-right:0; border-bottom:1px solid ${colors.border};
          }
          .admin-nav { width:auto; white-space:nowrap; flex-shrink:0; padding:10px 12px; }
          .admin-main { padding:20px 15px; }
          .admin-topbar { padding:0 16px; }
          .admin-mobile-title { display:block; }
        }
        @media(max-width:480px) {
          .admin-topbar { height:auto; min-height:68px; padding:12px; }
          .admin-topbar h2 { font-size:16px !important; }
          .admin-main { padding:16px 11px; }
        }
        @media print {
          body { background:#fff !important; }
          .admin-topbar, .admin-sidebar, .no-print, .admin-message { display:none !important; }
          .admin-main { padding:0 !important; }
          .admin-shell { background:#fff !important; }
          #reconnect-report { box-shadow:none !important; border:0 !important; max-width:none !important; }
        }
      `}</style>

      <header className="admin-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 13,
            display: "grid", placeItems: "center",
            color: "#fff", fontSize: 22, fontWeight: 900,
            background: "linear-gradient(135deg,#4169e1,#7654d6)"
          }}>R</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 19, color: colors.ink, fontWeight: 850 }}>ReConnect</h2>
            <small style={{ color: colors.muted, fontSize: 11 }}>Admin Console</small>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: colors.ink, fontWeight: 800 }}>{adminName}</div>
            <small style={{ color: colors.muted, fontSize: 10 }}>Administrator</small>
          </div>
          <div style={{
            width: 37, height: 37, borderRadius: "50%",
            background: "#eaf0ff", color: colors.blue,
            display: "grid", placeItems: "center", fontWeight: 850
          }}>{adminName.charAt(0).toUpperCase()}</div>
          <button className="no-print" style={{ ...button, background: "#fff0f1", color: "#b52d3b" }} onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-mobile-title" style={{ padding: "5px 9px", color: colors.muted, fontSize: 10, fontWeight: 800 }}>
            MENU
          </div>
          <div className="no-print" style={{ color: "#a0a9ba", fontSize: 10, fontWeight: 800, padding: "5px 13px 9px", letterSpacing: 1 }}>
            WORKSPACE
          </div>
          {sections.map(item => (
            <button key={item.name}
              className={`admin-nav ${section === item.name ? "active" : ""}`}
              onClick={() => { setSection(item.name); setMessage(""); }}>
              <span style={{ fontSize: 19, width: 23, textAlign: "center" }}>{item.icon}</span>
              {item.name}
              {item.name === "Validate Users" && stats.pendingApprovals > 0 && (
                <span style={{
                  marginLeft: "auto", background: "#ffedcc", color: "#98600a",
                  borderRadius: 20, padding: "3px 7px", fontSize: 10
                }}>{stats.pendingApprovals}</span>
              )}
            </button>
          ))}
          <div className="no-print" style={{ marginTop: "auto", padding: 13, borderRadius: 14, background: "#f5f7ff" }}>
            <div style={{ fontSize: 11, color: colors.ink, fontWeight: 800, marginBottom: 5 }}>ReConnect Admin</div>
            <div style={{ fontSize: 10, color: colors.muted, lineHeight: 1.5 }}>Manage the student and alumni community.</div>
          </div>
        </aside>

        <main className="admin-main">
          {message && (
            <div className="admin-message" style={{
              background: "#eaf4ff", border: "1px solid #c9e0ff",
              color: "#245ba6", borderRadius: 11,
              padding: "12px 15px", marginBottom: 18,
              fontSize: 13, display: "flex", justifyContent: "space-between", gap: 10
            }}>
              <span>{message}</span>
              <button onClick={() => setMessage("")} style={{ border: 0, background: "transparent", cursor: "pointer", color: "inherit" }}>✕</button>
            </div>
          )}

          {loading && (
            <div className="no-print" style={{ color: colors.blue, fontSize: 12, marginBottom: 12 }}>
              Loading latest information...
            </div>
          )}
          {renderSection()}
        </main>
      </div>
    </div>
  );
}