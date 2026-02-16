import { useState, useEffect, useRef } from "react";
import api from "../api/api";
import { useNotifications } from "../context/NotificationContext";
import { API_ENDPOINTS } from "../api/EndPoints";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    role: "cashier",
    salary: "",
    joinDate: "",
    address: "",
    cnic: "",
    password: "",
    username: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [alert, setAlert] = useState({ show: false, type: "", message: "" });

  const { addNotification } = useNotifications();

  // Refs
  const nameRef = useRef();
  const phoneRef = useRef();
  const emailRef = useRef();
  const salaryRef = useRef();
  const joinDateRef = useRef();
  const addressRef = useRef();
  const cnicRef = useRef();
  const passwordRef = useRef();
  const usernameRef = useRef();

  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(
        () => setAlert({ show: false, type: "", message: "" }),
        5000,
      );
      return () => clearTimeout(timer);
    }
  }, [alert.show]);

  useEffect(() => {
    fetchEmployees();
    if (showAddModal) nameRef.current?.focus();
  }, [showAddModal]);

  const fetchEmployees = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.EMPLOYEES);
      let employeeList = [];

      if (res.data?.data && Array.isArray(res.data.data)) {
        employeeList = res.data.data;
      } else if (Array.isArray(res.data)) {
        employeeList = res.data;
      }

      console.log("Extracted employees:", employeeList);

      const currentMonth = new Date().toISOString().slice(0, 7);

      const updated = employeeList.map((emp) => ({
        ...emp,
        salaryStatus: emp.lastPaidMonth === currentMonth ? "paid" : "unpaid",
      }));

      setEmployees(updated);
      setLoading(false);
    } catch (err) {
      console.error(err?.response?.data || err);
      notify(
        "error",
        err?.response?.data?.message || "Failed to load employees",
      );
      setLoading(false);
    }
  };

  const notify = (type, message) => {
    setAlert({ show: true, type, message });
    addNotification(type, message);
  };

  const handleKeyDown = (e, nextRef) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) return notify("error", "Name is required");
    if (!formData.phone.trim()) return notify("error", "Phone is required");
    if (!formData.salary || formData.salary <= 0)
      return notify("error", "Valid salary required");
    if (!formData.username.trim())
      return notify("error", "Username is required");

    if (!editingEmployee) {
      if (!formData.password.trim())
        return notify("error", "Password is required for new employee");
      if (formData.password.length < 6)
        return notify("error", "Password must be at least 6 characters");
    }

    try {
      let res;
      const employeeData = {
        ...formData,
        salary: Number(formData.salary),
        username: formData.username.trim().toLowerCase(),
      };

      if (editingEmployee) {
        if (!employeeData.password.trim()) {
          delete employeeData.password;
        }
        res = await api.put(
          API_ENDPOINTS.EMPLOYEE_BY_ID(editingEmployee._id),
          employeeData,
        );

        // ✅ Handle nested response
        const updatedEmployee = res.data.data || res.data;
        setEmployees(
          employees.map((emp) =>
            emp._id === editingEmployee._id ? updatedEmployee : emp,
          ),
        );
        notify("success", `Employee "${updatedEmployee.name}" updated!`);
      } else {
        // Add new employee
        res = await api.post(API_ENDPOINTS.EMPLOYEES, {
          ...employeeData,
          salaryStatus: "unpaid",
          lastPaidMonth: null,
          salaryHistory: [],
        });

        // ✅ FIX: Handle nested response
        const newEmployee = res.data.data || res.data;
        setEmployees([...employees, newEmployee]);
        notify("success", `New employee "${newEmployee.name}" added!`);
      }

      // Reset form
      setFormData({
        name: "",
        phone: "",
        email: "",
        role: "cashier",
        salary: "",
        joinDate: "",
        address: "",
        cnic: "",
        password: "",
        username: "",
      });
      setShowAddModal(false);
      setEditingEmployee(null);
    } catch (err) {
      console.error("Full error:", err.response?.data || err);
      notify("error", err.response?.data?.message || "Operation failed");
    }
  };

  const handlePaySalary = async (id, name, salary) => {
    if (
      !window.confirm(`Mark RS${salary} salary as PAID for ${name} this month?`)
    )
      return;

    try {
      const res = await api.patch(API_ENDPOINTS.PAY_SALARY(id), {});

      const updatedEmployee = res.data;

      setEmployees((prev) =>
        prev.map((emp) =>
          emp._id === id ? { ...emp, ...updatedEmployee } : emp,
        ),
      );

      printSalaryReceipt(name, salary, new Date().toLocaleDateString());

      notify("success", `Salary of RS${salary} marked PAID for ${name}!`);
    } catch (err) {
      console.error("Pay salary error:", err.response?.data || err.message);
      notify("error", err.response?.data?.message || "Failed to mark paid");
    }
  };

  const printSalaryReceipt = (name, amount, date) => {
    const receiptWindow = window.open("", "_blank");
    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Receipt - ${name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; max-width: 600px; margin: auto; }
          .receipt { border: 2px solid #000; padding: 20px; text-align: center; }
          h2 { margin: 0; }
          .details { margin: 20px 0; font-size: 18px; }
          .footer { margin-top: 30px; font-size: 14px; color: #555; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <h2>Salary Payment Receipt</h2>
          <p><strong>Shop Name:</strong> Your Shop</p>
          <hr>
          <div class="details">
            <p><strong>Employee:</strong> ${name}</p>
            <p><strong>Amount Paid:</strong> RS ${amount.toLocaleString()}</p>
            <p><strong>Date:</strong> ${date}</p>
          </div>
          <hr>
          <p class="footer">Thank you for your hard work! 💙</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    receiptWindow.document.close();
  };

  const handleEdit = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      name: emp.name,
      phone: emp.phone,
      email: emp.email || "",
      role: emp.role || "cashier",
      salary: emp.salary || "",
      joinDate: emp.joinDate ? emp.joinDate.split("T")[0] : "",
      address: emp.address || "",
      cnic: emp.cnic || "",
      password: "",
      username: emp.username || "",
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}" permanently?`)) return;
    try {
      await api.delete(API_ENDPOINTS.EMPLOYEE_BY_ID(id));
      setEmployees(employees.filter((emp) => emp._id !== id));
      notify("success", `Employee "${name}" deleted`);
    } catch (err) {
      notify("error", "Delete failed");
    }
  };

  const handleShowHistory = (emp) => {
    setSelectedEmployee(emp);
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone?.includes(searchQuery) ||
      emp.role?.toLowerCase().includes(searchQuery),
  );

  return (
    <div className="container-fluid py-4 position-relative">
      {/* TOP ALERT */}
      {alert.show && (
        <div
          className={`alert alert-${
            alert.type === "success"
              ? "success"
              : alert.type === "warning"
                ? "warning"
                : "danger"
          } position-fixed top-0 start-50 translate-middle-x mt-4 shadow-lg border-0 rounded-pill px-5 py-3 fw-bold text-white`}
          style={{
            zIndex: 3000,
            minWidth: "350px",
            animation: "slideDown 0.4s ease-out",
          }}
        >
          <i
            className={`bi ${
              alert.type === "success"
                ? "bi-check-circle-fill"
                : alert.type === "warning"
                  ? "bi-exclamation-triangle-fill"
                  : "bi-x-circle-fill"
            } me-2`}
          ></i>
          {alert.message}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Employees Management</h2>
        <button
          className="btn btn-primary btn-lg rounded-pill shadow-sm px-4 cate-btn"
          onClick={() => {
            setEditingEmployee(null);
            setFormData({
              name: "",
              phone: "",
              email: "",
              role: "cashier",
              salary: "",
              joinDate: "",
              address: "",
              cnic: "",
              password: "",
              username: "",
            });
            setShowAddModal(true);
          }}
        >
          <i className="bi bi-person-plus-fill me-2"></i> Add Employee
        </button>
      </div>

      {/* Search */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="position-relative">
            <input
              type="text"
              className="form-control form-control-lg ps-5 rounded-pill"
              placeholder="Search by name, phone or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow">
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-people fs-1 mb-3 opacity-50"></i>
              <h5>No employees found</h5>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="ps-4">Name</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Salary</th>
                    <th>Status</th>
                    <th>Join Date</th>
                    <th className="text-center">History</th>
                    <th className="text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => (
                    <tr key={emp._id}>
                      <td className="ps-4">
                        <div className="fw-bold">{emp.name}</div>
                        {emp.email && (
                          <small className="text-muted">{emp.email}</small>
                        )}
                      </td>
                      <td>{emp.phone}</td>
                      <td>
                        <span className="badge bg-info px-3 py-2">
                          {emp.role || "Cashier"}
                        </span>
                      </td>
                      <td className="fw-bold">
                        RS{Number(emp.salary || 0).toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            emp.salaryStatus === "paid"
                              ? "bg-success"
                              : "bg-danger"
                          } px-3 py-2`}
                        >
                          {emp.salaryStatus === "paid" ? "Paid" : "Unpaid"}
                        </span>
                        {emp.salaryStatus === "unpaid" && (
                          <button
                            className="btn btn-sm btn-success ms-2"
                            onClick={() =>
                              handlePaySalary(emp._id, emp.name, emp.salary)
                            }
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                      <td>
                        {emp.joinDate
                          ? new Date(emp.joinDate).toLocaleDateString("en-GB")
                          : "N/A"}
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-info"
                          onClick={() => setSelectedEmployee(emp)}
                        >
                          <i className="bi bi-clock-history"></i> History
                        </button>
                      </td>
                      <td className="text-end pe-4">
                        <button
                          className="btn btn-sm btn-outline-primary me-2"
                          onClick={() => handleEdit(emp)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(emp._id, emp.name)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Salary History Modal */}
      {selectedEmployee && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">
                  <i className="bi bi-clock-history me-2"></i>
                  Salary Payment History - {selectedEmployee.name}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedEmployee(null)}
                ></button>
              </div>
              <div className="modal-body">
                {selectedEmployee.salaryHistory?.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Month</th>
                          <th className="text-end">Amount (RS)</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEmployee.salaryHistory
                          .sort(
                            (a, b) =>
                              new Date(b.paidDate) - new Date(a.paidDate),
                          )
                          .map((entry, index) => (
                            <tr key={index}>
                              <td>
                                {new Date(entry.paidDate).toLocaleDateString(
                                  "en-GB",
                                )}
                              </td>
                              <td>{entry.month || "—"}</td>
                              <td className="text-end fw-bold">
                                RS{Number(entry.amount).toLocaleString()}
                              </td>
                              <td>
                                <span className="badge bg-success">Paid</span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-clock-history fs-1 mb-3 opacity-50"></i>
                    <p>No salary payment history yet.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedEmployee(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingEmployee) && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg overflow-auto">
              <form onSubmit={handleSubmit}>
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    <i className="bi bi-person-fill me-2"></i>
                    {editingEmployee ? "Edit Employee" : "Add New Employee"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingEmployee(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Name *</label>
                      <input
                        ref={nameRef}
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        onKeyDown={(e) => handleKeyDown(e, phoneRef)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Username *</label>
                      <input
                        ref={usernameRef}
                        type="text"
                        className="form-control"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            username: e.target.value.trim(),
                          })
                        }
                        required
                        placeholder="Login (unique)"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Phone *</label>
                      <input
                        ref={phoneRef}
                        type="text"
                        className="form-control"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        onKeyDown={(e) => handleKeyDown(e, emailRef)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Email</label>
                      <input
                        ref={emailRef}
                        type="email"
                        className="form-control"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        onKeyDown={(e) => handleKeyDown(e, salaryRef)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        Monthly Salary (RS) *
                      </label>
                      <input
                        ref={salaryRef}
                        type="number"
                        className="form-control"
                        value={formData.salary}
                        onChange={(e) =>
                          setFormData({ ...formData, salary: e.target.value })
                        }
                        onKeyDown={(e) => handleKeyDown(e, joinDateRef)}
                        required
                        min="1"
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Role</label>
                      <select
                        className="form-select"
                        value={formData.role}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                      >
                        <option value="cashier">Cashier</option>
                        <option value="manager">Manager</option>
                        <option value="stock_keeper">Stock Keeper</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Join Date</label>
                      <input
                        ref={joinDateRef}
                        type="date"
                        className="form-control"
                        value={formData.joinDate}
                        onChange={(e) =>
                          setFormData({ ...formData, joinDate: e.target.value })
                        }
                        onKeyDown={(e) => handleKeyDown(e, addressRef)}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-medium">Address</label>
                      <textarea
                        ref={addressRef}
                        className="form-control"
                        rows="2"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        onKeyDown={(e) => handleKeyDown(e, cnicRef)}
                      ></textarea>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">
                        CNIC (13 digits)
                      </label>
                      <input
                        ref={cnicRef}
                        type="text"
                        className="form-control"
                        maxLength="13"
                        value={formData.cnic}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            cnic: e.target.value.replace(/\D/g, ""),
                          })
                        }
                      />
                    </div>
                    <div className="col-md-6 position-relative">
                      <label className="form-label fw-medium">
                        Password{" "}
                        {editingEmployee && "(leave blank to keep current)"}
                      </label>
                      <div className="input-group">
                        <input
                          ref={passwordRef}
                          type={showPassword ? "text" : "password"}
                          className="form-control"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          required={!editingEmployee}
                          minLength={editingEmployee ? 0 : 6}
                          placeholder={
                            editingEmployee
                              ? "••••••••  (leave blank to keep)"
                              : "Minimum 6 characters"
                          }
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <i
                            className={`bi ${
                              showPassword ? "bi-eye-slash" : "bi-eye"
                            }`}
                          ></i>
                        </button>
                      </div>
                      {editingEmployee && (
                        <small className="text-muted">
                          Current password is hidden. Only fill this if you want
                          to change it.
                        </small>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingEmployee(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary px-4">
                    <i className="bi bi-check-lg me-2"></i>
                    {editingEmployee ? "Update" : "Add"} Employee
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
