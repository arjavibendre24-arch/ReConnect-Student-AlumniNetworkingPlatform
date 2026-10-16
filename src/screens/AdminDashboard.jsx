import { useEffect, useState } from "react";

const API = "https://reconnect-system.onrender.com/api";

const sections = [

  { name: "Dashboard", icon: "⌂" },

  { name: "Validate Users", icon: "✓" },

  { name: "Manage Users", icon: "♙" },

  { name: "Mentorship Requests", icon: "◎" },

  { name: "Opportunities", icon: "▣" },

  { name: "Events", icon: "▦" },

  { name: "Event Feedback", icon: "★" },

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

const getFeedbackList = (data) => {

  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.feedback)) return data.feedback;

  if (Array.isArray(data?.eventFeedback)) return data.eventFeedback;

  if (Array.isArray(data?.feedbacks)) return data.feedbacks;

  if (Array.isArray(data?.data)) return data.data;

  return [];

};

const getStudent = (item) =>

  typeof item?.studentId === "object" && item.studentId !== null

    ? item.studentId

    : item?.student || item?.user || {};

const getFeedbackEvent = (item) =>

  typeof item?.eventId === "object" && item.eventId !== null

    ? item.eventId

    : item?.event || {};

const getStudentName = (item) => {

  const student = getStudent(item);

  return (

    student.fullName ||

    student.name ||

    item.studentName ||

    item.userName ||

    "Unknown student"

  );

};

const getStudentEmail = (item) => {

  const student = getStudent(item);

  return student.email || item.studentEmail || "Email not available";

};

const getEventTitle = (item) => {

  const event = getFeedbackEvent(item);

  return event.title || item.eventTitle || "Event";

};

const getRating = (item) =>

  Number(item.rating ?? item.ratings ?? item.stars ?? 0);

const getComments = (item) =>

  item.comments ??

  item.comment ??

  item.feedback ??

  item.message ??

  item.review ??

  "";

