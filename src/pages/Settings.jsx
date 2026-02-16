import { useState, useEffect, useRef } from "react";
import api from "../api/api";
import { useNotifications } from "../context/NotificationContext";
import { API_ENDPOINTS } from "../api/EndPoints";
import QRCode from "qrcode";
import BackupButton from "../components/BackupButton";
import NetworkInfo from "../components/NetworkInfo";
import { VITE_BACKEND_URL } from "../config/config"; // Import your backend URL

export default function Setting() {
  const [formData, setFormData] = useState({
    shopName: "",
    address: "",
    location: "",
    phone: "",
    email: "",
    about: "",
    logo: null,
  });

  const [previewLogo, setPreviewLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

  const { addNotification } = useNotifications();
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchShopSettings();
  }, []);

  const fetchShopSettings = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.SHOP_SETTINGS);
      const data = res.data || {};

      setFormData({
        shopName: data.shopName || "",
        address: data.address || "",
        location: data.location || "",
        phone: data.phone || "",
        email: data.email || "",
        about: data.about || "",
        logo: null,
      });

      // FIXED: Properly construct the logo URL
      if (data.logo) {
        // If it's already a full URL, use it as is
        if (data.logo.startsWith('http')) {
          setPreviewLogo(data.logo);
        } 
        // If it starts with /uploads, use backend URL
        else if (data.logo.startsWith('/uploads')) {
          setPreviewLogo(`${VITE_BACKEND_URL}${data.logo}`);
        }
        // Otherwise assume it's just the filename and needs /uploads/
        else {
          setPreviewLogo(`${VITE_BACKEND_URL}/uploads/${data.logo}`);
        }
      }

      setLoading(false);
    } catch (err) {
      addNotification("error", "Failed to load shop settings");
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, logo: file }));
      setPreviewLogo(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const form = new FormData();
      form.append("shopName", formData.shopName);
      form.append("address", formData.address);
      form.append("location", formData.location);
      form.append("phone", formData.phone);
      form.append("email", formData.email);
      form.append("about", formData.about);

      if (formData.logo) {
        form.append("logo", formData.logo);
      }

      await api.post(API_ENDPOINTS.SHOP_SETTINGS, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      addNotification("success", "Shop settings updated successfully!");
      fetchShopSettings();
      setFormData((prev) => ({ ...prev, logo: null }));
    } catch (err) {
      addNotification("error", "Failed to update settings");
      console.error("Settings error:", err);
    } finally {
      setSaving(false);
    }
  };

  // Function to get local IP from backend
  const getLocalIPFromBackend = async () => {
    try {
      // Using your API instance
      const response = await api.get('/local-ip');
      return response.data.ip;
    } catch (error) {
      console.error("Failed to get IP from backend:", error);
      
      // Fallback: try to get from window.location
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return hostname;
      }
      
      // Last resort: return a default
      return '10.12.19.76'; // Your actual IP
    }
  };

  // Generate QR code
  const generateQR = async () => {
    try {
      setShowQR(true);
      
      // Get the local IP
      const ip = await getLocalIPFromBackend();
      
      // Construct the URL (using port 5173 for Vite)
      const port = "5173"; // Vite default port
      
      // For LAN access, use http
      const url = `http://${ip}:${port}`;
      
      console.log("📱 QR Code URL:", url);
      setQrUrl(url);

      // Generate QR code on canvas
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, url, {
          width: 250,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
      }
      
      addNotification("success", "QR Code generated! Scan to open on mobile");
    } catch (err) {
      console.error("QR Error:", err);
      addNotification("error", "Failed to generate QR code");
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <h2 className="fw-bold mb-4">Shop Settings</h2>
      <BackupButton />

      {/* QR Code Section */}
      <div className="mb-4">
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <div className="row align-items-center">
              <div className="col-md-8">
                <h5 className="mb-2">📱 Access on Mobile</h5>
                <p className="text-muted mb-0">
                  Scan the QR code to open this app on your mobile phone.
                  Make sure your phone is connected to the same WiFi network.
                </p>
                {qrUrl && (
                  <p className="mt-2 mb-0">
                    <strong>URL:</strong> 
                    <code className="ms-2 bg-light p-1 rounded">{qrUrl}</code>
                  </p>
                )}
              </div>
              <div className="col-md-4 text-end">
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={generateQR}
                >
                  <i className="bi bi-qr-code-scan me-2"></i>
                  Show QR Code
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal/Popup */}
      {showQR && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-phone me-2"></i>
                  Scan to Open on Mobile
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowQR(false)}
                ></button>
              </div>
              <div className="modal-body text-center p-4">
                <div className="bg-light p-4 rounded d-inline-block">
                  <canvas ref={canvasRef} className="img-fluid"></canvas>
                </div>
                
                <div className="mt-4">
                  <p className="mb-2">
                    <strong>📡 Network Info:</strong>
                  </p>
                  <div className="bg-light p-3 rounded">
                    <p className="mb-1">
                      <i className="bi bi-wifi me-2"></i>
                      Same WiFi required
                    </p>
                    <p className="mb-1">
                      <i className="bi bi-hdd-network me-2"></i>
                      IP: {qrUrl ? qrUrl.replace('http://', '').replace(':5173', '') : ''}
                    </p>
                    <p className="mb-0">
                      <i className="bi bi-plug me-2"></i>
                      Port: 5173
                    </p>
                  </div>
                </div>

                <div className="alert alert-info mt-3 mb-0">
                  <i className="bi bi-info-circle me-2"></i>
                  Open your phone's camera and scan the QR code
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowQR(false)}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    navigator.clipboard.writeText(qrUrl);
                    addNotification("success", "URL copied to clipboard!");
                  }}
                >
                  <i className="bi bi-clipboard me-2"></i>
                  Copy URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Network Info Component */}
      <NetworkInfo />

      {/* Settings Form */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="row g-4">
              {/* Shop Logo */}
              <div className="col-12 text-center mb-4">
                <label className="form-label fw-medium d-block">
                  Shop Logo
                </label>

                {previewLogo ? (
                  <img
                    src={previewLogo}
                    alt="Shop Logo"
                    className="img-fluid rounded-circle mb-3"
                    style={{
                      width: "150px",
                      height: "150px",
                      objectFit: "cover",
                      border: "3px solid #ddd",
                    }}
                    onError={(e) => {
                      console.error("Logo failed to load:", previewLogo);
                      e.target.style.display = 'none';
                      // Show fallback
                      e.target.parentElement.innerHTML += `
                        <div class="bg-light rounded-circle d-flex align-items-center justify-content-center mb-3 mx-auto" 
                             style="width: 150px; height: 150px;">
                          <i class="bi bi-shop fs-1 text-muted"></i>
                        </div>
                      `;
                    }}
                  />
                ) : (
                  <div
                    className="bg-light rounded-circle d-flex align-items-center justify-content-center mb-3 mx-auto"
                    style={{ width: "150px", height: "150px" }}
                  >
                    <i className="bi bi-shop fs-1 text-muted"></i>
                  </div>
                )}

                <input
                  type="file"
                  className="form-control form-control-sm w-50 mx-auto"
                  accept="image/*"
                  onChange={handleLogoChange}
                />
                <small className="text-muted d-block mt-2">
                  Recommended: 1:1 ratio (PNG/JPG, max 2MB)
                </small>
              </div>

              {/* Shop Name */}
              <div className="col-md-6">
                <label className="form-label fw-medium">Shop Name *</label>
                <input
                  type="text"
                  className="form-control"
                  name="shopName"
                  value={formData.shopName}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Phone */}
              <div className="col-md-6">
                <label className="form-label fw-medium">Phone Number *</label>
                <input
                  type="text"
                  className="form-control"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Email */}
              <div className="col-md-6">
                <label className="form-label fw-medium">
                  Email (for notifications)
                </label>
                <input
                  type="email"
                  className="form-control"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              {/* Location */}
              <div className="col-md-6">
                <label className="form-label fw-medium">
                  Location (City/Area)
                </label>
                <input
                  type="text"
                  className="form-control"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Lahore, Punjab"
                />
              </div>

              {/* Address */}
              <div className="col-12">
                <label className="form-label fw-medium">Full Address</label>
                <textarea
                  className="form-control"
                  rows="3"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                ></textarea>
              </div>

              {/* About Shop */}
              <div className="col-12">
                <label className="form-label fw-medium">About Shop</label>
                <textarea
                  className="form-control"
                  rows="4"
                  name="about"
                  value={formData.about}
                  onChange={handleChange}
                  placeholder="Short description about your shop..."
                ></textarea>
              </div>
            </div>

            <div className="mt-5 text-end">
              <button
                type="submit"
                className="btn btn-primary btn-lg px-5"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}