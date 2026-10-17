
import { useEffect, useMemo, useState } from "react";

const API = "https://reconnect-system.onrender.com/api";

const COLORS = {
  blue: "#4169e1",
  purple: "#7654d6",
  green: "#159c78",
  orange: "#e99536",
  red: "#dc4c58",
  ink: "#202b45",
  muted: "#77839b",
  border: "#e8edf5",
  bg: "#f4f7fc",
};

const NAVIGATION = [
  { id: "dashboard", label: "Dashboard", icon: "⌂", group: "WORKSPACE" },
  { id: "validate", label: "Validate Users", icon: "✓", group: "WORKSPACE" },
  { id: "users", label: "Manage Users", icon: "♙", group: "WORKSPACE" },
  { id: "mentorships", label: "Mentorship Requests", icon: "♧", group: "WORKSPACE" },
  { id: "opportunities", label: "Opportunities", icon: "▣", group: "MANAGEMENT" },
  { id: "events", label: "Events", icon: "▦", group: "MANAGEMENT" },
  { id: "feedback", label: "Event Feedback", icon: "☆", group: "MANAGEMENT" },
  { id: "notifications", label: "Notifications", icon: "♧", group: "MANAGEMENT" },
  { id: "reports", label: "Generate Reports", icon: "▤", group: "REPORTS" },
];

const safeArray = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

const getId = (item) => item?._id || item?.id || item?.userId || "";

const getName = (item) =>
  item?.name ||
  item?.fullName ||
  item?.username ||
  item?.title ||
  item?.email ||
  "Not available";

const getStatus = (item) =>
  String(item?.status || "Pending").toLowerCase();

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

function readUser() {
  try {
    return (
      JSON.parse(localStorage.getItem("user") || "null") ||
      JSON.parse(localStorage.getItem("loggedInUser") || "null") ||
      {}
    );
  } catch {
    return {};
  }
}

