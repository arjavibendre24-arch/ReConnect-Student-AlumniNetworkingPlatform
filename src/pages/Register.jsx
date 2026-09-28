import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

function Register() {
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      alert("Please fill all fields.");
      return;
    }

    alert("Registration successful!");

    navigate("/login");
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1>ReConnect</h1>

        <h2>Create Account</h2>

        <p className="login-subtitle">
          Register to join the ReConnect community
        </p>

        <div className="role-selection">
          <button
            type="button"
            className={role === "student" ? "selected-role" : ""}
            onClick={() => setRole("student")}
          >
            Student
          </button>

          <button
            type="button"
            className={role === "alumni" ? "selected-role" : ""}
            onClick={() => setRole("alumni")}
          >
            Alumni
          </button>

          <button
            type="button"
            className={role === "admin" ? "selected-role" : ""}
            onClick={() => setRole("admin")}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleRegister}>
          <label>Full Name</label>

          <input
            type="text"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="login-submit" type="submit">
            Create Account
          </button>
        </form>

        <p className="register-text">
          Already have an account?{" "}
          <Link to="/login">Login</Link>
        </p>

        <Link className="back-home" to="/">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default Register;