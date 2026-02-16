// components/auth/ForgotPassword.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ViteBackendIP } from "../../api/Vite_React_Backend_Base";

const ForgotPassword = () => {
  const [step, setStep] = useState(1);  
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Step 1: Send reset code
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const response = await fetch(
        `${ViteBackendIP}/auth/owner/forgot-password`, // ✅ CORRECTED URL
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setSuccess("Reset code sent to your email!");
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${ViteBackendIP}/auth/owner/verify-reset-code`, // ✅ CORRECTED URL
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setResetToken(data.resetToken);
      setSuccess("Code verified! Enter your new password.");
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match!");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters!");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${ViteBackendIP}/auth/owner/reset-password`, // ✅ CORRECTED URL
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resetToken, newPassword }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      setSuccess("Password reset successful! Redirecting to login...");
      setTimeout(() => navigate("/owner-login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div
        className="row justify-content-center align-items-center"
        style={{ minHeight: "100vh" }}
      >
        <div className="col-md-5">
          <div className="card shadow-lg border-0">
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <i
                  className="bi bi-key-fill text-warning"
                  style={{ fontSize: "3rem" }}
                ></i>
                <h2 className="mt-3">Reset Password</h2>
                <p className="text-muted small">
                  {step === 1 && "Enter your email to receive reset code"}
                  {step === 2 && "Enter the 6-digit code sent to your email"}
                  {step === 3 && "Create your new password"}
                </p>
              </div>

              {/* Progress Indicator */}
              <div className="mb-4">
                <div className="d-flex justify-content-between mb-2">
                  <span
                    className={`badge ${step >= 1 ? "bg-warning" : "bg-secondary"}`}
                  >
                    1. Email
                  </span>
                  <span
                    className={`badge ${step >= 2 ? "bg-warning" : "bg-secondary"}`}
                  >
                    2. Code
                  </span>
                  <span
                    className={`badge ${step >= 3 ? "bg-warning" : "bg-secondary"}`}
                  >
                    3. New Password
                  </span>
                </div>
                <div className="progress" style={{ height: "5px" }}>
                  <div
                    className="progress-bar bg-warning"
                    style={{ width: `${(step / 3) * 100}%` }}
                  ></div>
                </div>
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success" role="alert">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  {success}
                </div>
              )}

              {/* Step 1: Email Form */}
              {step === 1 && (
                <form onSubmit={handleSendCode}>
                  <div className="mb-3">
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      placeholder="Enter your registered email"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-warning w-100 btn-lg text-white fw-bold"
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send Reset Code"}
                  </button>
                </form>
              )}

              {/* Step 2: Code Verification */}
              {step === 2 && (
                <form onSubmit={handleVerifyCode}>
                  <div className="mb-3">
                    <label className="form-label">Verification Code</label>
                    <input
                      type="text"
                      className="form-control text-center fw-bold"
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      required
                      autoFocus
                      placeholder="Enter 6-digit code"
                      maxLength="6"
                      style={{ letterSpacing: "10px", fontSize: "1.5rem" }}
                    />
                    <small className="text-muted">
                      Check your email for the code
                    </small>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-warning w-100 btn-lg text-white fw-bold"
                    disabled={loading || code.length !== 6}
                  >
                    {loading ? "Verifying..." : "Verify Code"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-link w-100 mt-2"
                    onClick={() => setStep(1)}
                  >
                    Resend Code
                  </button>
                </form>
              )}

              {/* Step 3: New Password */}
              {step === 3 && (
                <form onSubmit={handleResetPassword}>
                  <div className="mb-3">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoFocus
                      placeholder="Enter new password"
                      minLength="6"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Confirm Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Confirm new password"
                      minLength="6"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-warning w-100 btn-lg text-white fw-bold"
                    disabled={loading}
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </form>
              )}

              <div className="text-center mt-4">
                <Link
                  to="/owner-login"
                  className="text-warning text-decoration-none"
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