function StatusBadge({ status }) {
  const normalized = String(status || "Pending").toLowerCase();

  const style =
    normalized === "approved" ||
    normalized === "accepted" ||
    normalized === "published" ||
    normalized === "active"
      ? { background: "#e4f7ee", color: "#14845f" }
      : normalized === "rejected" ||
          normalized === "declined" ||
          normalized === "cancelled"
        ? { background: "#ffebed", color: "#c43848" }
        : normalized === "read" ||
            normalized === "completed"
          ? { background: "#e9efff", color: "#4169e1" }
          : { background: "#fff3dc", color: "#a96b10" };

  return (
    <span className="rc-status" style={style}>
      {status || "Pending"}
    </span>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rc-empty">
      <div className="rc-empty-icon">▤</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function DataTable({
  columns,
  rows,
  emptyTitle = "No records found",
  emptyDescription = "Records will appear here when available.",
}) {
  if (!rows.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="rc-table-wrap">
      <table className="rc-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getId(row) || index}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render
                    ? column.render(row, index)
                    : row[column.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboard() {
  const [user] = useState(readUser);
  const [activeSection, setActiveSection] = useState("dashboard");

  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [mentorships, setMentorships] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedback, setFeedback] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const adminName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    "ReConnect Admin";

  const adminEmail = user?.email || "Administrator";

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const raw = await response.text();
    let data = {};

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw };
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          `Request failed (${response.status})`
      );
    }

    return data;
  }

  async function loadDashboard(showSpinner = true) {
    if (showSpinner) setLoading(true);

    setError("");

    const results = await Promise.allSettled([
      request("/admin/stats"),
      request("/admin/users"),
      request("/admin/mentorships"),
      request("/admin/opportunities"),
      request("/admin/events"),
      request("/admin/notifications"),
      request("/admin/event-feedback"),
    ]);

    const setters = [
      (data) => setStats(data?.stats || data?.data || data || {}),
      (data) => setUsers(safeArray(data?.users || data)),
      (data) => setMentorships(safeArray(data?.mentorships || data)),
      (data) =>
        setOpportunities(safeArray(data?.opportunities || data)),
      (data) => setEvents(safeArray(data?.events || data)),
      (data) =>
        setNotifications(safeArray(data?.notifications || data)),
      (data) => setFeedback(safeArray(data?.feedback || data)),
    ];

    const failures = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        setters[index](result.value);
      } else {
        failures.push(result.reason?.message || "A request failed");
      }
    });

    if (failures.length === results.length) {
      setError(
        "Could not load dashboard data. Check your internet connection and backend availability."
      );
    } else if (failures.length) {
      setError(
        "Some sections could not be loaded. Use Refresh to try again."
      );
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadDashboard(true);
    // Load dashboard information when the component opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refreshDashboard() {
    setRefreshing(true);
    loadDashboard(false);
  }

  function showSuccess(message) {
    setSuccess(message);
    setError("");

    window.setTimeout(() => {
      setSuccess("");
    }, 3500);
  }

  async function changeUserStatus(id, status) {
    if (!id) {
      setError("The selected user does not have a valid ID.");
      return;
    }

    try {
      await request(`/admin/users/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });

      showSuccess(`User ${status.toLowerCase()} successfully.`);
      await loadDashboard(false);
    } catch (err) {
      setError(err.message || "Could not update user status.");
    }
  }

  async function deleteRecord(path, label) {
    if (!window.confirm(`Are you sure you want to delete this ${label}?`)) {
      return;
    }

    try {
      await request(path, { method: "DELETE" });
      showSuccess(`${label} deleted successfully.`);
      await loadDashboard(false);
    } catch (err) {
      setError(err.message || `Could not delete ${label}.`);
    }
  }

  async function markNotificationRead(notification) {
    const id = getId(notification);

    if (!id) {
      setError("This notification does not have a valid ID.");
      return;
    }

    try {
      await request(`/admin/notifications/${id}/read`, {
        method: "PUT",
      });

      showSuccess("Notification marked as read.");
      await loadDashboard(false);
    } catch (err) {
      setError(err.message || "Could not update notification.");
    }
  }

  function logout() {
    if (!window.confirm("Are you sure you want to log out?")) return;

    [
      "user",
      "loggedInUser",
      "token",
      "authToken",
      "userInfo",
    ].forEach((key) => localStorage.removeItem(key));

    window.location.href = "/login";
  }

  function downloadCSV(filename, rows) {
    if (!rows.length) {
      setError("There are no records to export.");
      return;
    }

    const keys = [
      ...new Set(rows.flatMap((row) => Object.keys(row || {}))),
    ];

    const escapeCell = (value) => {
      if (value === null || value === undefined) return "";

      const text =
        typeof value === "object" ? JSON.stringify(value) : String(value);

      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
      keys.map(escapeCell).join(","),
      ...rows.map((row) =>
        keys.map((key) => escapeCell(row[key])).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }

  async function loadEventReport() {
    setReportLoading(true);
    setError("");
    setReportData(null);

    try {
      const [participation, feedbackReport] = await Promise.allSettled([
        request("/admin/reports/events"),
        request("/admin/reports/feedback"),
      ]);

      const report = {
        participation:
          participation.status === "fulfilled"
            ? participation.value
            : null,
        feedback:
          feedbackReport.status === "fulfilled"
            ? feedbackReport.value
            : null,
      };

      setReportData(report);

      if (
        participation.status === "rejected" &&
        feedbackReport.status === "rejected"
      ) {
        setError(
          "The report endpoints could not be loaded. Check which report routes your backend supports."
        );
      }
    } finally {
      setReportLoading(false);
    }
  }

  const pendingUsers = useMemo(
    () => users.filter((item) => getStatus(item) === "pending"),
    [users]
  );

  const unreadNotifications = useMemo(
    () =>
      notifications.filter(
        (item) =>
          item?.isRead === false ||
          item?.read === false ||
          getStatus(item) === "unread"
      ),
    [notifications]
  );

  const visibleUsers = useMemo(() => {
    const query = search.toLowerCase().trim();

    return users.filter((item) => {
      const matchesRole =
        roleFilter === "All" ||
        String(item?.role || "").toLowerCase() ===
          roleFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "All" ||
        String(item?.status || "").toLowerCase() ===
          statusFilter.toLowerCase();

      const matchesSearch =
        !query ||
        [
          item?.name,
          item?.fullName,
          item?.email,
          item?.role,
          item?.college,
          item?.status,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesRole && matchesStatus && matchesSearch;
    });
  }, [users, search, roleFilter, statusFilter]);

  const cards = [
    {
      label: "Total Users",
      value: stats?.totalUsers ?? stats?.total_users ?? users.length,
      icon: "♙",
      color: COLORS.blue,
      section: "users",
    },
    {
      label: "Students",
      value:
        stats?.students ??
        users.filter(
          (item) => String(item?.role).toLowerCase() === "student"
        ).length,
      icon: "♧",
      color: COLORS.purple,
      section: "users",
    },
    {
      label: "Alumni",
      value:
        stats?.alumni ??
        users.filter(
          (item) => String(item?.role).toLowerCase() === "alumni"
        ).length,
      icon: "♙",
      color: COLORS.green,
      section: "users",
    },
    {
      label: "Pending Approvals",
      value:
        stats?.pendingApprovals ??
        stats?.pendingUsers ??
        pendingUsers.length,
      icon: "◷",
      color: COLORS.orange,
      section: "validate",
    },
    {
      label: "Mentorship Requests",
      value: stats?.mentorshipRequests ?? mentorships.length,
      icon: "♧",
      color: "#168ca5",
      section: "mentorships",
    },
    {
      label: "Opportunities",
      value: stats?.opportunities ?? opportunities.length,
      icon: "▣",
      color: "#7654d6",
      section: "opportunities",
    },
    {
      label: "Events",
      value: stats?.events ?? events.length,
      icon: "▦",
      color: "#d16b35",
      section: "events",
    },
    {
      label: "Notifications",
      value: stats?.notifications ?? notifications.length,
      icon: "♧",
      color: "#d44d70",
      section: "notifications",
    },
    {
      label: "Event Feedback",
      value: stats?.eventFeedback ?? stats?.feedback ?? feedback.length,
      icon: "☆",
      color: "#a27a15",
      section: "feedback",
    },
  ];

  const pageTitles = {
    dashboard: "Dashboard",
    validate: "Validate Users",
    users: "Manage Users",
    mentorships: "Mentorship Requests",
    opportunities: "Opportunities",
    events: "Events",
    feedback: "Event Feedback",
    notifications: "Notifications",
    reports: "Generate Reports",
  };

  function openSection(section) {
    setActiveSection(section);
    setMobileMenuOpen(false);
    setSearch("");
    setError("");
    setSuccess("");
  }

  function renderDashboard() {
    return (
      <>
        <section className="rc-hero">
          <div className="rc-hero-content">
            <span className="rc-hero-label">ADMINISTRATION PANEL</span>
            <h2>Welcome back, ReConnect Admin!</h2>
            <p>
              Manage users, review registrations, and monitor the
              ReConnect community from one place.
            </p>
            <button
              className="rc-hero-button"
              onClick={() => openSection("validate")}
            >
              Review registrations <span>→</span>
            </button>
          </div>
          <div className="rc-hero-decoration" aria-hidden="true">
            <div className="rc-orbit rc-orbit-one" />
            <div className="rc-orbit rc-orbit-two" />
            <div className="rc-hero-symbol">R</div>
          </div>
        </section>

        <div className="rc-section-heading">
          <div>
            <h2>Platform Overview</h2>
            <p>Refresh the latest platform information.</p>
          </div>
          <button
            className="rc-button rc-button-light"
            onClick={refreshDashboard}
            disabled={refreshing}
          >
            <span className={refreshing ? "rc-spin" : ""}>↻</span>{" "}
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="rc-stats-grid">
          {cards.map((card) => (
            <button
              type="button"
              className="rc-stat-card"
              key={card.label}
              onClick={() => openSection(card.section)}
              style={{ "--card-color": card.color }}
            >
              <div className="rc-stat-top">
                <span className="rc-stat-icon">{card.icon}</span>
                <span className="rc-stat-arrow">↗</span>
              </div>
              <div className="rc-stat-value">{card.value}</div>
              <div className="rc-stat-label">{card.label}</div>
              <div className="rc-stat-line" />
            </button>
          ))}
        </div>

        <div className="rc-content-grid">
          <section className="rc-panel">
            <div className="rc-panel-heading">
              <div>
                <h3>Recent Registrations</h3>
                <p>Review the latest user registrations.</p>
              </div>
              <button
                className="rc-text-button"
                onClick={() => openSection("validate")}
              >
                View all →
              </button>
            </div>

            {pendingUsers.length ? (
              <div className="rc-activity-list">
                {pendingUsers.slice(0, 5).map((item, index) => (
                  <div
                    className="rc-activity-item"
                    key={getId(item) || index}
                  >
                    <div className="rc-avatar">
                      {getName(item).charAt(0).toUpperCase()}
                    </div>
                    <div className="rc-activity-info">
                      <strong>{getName(item)}</strong>
                      <span>{item?.email || item?.role || "New user"}</span>
                    </div>
                    <StatusBadge status={item?.status} />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="All caught up!"
                description="There are no pending user registrations."
              />
            )}
          </section>

          <section className="rc-panel">
            <div className="rc-panel-heading">
              <div>
                <h3>Quick Actions</h3>
                <p>Jump directly to an admin task.</p>
              </div>
            </div>
            <div className="rc-quick-actions">
              {[
                ["validate", "Approve users", "Review pending accounts", "✓"],
                ["mentorships", "Mentorship requests", "Monitor requests", "♧"],
                ["events", "Manage events", "Review platform events", "▦"],
                ["reports", "View reports", "Export platform records", "▤"],
              ].map(([section, title, description, icon]) => (
                <button
                  className="rc-quick-action"
                  key={section}
                  onClick={() => openSection(section)}
                >
                  <span className="rc-quick-icon">{icon}</span>
                  <span className="rc-quick-text">
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                  <span className="rc-quick-arrow">→</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </>
    );
  }

  function renderValidateUsers() {
    return (
      <section className="rc-panel">
        <div className="rc-panel-heading">
          <div>
            <h3>Pending User Approvals</h3>
            <p>Approve or reject new Student and Alumni registrations.</p>
          </div>
          <span className="rc-count">{pendingUsers.length} pending</span>
        </div>

        <DataTable
          rows={pendingUsers}
          emptyTitle="No pending registrations"
          emptyDescription="New registrations awaiting approval will appear here."
          columns={[
            {
              key: "name",
              label: "USER",
              render: (item) => (
                <div className="rc-user-cell">
                  <div className="rc-avatar">
                    {getName(item).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong>{getName(item)}</strong>
                    <span>{item?.email || "—"}</span>
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              label: "ROLE",
              render: (item) => item?.role || "—",
            },
            {
              key: "createdAt",
              label: "REGISTERED",
              render: (item) => formatDate(item?.createdAt || item?.date),
            },
            {
              key: "status",
              label: "STATUS",
              render: (item) => <StatusBadge status={item?.status} />,
            },
            {
              key: "actions",
              label: "ACTIONS",
              render: (item) => (
                <div className="rc-action-group">
                  <button
                    className="rc-button rc-button-success"
                    onClick={() => changeUserStatus(getId(item), "Approved")}
                  >
                    Approve
                  </button>
                  <button
                    className="rc-button rc-button-danger"
                    onClick={() => changeUserStatus(getId(item), "Rejected")}
                  >
                    Reject
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>
    );
  }

  function renderUsers() {
    return (
      <section className="rc-panel">
        <div className="rc-panel-heading">
          <div>
            <h3>All Users</h3>
            <p>Search, filter, and manage registered accounts.</p>
          </div>
          <button
            className="rc-button rc-button-light"
            onClick={() => downloadCSV("reconnect-users.csv", visibleUsers)}
          >
            ↓ Export CSV
          </button>
        </div>

        <div className="rc-filters">
          <input
            className="rc-input"
            placeholder="Search by name, email, college..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="rc-input"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option>All</option>
            <option>Student</option>
            <option>Alumni</option>
            <option>Admin</option>
          </select>
          <select
            className="rc-input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option>All</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>

        <DataTable
          rows={visibleUsers}
          emptyTitle="No matching users"
          emptyDescription="Try changing your search or filter."
          columns={[
            {
              key: "name",
              label: "USER",
              render: (item) => (
                <div className="rc-user-cell">
                  <div className="rc-avatar">
                    {getName(item).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong>{getName(item)}</strong>
                    <span>{item?.email || "—"}</span>
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              label: "ROLE",
              render: (item) => item?.role || "—",
            },
            {
              key: "status",
              label: "STATUS",
              render: (item) => <StatusBadge status={item?.status} />,
            },
            {
              key: "createdAt",
              label: "JOINED",
              render: (item) => formatDate(item?.createdAt),
            },
            {
              key: "actions",
              label: "ACTIONS",
              render: (item) => (
                <div className="rc-action-group">
                  {getStatus(item) !== "approved" && (
                    <button
                      className="rc-icon-button"
                      title="Approve user"
                      onClick={() =>
                        changeUserStatus(getId(item), "Approved")
                      }
                    >
                      ✓
                    </button>
                  )}
                  {getStatus(item) !== "rejected" && (
                    <button
                      className="rc-icon-button rc-icon-danger"
                      title="Reject user"
                      onClick={() =>
                        changeUserStatus(getId(item), "Rejected")
                      }
                    >
                      ✕
                    </button>
                  )}
                  <button
                    className="rc-icon-button rc-icon-danger"
                    title="Delete user"
                    onClick={() =>
                      deleteRecord(`/admin/users/${getId(item)}`, "user")
                    }
                  >
                    🗑
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>
    );
  }

  function renderMentorships() {
    return (
      <section className="rc-panel">
        <div className="rc-panel-heading">
          <div>
            <h3>Mentorship Requests</h3>
            <p>Monitor student requests and their current status.</p>
          </div>
          <button
            className="rc-button rc-button-light"
            onClick={() =>
              downloadCSV("reconnect-mentorships.csv", mentorships)
            }
          >
            ↓ Export CSV
          </button>
        </div>

        <DataTable
          rows={mentorships}
          columns={[
            {
              key: "student",
              label: "STUDENT",
              render: (item) =>
                getName(item?.student) ||
                item?.studentName ||
                item?.studentEmail ||
                "—",
            },
            {
              key: "alumni",
              label: "ALUMNI",
              render: (item) =>
                getName(item?.alumni) ||
                item?.alumniName ||
                item?.alumniEmail ||
                "—",
            },
            {
              key: "message",
              label: "MESSAGE",
              render: (item) => item?.message || item?.topic || "—",
            },
            {
              key: "createdAt",
              label: "REQUESTED",
              render: (item) => formatDate(item?.createdAt),
            },
            {
              key: "status",
              label: "STATUS",
              render: (item) => <StatusBadge status={item?.status} />,
            },
          ]}
        />
      </section>
    );
  }

  function renderOpportunities() {
    return (
      <section className="rc-panel">
        <div className="rc-panel-heading">
          <div>
            <h3>Manage Opportunities</h3>
            <p>View opportunities shared with the ReConnect community.</p>
          </div>
          <button
            className="rc-button rc-button-light"
            onClick={() =>
              downloadCSV("reconnect-opportunities.csv", opportunities)
            }
          >
            ↓ Export CSV
          </button>
        </div>

        <DataTable
          rows={opportunities}
          columns={[
            {
              key: "title",
              label: "OPPORTUNITY",
              render: (item) => (
                <div>
                  <strong>{item?.title || "Untitled opportunity"}</strong>
                  <div className="rc-secondary">
                    {item?.company || item?.organization || "—"}
                  </div>
                </div>
              ),
            },
            {
              key: "type",
              label: "TYPE",
              render: (item) => item?.type || item?.category || "—",
            },
            {
              key: "postedBy",
              label: "POSTED BY",
              render: (item) =>
                getName(item?.postedBy || item?.alumni) ||
                item?.postedByName ||
                "—",
            },
            {
              key: "createdAt",
              label: "POSTED",
              render: (item) => formatDate(item?.createdAt),
            },
            {
              key: "actions",
              label: "ACTIONS",
              render: (item) => (
                <button
                  className="rc-icon-button rc-icon-danger"
                  title="Delete opportunity"
                  onClick={() =>
                    deleteRecord(
                      `/admin/opportunities/${getId(item)}`,
                      "opportunity"
                    )
                  }
                >
                  🗑
                </button>
              ),
            },
          ]}
        />
      </section>
    );
  }

  function renderEvents() {
    return (
      <section className="rc-panel">
        <div className="rc-panel-heading">
          <div>
            <h3>Manage Events</h3>
            <p>Review event details and remove events when necessary.</p>
          </div>
          <button
            className="rc-button rc-button-light"
            onClick={() => downloadCSV("reconnect-events.csv", events)}
          >
            ↓ Export CSV
          </button>
        </div>

        <DataTable
          rows={events}
          columns={[
            {
              key: "title",
              label: "EVENT",
              render: (item) => (
                <div>
                  <strong>{item?.title || item?.name || "Untitled event"}</strong>
                  <div className="rc-secondary">
                    {item?.location || "Location not specified"}
                  </div>
                </div>
              ),
            },
            {
              key: "startDate",
              label: "DATE",
              render: (item) =>
                formatDate(item?.startDate || item?.eventDate || item?.date),
            },
            {
              key: "startTime",
              label: "TIME",
              render: (item) => item?.startTime || item?.time || "—",
            },
            {
              key: "status",
              label: "STATUS",
              render: (item) => (
                <StatusBadge status={item?.status || "Published"} />
              ),
            },
            {
              key: "actions",
              label: "ACTIONS",
              render: (item) => (
                <button
                  className="rc-icon-button rc-icon-danger"
                  title="Delete event"
                  onClick={() =>
                    deleteRecord(`/admin/events/${getId(item)}`, "event")
                  }
                >
                  🗑
                </button>
              ),
            },
          ]}
        />
      </section>
    );
  }

  function renderFeedback() {
    return (
      <section className="rc-panel">
        <div className="rc-panel-heading">
          <div>
            <h3>Event Feedback</h3>
            <p>Review ratings and comments submitted by students.</p>
          </div>
          <button
            className="rc-button rc-button-light"
            onClick={() => downloadCSV("reconnect-event-feedback.csv", feedback)}
          >
            ↓ Export CSV
          </button>
        </div>

        <DataTable
          rows={feedback}
          emptyTitle="No feedback available"
          emptyDescription="Student event feedback will appear here when available."
          columns={[
            {
              key: "event",
              label: "EVENT",
              render: (item) =>
                getName(item?.event) ||
                item?.eventTitle ||
                item?.title ||
                "—",
            },
            {
              key: "student",
              label: "STUDENT",
              render: (item) =>
                getName(item?.student) ||
                item?.studentName ||
                item?.studentEmail ||
                "—",
            },
            {
              key: "rating",
              label: "RATING",
              render: (item) => {
                const rating = Number(item?.rating || item?.stars || 0);
                return rating ? `${rating} / 5 ★` : "—";
              },
            },
            {
              key: "comment",
              label: "COMMENT",
              render: (item) => (
                <span className="rc-comment">
                  {item?.comment || item?.feedback || item?.message || "—"}
                </span>
              ),
            },
            {
              key: "createdAt",
              label: "SUBMITTED",
              render: (item) => formatDate(item?.createdAt),
            },
          ]}
        />
      </section>
    );
  }

  function renderNotifications() {
    return (
      <section className="rc-panel">
        <div className="rc-panel-heading">
          <div>
            <h3>Notifications</h3>
            <p>Review system activity and notification messages.</p>
          </div>
          <span className="rc-count">
            {unreadNotifications.length} unread
          </span>
        </div>

        {notifications.length ? (
          <div className="rc-notification-list">
            {notifications.map((item, index) => {
              const isUnread =
                item?.isRead === false ||
                item?.read === false ||
                getStatus(item) === "unread";

              return (
                <div
                  className={`rc-notification ${isUnread ? "rc-notification-unread" : ""}`}
                  key={getId(item) || index}
                >
                  <div className="rc-notification-icon">
                    {isUnread ? "●" : "✓"}
                  </div>
                  <div className="rc-notification-body">
                    <strong>
                      {item?.title || item?.type || "Notification"}
                    </strong>
                    <p>
                      {item?.message ||
                        item?.content ||
                        item?.description ||
                        "No message provided."}
                    </p>
                    <span>
                      {formatDateTime(item?.createdAt || item?.date)}
                    </span>
                  </div>
                  <div className="rc-notification-actions">
                    <StatusBadge status={isUnread ? "Unread" : "Read"} />
                    {isUnread && (
                      <button
                        className="rc-text-button"
                        onClick={() => markNotificationRead(item)}
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      className="rc-icon-button rc-icon-danger"
                      title="Delete notification"
                      onClick={() =>
                        deleteRecord(
                          `/admin/notifications/${getId(item)}`,
                          "notification"
                        )
                      }
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No notifications"
            description="System notifications will appear here."
          />
        )}
      </section>
    );
  }

  function renderReports() {
    return (
      <>
        <div className="rc-report-intro">
          <div className="rc-report-symbol">▤</div>
          <div>
            <h3>ReConnect Reports</h3>
            <p>
              Review platform records and export data for your project
              documentation.
            </p>
          </div>
        </div>

        <div className="rc-report-grid">
          {[
            {
              title: "User Report",
              description: "Export registered users, roles, and statuses.",
              icon: "♙",
              action: () => downloadCSV("reconnect-users.csv", users),
            },
            {
              title: "Mentorship Report",
              description: "Export student and alumni mentorship requests.",
              icon: "♧",
              action: () =>
                downloadCSV("reconnect-mentorships.csv", mentorships),
            },
            {
              title: "Opportunity Report",
              description: "Export available opportunity records.",
              icon: "▣",
              action: () =>
                downloadCSV("reconnect-opportunities.csv", opportunities),
            },
            {
              title: "Event Report",
              description: "Export events currently recorded on the platform.",
              icon: "▦",
              action: () => downloadCSV("reconnect-events.csv", events),
            },
            {
              title: "Feedback Report",
              description: "Export ratings and student comments.",
              icon: "☆",
              action: () =>
                downloadCSV("reconnect-event-feedback.csv", feedback),
            },
            {
              title: "Notification Report",
              description: "Export stored platform notifications.",
              icon: "♧",
              action: () =>
                downloadCSV("reconnect-notifications.csv", notifications),
            },
          ].map((report) => (
            <div className="rc-report-card" key={report.title}>
              <div className="rc-report-card-icon">{report.icon}</div>
              <h4>{report.title}</h4>
              <p>{report.description}</p>
              <button className="rc-button rc-button-light" onClick={report.action}>
                Download CSV ↓
              </button>
            </div>
          ))}
        </div>

        <section className="rc-panel rc-event-report">
          <div className="rc-panel-heading">
            <div>
              <h3>Event Participation Report</h3>
              <p>
                Request event participation and feedback summaries from
                the available report endpoints.
              </p>
            </div>
            <button
              className="rc-button rc-button-primary"
              onClick={loadEventReport}
              disabled={reportLoading}
            >
              {reportLoading ? "Loading..." : "Generate Report"}
            </button>
          </div>

          {reportData && (
            <div className="rc-report-result">
              {reportData.participation && (
                <div className="rc-report-data">
                  <h4>Event Participation</h4>
                  <pre>
                    {JSON.stringify(reportData.participation, null, 2)}
                  </pre>
                </div>
              )}

              {reportData.feedback && (
                <div className="rc-report-data">
                  <h4>Event Feedback Summary</h4>
                  <pre>
                    {JSON.stringify(reportData.feedback, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <button
            className="rc-button rc-button-light"
            onClick={() => window.print()}
          >
            Print Report
          </button>
        </section>
      </>
    );
  }

  function renderActiveSection() {
    switch (activeSection) {
      case "dashboard":
        return renderDashboard();
      case "validate":
        return renderValidateUsers();
      case "users":
        return renderUsers();
      case "mentorships":
        return renderMentorships();
      case "opportunities":
        return renderOpportunities();
      case "events":
        return renderEvents();
      case "feedback":
        return renderFeedback();
      case "notifications":
        return renderNotifications();
      case "reports":
        return renderReports();
      default:
        return renderDashboard();
    }
  }

  return (
    <div className="rc-admin">
      <style>{`
        .rc-admin {
          --rc-blue: #4169e1;
          --rc-ink: #202b45;
          --rc-muted: #77839b;
          --rc-border: #e8edf5;
          min-height: 100vh;
          background: #f4f7fc;
          color: var(--rc-ink);
          font-family: Inter, "Segoe UI", Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
        }

        .rc-admin * { box-sizing: border-box; }
        .rc-admin button, .rc-admin input, .rc-admin select {
          font: inherit;
        }
        .rc-admin button { cursor: pointer; }
        .rc-admin button:disabled { cursor: not-allowed; opacity: .6; }
        .rc-admin h2, .rc-admin h3, .rc-admin h4, .rc-admin p {
          margin-top: 0;
        }

        .rc-topbar {
          height: 76px;
          padding: 0 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          border-bottom: 1px solid var(--rc-border);
          position: sticky;
          top: 0;
          z-index: 30;
        }

        .rc-brand { display: flex; align-items: center; gap: 12px; }
        .rc-brand-mark {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          color: white;
          font-size: 21px;
          font-weight: 800;
          border-radius: 13px;
          background: linear-gradient(140deg, #4169e1, #7654d6);
          box-shadow: 0 5px 15px #4169e133;
        }
        .rc-brand-name { font-size: 19px; font-weight: 800; letter-spacing: -.5px; }
        .rc-brand-subtitle { color: var(--rc-muted); font-size: 11px; margin-top: -2px; }
        .rc-top-actions { display: flex; align-items: center; gap: 13px; }
        .rc-admin-info { text-align: right; }
        .rc-admin-info strong { display: block; font-size: 13px; }
        .rc-admin-info span { color: var(--rc-muted); font-size: 11px; }
        .rc-avatar-top {
          width: 40px; height: 40px; border-radius: 50%;
          display: grid; place-items: center;
          background: #e9edff; color: #4169e1;
          font-weight: 800; font-size: 15px;
        }
        .rc-logout {
          border: 1px solid #f0dfe2; color: #c43848;
          background: #fff; border-radius: 9px;
          padding: 9px 13px; font-weight: 650;
        }
        .rc-logout:hover { background: #fff3f4; }

        .rc-layout { display: flex; min-height: calc(100vh - 76px); }
        .rc-sidebar {
          width: 250px; flex-shrink: 0; background: #fff;
          border-right: 1px solid var(--rc-border);
          padding: 24px 14px;
        }
        .rc-sidebar-heading {
          font-size: 10px; font-weight: 800; letter-spacing: 1.25px;
          color: #a2aabd; padding: 0 12px; margin: 8px 0 9px;
        }
        .rc-nav-group { margin-bottom: 24px; }
        .rc-nav-item {
          display: flex; width: 100%; align-items: center; gap: 12px;
          text-align: left; padding: 11px 12px; margin: 3px 0;
          border: 0; border-radius: 10px; color: #64718a;
          background: transparent; font-weight: 600; font-size: 13px;
          transition: background .15s, color .15s;
        }
        .rc-nav-item:hover { background: #f4f6ff; color: var(--rc-blue); }
        .rc-nav-item.active {
          color: #4169e1; background: #edf1ff;
          box-shadow: inset 3px 0 #4169e1;
        }
        .rc-nav-icon {
          width: 22px; text-align: center; font-size: 18px;
          font-weight: 600;
        }
        .rc-nav-count {
          margin-left: auto; border-radius: 20px;
          background: #fff0d8; color: #9b6511;
          padding: 2px 7px; font-size: 10px; font-weight: 800;
        }
        .rc-sidebar-note {
          margin: 22px 3px 0; padding: 16px;
          border: 1px solid #e6eaff; border-radius: 13px;
          background: linear-gradient(145deg, #f7f8ff, #eff2ff);
        }
        .rc-sidebar-note strong { display: block; font-size: 12px; margin-bottom: 5px; }
        .rc-sidebar-note p { margin: 0; color: var(--rc-muted); font-size: 11px; }

        .rc-main { min-width: 0; flex: 1; padding: 28px 30px 38px; }
        .rc-page-heading {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; margin-bottom: 23px;
        }
        .rc-breadcrumb { color: var(--rc-muted); font-size: 12px; margin-bottom: 4px; }
        .rc-page-heading h1 { margin: 0; font-size: 25px; letter-spacing: -.7px; }
        .rc-page-heading p { color: var(--rc-muted); margin: 5px 0 0; font-size: 13px; }
        .rc-menu-button { display: none; }

        .rc-hero {
          min-height: 228px; border-radius: 19px; padding: 31px 35px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 20px; position: relative; overflow: hidden;
          color: white; margin-bottom: 29px;
          background: linear-gradient(115deg, #345bd4 0%, #5555d6 53%, #7954d8 100%);
          box-shadow: 0 12px 28px #465fca26;
        }
        .rc-hero-content { max-width: 570px; position: relative; z-index: 2; }
        .rc-hero-label {
          display: inline-block; border: 1px solid #ffffff55;
          background: #ffffff18; border-radius: 30px;
          padding: 5px 10px; font-size: 10px; font-weight: 800;
          letter-spacing: 1.4px; margin-bottom: 15px;
        }
        .rc-hero h2 {
          color: #fff; font-size: clamp(22px, 2.5vw, 31px);
          line-height: 1.2; letter-spacing: -.7px; margin: 0 0 10px;
        }
        .rc-hero p {
          color: #eef0ff; font-size: 13px; line-height: 1.7;
          max-width: 530px; margin: 0 0 19px;
        }
        .rc-hero-button {
          background: #fff; color: #435bc4; border: 0;
          padding: 10px 15px; border-radius: 9px;
          font-weight: 750; font-size: 12px;
          display: inline-flex; gap: 13px; align-items: center;
        }
        .rc-hero-button:hover { background: #f1f3ff; }
        .rc-hero-decoration { position: relative; width: 210px; height: 170px; flex-shrink: 0; }
        .rc-orbit {
          position: absolute; border: 1px solid #ffffff40;
          border-radius: 50%; transform: rotate(-24deg);
        }
        .rc-orbit-one { width: 190px; height: 115px; top: 24px; left: 5px; }
        .rc-orbit-two { width: 135px; height: 175px; top: -3px; left: 35px; }
        .rc-hero-symbol {
          position: absolute; top: 36px; left: 58px; width: 90px; height: 90px;
          display: grid; place-items: center; border-radius: 26px;
          background: #ffffff20; border: 1px solid #ffffff45;
          font-size: 52px; font-weight: 800; color: #fff;
          transform: rotate(-7deg);
        }

        .rc-section-heading, .rc-panel-heading {
          display: flex; justify-content: space-between;
          align-items: center; gap: 14px;
        }
        .rc-section-heading { margin-bottom: 16px; }
        .rc-section-heading h2 { font-size: 19px; margin: 0 0 4px; letter-spacing: -.35px; }
        .rc-section-heading p, .rc-panel-heading p {
          color: var(--rc-muted); font-size: 12px; margin: 0;
        }
        .rc-panel-heading { margin-bottom: 20px; }
        .rc-panel-heading h3 { font-size: 16px; margin: 0 0 4px; letter-spacing: -.2px; }

        .rc-button {
          display: inline-flex; justify-content: center; align-items: center;
          gap: 7px; border-radius: 8px; padding: 9px 12px;
          font-weight: 700; font-size: 12px; white-space: nowrap;
          border: 1px solid transparent; transition: .15s;
        }
        .rc-button-light { background: #fff; color: #52617a; border-color: var(--rc-border); }
        .rc-button-light:hover { border-color: #c9d3ef; background: #f9faff; }
        .rc-button-primary { background: #4169e1; color: white; }
        .rc-button-primary:hover { background: #3155c8; }
        .rc-button-success { background: #e4f7ee; color: #14845f; }
        .rc-button-success:hover { background: #d2f0e2; }
        .rc-button-danger { background: #fff0f1; color: #c43848; }
        .rc-button-danger:hover { background: #ffe0e3; }
        .rc-text-button { color: #4169e1; background: none; border: 0; font-size: 12px; font-weight: 750; }
        .rc-text-button:hover { color: #7654d6; }
        .rc-count {
          padding: 6px 10px; border-radius: 20px; color: #6b54c7;
          background: #f0ecff; font-size: 11px; font-weight: 750;
        }

        .rc-stats-grid {
          display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px; margin-bottom: 27px;
        }
        .rc-stat-card {
          min-width: 0; text-align: left; position: relative; overflow: hidden;
          background: #fff; border: 1px solid var(--rc-border);
          border-radius: 15px; padding: 18px 19px 17px;
          box-shadow: 0 2px 7px #263e7010;
          transition: transform .18s, box-shadow .18s, border-color .18s;
          color: var(--rc-ink);
        }
        .rc-stat-card:hover {
          transform: translateY(-3px); border-color: #d6def7;
          box-shadow: 0 10px 24px #263e7014;
        }
        .rc-stat-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .rc-stat-icon {
          display: grid; place-items: center; width: 43px; height: 43px;
          border-radius: 12px; color: var(--card-color);
          background: color-mix(in srgb, var(--card-color) 11%, white);
          font-size: 22px; font-weight: 700;
        }
        .rc-stat-arrow { color: #a4adc0; font-size: 16px; }
        .rc-stat-value { font-size: 30px; line-height: 1.15; font-weight: 800; letter-spacing: -1px; }
        .rc-stat-label { color: var(--rc-muted); font-size: 12px; margin-top: 5px; font-weight: 600; }
        .rc-stat-line { position: absolute; left: 0; bottom: 0; width: 100%; height: 3px; background: var(--card-color); opacity: .75; }

        .rc-content-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; }
        .rc-panel {
          background: #fff; border: 1px solid var(--rc-border);
          border-radius: 15px; padding: 22px;
          box-shadow: 0 2px 7px #263e7008; min-width: 0;
        }
        .rc-activity-list { display: flex; flex-direction: column; }
        .rc-activity-item {
          display: flex; align-items: center; gap: 11px;
          padding: 12px 0; border-bottom: 1px solid #f0f2f7;
        }
        .rc-activity-item:last-child { border-bottom: 0; }
        .rc-avatar {
          display: grid; place-items: center; flex-shrink: 0;
          width: 38px; height: 38px; border-radius: 12px;
          color: #5368c8; background: #eef1ff; font-weight: 800;
        }
        .rc-activity-info { min-width: 0; flex: 1; }
        .rc-activity-info strong { display: block; font-size: 12px; overflow-wrap: anywhere; }
        .rc-activity-info span { display: block; color: var(--rc-muted); font-size: 11px; margin-top: 3px; overflow-wrap: anywhere; }

        .rc-quick-actions { display: flex; flex-direction: column; }
        .rc-quick-action {
          display: flex; align-items: center; gap: 11px;
          padding: 12px 0; border: 0; border-bottom: 1px solid #f0f2f7;
          background: transparent; text-align: left; color: var(--rc-ink);
        }
        .rc-quick-action:last-child { border-bottom: 0; }
        .rc-quick-action:hover .rc-quick-icon { background: #e9edff; }
        .rc-quick-icon {
          width: 39px; height: 39px; display: grid; place-items: center;
          flex-shrink: 0; border-radius: 11px; background: #f3f5ff;
          color: #5266d0; font-size: 18px;
        }
        .rc-quick-text { min-width: 0; flex: 1; }
        .rc-quick-text strong { display: block; font-size: 12px; }
        .rc-quick-text small { display: block; font-size: 11px; color: var(--rc-muted); margin-top: 3px; }
        .rc-quick-arrow { color: #a1abc0; font-size: 18px; }

        .rc-status {
          display: inline-flex; align-items: center; white-space: nowrap;
          border-radius: 20px; padding: 5px 9px; font-size: 10px;
          font-weight: 800; text-transform: capitalize;
        }
        .rc-table-wrap { width: 100%; overflow-x: auto; }
        .rc-table { width: 100%; border-collapse: collapse; text-align: left; }
        .rc-table th {
          color: #8b96aa; background: #fafbfe; font-size: 10px;
          font-weight: 800; letter-spacing: .65px;
          padding: 13px 12px; border-bottom: 1px solid var(--rc-border);
          white-space: nowrap;
        }
        .rc-table td {
          padding: 14px 12px; border-bottom: 1px solid #eef1f7;
          color: #4c5972; font-size: 12px; vertical-align: middle;
        }
        .rc-table tbody tr:last-child td { border-bottom: 0; }
        .rc-table tbody tr:hover { background: #fbfcff; }
        .rc-user-cell { display: flex; align-items: center; gap: 10px; min-width: 150px; }
        .rc-user-cell strong { display: block; color: var(--rc-ink); font-size: 12px; }
        .rc-user-cell span { display: block; font-size: 11px; color: var(--rc-muted); margin-top: 3px; overflow-wrap: anywhere; }
        .rc-secondary { color: var(--rc-muted); font-size: 11px; margin-top: 3px; }
        .rc-action-group { display: flex; gap: 5px; flex-wrap: wrap; }
        .rc-icon-button {
          display: inline-grid; place-items: center;
          width: 30px; height: 30px; border-radius: 8px;
          border: 1px solid var(--rc-border); background: #fff;
          color: #52617a; font-size: 13px;
        }
        .rc-icon-button:hover { background: #f4f6ff; border-color: #d5dcf2; }
        .rc-icon-danger { color: #c43848; }
        .rc-icon-danger:hover { background: #fff0f1; border-color: #f5cbd0; }

        .rc-filters {
          display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 19px;
        }
        .rc-input {
          min-width: 0; border: 1px solid #dfe5f0;
          border-radius: 9px; padding: 10px 12px;
          color: var(--rc-ink); background: #fff; outline: none;
          font-size: 12px;
        }
        .rc-input:focus { border-color: #7891ed; box-shadow: 0 0 0 3px #4169e114; }
        .rc-filters .rc-input:first-child { flex: 1; min-width: 190px; }
        .rc-filters select { min-width: 125px; }

        .rc-empty { text-align: center; padding: 35px 18px; color: var(--rc-muted); }
        .rc-empty-icon {
          margin: 0 auto 12px; width: 47px; height: 47px;
          border-radius: 15px; display: grid; place-items: center;
          background: #f0f3ff; color: #6579d7; font-size: 22px;
        }
        .rc-empty h3 { font-size: 14px; color: var(--rc-ink); margin: 0 0 5px; }
        .rc-empty p { font-size: 12px; margin: 0; }

        .rc-notification-list { display: flex; flex-direction: column; }
        .rc-notification {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 17px 0; border-bottom: 1px solid #eef1f7;
        }
        .rc-notification:last-child { border-bottom: 0; }
        .rc-notification-unread { background: linear-gradient(90deg, #f8f9ff, #fff); }
        .rc-notification-icon {
          display: grid; place-items: center; flex-shrink: 0;
          width: 39px; height: 39px; border-radius: 12px;
          background: #edf1ff; color: #4169e1;
        }
        .rc-notification-body { flex: 1; min-width: 0; }
        .rc-notification-body strong { font-size: 13px; }
        .rc-notification-body p { color: #596781; font-size: 12px; margin: 5px 0; overflow-wrap: anywhere; }
        .rc-notification-body span { color: #929db0; font-size: 10px; }
        .rc-notification-actions { display: flex; align-items: flex-end; flex-direction: column; gap: 9px; }

        .rc-report-intro {
          display: flex; align-items: center; gap: 15px;
          background: linear-gradient(110deg, #edf1ff, #f8f5ff);
          border: 1px solid #e4e8ff; border-radius: 15px;
          padding: 22px; margin-bottom: 20px;
        }
        .rc-report-symbol {
          width: 50px; height: 50px; display: grid; place-items: center;
          flex-shrink: 0; border-radius: 14px; background: #fff;
          color: #5c63d6; font-size: 23px;
        }
        .rc-report-intro h3 { margin: 0 0 5px; font-size: 17px; }
        .rc-report-intro p { margin: 0; color: var(--rc-muted); font-size: 12px; }
        .rc-report-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 15px; margin-bottom: 20px; }
        .rc-report-card {
          background: #fff; border: 1px solid var(--rc-border);
          border-radius: 14px; padding: 19px;
          box-shadow: 0 2px 7px #263e7008;
        }
        .rc-report-card-icon {
          width: 40px; height: 40px; display: grid; place-items: center;
          background: #edf1ff; color: #5266d0;
          border-radius: 12px; font-size: 20px; margin-bottom: 13px;
        }
        .rc-report-card h4 { font-size: 13px; margin: 0 0 6px; }
        .rc-report-card p { color: var(--rc-muted); font-size: 11px; min-height: 34px; margin-bottom: 15px; }
        .rc-event-report { margin-bottom: 25px; }
        .rc-report-result { display: grid; gap: 14px; margin-bottom: 17px; }
        .rc-report-data { border: 1px solid var(--rc-border); border-radius: 10px; padding: 14px; min-width: 0; }
        .rc-report-data h4 { margin: 0 0 10px; font-size: 13px; }
        .rc-report-data pre {
          white-space: pre-wrap; overflow-wrap: anywhere;
          max-height: 350px; overflow: auto; font-size: 11px;
          background: #f7f8fc; border-radius: 8px; padding: 12px;
        }

        .rc-alert {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 15px; border-radius: 10px; margin-bottom: 18px;
          font-size: 12px; font-weight: 600;
        }
        .rc-alert-error { color: #a62e3d; background: #fff0f1; border: 1px solid #f8d9dd; }
        .rc-alert-success { color: #14724f; background: #e8f8f0; border: 1px solid #cdeedd; }
        .rc-footer { text-align: center; padding: 23px 10px 0; color: #9aa4b6; font-size: 11px; }

        .rc-spin { display: inline-block; animation: rc-rotation .8s linear infinite; }
        @keyframes rc-rotation { to { transform: rotate(360deg); } }

        @media (max-width: 1150px) {
          .rc-main { padding: 24px 21px 32px; }
          .rc-sidebar { width: 220px; }
          .rc-stats-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
          .rc-stat-card { padding: 16px; }
          .rc-content-grid { gap: 14px; }
          .rc-panel { padding: 18px; }
        }

        @media (max-width: 850px) {
          .rc-topbar { padding: 0 18px; }
          .rc-layout { display: block; }
          .rc-sidebar {
            display: none; position: fixed; z-index: 40;
            top: 76px; bottom: 0; left: 0; width: 270px;
            overflow-y: auto; box-shadow: 10px 0 30px #17264a22;
          }
          .rc-sidebar.rc-sidebar-open { display: block; }
          .rc-menu-button {
            display: inline-grid; place-items: center;
            width: 38px; height: 38px; border-radius: 9px;
            border: 1px solid var(--rc-border); background: #fff;
            color: var(--rc-ink); font-size: 20px;
          }
          .rc-main { padding: 23px 19px 30px; }
          .rc-content-grid { grid-template-columns: 1fr; }
          .rc-hero { padding: 27px; }
          .rc-hero-decoration { opacity: .65; width: 150px; }
          .rc-orbit-one { width: 140px; }
          .rc-orbit-two { left: 10px; }
          .rc-hero-symbol { left: 25px; }
          .rc-report-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }

        @media (max-width: 560px) {
          .rc-topbar { height: 66px; padding: 0 12px; }
          .rc-brand-mark { width: 36px; height: 36px; border-radius: 11px; }
          .rc-brand-name { font-size: 16px; }
          .rc-brand-subtitle { font-size: 10px; }
          .rc-admin-info { display: none; }
          .rc-avatar-top { width: 34px; height: 34px; }
          .rc-logout { padding: 8px 9px; font-size: 11px; }
          .rc-sidebar { top: 66px; }
          .rc-main { padding: 19px 12px 26px; }
          .rc-page-heading { align-items: flex-start; }
          .rc-page-heading h1 { font-size: 22px; }
          .rc-hero { min-height: 0; padding: 23px 19px; border-radius: 15px; }
          .rc-hero h2 { font-size: 23px; }
          .rc-hero p { font-size: 12px; }
          .rc-hero-decoration { display: none; }
          .rc-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .rc-stat-card { padding: 14px 13px 15px; border-radius: 12px; }
          .rc-stat-icon { width: 36px; height: 36px; font-size: 19px; }
          .rc-stat-value { font-size: 25px; }
          .rc-stat-label { font-size: 11px; }
          .rc-section-heading h2 { font-size: 17px; }
          .rc-section-heading { align-items: flex-start; }
          .rc-panel { padding: 15px 12px; border-radius: 12px; }
          .rc-panel-heading { align-items: flex-start; flex-wrap: wrap; }
          .rc-panel-heading h3 { font-size: 15px; }
          .rc-filters { display: grid; grid-template-columns: 1fr 1fr; }
          .rc-filters .rc-input:first-child { grid-column: 1 / -1; min-width: 0; }
          .rc-filters select { min-width: 0; width: 100%; }
          .rc-report-grid { grid-template-columns: 1fr; }
          .rc-report-card p { min-height: 0; }
          .rc-notification { flex-wrap: wrap; gap: 10px; }
          .rc-notification-body { min-width: calc(100% - 55px); }
          .rc-notification-actions { margin-left: 49px; align-items: flex-start; flex-direction: row; flex-wrap: wrap; }
          .rc-table th, .rc-table td { padding: 12px 10px; }
          .rc-report-intro { padding: 16px; align-items: flex-start; }
        }

        @media print {
          .rc-topbar, .rc-sidebar, .rc-page-heading,
          .rc-button, .rc-text-button, .rc-logout, .rc-footer,
          .rc-hero-button, .rc-menu-button { display: none !important; }
          .rc-admin, .rc-main { background: white !important; padding: 0 !important; }
          .rc-panel, .rc-report-card, .rc-stat-card { box-shadow: none !important; break-inside: avoid; }
          .rc-content-grid, .rc-stats-grid, .rc-report-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* ReConnect visual refresh: presentation only, no API or state changes */
        .rc-admin { --rc-blue:#6258e8; --rc-ink:#192342; --rc-muted:#7885a1; --rc-border:#e8eaf5; background:#f6f7fc; }
        .rc-topbar { height:78px; padding:0 34px; background:#ffffffed; backdrop-filter:blur(18px); border-bottom:1px solid #e9ebf5; box-shadow:0 2px 15px #252c5410; }
        .rc-brand-mark { background:linear-gradient(135deg,#6960f5,#a34cdb); border-radius:15px; box-shadow:0 7px 18px #7465e83b; }
        .rc-brand-name { color:#1b2343; font-size:21px; }
        .rc-avatar-top { background:linear-gradient(135deg,#eeeaff,#e1eaff); color:#6757d8; }
        .rc-logout { background:#fff1f3; border-color:transparent; border-radius:12px; padding:11px 17px; }
        .rc-layout { min-height:calc(100vh - 78px); }
        .rc-sidebar { width:264px; background:#171d39; border-right:0; padding:27px 14px 22px; display:flex; flex-direction:column; }
        .rc-sidebar-heading { color:#929bbd; font-size:10px; letter-spacing:1.7px; margin:15px 0 12px; }
        .rc-nav-group { margin-bottom:8px; }
        .rc-nav-item { color:#c3c9e2; padding:13px 15px; border-radius:12px; margin:4px 0; font-size:13px; transition:background .2s,transform .2s,color .2s; }
        .rc-nav-item:hover { background:#ffffff13; color:#fff; transform:translateX(3px); }
        .rc-nav-item.active { background:linear-gradient(95deg,#6556ed,#7b65ef); color:#fff; box-shadow:0 6px 18px #080d2740; }
        .rc-nav-icon { font-size:19px; color:inherit; }
        .rc-sidebar-note { margin-top:auto; background:linear-gradient(140deg,#2a3158,#262a4a); border:1px solid #ffffff1b; border-radius:15px; padding:18px; }
        .rc-sidebar-note strong { color:#fff; }
        .rc-sidebar-note p { color:#b0b8d3; }
        .rc-main { padding:32px 35px 45px; background:radial-gradient(circle at 94% 0%,#eeebff 0,transparent 35%),#f6f7fc; }
        .rc-page-heading h1 { font-size:29px; font-weight:800; color:#1b2444; }
        .rc-breadcrumb { color:#8a92ab; }
        .rc-hero { min-height:240px; padding:37px 42px; border-radius:23px; background:linear-gradient(112deg,#343a8b 0%,#6252d5 53%,#9b57dd 100%); box-shadow:0 18px 40px #5b54c62a; margin-bottom:28px; }
        .rc-hero::before { content:""; position:absolute; width:360px; height:360px; right:-110px; top:-200px; border-radius:50%; border:55px solid #ffffff10; pointer-events:none; }
        .rc-hero-label { font-size:11px; background:#ffffff22; border:1px solid #ffffff45; padding:7px 13px; }
        .rc-hero h2 { font-size:clamp(26px,2.6vw,36px); letter-spacing:-1px; }
        .rc-hero p { font-size:14px; color:#ecebff; }
        .rc-hero-button { border-radius:11px; padding:12px 18px; color:#5449bf; box-shadow:0 7px 20px #242c6630; }
        .rc-hero-symbol { background:#ffffff23; border-radius:25px; box-shadow:0 15px 35px #20236535; }
        .rc-section-heading h2 { font-size:21px; }
        .rc-stats-grid { grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; margin-bottom:25px; }
        .rc-stat-card { min-height:166px; border-radius:18px; padding:21px 23px; border:1px solid #eceef7; box-shadow:0 8px 25px #252e6110; }
        .rc-stat-card:hover { transform:translateY(-5px); border-color:color-mix(in srgb,var(--card-color) 35%,white); box-shadow:0 16px 35px #292d6b22; }
        .rc-stat-icon { width:49px; height:49px; border-radius:15px; font-size:24px; }
        .rc-stat-value { font-size:35px; color:#1c2648; letter-spacing:-1.5px; }
        .rc-stat-label { font-size:13px; color:#687795; }
        .rc-stat-line { height:4px; opacity:.8; }
        .rc-panel,.rc-report-card { border:1px solid #e9ebf5; border-radius:19px; box-shadow:0 8px 28px #27345b0c; }
        .rc-panel { padding:26px; }
        .rc-panel-heading h3 { font-size:18px; }
        .rc-quick-action { border-radius:10px; padding:13px 10px; }
        .rc-quick-action:hover { background:#f7f6ff; }
        .rc-button { border-radius:10px; padding:10px 15px; }
        .rc-button-primary { background:#6258e8; }
        .rc-button-primary:hover { background:#5145d0; }
        .rc-button-light { background:#f8f8ff; border-color:#e7e7fa; color:#5d5a91; }
        .rc-avatar { border-radius:13px; }
        .rc-input { border-radius:11px; }
        .rc-admin button:focus-visible { outline:3px solid #a79cff; outline-offset:3px; }
        /* Dashboard bottom: clean ending without an artificial footer bar. */
        .rc-content-grid { align-items: stretch; margin-bottom: 12px; }
        .rc-content-grid > .rc-panel { min-height: 280px; }
        .rc-quick-actions { gap: 5px; }
        .rc-quick-action:last-child { border-bottom: 0; }
        @media(max-width:1150px) { .rc-stats-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .rc-main { padding:25px; } }
        @media(max-width:760px) { .rc-topbar { padding:0 15px; } .rc-main { padding:18px 14px 30px; } .rc-hero { padding:28px 23px; } .rc-stats-grid { gap:12px; } .rc-stat-card { padding:16px; min-height:145px; } .rc-stat-value { font-size:29px; } .rc-sidebar { box-shadow:12px 0 32px #12173330; } }
        @media(max-width:480px) { .rc-stats-grid { grid-template-columns:1fr; } }
      `}</style>

      <header className="rc-topbar">
        <div className="rc-brand">
          <button
            className="rc-menu-button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <div className="rc-brand-mark">R</div>
          <div>
            <div className="rc-brand-name">ReConnect</div>
            <div className="rc-brand-subtitle">Admin workspace</div>
          </div>
        </div>

        <div className="rc-top-actions">
          <div className="rc-admin-info">
            <strong>{adminName}</strong>
            <span>{adminEmail}</span>
          </div>
          <div className="rc-avatar-top">
            {String(adminName).charAt(0).toUpperCase()}
          </div>
          <button className="rc-logout" onClick={logout}>
            Logout ↗
          </button>
        </div>
      </header>

      <div className="rc-layout">
        <aside
          className={`rc-sidebar ${mobileMenuOpen ? "rc-sidebar-open" : ""}`}
        >
          {["WORKSPACE", "MANAGEMENT", "REPORTS"].map((group) => (
            <div className="rc-nav-group" key={group}>
              <div className="rc-sidebar-heading">{group}</div>
              {NAVIGATION.filter((item) => item.group === group).map(
                (item) => (
                  <button
                    key={item.id}
                    className={`rc-nav-item ${activeSection === item.id ? "active" : ""}`}
                    onClick={() => openSection(item.id)}
                  >
                    <span className="rc-nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.id === "validate" && pendingUsers.length > 0 && (
                      <span className="rc-nav-count">{pendingUsers.length}</span>
                    )}
                  </button>
                )
              )}
            </div>
          ))}

          <div className="rc-sidebar-note">
            <strong>ReConnect Admin</strong>
            <p>
              Manage the community, monitor activity, and support student-alumni
              connections.
            </p>
          </div>
        </aside>

        <main className="rc-main">
          <div className="rc-page-heading">
            <div>
              <div className="rc-breadcrumb">
                ReConnect <span> / </span> Administration
              </div>
              <h1>{pageTitles[activeSection] || "Dashboard"}</h1>
              <p>
                {activeSection === "dashboard"
                  ? "Here is what's happening across your platform."
                  : `Manage and monitor ${pageTitles[activeSection]?.toLowerCase() || "your platform"}.`}
              </p>
            </div>

            {activeSection !== "dashboard" && (
              <button
                className="rc-button rc-button-light"
                onClick={refreshDashboard}
                disabled={refreshing}
              >
                <span className={refreshing ? "rc-spin" : ""}>↻</span>
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            )}
          </div>

          {error && (
            <div className="rc-alert rc-alert-error">
              <span>!</span>
              <span>{error}</span>
              <button
                className="rc-text-button"
                onClick={() => setError("")}
              >
                Dismiss
              </button>
            </div>
          )}

          {success && (
            <div className="rc-alert rc-alert-success">
              <span>✓</span>
              <span>{success}</span>
              <button
                className="rc-text-button"
                onClick={() => setSuccess("")}
              >
                Dismiss
              </button>
            </div>
          )}

          {loading ? (
            <section className="rc-panel">
              <div className="rc-empty">
                <div className="rc-empty-icon rc-spin">↻</div>
                <h3>Loading ReConnect dashboard...</h3>
                <p>Please wait while the latest information is retrieved.</p>
              </div>
            </section>
          ) : (
            renderActiveSection()
          )}

        </main>
      </div>
    </div>
  );
}
