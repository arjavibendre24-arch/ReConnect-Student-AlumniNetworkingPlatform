import { useEffect, useState } from "react";
import "./StudentDashboard.css";

const API = "https://reconnect-system.onrender.com/api";

function StudentDashboard() {
  const [user, setUser] = useState(null);
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [requestingMentorship, setRequestingMentorship] = useState(null);

  const [profile, setProfile] = useState({
    phone: "",
    college: "",
    branch: "",
    year: "",
    skills: "",
    bio: ""
  });

  const [alumni, setAlumni] = useState([]);
  const [search, setSearch] = useState("");
  const [mentorshipRequests, setMentorshipRequests] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const getUserId = (currentUser) => {
    return (
      currentUser?._id ||
      currentUser?.id ||
      currentUser?.userId ||
      null
    );
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      window.location.href = "/login";
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      const userId = getUserId(parsedUser);

      if (!userId) {
        alert("User ID not found. Please login again.");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      setUser(parsedUser);
      loadAllData(userId);
    } catch (error) {
      console.error("User data error:", error);
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
  }, []);

  const loadAllData = async (userId) => {
    if (!userId) return;

    try {
      setLoading(true);

      const [
        profileRes,
        alumniRes,
        mentorshipRes,
        opportunityRes,
        eventRes,
        notificationRes
      ] = await Promise.all([
        fetch(`${API}/profile/${userId}`),
        fetch(`${API}/alumni`),
        fetch(`${API}/mentorship/student/${userId}`),
        fetch(`${API}/opportunities`),
        fetch(`${API}/events`),
        fetch(`${API}/notifications/${userId}`)
      ]);

      // -----------------------------
      // STUDENT PROFILE
      // -----------------------------
      if (profileRes.ok) {
        const data = await profileRes.json();
        const profileData = data.profile || data;

        setProfile({
          phone: profileData.phone || "",
          college: profileData.college || "",
          branch: profileData.branch || "",
          year: profileData.year || "",
          skills: profileData.skills || "",
          bio: profileData.bio || ""
        });
      }

      // -----------------------------
      // ALUMNI
      // -----------------------------
      if (alumniRes.ok) {
        const data = await alumniRes.json();

        const alumniData = Array.isArray(data)
          ? data
          : data.alumni || [];

        /*
          IMPORTANT FIX:

          User information and profile information
          may be stored in different MongoDB collections.

          We first get all alumni users and then load
          their profiles so that searching by college,
          branch, year, skills and bio works correctly.
        */

        const completeAlumni = await Promise.all(
          alumniData.map(async (person) => {
            const alumniId =
              person._id ||
              person.id ||
              person.userId;

            if (!alumniId) {
              return person;
            }

            try {
              const profileResponse = await fetch(
                `${API}/profile/${alumniId}`
              );

              if (!profileResponse.ok) {
                return person;
              }

              const profileData =
                await profileResponse.json();

              const alumniProfile =
                profileData.profile ||
                profileData ||
                {};

              return {
                ...person,

                phone:
                  person.phone ||
                  alumniProfile.phone ||
                  "",

                college:
                  person.college ||
                  alumniProfile.college ||
                  "",

                branch:
                  person.branch ||
                  alumniProfile.branch ||
                  "",

                year:
                  person.year ||
                  alumniProfile.year ||
                  "",

                skills:
                  person.skills ||
                  alumniProfile.skills ||
                  "",

                bio:
                  person.bio ||
                  alumniProfile.bio ||
                  "",

                profilePicture:
                  person.profilePicture ||
                  alumniProfile.profilePicture ||
                  ""
              };
            } catch (profileError) {
              console.error(
                "Alumni profile loading error:",
                profileError
              );

              return person;
            }
          })
        );

        setAlumni(completeAlumni);
      } else {
        console.error(
          "Unable to load alumni:",
          alumniRes.status
        );

        setAlumni([]);
      }

      // -----------------------------
      // MENTORSHIP
      // -----------------------------
      if (mentorshipRes.ok) {
        const data = await mentorshipRes.json();

        const mentorshipData = Array.isArray(data)
          ? data
          : data.mentorships || [];

        setMentorshipRequests(mentorshipData);
      }

      // -----------------------------
      // OPPORTUNITIES
      // -----------------------------
      if (opportunityRes.ok) {
        const data = await opportunityRes.json();

        setOpportunities(
          Array.isArray(data)
            ? data
            : data.opportunities || []
        );
      }

      // -----------------------------
      // EVENTS
      // -----------------------------
      if (eventRes.ok) {
        const data = await eventRes.json();

        setEvents(
          Array.isArray(data)
            ? data
            : data.events || []
        );
      }

      // -----------------------------
      // NOTIFICATIONS
      // -----------------------------
      if (notificationRes.ok) {
        const data = await notificationRes.json();

        setNotifications(
          Array.isArray(data)
            ? data
            : data.notifications || []
        );
      }
    } catch (error) {
      console.error(
        "Loading error:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (event) => {
    setProfile((previousProfile) => ({
      ...previousProfile,
      [event.target.name]: event.target.value
    }));
  };

  const saveProfile = async () => {
    try {
      const userId = getUserId(user);

      if (!userId) {
        alert("User ID not found. Please login again.");
        return;
      }

      const response = await fetch(
        `${API}/profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId,
            phone: profile.phone,
            college: profile.college,
            branch: profile.branch,
            year: profile.year,
            skills: profile.skills,
            bio: profile.bio
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Profile updated successfully!");
        setEditingProfile(false);
        await loadAllData(userId);
      } else {
        alert(
          data.message ||
            "Unable to update profile."
        );
      }
    } catch (error) {
      console.error(
        "Profile update error:",
        error
      );

      alert("Cannot connect to the server.");
    }
  };

  const getMentorshipStatus = (alumniId) => {
    const request =
      mentorshipRequests.find((item) => {
        const requestAlumniId =
          item.alumniId?._id ||
          item.alumniId ||
          item.alumni?._id ||
          item.alumni;

        return (
          requestAlumniId?.toString() ===
          alumniId?.toString()
        );
      });

    return request?.status || null;
  };

  const requestMentorship = async (alumniId) => {
    try {
      const studentId = getUserId(user);

      if (!studentId) {
        alert(
          "Student ID not found. Please login again."
        );
        return;
      }

      if (!alumniId) {
        alert("Alumni ID not found.");
        return;
      }

      const existingStatus =
        getMentorshipStatus(alumniId);

      if (existingStatus) {
        alert(
          `You already have a ${existingStatus.toLowerCase()} mentorship request with this alumni.`
        );
        return;
      }

      setRequestingMentorship(alumniId);

      const response = await fetch(
        `${API}/mentorship`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            studentId,
            alumniId
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert(
          "Mentorship request sent successfully!"
        );

        await loadAllData(studentId);
      } else {
        alert(
          data.message ||
            "Unable to send mentorship request."
        );
      }
    } catch (error) {
      console.error(
        "Mentorship error:",
        error
      );

      alert("Cannot connect to the server.");
    } finally {
      setRequestingMentorship(null);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  // ------------------------------------
  // IMPROVED ALUMNI SEARCH
  // ------------------------------------
  const filteredAlumni = alumni.filter((person) => {
    const text = search.trim().toLowerCase();

    if (!text) {
      return true;
    }

    const searchableText = [
      person.fullName,
      person.name,
      person.email,
      person.college,
      person.branch,
      person.year,
      person.skills,
      person.company,
      person.designation,
      person.bio
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(text);
  });

  if (!user) {
    return (
      <div className="loading-screen">
        Loading ReConnect...
      </div>
    );
  }

  // ------------------------------------
  // DASHBOARD
  // ------------------------------------
  const renderDashboard = () => (
    <>
      <section className="welcome-banner">
        <div className="welcome-content">
          <span className="welcome-label">
            STUDENT PORTAL
          </span>

          <h1>
            Welcome back,{" "}
            {user.fullName?.split(" ")[0] ||
              "Student"}!
          </h1>

          <p>
            Build meaningful connections with alumni
            and discover new opportunities.
          </p>

          <button
            type="button"
            className="primary-action"
            onClick={() =>
              setActiveSection("Search Alumni")
            }
          >
            Explore Alumni →
          </button>
        </div>

        <div className="welcome-graphic">
          <div className="graphic-circle circle-one"></div>
          <div className="graphic-circle circle-two"></div>

          <div className="graphic-person">
            🎓
          </div>
        </div>
      </section>

      <div className="section-heading-row">
        <div>
          <span className="section-label">
            OVERVIEW
          </span>

          <h2>Your Activity</h2>
        </div>
      </div>

      <section className="stats-grid">
        <button
          type="button"
          className="modern-stat stat-button"
          onClick={() =>
            setActiveSection("Search Alumni")
          }
        >
          <div className="stat-icon">
            👥
          </div>

          <div className="stat-info">
            <span>Alumni</span>
            <strong>{alumni.length}</strong>
          </div>
        </button>

        <button
          type="button"
          className="modern-stat stat-button"
          onClick={() =>
            setActiveSection("Mentorship")
          }
        >
          <div className="stat-icon">
            🤝
          </div>

          <div className="stat-info">
            <span>Mentorship</span>
            <strong>
              {mentorshipRequests.length}
            </strong>
          </div>
        </button>

        <button
          type="button"
          className="modern-stat stat-button"
          onClick={() =>
            setActiveSection("Opportunities")
          }
        >
          <div className="stat-icon">
            💼
          </div>

          <div className="stat-info">
            <span>Opportunities</span>
            <strong>
              {opportunities.length}
            </strong>
          </div>
        </button>

        <button
          type="button"
          className="modern-stat stat-button"
          onClick={() =>
            setActiveSection("Events")
          }
        >
          <div className="stat-icon">
            📅
          </div>

          <div className="stat-info">
            <span>Events</span>
            <strong>{events.length}</strong>
          </div>
        </button>
      </section>
    </>
  );

  // ------------------------------------
  // PROFILE
  // ------------------------------------
  const renderProfile = () => (
    <section className="profile-page">
      <div className="page-title-area">
        <span className="section-label">
          ACCOUNT
        </span>

        <h1>My Profile</h1>

        <p>
          View and manage your personal and academic
          information.
        </p>
      </div>

      <div className="profile-card">
        <div className="profile-cover"></div>

        <div className="profile-header">
          <div className="large-avatar">
            {user.fullName
              ?.charAt(0)
              .toUpperCase() || "S"}
          </div>

          <div className="profile-main-info">
            <h2>{user.fullName}</h2>

            <p>{user.email}</p>

            <span className="role-badge">
              Student
            </span>
          </div>

          {!editingProfile && (
            <button
              type="button"
              className="edit-profile-btn"
              onClick={() =>
                setEditingProfile(true)
              }
            >
              ✎ Edit Profile
            </button>
          )}
        </div>

        {!editingProfile ? (
          <div className="profile-details">
            <div className="profile-detail">
              <span>Phone</span>
              <strong>
                {profile.phone || "Not added"}
              </strong>
            </div>

            <div className="profile-detail">
              <span>College</span>
              <strong>
                {profile.college || "Not added"}
              </strong>
            </div>

            <div className="profile-detail">
              <span>Branch</span>
              <strong>
                {profile.branch || "Not added"}
              </strong>
            </div>

            <div className="profile-detail">
              <span>Year</span>
              <strong>
                {profile.year || "Not added"}
              </strong>
            </div>

            <div className="profile-detail full-detail">
              <span>Skills</span>
              <strong>
                {profile.skills || "Not added"}
              </strong>
            </div>

            <div className="profile-detail full-detail">
              <span>About Me</span>
              <strong>
                {profile.bio ||
                  "No bio added yet."}
              </strong>
            </div>
          </div>
        ) : (
          <div className="profile-edit-form">
            <div className="form-section-title">
              <h3>Edit Profile</h3>

              <p>
                Update your information below.
              </p>
            </div>

            <div className="profile-form-grid">
              <div className="form-field">
                <label>Full Name</label>

                <input
                  type="text"
                  value={user.fullName || ""}
                  disabled
                />
              </div>

              <div className="form-field">
                <label>Email</label>

                <input
                  type="email"
                  value={user.email || ""}
                  disabled
                />
              </div>

              <div className="form-field">
                <label>Phone</label>

                <input
                  name="phone"
                  value={profile.phone}
                  onChange={handleProfileChange}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-field">
                <label>College</label>

                <input
                  name="college"
                  value={profile.college}
                  onChange={handleProfileChange}
                  placeholder="Enter college name"
                />
              </div>

              <div className="form-field">
                <label>Branch</label>

                <input
                  name="branch"
                  value={profile.branch}
                  onChange={handleProfileChange}
                  placeholder="e.g. Information Technology"
                />
              </div>

              <div className="form-field">
                <label>Year</label>

                <select
                  name="year"
                  value={profile.year}
                  onChange={handleProfileChange}
                >
                  <option value="">
                    Select year
                  </option>

                  <option value="First Year">
                    First Year
                  </option>

                  <option value="Second Year">
                    Second Year
                  </option>

                  <option value="Third Year">
                    Third Year
                  </option>

                  <option value="Final Year">
                    Final Year
                  </option>
                </select>
              </div>

              <div className="form-field full-width">
                <label>Skills</label>

                <input
                  name="skills"
                  value={profile.skills}
                  onChange={handleProfileChange}
                  placeholder="e.g. Java, Python, React, MongoDB"
                />
              </div>

              <div className="form-field full-width">
                <label>About Me</label>

                <textarea
                  name="bio"
                  value={profile.bio}
                  onChange={handleProfileChange}
                  placeholder="Write a short description about yourself..."
                  rows="5"
                ></textarea>
              </div>
            </div>

            <div className="profile-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() =>
                  setEditingProfile(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="save-profile-btn"
                onClick={saveProfile}
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  // ------------------------------------
  // SEARCH ALUMNI
  // ------------------------------------
  const renderSearchAlumni = () => (
    <section className="alumni-page">
      <div className="page-title-area alumni-title">
        <div>
          <span className="section-label">
            NETWORK
          </span>

          <h1>Search Alumni</h1>

          <p>
            Discover experienced alumni and connect
            with them for guidance, mentorship and
            career opportunities.
          </p>
        </div>

        <div className="alumni-count">
          <strong>
            {filteredAlumni.length}
          </strong>

          <span>Alumni Found</span>
        </div>
      </div>

      <div className="alumni-search-box">
        <span className="search-icon">
          ⌕
        </span>

        <input
          type="text"
          placeholder="Search by name, email, college, branch, skills, company or designation..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        {search && (
          <button
            type="button"
            className="clear-search"
            onClick={() => setSearch("")}
          >
            ×
          </button>
        )}
      </div>

      {loading ? (
        <div className="empty-alumni">
          <div className="empty-icon">
            ⏳
          </div>

          <h3>Loading alumni...</h3>

          <p>
            Finding approved alumni profiles.
          </p>
        </div>
      ) : filteredAlumni.length > 0 ? (
        <div className="alumni-grid">
          {filteredAlumni.map(
            (person, index) => {
              const alumniId =
                person._id ||
                person.id ||
                person.userId;

              const mentorshipStatus =
                getMentorshipStatus(alumniId);

              return (
                <div
                  className="alumni-card"
                  key={
                    alumniId || index
                  }
                >
                  <div className="alumni-card-top">
                    <div className="alumni-avatar">
                      {(
                        person.fullName ||
                        person.name ||
                        "A"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <span className="available-badge">
                      ● Available
                    </span>
                  </div>

                  <div className="alumni-info">
                    <h3>
                      {person.fullName ||
                        person.name ||
                        "Alumni"}
                    </h3>

                    <p className="alumni-email">
                      {person.email ||
                        "Email not available"}
                    </p>

                    {person.designation && (
                      <p className="alumni-designation">
                        💼 {person.designation}
                      </p>
                    )}

                    {person.company && (
                      <p className="alumni-designation">
                        🏢 {person.company}
                      </p>
                    )}

                    {person.college && (
                      <p className="alumni-designation">
                        🎓 {person.college}
                      </p>
                    )}

                    <div className="alumni-tags">
                      {person.branch && (
                        <span>
                          {person.branch}
                        </span>
                      )}

                      {person.year && (
                        <span>
                          {person.year}
                        </span>
                      )}

                      {person.skills && (
                        <span>
                          {person.skills}
                        </span>
                      )}
                    </div>

                    {person.bio && (
                      <p className="alumni-bio">
                        {person.bio}
                      </p>
                    )}
                  </div>

                  {mentorshipStatus ? (
                    <button
                      type="button"
                      className="mentorship-btn"
                      disabled
                    >
                      {mentorshipStatus ===
                      "Accepted"
                        ? "✓ Mentorship Accepted"
                        : mentorshipStatus ===
                          "Rejected"
                        ? "Request Rejected"
                        : "Request Pending"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="mentorship-btn"
                      disabled={
                        requestingMentorship ===
                        alumniId
                      }
                      onClick={() =>
                        requestMentorship(
                          alumniId
                        )
                      }
                    >
                      {requestingMentorship ===
                      alumniId
                        ? "Sending..."
                        : "Request Mentorship"}

                      {requestingMentorship !==
                        alumniId && (
                        <span>→</span>
                      )}
                    </button>
                  )}
                </div>
              );
            }
          )}
        </div>
      ) : (
        <div className="empty-alumni">
          <div className="empty-icon">
            👥
          </div>

          <h3>
            {search
              ? "No alumni found"
              : "No approved alumni available"}
          </h3>

          <p>
            {search
              ? "Try searching by the alumni name, college, branch, year, skill or company."
              : "Once an alumni account is approved and their profile is created, it will appear here."}
          </p>

          {search && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearch("")}
            >
              Clear Search
            </button>
          )}
        </div>
      )}
    </section>
  );

  // ------------------------------------
  // MENTORSHIP
  // ------------------------------------
  const renderMentorship = () => (
    <section className="simple-page">
      <div className="page-title-area">
        <span className="section-label">
          CONNECTIONS
        </span>

        <h1>Mentorship</h1>

        <p>
          Track your mentorship requests and
          connection status.
        </p>
      </div>

      {mentorshipRequests.length === 0 ? (
        <div className="empty-alumni">
          <div className="empty-icon">
            🤝
          </div>

          <h3>
            No mentorship requests
          </h3>

          <p>
            Search alumni and send your first
            mentorship request.
          </p>

          <button
            type="button"
            className="clear-search-btn"
            onClick={() =>
              setActiveSection(
                "Search Alumni"
              )
            }
          >
            Search Alumni
          </button>
        </div>
      ) : (
        <div className="request-list">
          {mentorshipRequests.map(
            (request, index) => {
              const alumniName =
                request.alumniId?.fullName ||
                request.alumni?.fullName ||
                request.alumniName ||
                "Alumni";

              const status =
                request.status ||
                "Pending";

              return (
                <div
                  className="request-card"
                  key={
                    request._id || index
                  }
                >
                  <div className="request-avatar">
                    🤝
                  </div>

                  <div>
                    <h3>{alumniName}</h3>

                    <p>
                      Mentorship Request
                    </p>

                    <p>
                      Status:{" "}
                      <strong>
                        {status}
                      </strong>
                    </p>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </section>
  );

  // ------------------------------------
  // OPPORTUNITIES
  // ------------------------------------
  const renderOpportunities = () => (
    <section className="simple-page">
      <div className="page-title-area">
        <span className="section-label">
          CAREER
        </span>

        <h1>Opportunities</h1>

        <p>
          Explore opportunities shared by the
          ReConnect community.
        </p>
      </div>

      <div className="content-grid">
        {opportunities.length === 0 ? (
          <div className="empty-alumni">
            <div className="empty-icon">
              💼
            </div>

            <h3>
              No opportunities available
            </h3>

            <p>
              New opportunities will appear here.
            </p>
          </div>
        ) : (
          opportunities.map(
            (item, index) => (
              <div
                className="content-card"
                key={
                  item._id || index
                }
              >
                <div className="content-card-icon">
                  💼
                </div>

                <h3>
                  {item.title ||
                    "Opportunity"}
                </h3>

                <p>
                  {item.description ||
                    "No description available."}
                </p>

                {item.company && (
                  <p>
                    <strong>
                      Company:
                    </strong>{" "}
                    {item.company}
                  </p>
                )}

                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="opportunity-link"
                  >
                    View Opportunity →
                  </a>
                )}
              </div>
            )
          )
        )}
      </div>
    </section>
  );

  // ------------------------------------
  // EVENTS
  // ------------------------------------
  const renderEvents = () => (
    <section className="simple-page">
      <div className="page-title-area">
        <span className="section-label">
          COMMUNITY
        </span>

        <h1>Events</h1>

        <p>
          Discover upcoming ReConnect events.
        </p>
      </div>

      <div className="content-grid">
        {events.length === 0 ? (
          <div className="empty-alumni">
            <div className="empty-icon">
              📅
            </div>

            <h3>
              No events available
            </h3>

            <p>
              Upcoming events will appear here.
            </p>
          </div>
        ) : (
          events.map(
            (event, index) => (
              <div
                className="content-card"
                key={
                  event._id || index
                }
              >
                <div className="content-card-icon">
                  📅
                </div>

                <h3>
                  {event.title ||
                    event.name ||
                    "ReConnect Event"}
                </h3>

                <p>
                  {event.description ||
                    "Join this ReConnect community event."}
                </p>

                {event.date && (
                  <p>
                    <strong>
                      📅 Date:
                    </strong>{" "}
                    {event.date}
                  </p>
                )}

                {event.time && (
                  <p>
                    <strong>
                      ⏰ Time:
                    </strong>{" "}
                    {event.time}
                  </p>
                )}

                {event.location && (
                  <p>
                    <strong>
                      📍 Location:
                    </strong>{" "}
                    {event.location}
                  </p>
                )}

                {event.organizer && (
                  <p>
                    <strong>
                      Organizer:
                    </strong>{" "}
                    {typeof event.organizer ===
                    "object"
                      ? event.organizer.fullName ||
                        event.organizer.name ||
                        "ReConnect"
                      : "ReConnect"}
                  </p>
                )}
              </div>
            )
          )
        )}
      </div>
    </section>
  );

  // ------------------------------------
  // NOTIFICATIONS
  // ------------------------------------
  const renderNotifications = () => (
    <section className="simple-page">
      <div className="page-title-area">
        <span className="section-label">
          UPDATES
        </span>

        <h1>Notifications</h1>

        <p>
          Stay updated with your ReConnect
          activities.
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="empty-alumni">
          <div className="empty-icon">
            🔔
          </div>

          <h3>
            No notifications
          </h3>

          <p>
            You are all caught up.
          </p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map(
            (notification, index) => (
              <div
                className="notification-card"
                key={
                  notification._id ||
                  index
                }
              >
                <div className="notification-icon">
                  🔔
                </div>

                <div>
                  <h3>
                    {notification.title ||
                      notification.type ||
                      "ReConnect Notification"}
                  </h3>

                  <p>
                    {notification.message ||
                      notification.text ||
                      notification.description ||
                      "You have a new ReConnect notification."}
                  </p>

                  {notification.createdAt && (
                    <small className="notification-date">
                      {new Date(
                        notification.createdAt
                      ).toLocaleString()}
                    </small>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );

  // ------------------------------------
  // ACCOUNT
  // ------------------------------------
  const renderAccount = () => (
    <section className="simple-page">
      <div className="page-title-area">
        <span className="section-label">
          ACCOUNT
        </span>

        <h1>Account</h1>

        <p>
          Manage your ReConnect account.
        </p>
      </div>

      <div className="account-card">
        <div className="account-avatar">
          {user.fullName
            ?.charAt(0)
            .toUpperCase()}
        </div>

        <div>
          <h2>{user.fullName}</h2>

          <p>{user.email}</p>

          <span className="role-badge">
            Student
          </span>
        </div>

        <button
          type="button"
          className="logout-btn account-logout"
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </section>
  );

  const renderContent = () => {
    switch (activeSection) {
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

  const menuItems = [
    {
      name: "Dashboard",
      icon: "⌂"
    },
    {
      name: "My Profile",
      icon: "◎"
    },
    {
      name: "Search Alumni",
      icon: "⌕"
    },
    {
      name: "Mentorship",
      icon: "♧"
    },
    {
      name: "Opportunities",
      icon: "▣"
    },
    {
      name: "Events",
      icon: "◫"
    },
    {
      name: "Notifications",
      icon: "♢"
    },
    {
      name: "Account",
      icon: "◉"
    }
  ];

  return (
    <div className="student-dashboard">
      <aside className="student-sidebar">
        <div className="brand">
          <div className="brand-mark">
            R
          </div>

          <div>
            <strong>
              ReConnect
            </strong>

            <span>
              Student Portal
            </span>
          </div>
        </div>

        <div className="sidebar-profile">
          <div className="avatar">
            {user.fullName
              ?.charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <strong>
              {user.fullName}
            </strong>

            <span>
              Student
            </span>
          </div>
        </div>

        <div className="menu-title">
          MENU
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <button
              type="button"
              key={item.name}
              className={`menu-item ${
                activeSection === item.name
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setActiveSection(
                  item.name
                )
              }
            >
              <span className="menu-icon">
                {item.icon}
              </span>

              <span>
                {item.name}
              </span>

              {item.name ===
                "Notifications" &&
                notifications.length >
                  0 && (
                  <span className="notification-count">
                    {notifications.length}
                  </span>
                )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="logout-btn"
            onClick={logout}
          >
            ↪ Logout
          </button>
        </div>
      </aside>

      <main className="student-main">
        <header className="student-topbar">
          <div className="breadcrumb">
            <span>
              ReConnect
            </span>

            <b>/</b>

            <strong>
              {activeSection}
            </strong>
          </div>

          <div className="topbar-user">
            <div className="topbar-avatar">
              {user.fullName
                ?.charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {user.fullName}
              </strong>

              <span>
                Student
              </span>
            </div>
          </div>
        </header>

        <div className="page-content">
          {loading &&
          activeSection ===
            "Dashboard" ? (
            <div className="loading-box">
              Loading...
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;