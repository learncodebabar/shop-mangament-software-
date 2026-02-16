import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Dashboard from "./pages/Dashboard";
import Products from "./pages/products/Products.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import SalesPOS from "./pages/SalesPOS.jsx";
import CashCustomers from "./pages/customers/CashCustomers.jsx";
import PermanentCredit from "./pages/customers/PermanentCredit.jsx";
import TemporaryCredit from "./pages/customers/TemporaryCredit.jsx";
import Employees from "./pages/Employees";
import Reports from "./pages/Reports";
import Layout from "./components/layout.jsx";
import Setting from "./pages/Settings.jsx";
import SalesHistoryPage from "./pages/SalesHistory.jsx";
import Categories from "./pages/products/Categories.jsx";
import Locations from "./pages/products/Locations.jsx";

// Auth Pages
import OwnerLogin from "./pages/auth/OwnerLogin";
import EmployeeLogin from "./pages/auth/EmployeeLogin";
import OwnerRegister from "./pages/auth/OwnerRegister";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import Expenses from "./pages/Expenses.jsx";




function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<OwnerLogin />} />
          <Route path="/owner-login" element={<OwnerLogin />} />
          <Route path="/employee-login" element={<EmployeeLogin />} />
          <Route path="/owner-register" element={<OwnerRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Nested routes same as before */}
            <Route index element={<ProtectedRoute allowedRoles={["manager"]}><Dashboard /></ProtectedRoute>} />
            <Route path="products" element={<ProtectedRoute allowedRoles={["manager", "stock_keeper"]}><Products /></ProtectedRoute>} />
            <Route path="products/:id" element={<ProtectedRoute allowedRoles={["manager", "stock_keeper"]}><ProductDetail /></ProtectedRoute>} />
            <Route path="locations" element={<ProtectedRoute allowedRoles={["manager", "stock_keeper"]}><Locations /></ProtectedRoute>} />
            <Route path="categories" element={<ProtectedRoute allowedRoles={["manager", "stock_keeper"]}><Categories /></ProtectedRoute>} />
            <Route path="sales/pos" element={<ProtectedRoute allowedRoles={["manager", "cashier"]}><SalesPOS /></ProtectedRoute>} />
            <Route path="sales/history" element={<ProtectedRoute allowedRoles={["manager"]}><SalesHistoryPage /></ProtectedRoute>} />
            <Route path="customers/cash" element={<ProtectedRoute allowedRoles={["manager"]}><CashCustomers /></ProtectedRoute>} />
            <Route path="customers/permanent-credit" element={<ProtectedRoute allowedRoles={["manager"]}><PermanentCredit /></ProtectedRoute>} />
            <Route path="customers/temporary-credit" element={<ProtectedRoute allowedRoles={["manager"]}><TemporaryCredit /></ProtectedRoute>} />
            <Route path="employees" element={<ProtectedRoute allowedRoles={[]}><Employees /></ProtectedRoute>} />
            <Route path="reports" element={<ProtectedRoute allowedRoles={["manager"]}><Reports /></ProtectedRoute>} />
            <Route path="setting" element={<ProtectedRoute allowedRoles={[]}><Setting /></ProtectedRoute>} />
            <Route path="expenses" element={<ProtectedRoute allowedRoles={["manager"]}><Expenses /></ProtectedRoute>} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;

