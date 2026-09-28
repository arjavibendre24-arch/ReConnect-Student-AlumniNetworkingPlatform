import "./Home.css";

function Home() {
  return (
    <div>
      {/* NAVBAR */}
      <div className="navbar">
        <h2>ReConnect</h2>
        <div>
          <a>Home</a>
          <a>About</a>
          <a>Features</a>
          <a>Login</a>
        </div>
      </div>

      {/* HERO */}
      <div className="hero">
        <h1>Connect with Alumni. Grow Your Career.</h1>
        <p>Find mentors, opportunities, and events in one place.</p>
      </div>

      {/* ROLES */}
      <div style={{ textAlign: "center", padding: "40px" }}>
        <div className="role-card">
          <h3>Student</h3>
          <p>Find mentors and opportunities</p>
          <button>Continue</button>
        </div>

        <div className="role-card">
          <h3>Alumni</h3>
          <p>Guide students and share experience</p>
          <button>Continue</button>
        </div>

        <div className="role-card">
          <h3>Admin</h3>
          <p>Manage platform activities</p>
          <button>Continue</button>
        </div>
      </div>
    </div>
  );
}

export default Home;