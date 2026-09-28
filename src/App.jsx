import "./App.css";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import LoginScreen from "./screens/LoginScreen";
import StudentDashboard from "./screens/StudentDashboard";
import AlumniDashboard from "./screens/AlumniDashboard";
import AdminDashboard from "./screens/AdminDashboard";
import RegisterScreen from "./screens/RegisterScreen";
import Home from "./pages/Home";

<Route path="/" element={<Home />} />

function HomePage() {
  return (
    <div className="app">

      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          ReConnect
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#features">Features</a>

          <Link to="/login" className="login-btn">
            Login
          </Link>
        </div>
      </nav>

     {/* Hero Section */}
<section className="hero" id="home">

  <div className="hero-content">

    <p className="welcome">
      <span className="highlight">WELCOME TO RECONNECT</span>
    </p>

          <h1>
            Connecting Students
            <br />
            With Alumni
          </h1>

          <p className="description">
            ReConnect is a platform that brings students and alumni together
            for mentorship, opportunities, events and professional growth.
          </p>

          <div className="hero-buttons">

            <a href="#features" className="primary-btn">
              Get Started
            </a>

            <a href="#about" className="secondary-btn">
              Learn More
            </a>

          </div>

        </div>

        <div className="hero-card">

          <div className="circle">
            <span>R</span>
          </div>

          <h2>
            ReConnect
          </h2>

          <p>
            Connect • Mentor • Learn • Grow
          </p>

        </div>

      </section>

      {/* Role Section */}
      <section className="roles" id="features">

        <h2>
          Choose Your Role
        </h2>

        <p className="section-text">
          Select how you want to use the ReConnect platform.
        </p>

        <div className="role-container">

          {/* Student */}
          <div className="role-card">

            <div className="role-icon">
              🎓
            </div>

            <h3>
              Student
            </h3>

            <p>
              Find alumni, request mentorship, discover opportunities
              and participate in events.
            </p>

            <Link to="/login">
              <button>
                Continue as Student
              </button>
            </Link>

          </div>

          {/* Alumni */}
          <div className="role-card">

            <div className="role-icon">
              👨‍💼
            </div>

            <h3>
              Alumni
            </h3>

            <p>
              Guide students, provide mentorship, share opportunities
              and organize events.
            </p>

            <Link to="/login">
              <button>
                Continue as Alumni
              </button>
            </Link>

          </div>

          {/* Admin */}
          <div className="role-card">

            <div className="role-icon">
              ⚙️
            </div>

            <h3>
              Admin
            </h3>

            <p>
              Validate users, manage activities, manage events
              and generate reports.
            </p>

            <Link to="/login">
              <button>
                Continue as Admin
              </button>
            </Link>

          </div>

        </div>

      </section>

      {/* About Section */}
      <section className="about" id="about">

        <h2>
          About ReConnect
        </h2>

        <p>
          ReConnect is designed to create a strong connection between
          current students and alumni. Students can seek guidance and
          opportunities, while alumni can contribute their knowledge
          and experience.
        </p>

      </section>

      {/* Footer */}
      <footer>

        <p>
          © 2026 ReConnect System | Student-Alumni Networking Platform
        </p>

      </footer>

    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<HomePage />} />

        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/alumni-dashboard" element={<AlumniDashboard />}/>
      <Route path="/admin-dashboard" element={<AdminDashboard />}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;