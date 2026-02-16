import { useState, useEffect } from "react";
import api from "../api/api";
import { API_ENDPOINTS } from "../api/EndPoints";
import { useNotifications } from "../context/NotificationContext";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filterType, setFilterType] = useState("all");

  const [expenseForm, setExpenseForm] = useState({
    type: "office",
    category: "",
    description: "",
    amount: 0,
    employee: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    notes: "",
  });

  const [alert, setAlert] = useState({ show: false, type: "", message: "" });
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(
        () => setAlert({ show: false, type: "", message: "" }),
        2000,
      );
      return () => clearTimeout(timer);
    }
  }, [alert.show]);

  useEffect(() => {
    fetchExpenses();
  }, [dateRange, customStart, customEnd]);

  const notify = (type, message) => {
    setAlert({ show: true, type, message });
    addNotification(type, message);
  };

  const fetchExpenses = async () => {
    try {
      let url = API_ENDPOINTS.EXPENSES;
      const params = new URLSearchParams();

      if (dateRange === "today") {
        const today = new Date().toISOString().split("T")[0];
        params.append("start", today);
        params.append("end", today);
      } else if (dateRange === "yesterday") {
        const yesterday = new Date(Date.now() - 86400000)
          .toISOString()
          .split("T")[0];
        params.append("start", yesterday);
        params.append("end", yesterday);
      } else if (dateRange === "last7") {
        const end = new Date().toISOString().split("T")[0];
        const start = new Date(Date.now() - 7 * 86400000)
          .toISOString()
          .split("T")[0];
        params.append("start", start);
        params.append("end", end);
      } else if (dateRange === "custom" && customStart && customEnd) {
        params.append("start", customStart);
        params.append("end", customEnd);
      }

      if (params.toString()) url += `?${params.toString()}`;

      const res = await api.get(url);
      setExpenses(res.data || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching expenses:", err);
      notify("error", "Failed to load expenses");
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();

    if (!expenseForm.category.trim() || !expenseForm.description.trim()) {
      notify("error", "Please fill all required fields");
      return;
    }

    try {
      if (editingExpense) {
        await api.put(
          API_ENDPOINTS.EXPENSE_BY_ID(editingExpense._id),
          expenseForm,
        );
        notify("success", "Expense updated successfully!");
      } else {
        await api.post(API_ENDPOINTS.EXPENSES, expenseForm);
        notify("success", "Expense added successfully!");
      }

      setShowExpenseModal(false);
      resetExpenseForm();
      fetchExpenses();
    } catch (err) {
      notify("error", err.response?.data?.message || "Failed to save expense");
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Delete this expense?")) return;

    try {
      await api.delete(API_ENDPOINTS.EXPENSE_BY_ID(id));
      notify("success", "Expense deleted successfully!");
      fetchExpenses();
    } catch (err) {
      notify("error", "Failed to delete expense");
    }
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      type: expense.type,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      employee: expense.employee || "",
      date: new Date(expense.date).toISOString().split("T")[0],
      paymentMethod: expense.paymentMethod,
      notes: expense.notes || "",
    });
    setShowExpenseModal(true);
  };

  const resetExpenseForm = () => {
    setEditingExpense(null);
    setExpenseForm({
      type: "office",
      category: "",
      description: "",
      amount: 0,
      employee: "",
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "cash",
      notes: "",
    });
  };

  const exportToCSV = () => {
    if (expenses.length === 0) {
      notify("warning", "No expenses to export");
      return;
    }

    const rangeLabels = {
      today: "Today",
      yesterday: "Yesterday",
      last7: "Last 7 Days",
      custom: `${customStart} to ${customEnd}`,
    };

    let csvContent = "Expenses Report\n\n";
    csvContent += `Period:,${rangeLabels[dateRange]}\n\n`;

    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0,
    );
    csvContent += `Total Expenses:,RS${totalExpenses.toFixed(0)}\n`;
    csvContent += `Total Entries:,${expenses.length}\n\n`;

    csvContent += "DETAILED EXPENSES\n";
    csvContent +=
      "Date,Type,Category,Description,Person,Amount,Payment Method,Notes\n";

    expenses.forEach((exp) => {
      csvContent += `${new Date(exp.date).toLocaleDateString()},${exp.type},${exp.category},"${exp.description}",${exp.employee || "N/A"},RS${exp.amount.toFixed(0)},${exp.paymentMethod},"${exp.notes || ""}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `expenses_${dateRange}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notify("success", "Expenses exported successfully!");
  };

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div
          className="spinner-border text-primary"
          style={{ width: "3rem", height: "3rem" }}
        />
        <p className="mt-3 text-muted">Loading expenses...</p>
      </div>
    );
  }

  // Calculations
  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + (exp.amount || 0),
    0,
  );
  const utilityExpenses = expenses
    .filter((e) => e.type === "utility")
    .reduce((sum, e) => sum + e.amount, 0);
  const officeExpenses = expenses
    .filter((e) => e.type === "office")
    .reduce((sum, e) => sum + e.amount, 0);
  const foodExpenses = expenses
    .filter((e) => e.type === "food")
    .reduce((sum, e) => sum + e.amount, 0);
  const transportExpenses = expenses
    .filter((e) => e.type === "transport")
    .reduce((sum, e) => sum + e.amount, 0);
  const otherExpenses = expenses
    .filter((e) => e.type === "other")
    .reduce((sum, e) => sum + e.amount, 0);

  // Filter expenses
  const filteredExpenses =
    filterType === "all"
      ? expenses
      : expenses.filter((e) => e.type === filterType);

  return (
    <div className="container-fluid py-4">
      {/* TOAST ALERT */}
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
            } me-2 fs-5`}
          ></i>
          {alert.message}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4 sale-history-header ">
        <h2 className="fw-bold mb-0">Expenses Management</h2>

        <div className="d-flex gap-3 align-items-center history-filter sale-history-headers">
          <select
            className="form-select expenses-filter"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 Days</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRange === "custom" && (
            <div className="d-flex gap-2">
              <input
                type="date"
                className="form-control"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <input
                type="date"
                className="form-control"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          )}

          <button
            className="btn btn-success credit-cstmr"
            onClick={exportToCSV}
            disabled={expenses.length === 0}
            style={{ width: "258px" }}
          >
            <i className="bi bi-download me-2"></i> Export CSV
          </button>

          <button
            className="btn btn-primary"
            style={{ width: "300px" }}
            onClick={() => {
              resetExpenseForm();
              setShowExpenseModal(true);
            }}
          >
            <i className="bi bi-plus-circle me-2"></i> Add Expense
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-6 col-lg-2">
          <div
            className="card border-0 shadow-sm text-center p-3"
            style={{ backgroundColor: "#6f42c1", color: "white" }}
          >
            <h6 className="mb-1 fw-bold">Total Expenses</h6>
            <h3 className="fw-bold mb-0">RS{totalExpenses.toFixed(0)}</h3>
            <small className="opacity-75">{expenses.length} entries</small>
          </div>
        </div>

        <div className="col-md-6 col-lg-2">
          <div className="card border-0 shadow-sm text-center p-3 bg-info text-white">
            <h6 className="mb-1 fw-bold">Utility</h6>
            <h3 className="fw-bold mb-0">RS{utilityExpenses.toFixed(0)}</h3>
            <small className="opacity-75">Bills</small>
          </div>
        </div>

        <div className="col-md-6 col-lg-2">
          <div className="card border-0 shadow-sm text-center p-3 bg-primary text-white">
            <h6 className="mb-1 fw-bold">Office</h6>
            <h3 className="fw-bold mb-0">RS{officeExpenses.toFixed(0)}</h3>
            <small className="opacity-75">Supplies</small>
          </div>
        </div>

        <div className="col-md-6 col-lg-2">
          <div className="card border-0 shadow-sm text-center p-3 bg-warning text-dark">
            <h6 className="mb-1 fw-bold">Food</h6>
            <h3 className="fw-bold mb-0">RS{foodExpenses.toFixed(0)}</h3>
            <small>Coffee/Lunch</small>
          </div>
        </div>

        <div className="col-md-6 col-lg-2">
          <div className="card border-0 shadow-sm text-center p-3 bg-success text-white">
            <h6 className="mb-1 fw-bold">Transport</h6>
            <h3 className="fw-bold mb-0">RS{transportExpenses.toFixed(0)}</h3>
            <small className="opacity-75">Delivery</small>
          </div>
        </div>

        <div className="col-md-6 col-lg-2">
          <div className="card border-0 shadow-sm text-center p-3 bg-secondary text-white">
            <h6 className="mb-1 fw-bold">Other</h6>
            <h3 className="fw-bold mb-0">RS{otherExpenses.toFixed(0)}</h3>
            <small className="opacity-75">Misc</small>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">All Expenses</h5>
          <div className="d-flex gap-2">
            <select
              className="form-select form-select-sm"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ width: "150px" }}
            >
              <option value="all">All Types</option>
              <option value="utility">Utility</option>
              <option value="office">Office</option>
              <option value="food">Food</option>
              <option value="transport">Transport</option>
              <option value="other">Other</option>
            </select>
            <span className="badge bg-light text-dark align-self-center">
              {filteredExpenses.length} of {expenses.length}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          <div
            className="table-responsive"
            style={{ maxHeight: "600px", overflowY: "auto" }}
          >
            <table className="table table-hover mb-0">
              <thead className="table-light sticky-top">
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Person</th>
                  <th className="text-end">Amount</th>
                  <th>Payment</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((exp, index) => (
                    <tr key={exp._id}>
                      <td className="text-muted">{index + 1}</td>
                      <td>{new Date(exp.date).toLocaleDateString()}</td>
                      <td>
                        <span
                          className={`badge ${
                            exp.type === "food"
                              ? "bg-warning"
                              : exp.type === "utility"
                                ? "bg-info"
                                : exp.type === "office"
                                  ? "bg-primary"
                                  : exp.type === "transport"
                                    ? "bg-success"
                                    : "bg-secondary"
                          }`}
                        >
                          {exp.type}
                        </span>
                      </td>
                      <td>
                        <strong>{exp.category}</strong>
                      </td>
                      <td>
                        {exp.description}
                        {exp.notes && (
                          <small className="text-muted">{exp.notes}</small>
                        )}
                      </td>
                      <td>{exp.employee || "-"}</td>
                      <td className="text-end fw-bold">
                        RS{exp.amount.toFixed(0)}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark">
                          {exp.paymentMethod}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-xs btn-outline-primary me-1"
                          onClick={() => openEditExpense(exp)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-xs btn-outline-danger"
                          onClick={() => handleDeleteExpense(exp._id)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-1 mb-3 opacity-50"></i>
                      <p>No expenses found for the selected period</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleAddExpense}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingExpense ? "Edit Expense" : "Add New Expense"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowExpenseModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Type *</label>
                      <select
                        className="form-select"
                        required
                        value={expenseForm.type}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            type: e.target.value,
                          })
                        }
                      >
                        <option value="utility">
                          Utility (Electric/Water)
                        </option>
                        <option value="office">Office Supplies</option>
                        <option value="food">Food (Coffee/Lunch/Tea)</option>
                        <option value="transport">Transport/Delivery</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Category *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="e.g., Coffee, Electric Bill"
                        value={expenseForm.category}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            category: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Description *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="Brief description"
                        value={expenseForm.description}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Amount (RS) *</label>
                      <input
                        type="number"
                        className="form-control"
                        required
                        value={expenseForm.amount}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            amount: Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Person (Optional)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Who used/bought this"
                        value={expenseForm.employee}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            employee: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Date *</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={expenseForm.date}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            date: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Payment Method</label>
                      <select
                        className="form-select"
                        value={expenseForm.paymentMethod}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            paymentMethod: e.target.value,
                          })
                        }
                      >
                        <option value="cash">Cash</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="credit">Credit Card</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label">Notes (Optional)</label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Additional details..."
                        value={expenseForm.notes}
                        onChange={(e) =>
                          setExpenseForm({
                            ...expenseForm,
                            notes: e.target.value,
                          })
                        }
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowExpenseModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingExpense ? "Update" : "Add"} Expense
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
        .sticky-top {
          position: sticky;
          top: 0;
          z-index: 10;
        }
      `}</style>
    </div>
  );
}
