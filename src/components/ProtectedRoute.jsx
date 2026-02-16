import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (allowedRoles.length > 0) {
    const hasAccess = user.isOwner || allowedRoles.includes(user.role);

    if (!hasAccess) {
      if (user.role === "cashier") return <Navigate to="/sales/pos" replace />;
      if (user.role === "stock_keeper")
        return <Navigate to="/products" replace />;
      if (user.role === "manager") return <Navigate to="/" replace />;

      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
