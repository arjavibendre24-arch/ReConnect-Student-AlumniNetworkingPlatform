import { useState } from "react";

function Login() {
  const [role, setRole] = useState("student");

  const handleLogin = (event) => {
    event.preventDefault();

    alert("Login selected for " + role);
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <h1>ReConnect</h1>

        <h2>Login</h2>

        <p>Login to your ReConnect account</p>

        <div className="role-selector">

          <button
            type="button"
            onClick={() => setRole("student")}
            className={role === "student" ? "active" : ""}
          >
            Student
          </button>

          <button
            type="button"
            onClick={() => setRole("alumni")}
            className={role === "alumni" ? "active" : ""}
          >
            Alumni
          </button>

          <button
            type="button"
            onClick={() => setRole("admin")}
            className={role === "admin" ? "active" : ""}
          >
            Admin
          </button>

        </div>

        <form onSubmit={handleLogin}>

          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            required
          />

          <button type="submit" className="login-submit">
            Login
          </button>

        </form>

        <a href="/" className="back-home">
          ← Back to Home
        </a>

      </div>
    </div>
  );
}

export default Login;