import Offcanvas from "react-bootstrap/Offcanvas";
import { useTheme } from "../context/ThemeContext";

export default function SettingsOffcanvas({ show, handleClose }) {
  const { theme, setTheme } = useTheme();

  const colors = [
    { name: "Blue", value: "#0d6efd" },
    { name: "Green", value: "#198754" },
    { name: "Purple", value: "#6f42c1" },
    { name: "Orange", value: "#fd7e14" },
    { name: "Red", value: "#dc3545" },
    { name: "Teal", value: "#20c997" },
    { name: "Pink", value: "#d63384" },
    { name: "Indigo", value: "#6610f2" },
  ];

  return (
    <Offcanvas show={show} onHide={handleClose} placement="end" backdrop={true}>
      <Offcanvas.Header closeButton className="border-bottom">
        <Offcanvas.Title className="fw-bold">
          <i className="bi bi-palette me-2"></i> Appearance Settings
        </Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body className="pt-4">
        {/* Theme Mode */}
        <div className="mb-5">
          <h6 className="fw-bold text-muted mb-3">Theme Mode</h6>
          <div className="btn-group w-100" role="group">
            <button
              className={`btn btn-lg flex-fill ${
                theme.mode === "light" ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => setTheme({ ...theme, mode: "light" })}
            >
              <i className="bi bi-sun me-2"></i> Light Mode
            </button>
            <button
              className={`btn btn-lg flex-fill ${
                theme.mode === "dark" ? "btn-primary" : "btn-outline-primary"
              }`}
              onClick={() => setTheme({ ...theme, mode: "dark" })}
            >
              <i className="bi bi-moon-stars me-2"></i> Dark Mode
            </button>
          </div>
        </div>

        {/* Primary Color */}
        <div>
          <h6 className="fw-bold text-muted mb-3">Primary Color</h6>
          <div className="row g-3">
            {colors.map((c) => (
              <div key={c.value} className="col-4">
                <button
                  className="btn w-100 p-0 rounded-3 shadow-sm position-relative"
                  style={{
                    backgroundColor: c.value,
                    height: "80px",
                    border:
                      theme.primary === c.value
                        ? "4px solid #000"
                        : "2px solid #ccc",
                  }}
                  onClick={() => setTheme({ ...theme, primary: c.value })}
                  title={c.name}
                >
                  {theme.primary === c.value && (
                    <i className="bi bi-check-lg text-white position-absolute top-50 start-50 translate-middle fs-3"></i>
                  )}
                </button>
                <small className="d-block text-center mt-2 text-muted">
                  {c.name}
                </small>
              </div>
            ))}
          </div>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
}
