import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { ViteBackendIP } from "../../api/Vite_React_Backend_Base";



const OwnerLogin = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${ViteBackendIP}/auth/owner/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      login(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="row">
        <div className="col-12 pt-3">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-link text-warning text-decoration-none p-0"
            style={{ fontSize: "1.1rem" }}
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back
          </button>
        </div>
      </div>

      <div
        className="row justify-content-center align-items-center"
        style={{ minHeight: "90vh" }}
      >
        <div className="col-md-5">
          <div className="card shadow-lg border-0">
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <i
                  className="bi bi-shield-lock-fill text-warning"
                  style={{ fontSize: "3rem" }}
                ></i>
                <h2 className="mt-3">Owner Access</h2>
                <p className="text-muted small">Secure login portal</p>
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    autoFocus
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                </div>

                {/* FORGOT PASSWORD LINK */}
                <div className="text-end mb-3">
                  <Link
                    to="/forgot-password"
                    className="text-warning text-decoration-none small"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <button
                  type="submit"
                  className="btn btn-warning w-100 btn-lg text-white fw-bold"
                  disabled={loading}
                >
                  {loading ? "Logging in..." : "Login as Owner"}
                </button>

                <p className="text-center mt-3 mb-0">
                  Not registered?{" "}
                  <Link to="/owner-register" className="text-warning">
                    Register Here
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;
