import { useState } from "react";
import "./LoginScreen.css";

function LoginScreen() {
  const [role, setRole] = useState("Student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("https://reconnect-system.onrender.com/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password,
          role
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store logged-in user information
        localStorage.setItem("user", JSON.stringify(data.user));

        alert("Login successful!");

        // Redirect according to role
        if (data.user.role === "Student") {
          window.location.href = "/student-dashboard";
        } else if (data.user.role === "Alumni") {
          window.location.href = "/alumni-dashboard";
        } else if (data.user.role === "Admin") {
          window.location.href = "/admin-dashboard";
        }
      } else {
        alert(data.message || "Login failed.");
      }
    } catch (error) {
      console.error("Login error:", error);

      alert(
        "Cannot connect to the server. Make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">

        <h1>ReConnect</h1>

        <h2>Login</h2>

        <form onSubmit={handleLogin}>

          <label>Login As</label>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="Student">Student</option>
            <option value="Alumni">Alumni</option>
            <option value="Admin">Admin</option>
          </select>

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
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <button
          className="register-btn"
          onClick={() => {
            window.location.href = "/register";
          }}
        >
          Create New Account
        </button>

      </div>
    </div>
  );
}

export default LoginScreen;