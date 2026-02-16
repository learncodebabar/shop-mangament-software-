import { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const handleSessionExpiry = (event) => {
      if (event.detail?.sessionExpired || event.detail?.tokenInvalid) {
        logout();
        alert("Your session has expired. Please login again.");
      }
    };

    window.addEventListener("sessionExpired", handleSessionExpiry);

    return () => {
      window.removeEventListener("sessionExpired", handleSessionExpiry);
    };
  }, []);

  // Login function
  const login = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);

    // Redirect based on role
    redirectAfterLogin(userData);
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/owner-login");
  };

  // Redirect logic after login
  const redirectAfterLogin = (userData) => {
    if (userData.isOwner) {
      navigate("/");
    } else if (userData.role === "cashier") {
      navigate("/sales/pos");
    } else if (userData.role === "stock_keeper") {
      navigate("/products");
    } else if (userData.role === "manager") {
      navigate("/");
    }
  };

  const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const apiCall = async (url, options = {}) => {
    const token = localStorage.getItem("token");

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    // Check for session expiry
    if (response.status === 401) {
      const data = await response.json();
      if (data.sessionExpired || data.tokenInvalid) {
        logout();
        throw new Error("Session expired. Please login again.");
      }
    }

    return response;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    getAuthHeader,
    apiCall,
    isOwner: user?.isOwner || false,
    isManager: user?.role === "manager",
    isCashier: user?.role === "cashier",
    isStockKeeper: user?.role === "stock_keeper",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
