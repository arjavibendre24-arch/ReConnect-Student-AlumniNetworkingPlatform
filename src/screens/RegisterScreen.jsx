import { useState } from "react";

function RegisterScreen() {
  const [role, setRole] = useState("Student");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    // Check empty fields
    if (!fullName || !email || !password || !confirmPassword) {
      alert("Please fill in all fields.");
      return;
    }

    // Check password
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("https://reconnect-system.onrender.com/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert("Registration successful!");

        // Clear form
        setFullName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");

        // Go to login
        window.location.href = "/login";
      } else {
        alert(data.message || "Registration failed.");
      }
    } catch (error) {
      console.error("Registration error:", error);
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

        <h2>Create Account</h2>

        <form onSubmit={handleRegister}>

          <label>Register As</label>

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="Student">Student</option>
            <option value="Alumni">Alumni</option>
          </select>

          <label>Full Name</label>

          <input
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
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
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label>Confirm Password</label>

          <input
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>

        </form>

        <button
          className="back-login-btn"
          onClick={() => {
            window.location.href = "/login";
          }}
        >
          Go to Login
        </button>

      </div>
    </div>
  );
}

export default RegisterScreen;