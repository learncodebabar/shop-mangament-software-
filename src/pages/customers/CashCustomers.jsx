import { useState, useEffect } from "react";
import api from "../../api/api";
import { API_ENDPOINTS } from "../../api/EndPoints";

export default function CashCustomers() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCashSales();
  }, []);

  const fetchCashSales = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.CASH_SALE);
      setSales(res.data || []);
      setLoading(false);
    } catch (err) {
      alert("Error loading cash sales");
      setLoading(false);
    }
  };

  // Date filtering logic
  const getFilteredSalesByDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateRange === "all") {
      return sales;
    }

    if (dateRange === "today") {
      return sales.filter((s) => new Date(s.createdAt) >= today);
    }

    if (dateRange === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayAfterYesterday = new Date(today);
      return sales.filter((s) => {
        const saleDate = new Date(s.createdAt);
        return saleDate >= yesterday && saleDate < dayAfterYesterday;
      });
    }

    if (dateRange === "last7") {
      const last7Days = new Date(today);
      last7Days.setDate(last7Days.getDate() - 7);
      return sales.filter((s) => new Date(s.createdAt) >= last7Days);
    }

    if (dateRange === "thisMonth") {
      return sales.filter((s) => {
        const date = new Date(s.createdAt);
        return (
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear()
        );
      });
    }

    if (dateRange === "custom" && customStart && customEnd) {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return sales.filter((s) => {
        const saleDate = new Date(s.createdAt);
        return saleDate >= start && saleDate <= end;
      });
    }

    return sales;
  };

  const dateFilteredSales = getFilteredSalesByDate();

  // Search filtering
  const filteredSales = dateFilteredSales.filter((sale) => {
    const query = searchQuery.toLowerCase();
    return (
      sale._id?.toLowerCase().includes(query) ||
      sale.payments?.some((p) => p.method?.toLowerCase().includes(query))
    );
  });

  // Summary calculations
  const totalAmount = filteredSales.reduce(
    (sum, s) => sum + (s.paidAmount || 0),
    0,
  );
  const totalChange = filteredSales.reduce(
    (sum, s) => sum + ((s.paidAmount || 0) - (s.total || 0)),
    0,
  );
  const totalItems = filteredSales.reduce(
    (sum, s) => sum + (s.items?.length || 0),
    0,
  );

  // Payment method breakdown
  const paymentBreakdown = {};
  filteredSales.forEach((sale) => {
    sale.payments?.forEach((payment) => {
      const method = payment.method || "Cash";
      paymentBreakdown[method] =
        (paymentBreakdown[method] || 0) + payment.amount;
    });
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // CSV Export Function
  const exportToCSV = () => {
    if (filteredSales.length === 0) {
      alert("No data to export");
      return;
    }

    let csvContent = "Cash Sales Report\n\n";

    // Date Range Info
    const rangeLabels = {
      all: "All Time",
      today: "Today",
      yesterday: "Yesterday",
      last7: "Last 7 Days",
      thisMonth: "This Month",
      custom: `${customStart} to ${customEnd}`,
    };
    csvContent += `Period:,${rangeLabels[dateRange]}\n`;
    csvContent += `Total Transactions:,${filteredSales.length}\n`;
    csvContent += `Total Amount Collected:,RS${totalAmount.toFixed(2)}\n`;
    csvContent += `Total Change Given:,RS${totalChange.toFixed(2)}\n`;
    csvContent += `Total Items Sold:,${totalItems}\n\n`;

    // Payment Method Breakdown
    csvContent += "PAYMENT METHOD BREAKDOWN\n";
    csvContent += "Method,Amount\n";
    Object.entries(paymentBreakdown).forEach(([method, amount]) => {
      csvContent += `${method},RS${amount.toFixed(2)}\n`;
    });
    csvContent += "\n";

    // Sales Details Header
    csvContent += "SALES DETAILS\n";
    csvContent +=
      "Date & Time,Invoice ID,Payment Methods,Amount Paid,Sale Total,Change Given,Items Count\n";

    // Sales Data
    filteredSales.forEach((sale) => {
      const date = formatDate(sale.createdAt);
      const invoiceId = sale._id.slice(-8).toUpperCase();
      const paymentMethods =
        sale.payments?.map((p) => p.method).join(" + ") || "Cash";
      const amountPaid = `RS${(sale.paidAmount || 0).toFixed(2)}`;
      const saleTotal = `RS${(sale.total || 0).toFixed(2)}`;
      const change = `RS${((sale.paidAmount || 0) - (sale.total || 0)).toFixed(2)}`;
      const itemsCount = sale.items?.length || 0;

      csvContent += `"${date}",${invoiceId},"${paymentMethods}",${amountPaid},${saleTotal},${change},${itemsCount}\n`;
    });

    csvContent += "\n\nITEMS BREAKDOWN\n";
    csvContent +=
      "Invoice ID,Item Name,Quantity,Unit Price,Discount,Line Total\n";

    filteredSales.forEach((sale) => {
      const invoiceId = sale._id.slice(-8).toUpperCase();
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const lineTotal = (item.price - (item.itemDiscount || 0)) * item.qty;
          csvContent += `${invoiceId},"${item.name}",${item.qty},RS${item.price},${item.itemDiscount || 0},RS${lineTotal.toFixed(2)}\n`;
        });
      }
    });

    // Create and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `cash_sales_${dateRange}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 cash-customer-header">
        <h2 className="fw-bold mb-0">Cash Customers / Payments</h2>

        <div className="d-flex gap-3 align-items-center history-filter ">
          <select
            className="form-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7">Last 7 Days</option>
            <option value="thisMonth">This Month</option>
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
            className="btn btn-success d-flex align-items-center gap-2 history-csv"
            onClick={exportToCSV}
            disabled={filteredSales.length === 0}
            style={{ width: "208px" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
              <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm text-center p-4 bg-primary text-white rounded-3">
            <h6 className="mb-1">Total Transactions</h6>
            <h3 className="fw-bold mb-0">{filteredSales.length}</h3>
            <small className="opacity-75">Cash sales</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm text-center p-4 bg-success text-white rounded-3">
            <h6 className="mb-1">Amount Collected</h6>
            <h3 className="fw-bold mb-0">RS{totalAmount.toFixed(0)}</h3>
            <small className="opacity-75">Total received</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm text-center p-4 bg-warning text-dark rounded-3">
            <h6 className="mb-1">Change Given</h6>
            <h3 className="fw-bold mb-0">RS{totalChange.toFixed(0)}</h3>
            <small>To customers</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm text-center p-4 bg-info text-white rounded-3">
            <h6 className="mb-1">Items Sold</h6>
            <h3 className="fw-bold mb-0">{totalItems}</h3>
            <small className="opacity-75">Total quantity</small>
          </div>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      {Object.keys(paymentBreakdown).length > 0 && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-light">
            <h6 className="mb-0 fw-bold">Payment Method Breakdown</h6>
          </div>
          <div className="card-body">
            <div className="row g-3">
              {Object.entries(paymentBreakdown).map(([method, amount]) => (
                <div key={method} className="col-md-4 col-lg-3">
                  <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded">
                    <span className="fw-medium">{method}</span>
                    <span className="fw-bold text-success">
                      RS{amount.toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="position-relative">
            <input
              type="text"
              className="form-control form-control-lg ps-5 rounded-pill"
              placeholder="Search by Invoice ID or Payment Method..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-5"></i>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-3 py-3">Date & Time</th>
                  <th className="py-3">Invoice ID</th>
                  <th className="py-3">Payment Method</th>
                  <th className="py-3">Amount Paid</th>
                  <th className="py-3">Sale Total</th>
                  <th className="py-3">Change</th>
                  <th className="pe-3 py-3">Items</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5">
                      <div className="spinner-border text-primary" />
                      <p className="mt-2 text-muted">Loading cash sales...</p>
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                      No cash sales found for selected filters
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale._id}>
                      <td className="ps-3 py-3 text-muted">
                        {formatDate(sale.createdAt)}
                      </td>
                      <td className="py-3 fw-semibold text-primary">
                        #{sale._id.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-3">
                        {sale.payments?.length > 0 ? (
                          <div className="d-flex flex-wrap gap-1">
                            {sale.payments.map((p, idx) => (
                              <span
                                key={idx}
                                className="badge bg-success rounded-pill"
                              >
                                {p.method}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="badge bg-success rounded-pill">
                            Cash
                          </span>
                        )}
                      </td>
                      <td className="py-3 fw-bold text-success">
                        RS{(sale.paidAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 fw-semibold">
                        RS{(sale.total || 0).toFixed(2)}
                      </td>
                      <td className="py-3 text-warning fw-semibold">
                        RS
                        {((sale.paidAmount || 0) - (sale.total || 0)).toFixed(
                          2,
                        )}
                      </td>
                      <td className="pe-3 py-3">
                        <span className="badge bg-info rounded-pill">
                          {sale.items?.length || 0} items
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
