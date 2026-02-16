import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { ViteBackendIP } from "../../api/Vite_React_Backend_Base";

const OwnerRegister = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    shopName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingOwner, setCheckingOwner] = useState(true);
  const [ownerExists, setOwnerExists] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Check if owner already exists
  useEffect(() => {
    const checkOwner = async () => {
      try {
        setCheckingOwner(true);
        setError("");
        
        console.log("🔍 Checking owner at:", `${ViteBackendIP}/auth/owner/exists`);
        console.log("📡 Using backend URL:", ViteBackendIP);
        
        const response = await fetch(`${ViteBackendIP}/auth/owner/exists`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("✅ Owner check response:", data);
        setOwnerExists(data.exists);
      } catch (err) {
        console.error("❌ Error checking owner:", err);
        setError(`Connection error: ${err.message}. Please check if the backend server is running.`);
      } finally {
        setCheckingOwner(false);
      }
    };
    
    checkOwner();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      console.log("📝 Registering at:", `${ViteBackendIP}/auth/owner/register`);
      
      const response = await fetch(
        `${ViteBackendIP}/auth/owner/register`,
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            shopName: formData.shopName,
          }),
        },
      );

      const data = await response.json();
      console.log("✅ Registration response:", data);

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Login the user and redirect
      login(data.token, data.user);
      navigate("/owner-dashboard");
    } catch (err) {
      console.error("❌ Registration error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking owner status
  if (checkingOwner) {
    return (
      <div className="container">
        <div className="row justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
          <div className="col-md-5">
            <div className="card shadow">
              <div className="card-body p-5 text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Checking registration status...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If owner already exists, show message
  if (ownerExists) {
    return (
      <div className="container">
        <div className="row justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
          <div className="col-md-5">
            <div className="card shadow">
              <div className="card-body p-5 text-center">
                <i className="bi bi-shield-lock text-warning" style={{ fontSize: "4rem" }}></i>
                <h3 className="mt-3">Owner Already Registered</h3>
                <p className="text-muted">
                  This system already has an owner. Only one owner is allowed.
                </p>
                <button
                  className="btn btn-primary mt-3"
                  onClick={() => navigate("/owner-login")}
                >
                  Go to Owner Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="container">
      <div className="row justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-body p-5">
              <h2 className="text-center mb-4">Register as Owner</h2>
              <p className="text-center text-muted mb-4">
                One-time registration
              </p>

              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Shop Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.shopName}
                    onChange={(e) =>
                      setFormData({ ...formData, shopName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    minLength="6"
                  />
                  <small className="text-muted">Minimum 6 characters</small>
                </div>

                <div className="mb-3">
                  <label className="form-label">Confirm Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Registering...
                    </>
                  ) : "Register Owner"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerRegister;