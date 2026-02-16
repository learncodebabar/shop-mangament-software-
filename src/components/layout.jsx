import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationContext";
 import { useAuth } from "../context/AuthContext";
import SettingsOffcanvas from "./SettingsOffcanvas";
import NotificationOffcanvas from "./NotificationOffcanvas.jsx";
import "../css/main.css";
import api from "../api/api.js";
import { API_ENDPOINTS } from "../api/EndPoints.js";

export default function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [customersOpen, setCustomersOpen] = useState(false);
  const { notifications, unreadCount } = useNotifications();
  const { theme, setTheme } = useTheme();

 const { user, logout, isOwner, isManager, isCashier, isStockKeeper } = useAuth();

  const navigate = useNavigate();

  const toggleTheme = () => {
    setTheme({
      ...theme,
      mode: theme.mode === "light" ? "dark" : "light",
    });
  };

  //  REMOVE or SIMPLIFY - Logout
  const handleLogout = () => {
    logout();  //  Remove this
    navigate("/"); //  Just redirect to home
  };

  const toggleSales = () => setSalesOpen(!salesOpen);
  const toggleCustomers = () => setCustomersOpen(!customersOpen);
  const [shopName, setShopName] = useState("ShopPro");

  useEffect(() => {
    const fetchShopName = async () => {
      try {
        const res = await api.get(API_ENDPOINTS.SHOP_SETTINGS);
        const data = res.data || {};
        setShopName(data.shopName?.trim() || "ShopPro");
      } catch (err) {
        console.error("Failed to fetch shop name:", err);
      }
    };

    fetchShopName();
  }, []);

  return (
    <>
      {/* Header */}
      <header className="bg-body shadow-sm border-bottom border-top z-1 position-fixed w-100 top-0">
        <div className="container-fluid px-4 py-3">
          <div className="d-flex align-items-center justify-content-between">
            <button
              className="btn btn-link text-dark d-lg-none p-0 me-3"
              onClick={() => setIsMobileOpen(true)}
            >
              <i className="bi bi-list fs-3"></i>
            </button>

            {/*  SIMPLIFIED - User Info (Without Auth) */}
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-person-circle fs-4 text-primary"></i>
              <div className="d-none d-md-block">
                <small className="d-block fw-bold">Admin</small>
                <small className="text-muted text-capitalize">Owner</small>
              </div>
            </div>

            <div className="flex-grow-1" />

            {/* Right Icons */}
            <div className="d-flex align-items-center gap-3">
              <button
                className="btn btn-link text-muted p-0 position-relative"
                onClick={() => setShowNotifications(true)}
              >
                <i className="bi bi-bell fs-4"></i>
                {unreadCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                className="btn btn-link text-muted p-0"
                onClick={toggleTheme}
              >
                <i
                  className={`bi fs-4 ${theme.mode === "light" ? "bi-moon-stars" : "bi-sun"}`}
                ></i>
              </button>

              {/* ⚠️ OPTIONAL - Logout Button (can remove completely) */}
              <button
                className="btn btn-link text-danger p-0"
                onClick={handleLogout}
              >
                <i className="bi bi-power fs-4"></i>
              </button>

              <button
                className="btn btn-link text-muted p-0"
                onClick={() => setShowSettings(true)}
              >
                <i className="bi bi-gear fs-4"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Overlay  */}
      {isMobileOpen && (
        <div
          className="position-fixed start-0 w-100 h-100 bg-dark bg-opacity-50 d-lg-none"
          style={{ zIndex: 1040 }}
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar  */}
      <div
        className={`d-flex flex-column bg-body-tertiary border-end shadow-sm position-fixed start-0 top-0 h-100 transition-all ${
          isMobileOpen ? "" : "d-none"
        } d-lg-flex`}
        style={{
          width: isCollapsed ? "80px" : "260px",
          transition: "width 0.3s ease",
          zIndex: 1050,
          marginTop: "76px",
          height: "calc(100vh - 70px)",
          overflowY: "auto",
        }}
      >
        <button
          className="btn btn-link text-body position-absolute top-3 end-0 me-3 d-none d-lg-block"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <i
            className={`bi fs-4 ${isCollapsed ? "bi-arrow-right-square" : "bi-arrow-left-square"}`}
          ></i>
        </button>

        <h4
          className={`mb-0 fw-bold text-primary ${isCollapsed ? "d-none" : ""}`}
          style={{ position: "absolute", top: "10px", left: "15px" }}
        >
          {shopName}
        </h4>

        <nav className="flex-grow-1 py-5 px-3" style={{ marginTop: "35px" }}>
          {/*  NO ROLE CHECKS - All visible */}

          {/* Dashboard */}
          <NavLink
            to="/"
            end
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) =>
              `d-flex align-items-center rounded-3 mb-2 px-3 py-3 text-decoration-none transition-all ${isActive ? "bg-primary text-white shadow-sm" : "text-body hover-bg-primary hover-bg-opacity-10"} ${isCollapsed ? "justify-content-center" : ""}`
            }
          >
            <i
              className={`bi bi-speedometer2 fs-5 ${isCollapsed ? "" : "me-3"}`}
            ></i>
            <span className={isCollapsed ? "d-none" : "fw-medium"}>
              Dashboard
            </span>
          </NavLink>

          {/* Products */}
          <NavLink
            to="/products"
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) =>
              `d-flex align-items-center rounded-3 mb-2 px-3 py-3 text-decoration-none transition-all ${isActive ? "bg-primary text-white shadow-sm" : "text-body hover-bg-primary hover-bg-opacity-10"} ${isCollapsed ? "justify-content-center" : ""}`
            }
          >
            <i className={`bi bi-box fs-5 ${isCollapsed ? "" : "me-3"}`}></i>
            <span className={isCollapsed ? "d-none" : "fw-medium"}>
              Products
            </span>
          </NavLink>

          <NavLink
            to="/categories"
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) =>
              `d-flex align-items-center rounded-3 mb-2 px-3 py-3 text-decoration-none transition-all ${isActive ? "bg-primary text-white shadow-sm" : "text-body hover-bg-primary hover-bg-opacity-10"} ${isCollapsed ? "justify-content-center" : ""}`
            }
          >
            <i className={`bi bi-tag fs-5 ${isCollapsed ? "" : "me-3"}`}></i>
            <span className={isCollapsed ? "d-none" : "fw-medium"}>
              Categories
            </span>
          </NavLink>

          <NavLink
            to="/locations"
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) =>
              `d-flex align-items-center rounded-3 mb-2 px-3 py-3 text-decoration-none transition-all ${isActive ? "bg-primary text-white shadow-sm" : "text-body hover-bg-primary hover-bg-opacity-10"} ${isCollapsed ? "justify-content-center" : ""}`
            }
          >
            <i
              className={`bi bi-building fs-5 ${isCollapsed ? "" : "me-3"}`}
            ></i>
            <span className={isCollapsed ? "d-none" : "fw-medium"}>
              Locations
            </span>
          </NavLink>

          {/* Sales */}
          <div className="mt-2">
            <button
              className={`d-flex align-items-center w-100 rounded-3 mb-2 px-3 py-3 text-start text-decoration-none transition-all text-body hover-bg-primary hover-bg-opacity-10 ${isCollapsed ? "justify-content-center" : ""}`}
              onClick={toggleSales}
              style={{ background: "none", border: "none" }}
            >
              <i className={`bi bi-cart fs-5 ${isCollapsed ? "" : "me-3"}`}></i>
              <span className={isCollapsed ? "d-none" : "fw-medium"}>
                Sales
              </span>
              {!isCollapsed && (
                <i
                  className={`bi ms-auto fs-6 ${salesOpen ? "bi-chevron-down" : "bi-chevron-right"}`}
                ></i>
              )}
            </button>

            {!isCollapsed && salesOpen && (
              <div className="ps-5">
                <NavLink
                  to="/sales/pos"
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `d-block py-2 px-3 rounded text-decoration-none small transition-all ${isActive ? "bg-primary text-white" : "text-body hover-bg-primary hover-bg-opacity-10"}`
                  }
                >
                  POS Terminal
                </NavLink>
                <NavLink
                  to="/sales/history"
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `d-block py-2 px-3 rounded text-decoration-none small transition-all ${isActive ? "bg-primary text-white" : "text-body hover-bg-primary hover-bg-opacity-10"}`
                  }
                >
                  Sales History
                </NavLink>
              </div>
            )}
          </div>

          {/* Customers */}
          <div className="mt-2">
            <button
              className={`d-flex align-items-center w-100 rounded-3 mb-2 px-3 py-3 text-start text-decoration-none transition-all text-body hover-bg-primary hover-bg-opacity-10 ${isCollapsed ? "justify-content-center" : ""}`}
              onClick={toggleCustomers}
              style={{ background: "none", border: "none" }}
            >
              <i
                className={`bi bi-people fs-5 ${isCollapsed ? "" : "me-3"}`}
              ></i>
              <span className={isCollapsed ? "d-none" : "fw-medium"}>
                Customers
              </span>
              {!isCollapsed && (
                <i
                  className={`bi ms-auto fs-6 ${customersOpen ? "bi-chevron-down" : "bi-chevron-right"}`}
                ></i>
              )}
            </button>

            {!isCollapsed && customersOpen && (
              <div className="ps-5">
                <NavLink
                  to="/customers/cash"
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `d-block py-2 px-3 rounded text-decoration-none small transition-all ${isActive ? "bg-primary text-white" : "text-body hover-bg-primary hover-bg-opacity-10"}`
                  }
                >
                  Cash Customers
                </NavLink>
                <NavLink
                  to="/customers/permanent-credit"
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `d-block py-2 px-3 rounded text-decoration-none small transition-all ${isActive ? "bg-primary text-white" : "text-body hover-bg-primary hover-bg-opacity-10"}`
                  }
                >
                  Credits Customer
                </NavLink>
                <NavLink
                  to="/customers/temporary-credit"
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `d-block py-2 px-3 rounded text-decoration-none small transition-all ${isActive ? "bg-primary text-white" : "text-body hover-bg-primary hover-bg-opacity-10"}`
                  }
                >
                  Temporary Credits
                </NavLink>
              </div>
            )}
          </div>

          {/* Reports */}
          <NavLink
            to="/reports"
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) =>
              `d-flex align-items-center rounded-3 mb-2 px-3 py-3 text-decoration-none transition-all ${isActive ? "bg-primary text-white shadow-sm" : "text-body hover-bg-primary hover-bg-opacity-10"} ${isCollapsed ? "justify-content-center" : ""}`
            }
          >
            <i
              className={`bi bi-graph-up fs-5 ${isCollapsed ? "" : "me-3"}`}
            ></i>
            <span className={isCollapsed ? "d-none" : "fw-medium"}>
              Reports
            </span>
          </NavLink>

          {/* Expenses */}
          <NavLink
            to="/expenses"
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) =>
              `d-flex align-items-center rounded-3 mb-2 px-3 py-3 text-decoration-none transition-all ${isActive ? "bg-primary text-white shadow-sm" : "text-body hover-bg-primary hover-bg-opacity-10"} ${isCollapsed ? "justify-content-center" : ""}`
            }
          >
            <i
              className={`bi bi-currency-exchange fs-5 ${isCollapsed ? "" : "me-3"}`}
            ></i>
            <span className={isCollapsed ? "d-none" : "fw-medium"}>
              Expenses
            </span>
          </NavLink>
          {/* Employees */}
          <NavLink
            to="/employees"
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) =>
              `d-flex align-items-center rounded-3 mb-2 px-3 py-3 text-decoration-none transition-all ${isActive ? "bg-primary text-white shadow-sm" : "text-body hover-bg-primary hover-bg-opacity-10"} ${isCollapsed ? "justify-content-center" : ""}`
            }
          >
            <i
              className={`bi bi-person-badge fs-5 ${isCollapsed ? "" : "me-3"}`}
            ></i>
            <span className={isCollapsed ? "d-none" : "fw-medium"}>
              Employees
            </span>
          </NavLink>

          {/* Settings */}
          <NavLink
            to="/setting"
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) =>
              `d-flex align-items-center rounded-3 mb-2 px-3 py-3 text-decoration-none transition-all ${isActive ? "bg-primary text-white shadow-sm" : "text-body hover-bg-primary hover-bg-opacity-10"} ${isCollapsed ? "justify-content-center" : ""}`
            }
          >
            <i className={`bi bi-gear fs-5 ${isCollapsed ? "" : "me-3"}`}></i>
            <span className={isCollapsed ? "d-none" : "fw-medium"}>
              Settings
            </span>
          </NavLink>
        </nav>

        <hr
          className={`mx-3 border-secondary ${isCollapsed ? "d-none" : ""}`}
        />

        {/* OPTIONAL - Logout button (can remove) */}
        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className={`d-flex align-items-center w-100 rounded-3 px-3 py-3 text-danger text-decoration-none transition-all hover-bg-danger hover-bg-opacity-10 ${isCollapsed ? "justify-content-center" : ""}`}
            style={{ background: "none", border: "none", marginBottom: "65px" }}
          >
            <i
              className={`bi bi-box-arrow-right fs-5 ${isCollapsed ? "" : "me-3"}`}
            ></i>
            <span className={isCollapsed ? "d-none" : "fw-medium"}>Logout</span>
          </button>
        </div>
      </div>

      <main
        className="min-vh-100 bg-body"
        style={{
          marginLeft:
            window.innerWidth >= 992 ? (isCollapsed ? "80px" : "260px") : "0",
          transition: "margin-left 0.3s ease",
          marginTop: "70px",
          padding: "20px",
        }}
      >
        <Outlet />
      </main>

      <SettingsOffcanvas
        show={showSettings}
        handleClose={() => setShowSettings(false)}
      />
      <NotificationOffcanvas
        show={showNotifications}
        handleClose={() => setShowNotifications(false)}
      />
    </>
  );
}