export default function AdminDashboard() {

  const [section, setSection] = useState("Dashboard");

  const [stats, setStats] = useState({});

  const [users, setUsers] = useState([]);

  const [mentorships, setMentorships] = useState([]);

  const [opportunities, setOpportunities] = useState([]);

  const [events, setEvents] = useState([]);

  const [notifications, setNotifications] = useState([]);

  const [eventFeedback, setEventFeedback] = useState([]);

  // State used by the event participation and report section.
  const [eventReports, setEventReports] = useState([]);

  const [reportLoading, setReportLoading] = useState(false);

  const [feedbackLoading, setFeedbackLoading] = useState(false);

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

  // Load all student event feedback from the backend.

  async function loadEventFeedback() {

    setFeedbackLoading(true);

    try {

      const data = await request("/admin/event-feedback");

      setEventFeedback(getFeedbackList(data));

    } catch (error) {

      setMessage(error.message || "Unable to load event feedback.");

      throw error;

    } finally {

      setFeedbackLoading(false);

    }

  }

  async function loadEventReports() {
    setReportLoading(true);
    try {
      const data = await request("/admin/reports/events");
      setEventReports(Array.isArray(data) ? data : Array.isArray(data?.reports) ? data.reports : []);
    } catch (error) {
      setMessage(error.message || "Unable to load event participation reports.");
      throw error;
    } finally {
      setReportLoading(false);
    }
  }

  function downloadCsv(filename, rows) {
    if (!rows.length) {
      setMessage("There is no report data to download yet.");
      return;
    }
    const escapeCsv = (value) => {
      const text = value === null || value === undefined ? "" : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\\r\\n");
    const blob = new Blob(["\\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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

      setMessage(error.message || "Unable to load dashboard information.");

    } finally {

      setLoading(false);

    }

  }

  useEffect(() => {

    loadAll();

  }, []);

  // Load feedback when the admin opens the Event Feedback section.

  useEffect(() => {

    if (section === "Event Feedback") {

      loadEventFeedback().catch(() => {});

    }

  }, [section]);

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

      () =>

        request(`/admin/users/${id}/status`, {

          method: "PUT",

          body: JSON.stringify({ status })

        }),

      `User ${status.toLowerCase()} successfully.`

    );

  }

  async function deleteItem(path, label) {

    if (!window.confirm(`Are you sure you want to delete ${label}?`)) {

      return;

    }

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

      filter === "All" ||

      user.status === filter ||

      user.role === filter;

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

    const [background, color] = palette[status] || [

      "#edf1f7",

      "#536176"

    ];

    return (

      <span

        style={{

          display: "inline-block",

          background,

          color,

          padding: "5px 10px",

          borderRadius: 20,

          fontSize: 11,

          fontWeight: 800,

          whiteSpace: "nowrap"

        }}

      >

        {status}

      </span>

    );

  }

  function statCard(label, value, icon, color, note) {

    const destinationByLabel = {
      "Total Users": "Manage Users",
      Students: "Manage Users",
      Alumni: "Manage Users",
      "Pending Approvals": "Validate Users",
      "Mentorship Requests": "Mentorship Requests",
      Opportunities: "Opportunities",
      Events: "Events",
      Notifications: "Notifications",
      "Event Feedback": "Event Feedback"
    };
    const destination = destinationByLabel[label];
    const openDestination = () => {
      if (!destination) return;
      setSection(destination);
      setMessage("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (

      <div
        role={destination ? "button" : undefined}
        tabIndex={destination ? 0 : undefined}
        onClick={openDestination}
        onKeyDown={(event) => {
          if (destination && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            openDestination();
          }
        }}
        title={destination ? `Open ${destination}` : undefined}
        style={{
          ...card,
          position: "relative",
          overflow: "hidden",
          minWidth: 0,
          cursor: destination ? "pointer" : "default",
          transition: "transform 160ms ease, box-shadow 160ms ease",
          outline: "none"
        }}
      >

        <div

          style={{

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

            gap: 10

          }}

        >

          <span

            style={{

              color: colors.muted,

              fontSize: 13,

              fontWeight: 700

            }}

          >

            {label}

          </span>

          <span

            style={{

              width: 43,

              height: 43,

              borderRadius: 14,

              display: "grid",

              placeItems: "center",

              background: `${color}18`,

              color,

              fontSize: 22,

              fontWeight: 800

            }}

          >

            {icon}

          </span>

        </div>

        <div

          style={{

            color: colors.ink,

            fontSize: 31,

            fontWeight: 850,

            marginTop: 15,

            letterSpacing: "-1px"

          }}

        >

          {value ?? 0}

        </div>

        <div

          style={{

            color: colors.muted,

            fontSize: 12,

            marginTop: 5

          }}

        >

          {note}

        </div>

        {destination && (
          <div style={{ marginTop: 12, color, fontSize: 11, fontWeight: 800 }}>
            Open {destination} →
          </div>
        )}

        <div

          style={{

            position: "absolute",

            bottom: -28,

            right: -22,

            width: 90,

            height: 90,

            borderRadius: "50%",

            background: `${color}09`

          }}

        />

      </div>

    );

  }

  function pageHeading(title, subtitle, action) {

    return (

      <div

        style={{

          display: "flex",

          justifyContent: "space-between",

          alignItems: "center",

          flexWrap: "wrap",

          gap: 14,

          marginBottom: 23

        }}

      >

        <div>

          <h1

            style={{

              color: colors.ink,

              fontSize: 25,

              margin: "0 0 7px",

              fontWeight: 850

            }}

          >

            {title}

          </h1>

          <p

            style={{

              color: colors.muted,

              margin: 0,

              fontSize: 13

            }}

          >

            {subtitle}

          </p>

        </div>

        {action}

      </div>

    );

  }

  function refreshButton(onClick, label = "Refresh") {

    return (

      <button

        style={{

          ...button,

          color: colors.blue,

          background: "#eaf0ff",

          border: "1px solid #dce6ff"

        }}

        onClick={onClick}

      >

        ↻ {label}

      </button>

    );

  }

  const td = {

    padding: "14px 16px",

    borderBottom: `1px solid ${colors.border}`,

    color: "#536078",

    fontSize: 12,

    verticalAlign: "middle"

  };

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

  function userTable(list, showApproval = false) {

    if (!list.length) {

      return (

        <div

          style={{

            ...card,

            textAlign: "center",

            color: colors.muted

          }}

        >

          <div style={{ fontSize: 32, marginBottom: 8 }}>♙</div>

          No users found.

        </div>

      );

    }

    return (

      <div style={{ ...card, padding: 0, overflowX: "auto" }}>

        <table

          style={{

            width: "100%",

            borderCollapse: "collapse",

            minWidth: 760

          }}

        >

          <thead>

            <tr>

              {[

                "User",

                "Email",

                "Role",

                "Status",

                "Registered",

                "Actions"

              ].map((heading) => (

                <th

                  key={heading}

                  style={{

                    padding: "15px 16px",

                    textAlign: "left",

                    background: "#f7f9fd",

                    color: colors.muted,

                    fontSize: 11,

                    textTransform: "uppercase",

                    letterSpacing: ".5px",

                    borderBottom: `1px solid ${colors.border}`

                  }}

                >

                  {heading}

                </th>

              ))}

            </tr>

          </thead>

          <tbody>

            {list.map((user) => (

              <tr key={user._id}>

                <td style={td}>

                  <div

                    style={{

                      display: "flex",

                      alignItems: "center",

                      gap: 10

                    }}

                  >

                    <div

                      style={{

                        width: 34,

                        height: 34,

                        borderRadius: 12,

                        display: "grid",

                        placeItems: "center",

                        background: "#eaf0ff",

                        color: colors.blue,

                        fontWeight: 800

                      }}

                    >

                      {(user.fullName || "U")

                        .charAt(0)

                        .toUpperCase()}

                    </div>

                    <strong style={{ color: colors.ink }}>

                      {user.fullName}

                    </strong>

                  </div>

                </td>

                <td style={td}>{user.email}</td>

                <td style={td}>{badge(user.role)}</td>

                <td style={td}>{badge(user.status)}</td>

                <td style={td}>

                  {user.createdAt

                    ? new Date(user.createdAt).toLocaleDateString()

                    : "—"}

                </td>

                <td style={td}>

                  <div

                    style={{

                      display: "flex",

                      flexWrap: "wrap",

                      gap: 6

                    }}

                  >

                    {showApproval && user.status === "Pending" && (

                      <>

                        <button

                          style={{

                            ...button,

                            background: "#e2f7ed",

                            color: "#13764f",

                            padding: "7px 10px"

                          }}

                          onClick={() =>

                            updateStatus(user._id, "Approved")

                          }

                        >

                          Approve

                        </button>

                        <button

                          style={{

                            ...button,

                            background: "#ffeaec",

                            color: "#b52d3b",

                            padding: "7px 10px"

                          }}

                          onClick={() =>

                            updateStatus(user._id, "Rejected")

                          }

                        >

                          Reject

                        </button>

                      </>

                    )}

                    {user.role !== "Admin" && (

                      <button

                        style={{

                          ...button,

                          background: "#fff0f1",

                          color: "#b52d3b",

                          padding: "7px 10px"

                        }}

                        onClick={() =>

                          deleteItem(

                            `/admin/users/${user._id}`,

                            user.fullName || "this user"

                          )

                        }

                      >

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

  function contentCard(title, children, action) {

    return (

      <div style={{ ...card, marginBottom: 15 }}>

        <div

          style={{

            display: "flex",

            alignItems: "center",

            justifyContent: "space-between",

            flexWrap: "wrap",

            gap: 12,

            marginBottom: 17

          }}

        >

          <h3

            style={{

              margin: 0,

              color: colors.ink,

              fontSize: 16

            }}

          >

            {title}

          </h3>

          {action}

        </div>

        {children}

      </div>

    );

  }

  function recordCard(title, details, onDelete, buttonText = "Delete") {

    return (

      <div

        key={title + details.join("|")}

        style={{

          ...card,

          padding: 19,

          display: "flex",

          justifyContent: "space-between",

          alignItems: "flex-start",

          gap: 16,

          flexWrap: "wrap"

        }}

      >

        <div style={{ minWidth: 0, flex: 1 }}>

          <h3

            style={{

              margin: "0 0 10px",

              color: colors.ink,

              fontSize: 16

            }}

          >

            {title}

          </h3>

          {details.map((detail, i) => (

            <p

              key={i}

              style={{

                color: colors.muted,

                fontSize: 13,

                margin: "6px 0",

                overflowWrap: "anywhere"

              }}

            >

              {detail}

            </p>

          ))}

        </div>

        <button

          style={{

            ...button,

            background: "#fff0f1",

            color: "#b52d3b"

          }}

          onClick={onDelete}

        >

          {buttonText}

        </button>

      </div>

    );

  }

  function renderSection() {

    if (section === "Dashboard") {

      return (

        <>

          <div

            style={{

              background: "linear-gradient(115deg,#4169e1,#7654d6)",

              color: "#fff",

              borderRadius: 22,

              padding: "27px 28px",

              marginBottom: 22,

              boxShadow: "0 12px 28px rgba(65,105,225,.18)",

              position: "relative",

              overflow: "hidden"

            }}

          >

            <div style={{ position: "relative", zIndex: 1 }}>

              <div

                style={{

                  fontSize: 12,

                  opacity: 0.85,

                  marginBottom: 9

                }}

              >

                ADMINISTRATION PANEL

              </div>

              <h1

                style={{

                  fontSize: 26,

                  margin: "0 0 9px",

                  fontWeight: 850

                }}

              >

                Welcome back, {adminName}!

              </h1>

              <p

                style={{

                  fontSize: 13,

                  opacity: 0.9,

                  margin: 0,

                  maxWidth: 530,

                  lineHeight: 1.6

                }}

              >

                Manage users, review registrations, and monitor the

                ReConnect community from one place.

              </p>

            </div>

            <div

              style={{

                position: "absolute",

                right: -30,

                top: -65,

                width: 210,

                height: 210,

                border: "35px solid #ffffff16",

                borderRadius: "50%"

              }}

            />

          </div>

          <div

            style={{

              display: "grid",

              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",

              gap: 15,

              marginBottom: 22

            }}

          >

            {statCard("Total Users", stats.totalUsers, "♙", colors.blue, "Registered accounts")}

            {statCard("Students", stats.students, "▤", colors.purple, "Student accounts")}

            {statCard("Alumni", stats.alumni, "♧", colors.green, "Alumni accounts")}

            {statCard("Pending Approvals", stats.pendingApprovals, "◷", colors.orange, "Awaiting review")}

            {statCard("Mentorship Requests", stats.mentorshipRequests, "◎", "#0e9bb5", "Requests submitted")}

            {statCard("Opportunities", stats.opportunities, "▣", "#d17a35", "Shared opportunities")}

            {statCard("Events", stats.events, "▦", "#bd5a9b", "Community events")}

            {statCard("Notifications", stats.notifications, "♧", "#64748b", "System notifications")}

            {statCard("Event Feedback", eventFeedback.length, "★", "#e99536", "Feedback submissions loaded")}

          </div>

          <div

            style={{

              ...card,

              display: "flex",

              justifyContent: "space-between",

              alignItems: "center",

              flexWrap: "wrap",

              gap: 15

            }}

          >

            <div>

              <h3 style={{ margin: "0 0 5px", color: colors.ink }}>

                System overview

              </h3>

              <p

                style={{

                  margin: 0,

                  color: colors.muted,

                  fontSize: 13

                }}

              >

                Refresh the latest platform information.

              </p>

            </div>

            {refreshButton(loadAll, "Refresh Dashboard")}

          </div>

        </>

      );

    }

    if (section === "Validate Users") {

      const pending = users.filter(

        (user) => user.status === "Pending"

      );

      return (

        <>

          {pageHeading(

            "Validate Users",

            "Review and approve or reject student and alumni registrations.",

            refreshButton(loadUsers, "Refresh Users")

          )}

          <div

            style={{

              ...card,

              marginBottom: 18,

              background: "#fff9eb",

              borderColor: "#f6e5bd"

            }}

          >

            <strong style={{ color: "#93610a" }}>

              {pending.length} pending registration(s)

            </strong>

            <p

              style={{

                color: "#93610a",

                fontSize: 12,

                margin: "5px 0 0"

              }}

            >

              Review account details before approving access.

            </p>

          </div>

          {userTable(pending, true)}

        </>

      );

    }

    if (section === "Manage Users") {

      return (

        <>

          {pageHeading(

            "Manage Users",

            "Search, filter, review, and manage registered accounts.",

            refreshButton(loadUsers, "Refresh Users")

          )}

          <div

            style={{

              ...card,

              marginBottom: 17,

              display: "flex",

              gap: 10,

              flexWrap: "wrap"

            }}

          >

            <input

              value={search}

              onChange={(e) => setSearch(e.target.value)}

              placeholder="Search by name or email..."

              style={inputStyle}

            />

            <select

              value={filter}

              onChange={(e) => setFilter(e.target.value)}

              style={inputStyle}

            >

              {[

                "All",

                "Student",

                "Alumni",

                "Admin",

                "Pending",

                "Approved",

                "Rejected"

              ].map((item) => (

                <option key={item}>{item}</option>

              ))}

            </select>

          </div>

          {userTable(filteredUsers)}

        </>

      );

    }

    if (section === "Mentorship Requests") {

      return (

        <>

          {pageHeading(

            "Mentorship Requests",

            "Monitor student and alumni mentorship activity.",

            refreshButton(loadMentorships, "Refresh Requests")

          )}

          {mentorships.length ? (

            <div style={{ display: "grid", gap: 13 }}>

              {mentorships.map((item) => (

                <div key={item._id} style={card}>

                  <div

                    style={{

                      display: "flex",

                      justifyContent: "space-between",

                      flexWrap: "wrap",

                      gap: 12

                    }}

                  >

                    <div>

                      <h3

                        style={{

                          color: colors.ink,

                          margin: "0 0 12px",

                          fontSize: 16

                        }}

                      >

                        Mentorship connection

                      </h3>

                      <p style={{ color: colors.muted, fontSize: 13 }}>

                        Student:{" "}

                        <strong>

                          {item.studentId?.fullName || "Unknown"}

                        </strong>

                      </p>

                      <p style={{ color: colors.muted, fontSize: 13 }}>

                        Alumni:{" "}

                        <strong>

                          {item.alumniId?.fullName || "Unknown"}

                        </strong>

                      </p>

                      <p style={{ color: colors.muted, fontSize: 12 }}>

                        Date:{" "}

                        {item.createdAt

                          ? new Date(item.createdAt).toLocaleString()

                          : "—"}

                      </p>

                    </div>

                    {badge(item.status)}

                  </div>

                </div>

              ))}

            </div>

          ) : (

            <div style={card}>No mentorship requests found.</div>

          )}

        </>

      );

    }

    if (section === "Opportunities") {

      return (

        <>

          {pageHeading(

            "Manage Opportunities",

            "View and manage opportunities shared on ReConnect.",

            refreshButton(loadOpportunities, "Refresh")

          )}

          {opportunities.length ? (

            <div style={{ display: "grid", gap: 13 }}>

              {opportunities.map((item) =>

                recordCard(

                  item.title || "Untitled opportunity",

                  [

                    `Company: ${item.company || "—"}`,

                    `Description: ${item.description || "—"}`,

                    `Posted by: ${item.postedBy?.fullName || "Unknown"}`,

                    `Posted: ${

                      item.createdAt

                        ? new Date(item.createdAt).toLocaleString()

                        : "—"

                    }`

                  ],

                  () =>

                    deleteItem(

                      `/admin/opportunities/${item._id}`,

                      "this opportunity"

                    ),

                  "Delete Opportunity"

                )

              )}

            </div>

          ) : (

            <div style={card}>No opportunities found.</div>

          )}

        </>

      );

    }

    if (section === "Events") {

      return (

        <>

          {pageHeading(

            "Manage Events",

            "Review and manage events hosted by the ReConnect community.",

            refreshButton(loadEvents, "Refresh")

          )}

          {events.length ? (

            <div style={{ display: "grid", gap: 13 }}>

              {events.map((item) =>

                recordCard(

                  item.title || "Untitled event",

                  [

                    `Description: ${item.description || "—"}`,

                    `Date: ${item.date || "—"} • Time: ${item.time || "—"}`,

                    `Location: ${item.location || "—"}`,

                    `Organizer: ${item.organizer?.fullName || "Unknown"}`

                  ],

                  () => deleteItem(`/admin/events/${item._id}`, "this event"),

                  "Delete Event"

                )

              )}

            </div>

          ) : (

            <div style={card}>No events found.</div>

          )}

        </>

      );

    }

    if (section === "Event Feedback") {

      const averageRating = eventFeedback.length

        ? eventFeedback.reduce(

            (total, item) => total + getRating(item),

            0

          ) / eventFeedback.length

        : 0;

      const ratedCount = eventFeedback.filter(

        (item) => getRating(item) > 0

      ).length;

      const ratedAverage = ratedCount

        ? eventFeedback.reduce(

            (total, item) =>

              total + (getRating(item) > 0 ? getRating(item) : 0),

            0

          ) / ratedCount

        : 0;

      const filteredFeedback = eventFeedback.filter((item) => {

        const query = search.trim().toLowerCase();

        if (!query) return true;

        const studentName = getStudentName(item).toLowerCase();

        const studentEmail = getStudentEmail(item).toLowerCase();

        const eventTitle = getEventTitle(item).toLowerCase();

        const comments = String(getComments(item)).toLowerCase();

        return (

          studentName.includes(query) ||

          studentEmail.includes(query) ||

          eventTitle.includes(query) ||

          comments.includes(query)

        );

      });

      return (

        <>

          {pageHeading(

            "Event Feedback",

            "View student ratings and comments submitted for ReConnect events.",

            refreshButton(

              () => loadEventFeedback().catch(() => {}),

              "Refresh Feedback"

            )

          )}

          <div

            style={{

              display: "grid",

              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",

              gap: 15,

              marginBottom: 22

            }}

          >

            {statCard(

              "Total Feedback",

              eventFeedback.length,

              "★",

              colors.blue,

              "Student submissions"

            )}

            {statCard(

              "Rated Submissions",

              ratedCount,

              "★",

              colors.orange,

              "Submissions with a rating"

            )}

            {statCard(

              "Average Rating",

              ratedCount ? `${ratedAverage.toFixed(2)} / 5` : "—",

              "☆",

              colors.green,

              "Across rated submissions"

            )}

          </div>

          <div

            style={{

              ...card,

              marginBottom: 18,

              display: "flex",

              alignItems: "center",

              justifyContent: "space-between",

              flexWrap: "wrap",

              gap: 12

            }}

          >

            <div>

              <h3

                style={{

                  color: colors.ink,

                  margin: "0 0 5px",

                  fontSize: 16

                }}

              >

                Student Feedback Submissions

              </h3>

              <p

                style={{

                  color: colors.muted,

                  margin: 0,

                  fontSize: 12

                }}

              >

                Feedback is retrieved from the backend and displayed below.

              </p>

            </div>

            <input

              value={search}

              onChange={(e) => setSearch(e.target.value)}

              placeholder="Search student, event, or comment..."

              style={{

                ...inputStyle,

                width: "100%",

                maxWidth: 340

              }}

            />

          </div>

          {feedbackLoading && (

            <div style={{ ...card, marginBottom: 15 }}>

              Loading student feedback...

            </div>

          )}

          {!feedbackLoading && !eventFeedback.length && (

            <div

              style={{

                ...card,

                textAlign: "center",

                padding: "40px 22px"

              }}

            >

              <div

                style={{

                  fontSize: 42,

                  marginBottom: 12,

                  color: colors.orange

                }}

              >

                ★

              </div>

              <h3

                style={{

                  color: colors.ink,

                  margin: "0 0 9px",

                  fontSize: 18

                }}

              >

                No Feedback Found

              </h3>

              <p

                style={{

                  color: colors.muted,

                  fontSize: 13,

                  lineHeight: 1.7,

                  maxWidth: 490,

                  margin: "0 auto 18px"

                }}

              >

                No feedback submissions were returned by the server.

                Once students submit feedback and it is saved in MongoDB,

                it should appear here.

              </p>

              {refreshButton(

                () => loadEventFeedback().catch(() => {}),

                "Try Again"

              )}

            </div>

          )}

          {!feedbackLoading && eventFeedback.length > 0 && (

            <>

              <div

                style={{

                  color: colors.muted,

                  fontSize: 12,

                  marginBottom: 12

                }}

              >

                Showing {filteredFeedback.length} of {eventFeedback.length}{" "}

                feedback submission(s)

              </div>

              {filteredFeedback.length ? (

                <div style={{ display: "grid", gap: 14 }}>

                  {filteredFeedback.map((item, index) => {

                    const student = getStudent(item);

                    const event = getFeedbackEvent(item);

                    const rating = getRating(item);

                    const comments = getComments(item);

                    const studentName = getStudentName(item);

                    const eventTitle = getEventTitle(item);

                    const feedbackId =

                      item._id ||

                      `${student._id || studentName}-${event._id || eventTitle}-${index}`;

                    return (

                      <div key={feedbackId} style={card}>

                        <div

                          style={{

                            display: "flex",

                            justifyContent: "space-between",

                            alignItems: "flex-start",

                            flexWrap: "wrap",

                            gap: 14

                          }}

                        >

                          <div

                            style={{

                              display: "flex",

                              alignItems: "center",

                              gap: 12,

                              minWidth: 0

                            }}

                          >

                            <div

                              style={{

                                width: 46,

                                height: 46,

                                flexShrink: 0,

                                borderRadius: 15,

                                background: "#eaf0ff",

                                color: colors.blue,

                                display: "grid",

                                placeItems: "center",

                                fontSize: 19,

                                fontWeight: 850

                              }}

                            >

                              {studentName.charAt(0).toUpperCase()}

                            </div>

                            <div style={{ minWidth: 0 }}>

                              <h3

                                style={{

                                  margin: "0 0 5px",

                                  color: colors.ink,

                                  fontSize: 16,

                                  overflowWrap: "anywhere"

                                }}

                              >

                                {studentName}

                              </h3>

                              <p

                                style={{

                                  margin: 0,

                                  color: colors.muted,

                                  fontSize: 12,

                                  overflowWrap: "anywhere"

                                }}

                              >

                                {getStudentEmail(item)}

                              </p>

                              {student.role && (

                                <div style={{ marginTop: 7 }}>

                                  {badge(student.role)}

                                </div>

                              )}

                            </div>

                          </div>

                          <div

                            style={{

                              padding: "9px 13px",

                              borderRadius: 12,

                              background: "#fff4d9",

                              border: "1px solid #f5e2b9",

                              color: "#8b641a",

                              fontWeight: 850,

                              fontSize: 14,

                              whiteSpace: "nowrap"

                            }}

                          >

                            {rating > 0

                              ? `${rating} / 5 ★`

                              : "No rating"}

                          </div>

                        </div>

                        <div

                          style={{

                            marginTop: 17,

                            padding: 15,

                            background: "#f7f9fd",

                            border: `1px solid ${colors.border}`,

                            borderRadius: 13

                          }}

                        >

                          <div

                            style={{

                              color: colors.muted,

                              fontSize: 10,

                              fontWeight: 800,

                              textTransform: "uppercase",

                              letterSpacing: ".7px",

                              marginBottom: 6

                            }}

                          >

                            Event

                          </div>

                          <h4

                            style={{

                              color: colors.ink,

                              margin: "0 0 6px",

                              fontSize: 15

                            }}

                          >

                            {eventTitle}

                          </h4>

                          {(event.date || item.eventDate) && (

                            <p

                              style={{

                                color: colors.muted,

                                margin: 0,

                                fontSize: 12

                              }}

                            >

                              Date: {event.date || item.eventDate}

                            </p>

                          )}

                          {(event.location || item.eventLocation) && (

                            <p

                              style={{

                                color: colors.muted,

                                margin: "5px 0 0",

                                fontSize: 12

                              }}

                            >

                              Location: {event.location || item.eventLocation}

                            </p>

                          )}

                        </div>

                        <div style={{ marginTop: 17 }}>

                          <h4

                            style={{

                              color: colors.ink,

                              margin: "0 0 8px",

                              fontSize: 13

                            }}

                          >

                            Student's Comments

                          </h4>

                          <p

                            style={{

                              color: comments ? "#536078" : colors.muted,

                              fontSize: 13,

                              lineHeight: 1.8,

                              whiteSpace: "pre-wrap",

                              overflowWrap: "anywhere",

                              margin: 0

                            }}

                          >

                            {typeof comments === "string" && comments.trim()

                              ? comments

                              : "No written comment provided."}

                          </p>

                        </div>

                        <div

                          style={{

                            marginTop: 17,

                            paddingTop: 12,

                            borderTop: `1px solid ${colors.border}`,

                            display: "flex",

                            justifyContent: "space-between",

                            flexWrap: "wrap",

                            gap: 8

                          }}

                        >

                          <small

                            style={{

                              color: colors.muted,

                              fontSize: 11

                            }}

                          >

                            Submitted:{" "}

                            {item.createdAt || item.submittedAt

                              ? new Date(

                                  item.createdAt || item.submittedAt

                                ).toLocaleString()

                              : "Date unavailable"}

                          </small>

                          <small

                            style={{

                              color: colors.muted,

                              fontSize: 11

                            }}

                          >

                            Feedback ID:{" "}

                            {item._id ? String(item._id).slice(-8) : "—"}

                          </small>

                        </div>

                      </div>

                    );

                  })}

                </div>

              ) : (

                <div

                  style={{

                    ...card,

                    textAlign: "center",

                    color: colors.muted

                  }}

                >

                  No feedback matches your search.

                </div>

              )}

            </>

          )}

        </>

      );

    }

    if (section === "Notifications") {

      return (

        <>

          {pageHeading(

            "Notifications",

            "Monitor notifications generated across the platform.",

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>

              {refreshButton(loadNotifications)}

              {notifications.length > 0 && (

                <button

                  style={{

                    ...button,

                    background: "#fff0f1",

                    color: "#b52d3b"

                  }}

                  onClick={() =>

                    deleteItem("/admin/notifications", "all notifications")

                  }

                >

                  Delete All

                </button>

              )}

            </div>

          )}

          {notifications.length ? (

            <div style={{ display: "grid", gap: 12 }}>

              {notifications.map((item) => (

                <div

                  key={item._id}

                  style={{

                    ...card,

                    display: "flex",

                    justifyContent: "space-between",

                    gap: 14,

                    flexWrap: "wrap"

                  }}

                >

                  <div style={{ flex: 1, minWidth: 180 }}>

                    <h3

                      style={{

                        color: colors.ink,

                        fontSize: 15,

                        margin: "0 0 7px"

                      }}

                    >

                      {item.title || "ReConnect Notification"}

                    </h3>

                    <p

                      style={{

                        color: colors.muted,

                        fontSize: 13,

                        margin: "0 0 10px"

                      }}

                    >

                      {item.message}

                    </p>

                    <small style={{ color: colors.muted }}>

                      User: {item.user?.fullName || "Unknown"} •{" "}

                      {item.createdAt

                        ? new Date(item.createdAt).toLocaleString()

                        : ""}

                    </small>

                  </div>

                  <button

                    style={{

                      ...button,

                      background: "#fff0f1",

                      color: "#b52d3b",

                      alignSelf: "flex-start"

                    }}

                    onClick={() =>

                      deleteItem(

                        `/admin/notifications/${item._id}`,

                        "this notification"

                      )

                    }

                  >

                    Delete

                  </button>

                </div>

              ))}

            </div>

          ) : (

            <div style={card}>No notifications found.</div>

          )}

        </>

      );

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
        ["Notifications", stats.notifications],
        ["Event Feedback Responses", eventFeedback.length]
      ];

      const eventReportRows = eventReports.map((report) => {
        const event = report.event || report;
        return {
          id: event._id || event.id || event.title,
          title: event.title || "Untitled event",
          date: event.startDate || event.eventDate || event.date || "—",
          organizer: event.organizer?.fullName || event.organizer?.name || "Unknown",
          registered: Number(report.registrationCount ?? report.registeredCount ?? 0),
          cancelled: Number(report.cancelledCount ?? 0),
          feedbackCount: Number(report.feedbackCount ?? 0),
          averageRating: report.averageRating ?? "—",
          participants: Array.isArray(report.participants) ? report.participants : []
        };
      });

      const feedbackCsvRows = [
        ["Event", "Event Date", "Student Name", "Student Email", "Rating", "Comments", "Submitted At"],
        ...eventFeedback.map((item) => {
          const event = getFeedbackEvent(item);
          return [
            getEventTitle(item),
            event.startDate || event.eventDate || event.date || item.eventDate || "",
            getStudentName(item),
            getStudentEmail(item),
            getRating(item) || "",
            typeof getComments(item) === "string" ? getComments(item) : JSON.stringify(getComments(item) || ""),
            item.createdAt || item.submittedAt
              ? new Date(item.createdAt || item.submittedAt).toLocaleString()
              : ""
          ];
        })
      ];

      const eventCsvRows = [
        ["Event", "Date", "Organizer", "Registered Members", "Participant Names", "Participant Emails", "Cancelled Registrations", "Feedback Responses", "Average Rating"],
        ...eventReportRows.map((item) => [
          item.title, item.date, item.organizer, item.registered,
          item.participants.map((person) => person.fullName).join("; "),
          item.participants.map((person) => person.email).join("; "),
          item.cancelled, item.feedbackCount, item.averageRating
        ])
      ];

      return (
        <>
          {pageHeading(
            "Generate Reports",
            "Generate event participation and student feedback reports, or print the system summary.",
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                style={{ ...button, background: colors.blue, color: "#fff" }}
                onClick={() => window.print()}
              >
                Print / Save as PDF
              </button>
              <button
                style={{ ...button, background: "#e2f7ed", color: "#13764f" }}
                onClick={() => downloadCsv("reconnect-event-participation-report.csv", eventCsvRows)}
              >
                Download Event Report CSV
              </button>
              <button
                style={{ ...button, background: "#fff3d9", color: "#8b641a" }}
                onClick={() => downloadCsv("reconnect-event-feedback-report.csv", feedbackCsvRows)}
              >
                Download Feedback CSV
              </button>
            </div>
          )}

          <div id="reconnect-report" style={{ ...card, maxWidth: 1000, margin: "0 auto 22px" }}>
            <div style={{ textAlign: "center", padding: "12px 0 22px", borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
              <h2 style={{ color: colors.ink, margin: 0 }}>ReConnect System Report</h2>
              <p style={{ color: colors.muted, fontSize: 12 }}>
                Generated on {new Date().toLocaleString()}
              </p>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
              gap: 12,
              marginTop: 20
            }}>
              {rows.map(([label, value]) => (
                <div key={label} style={{
                  padding: 16, borderRadius: 13, background: "#f6f8fd",
                  border: `1px solid ${colors.border}`
                }}>
                  <div style={{ color: colors.muted, fontSize: 12 }}>{label}</div>
                  <div style={{ color: colors.ink, fontWeight: 850, fontSize: 25, marginTop: 8 }}>
                    {value ?? 0}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: 12, marginBottom: 16
            }}>
              <div>
                <h3 style={{ color: colors.ink, margin: "0 0 5px", fontSize: 17 }}>
                  Event Participation Report
                </h3>
                <p style={{ color: colors.muted, margin: 0, fontSize: 12 }}>
                  Registration totals, cancellations, feedback response counts, and average ratings for each event.
                </p>
              </div>
              {refreshButton(() => {
                loadEventReports().catch(() => {});
                loadEventFeedback().catch(() => {});
              }, "Refresh Reports")}
            </div>

            {reportLoading && <p style={{ color: colors.blue, fontSize: 13 }}>Loading event reports...</p>}

            {!reportLoading && eventReportRows.length === 0 && (
              <p style={{ color: colors.muted, fontSize: 13 }}>No event report data was returned by the server.</p>
            )}

            {eventReportRows.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
                  <thead>
                    <tr>
                      {["Event", "Date", "Organizer", "Registered", "Participants", "Cancelled", "Feedback", "Avg. Rating"].map((heading) => (
                        <th key={heading} style={{
                          padding: "12px 10px", textAlign: "left", background: "#f7f9fd",
                          color: colors.muted, fontSize: 11, textTransform: "uppercase",
                          borderBottom: `1px solid ${colors.border}`
                        }}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {eventReportRows.map((item) => (
                      <tr key={item.id}>
                        <td style={td}><strong style={{ color: colors.ink }}>{item.title}</strong></td>
                        <td style={td}>{item.date}</td>
                        <td style={td}>{item.organizer}</td>
                        <td style={td}>{item.registered}</td>
                        <td style={{ ...td, minWidth: 200, whiteSpace: "pre-wrap" }}>
                          {item.participants.length
                            ? item.participants.map((person) => `${person.fullName}${person.email ? ` (${person.email})` : ""}`).join("\n")
                            : "No active registrations"}
                        </td>
                        <td style={td}>{item.cancelled}</td>
                        <td style={td}>{item.feedbackCount}</td>
                        <td style={td}>{item.averageRating === "—" ? "—" : `${item.averageRating} / 5`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ ...card, marginBottom: 20 }}>
            <h3 style={{ color: colors.ink, margin: "0 0 6px", fontSize: 17 }}>
              Student Feedback Details
            </h3>
            <p style={{ color: colors.muted, fontSize: 12, margin: "0 0 15px" }}>
              Each feedback submission is included in the downloadable feedback CSV.
            </p>
            {feedbackLoading && <p style={{ color: colors.blue, fontSize: 13 }}>Loading feedback responses...</p>}
            {!feedbackLoading && eventFeedback.length === 0 && (
              <p style={{ color: colors.muted, fontSize: 13 }}>No feedback submissions are available yet.</p>
            )}
            {eventFeedback.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr>
                      {["Event", "Student", "Email", "Rating", "Feedback", "Submitted"].map((heading) => (
                        <th key={heading} style={{
                          padding: "12px 10px", textAlign: "left", background: "#f7f9fd",
                          color: colors.muted, fontSize: 11, textTransform: "uppercase",
                          borderBottom: `1px solid ${colors.border}`
                        }}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {eventFeedback.map((item, index) => (
                      <tr key={item._id || index}>
                        <td style={td}>{getEventTitle(item)}</td>
                        <td style={td}>{getStudentName(item)}</td>
                        <td style={td}>{getStudentEmail(item)}</td>
                        <td style={td}>{getRating(item) ? `${getRating(item)} / 5` : "—"}</td>
                        <td style={{ ...td, minWidth: 180, whiteSpace: "pre-wrap" }}>
                          {String(getComments(item) || "No written comment")}
                        </td>
                        <td style={td}>
                          {item.createdAt || item.submittedAt
                            ? new Date(item.createdAt || item.submittedAt).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 25 }}>
            ReConnect • Connecting Students and Alumni
          </p>
        </>
      );
    }

    return null;

  }

  return (

    <div

      className="admin-shell"

      style={{

        minHeight: "100vh",

        background: colors.bg,

        color: colors.ink,

        fontFamily: "Inter, Segoe UI, Arial, sans-serif"

      }}

    >

      <style>{`

        * { box-sizing: border-box; }

        .admin-layout {

          display: flex;

          min-height: calc(100vh - 72px);

        }

        .admin-sidebar {

          width: 245px;

          flex-shrink: 0;

          padding: 20px 14px;

          background: #fff;

          border-right: 1px solid ${colors.border};

          display: flex;

          flex-direction: column;

          gap: 6px;

        }

        .admin-main {

          flex: 1;

          min-width: 0;

          padding: 28px;

        }

        .admin-nav {

          border: 0;

          border-radius: 11px;

          padding: 12px 14px;

          display: flex;

          align-items: center;

          gap: 12px;

          text-align: left;

          cursor: pointer;

          font-size: 13px;

          font-weight: 700;

          color: #69758d;

          background: transparent;

          width: 100%;

        }

        .admin-nav:hover {

          background: #f2f5ff;

          color: ${colors.blue};

        }

        .admin-nav.active {

          background: linear-gradient(100deg,#eaf0ff,#f0ecff);

          color: ${colors.blue};

          box-shadow: inset 3px 0 ${colors.blue};

        }

        .admin-topbar {

          height: 72px;

          background: #fff;

          border-bottom: 1px solid ${colors.border};

          display: flex;

          align-items: center;

          justify-content: space-between;

          padding: 0 28px;

          gap: 15px;

        }

        .admin-mobile-title { display: none; }

        @media(max-width:850px) {

          .admin-layout { display: block; }

          .admin-sidebar {

            width: 100%;

            flex-direction: row;

            overflow-x: auto;

            padding: 10px 12px;

            border-right: 0;

            border-bottom: 1px solid ${colors.border};

          }

          .admin-nav {

            width: auto;

            white-space: nowrap;

            flex-shrink: 0;

            padding: 10px 12px;

          }

          .admin-main { padding: 20px 15px; }

          .admin-topbar { padding: 0 16px; }

          .admin-mobile-title { display: block; }

        }

        @media(max-width:480px) {

          .admin-topbar {

            height: auto;

            min-height: 68px;

            padding: 12px;

          }

          .admin-topbar h2 { font-size: 16px !important; }

          .admin-main { padding: 16px 11px; }

        }

        @media print {

          body { background: #fff !important; }

          .admin-topbar,

          .admin-sidebar,

          .no-print,

          .admin-message {

            display: none !important;

          }

          .admin-main { padding: 0 !important; }

          .admin-shell { background: #fff !important; }

          #reconnect-report {

            box-shadow: none !important;

            border: 0 !important;

            max-width: none !important;

          }

        }

      `}</style>

      <header className="admin-topbar">

        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>

          <div

            style={{

              width: 40,

              height: 40,

              borderRadius: 13,

              display: "grid",

              placeItems: "center",

              color: "#fff",

              fontSize: 22,

              fontWeight: 900,

              background: "linear-gradient(135deg,#4169e1,#7654d6)"

            }}

          >

            R

          </div>

          <div>

            <h2

              style={{

                margin: 0,

                fontSize: 19,

                color: colors.ink,

                fontWeight: 850

              }}

            >

              ReConnect

            </h2>

            <small style={{ color: colors.muted, fontSize: 11 }}>

              Admin Console

            </small>

          </div>

        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

          <div style={{ textAlign: "right" }}>

            <div

              style={{

                fontSize: 12,

                color: colors.ink,

                fontWeight: 800

              }}

            >

              {adminName}

            </div>

            <small style={{ color: colors.muted, fontSize: 10 }}>

              Administrator

            </small>

          </div>

          <div

            style={{

              width: 37,

              height: 37,

              borderRadius: "50%",

              background: "#eaf0ff",

              color: colors.blue,

              display: "grid",

              placeItems: "center",

              fontWeight: 850

            }}

          >

            {adminName.charAt(0).toUpperCase()}

          </div>

          <button

            className="no-print"

            style={{

              ...button,

              background: "#fff0f1",

              color: "#b52d3b"

            }}

            onClick={logout}

          >

            Logout

          </button>

        </div>

      </header>

      <div className="admin-layout">

        <aside className="admin-sidebar">

          <div

            className="admin-mobile-title"

            style={{

              padding: "5px 9px",

              color: colors.muted,

              fontSize: 10,

              fontWeight: 800

            }}

          >

            MENU

          </div>

          <div

            className="no-print"

            style={{

              color: "#a0a9ba",

              fontSize: 10,

              fontWeight: 800,

              padding: "5px 13px 9px",

              letterSpacing: 1

            }}

          >

            WORKSPACE

          </div>

          {sections.map((item) => (

            <button

              key={item.name}

              className={`admin-nav ${

                section === item.name ? "active" : ""

              }`}

              onClick={() => {

                setSection(item.name);

                setMessage("");

              }}

            >

              <span

                style={{

                  fontSize: 19,

                  width: 23,

                  textAlign: "center"

                }}

              >

                {item.icon}

              </span>

              {item.name}

              {item.name === "Validate Users" &&

                stats.pendingApprovals > 0 && (

                  <span

                    style={{

                      marginLeft: "auto",

                      background: "#ffedcc",

                      color: "#98600a",

                      borderRadius: 20,

                      padding: "3px 7px",

                      fontSize: 10

                    }}

                  >

                    {stats.pendingApprovals}

                  </span>

                )}

            </button>

          ))}

          <div

            className="no-print"

            style={{

              marginTop: "auto",

              padding: 13,

              borderRadius: 14,

              background: "#f5f7ff"

            }}

          >

            <div

              style={{

                fontSize: 11,

                color: colors.ink,

                fontWeight: 800,

                marginBottom: 5

              }}

            >

              ReConnect Admin

            </div>

            <div

              style={{

                fontSize: 10,

                color: colors.muted,

                lineHeight: 1.5

              }}

            >

              Manage the student and alumni community.

            </div>

          </div>

        </aside>

        <main className="admin-main">

          {message && (

            <div

              className="admin-message"

              style={{

                background: "#eaf4ff",

                border: "1px solid #c9e0ff",

                color: "#245ba6",

                borderRadius: 11,

                padding: "12px 15px",

                marginBottom: 18,

                fontSize: 13,

                display: "flex",

                justifyContent: "space-between",

                gap: 10

              }}

            >

              <span>{message}</span>

              <button

                onClick={() => setMessage("")}

                style={{

                  border: 0,

                  background: "transparent",

                  cursor: "pointer",

                  color: "inherit"

                }}

              >

                ✕

              </button>

            </div>

          )}

          {loading && (

            <div

              className="no-print"

              style={{

                color: colors.blue,

                fontSize: 12,

                marginBottom: 12

              }}

            >

              Loading latest information...

            </div>

          )}

          {renderSection()}

        </main>

      </div>

    </div>

  );

}
