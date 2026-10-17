import "./App.css";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import LoginScreen from "./screens/LoginScreen";
import StudentDashboard from "./screens/StudentDashboard";
import AlumniDashboard from "./screens/AlumniDashboard";
import AdminDashboard from "./screens/AdminDashboard";
import RegisterScreen from "./screens/RegisterScreen";

const roles = [
  { icon: "🎓", tag: "FOR LEARNERS", name: "Student", description: "Connect with experienced alumni, find mentors, explore career opportunities and join exciting events.", perks: ["Find your mentor", "Explore opportunities", "Attend events"], theme: "student" },
  { icon: "✦", tag: "FOR GRADUATES", name: "Alumni", description: "Give back to your community by mentoring students, sharing opportunities and hosting meaningful events.", perks: ["Guide students", "Share career openings", "Host events"], theme: "alumni" },
  { icon: "⚙", tag: "FOR MANAGERS", name: "Admin", description: "Keep the community thriving with tools to validate users, oversee activities and generate reports.", perks: ["Manage accounts", "Oversee activities", "View reports"], theme: "admin" },
];

function HomePage() {
  return (
    <div className="app">
      <nav className="navbar" aria-label="Main navigation">
        <a className="logo" href="#home" aria-label="ReConnect home"><span className="logo-symbol">R</span><span>Re<span className="logo-accent">Connect</span></span></a>
        <div className="nav-links">
          <a href="#home">Home</a><a href="#about">About</a><a href="#features">Features</a>
          <Link to="/login" className="login-btn">Login <span aria-hidden="true">↗</span></Link>
        </div>
      </nav>

      <main>
        <section className="hero" id="home">
          <div className="hero-glow hero-glow-one" aria-hidden="true"/><div className="hero-glow hero-glow-two" aria-hidden="true"/>
          <div className="hero-inner">
            <div className="hero-content">
              <div className="welcome"><span className="welcome-dot"/> WELCOME TO RECONNECT</div>
              <h1>Where connections <span className="hero-gradient-text">shape futures.</span></h1>
              <p className="description">ReConnect brings students and alumni together for mentorship, opportunities, events and professional growth. Your next big step starts with a conversation.</p>
              <div className="hero-buttons">
                <a href="#features" className="primary-btn">Get Started <span aria-hidden="true">↗</span></a>
                <a href="#about" className="secondary-btn">Explore ReConnect <span aria-hidden="true">→</span></a>
              </div>
              <div className="hero-footnote"><span className="hero-avatars"><b>🎓</b><b>💼</b><b>✨</b></span><span>Connect. Mentor. Learn. Grow.</span></div>
            </div>
            <div className="hero-visual" aria-label="Student and alumni networking illustration">
              <div className="visual-grid" aria-hidden="true"/>
              <div className="connection-line connection-line-one"/><div className="connection-line connection-line-two"/>
              <div className="visual-main-card"><div className="visual-card-top"><span className="visual-label">YOUR NETWORK</span><span className="live-dot">● &nbsp;Connected</span></div><div className="visual-orbit"><div className="orbit-ring orbit-ring-outer"/><div className="orbit-ring orbit-ring-inner"/><div className="orbit-center">R</div><div className="orbit-node orbit-student">🎓</div><div className="orbit-node orbit-alumni">💼</div><div className="orbit-node orbit-growth">✦</div></div><h2>Grow together.</h2><p>Every connection creates possibility.</p></div>
              <div className="floating-note note-mentor"><span>✦</span><div><strong>Mentorship</strong><small>Learn from experience</small></div></div>
              <div className="floating-note note-career"><span>↗</span><div><strong>Opportunities</strong><small>Discover what's next</small></div></div>
            </div>
          </div>
          <div className="hero-bottom-line" aria-hidden="true"/>
        </section>

        <section className="benefits-strip" aria-label="Platform highlights"><div><span>✦</span> Meaningful mentorship</div><div><span>↗</span> Career opportunities</div><div><span>◈</span> Community events</div><div><span>◎</span> Lifelong connections</div></section>

        <section className="roles" id="features"><div className="section-kicker">BUILT FOR EVERYONE</div><h2>Find your place in <span>ReConnect.</span></h2><p className="section-text">Whether you're starting your journey, giving back, or building the community, there's a space for you.</p>
          <div className="role-container">{roles.map(role => <article className={`role-card ${role.theme}`} key={role.name}><div className="role-card-head"><div className="role-icon">{role.icon}</div><span className="role-tag">{role.tag}</span></div><h3>{role.name}</h3><p>{role.description}</p><ul>{role.perks.map(perk=><li key={perk}><span>✓</span>{perk}</li>)}</ul><Link className="role-link" to="/login">Continue as {role.name} <span aria-hidden="true">↗</span></Link></article>)}</div>
        </section>

        <section className="about" id="about"><div className="about-panel"><div><div className="section-kicker">OUR PURPOSE</div><h2>Stronger networks.<br/><span>Brighter futures.</span></h2></div><div className="about-copy"><p>ReConnect is designed to create a strong connection between current students and alumni. Students can seek guidance and opportunities, while alumni contribute their knowledge and experience.</p><a href="#features">Join the community <span aria-hidden="true">↗</span></a></div></div></section>
      </main>
      <footer className="site-footer"><a className="footer-brand" href="#home">Re<span>Connect</span></a><p>© 2026 ReConnect System · Student–Alumni Networking Platform</p><a href="#home">Back to top ↑</a></footer>
    </div>
  );
}

function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<LoginScreen />} />
    <Route path="/register" element={<RegisterScreen />} />
    <Route path="/student-dashboard" element={<StudentDashboard />} />
    <Route path="/alumni-dashboard" element={<AlumniDashboard />} />
    <Route path="/admin-dashboard" element={<AdminDashboard />} />
  </Routes></BrowserRouter>;
}
export default App;
