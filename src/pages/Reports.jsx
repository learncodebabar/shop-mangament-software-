import { useState, useEffect } from "react";
import api from "../api/api";
import { API_ENDPOINTS } from "../api/EndPoints";
import { useNotifications } from "../context/NotificationContext";

export default function Reports() {
  const [reportData, setReportData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("today");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

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
    fetchReport();
    fetchExpenses();
    fetchProducts();
  }, [dateRange, customStart, customEnd]);

  const notify = (type, message) => {
    setAlert({ show: true, type, message });
    addNotification(type, message);
  };

  const fetchReport = async () => {
    try {
      let url = API_ENDPOINTS.SALE_REPORT;
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
      setReportData(res.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching report:", err);
      notify("error", "Unable to load report");
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.PRODUCTS);
      const productsData = res.data.products || res.data || [];
      setProducts(productsData);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
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
    } catch (err) {
      console.error("Error fetching expenses:", err);
    }
  };

  const exportToCSV = () => {
    if (!reportData) {
      notify("warning", "No data to export");
      return;
    }

    let csvContent = "Complete Business Report\n\n";

    const rangeLabels = {
      today: "Today",
      yesterday: "Yesterday",
      last7: "Last 7 Days",
      custom: `${customStart} to ${customEnd}`,
    };
    csvContent += `Period:,${rangeLabels[dateRange]}\n\n`;

    csvContent += "SALES SUMMARY\n";
    csvContent += "Metric,Amount,Count\n";
    csvContent += `Total Sales Revenue,RS${(reportData.totalSales || 0).toFixed(0)},${reportData.saleCount || 0} orders\n`;
    csvContent += `Cash Sales,RS${(reportData.cashSales || 0).toFixed(0)},${reportData.cashCount || 0} orders\n`;
    csvContent += `Credit Sales,RS${(reportData.creditSales || 0).toFixed(0)},${reportData.creditCount || 0} orders\n`;
    csvContent += `Recovered Credit,RS${(reportData.recoveredAmount || 0).toFixed(0)},In this period\n`;
    csvContent += `Gross Profit (Sales),RS${(reportData.profit || 0).toFixed(0)},Before expenses\n\n`;

    const totalPurchaseValue = products.reduce(
      (sum, p) => sum + (p.stock || 0) * (p.costPrice || 0),
      0,
    );
    const totalSaleValue = products.reduce(
      (sum, p) => sum + (p.stock || 0) * (p.salePrice || 0),
      0,
    );
    const potentialProfit = totalSaleValue - totalPurchaseValue;

    csvContent += "INVENTORY SUMMARY\n";
    csvContent += "Metric,Value\n";
    csvContent += `Total Products,${products.length}\n`;
    csvContent += `Total Stock Units,${products.reduce((sum, p) => sum + (p.stock || 0), 0)}\n`;
    csvContent += `Purchase Value (Cost),RS${totalPurchaseValue.toFixed(0)}\n`;
    csvContent += `Sale Value (Retail),RS${totalSaleValue.toFixed(0)}\n`;
    csvContent += `Potential Profit,RS${potentialProfit.toFixed(0)}\n\n`;

    const totalExpenses = expenses.reduce(
      (sum, exp) => sum + (exp.amount || 0),
      0,
    );
    csvContent += "EXPENSES SUMMARY\n";
    csvContent += `Total Miscellaneous Expenses,RS${totalExpenses.toFixed(0)}\n\n`;

    const netProfit = (reportData.profit || 0) - totalExpenses;
    csvContent += "NET PROFIT\n";
    csvContent += `After All Expenses,RS${netProfit.toFixed(0)}\n\n`;

    csvContent += "TOP SELLING PRODUCTS\n";
    csvContent += "Product,Quantity Sold,Revenue\n";
    if (reportData.topProducts?.length > 0) {
      reportData.topProducts.forEach((p) => {
        csvContent += `${p.name},${p.qty},RS${p.revenue.toFixed(0)}\n`;
      });
    }
    csvContent += "\n";

    csvContent += "CREDIT STATUS\n";
    csvContent += "Type,Amount\n";
    csvContent += `Permanent Credit,RS${(reportData.permanentRemaining || 0).toFixed(0)}\n`;
    csvContent += `Temporary Credit,RS${(reportData.temporaryRemaining || 0).toFixed(0)}\n`;
    csvContent += `Total Recoverable,RS${((reportData.permanentRemaining || 0) + (reportData.temporaryRemaining || 0)).toFixed(0)}\n`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `business_report_${dateRange}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notify("success", "Report exported successfully!");
  };

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div
          className="spinner-border text-primary"
          style={{ width: "3rem", height: "3rem" }}
        />
        <p className="mt-3 text-muted">Loading report...</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        No data available
      </div>
    );
  }

  // Calculations
  const recoveredAmount = reportData.recoveredAmount || 0;
  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + (exp.amount || 0),
    0,
  );

  const totalProducts = products.length;
  const totalStockUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalPurchaseValue = products.reduce(
    (sum, p) => sum + (p.stock || 0) * (p.costPrice || 0),
    0,
  );
  const totalSaleValue = products.reduce(
    (sum, p) => sum + (p.stock || 0) * (p.salePrice || 0),
    0,
  );
  const potentialProfit = totalSaleValue - totalPurchaseValue;
  const netProfit = (reportData.profit || 0) - totalExpenses;

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

      <div className="d-flex justify-content-between align-items-center mb-4 sale-history-header">
        <h2 className="fw-bold mb-0">Business Reports</h2>

        <div className="d-flex gap-3 align-items-center history-filter">
          <select
            className="form-select"
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
            className="btn btn-success d-flex align-items-center gap-2 cate-btn"
            onClick={exportToCSV}
            style={{ width: "238px" }}
          >
            <i className="bi bi-download me-2"></i>
            Export CSV
          </button>
        </div>
      </div>

      {/* SALES CARDS - Original 5 */}
      <div className="row g-3 mb-4">
        <div className="col-md-6 col-lg-3 col-xl">
          <div className="card border-0 shadow-sm h-100 text-center p-3 bg-danger text-white">
            <h6 className="mb-1 fw-bold">Total Sales</h6>
            <h3 className="fw-bold mb-0">
              RS{(reportData.totalSales || 0).toFixed(0)}
            </h3>
            <small className="opacity-75">
              {reportData.saleCount || 0} orders
            </small>
          </div>
        </div>

        <div className="col-md-6 col-lg-3 col-xl">
          <div className="card border-0 shadow-sm h-100 text-center p-3 bg-success text-white">
            <h6 className="mb-1 fw-bold">Cash Sales</h6>
            <h3 className="fw-bold mb-0">
              RS{(reportData.cashSales || 0).toFixed(0)}
            </h3>
            <small className="opacity-75">
              {reportData.cashCount || 0} orders
            </small>
          </div>
        </div>

        <div className="col-md-6 col-lg-3 col-xl">
          <div className="card border-0 shadow-sm h-100 text-center p-3 bg-warning text-dark">
            <h6 className="mb-1 fw-bold">Credit Sales</h6>
            <h3 className="fw-bold mb-0">
              RS{(reportData.creditSales || 0).toFixed(0)}
            </h3>
            <small>{reportData.creditCount || 0} orders</small>
          </div>
        </div>

        <div className="col-md-6 col-lg-3 col-xl">
          <div
            className="card border-0 shadow-sm h-100 text-center p-3 text-white"
            style={{ backgroundColor: "#20c997" }}
          >
            <h6 className="mb-1 fw-bold">Recovered Credit</h6>
            <h3 className="fw-bold mb-0">RS{recoveredAmount.toFixed(0)}</h3>
            <small className="opacity-75">In this period</small>
          </div>
        </div>

        <div className="col-md-12 col-lg-3 col-xl">
          <div className="card border-0 shadow-sm h-100 text-center p-3 bg-info text-white">
            <h6 className="mb-1 fw-bold">Gross Profit</h6>
            <h3 className="fw-bold mb-0">
              RS{(reportData.profit || 0).toFixed(0)}
            </h3>
            <small className="opacity-75">From sales</small>
          </div>
        </div>
      </div>

      {/* INVENTORY & FINANCIAL CARDS */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div
            className="card border-0 shadow-sm text-center p-3"
            style={{ backgroundColor: "#fd7e14", color: "white" }}
          >
            <h6 className="mb-1 fw-bold">Total Inventory</h6>
            <h3 className="fw-bold mb-0">{totalProducts}</h3>
            <small className="opacity-75">
              {totalStockUnits} units in stock
            </small>
          </div>
        </div>

        <div className="col-md-4">
          <div
            className="card border-0 shadow-sm text-center p-3"
            style={{ backgroundColor: "#e83e8c", color: "white" }}
          >
            <h6 className="mb-1 fw-bold">Purchase Value</h6>
            <h3 className="fw-bold mb-0">RS{totalPurchaseValue.toFixed(0)}</h3>
            <small className="opacity-75">Total cost of inventory</small>
          </div>
        </div>

        <div className="col-md-4">
          <div
            className="card border-0 shadow-sm text-center p-3"
            style={{ backgroundColor: "#20c997", color: "white" }}
          >
            <h6 className="mb-1 fw-bold">Potential Sale Value</h6>
            <h3 className="fw-bold mb-0">RS{totalSaleValue.toFixed(0)}</h3>
            <small className="opacity-75">If all stock sells</small>
          </div>
        </div>
      </div>

      {/* PROFIT & EXPENSES ROW */}
      <div className="row g-3 mb-5">
        <div className="col-md-4">
          <div
            className="card border-0 shadow-sm text-center p-3"
            style={{ backgroundColor: "#17a2b8", color: "white" }}
          >
            <h6 className="mb-1 fw-bold">Potential Profit</h6>
            <h3 className="fw-bold mb-0">RS{potentialProfit.toFixed(0)}</h3>
            <small className="opacity-75">From inventory</small>
          </div>
        </div>

        <div className="col-md-4">
          <div
            className="card border-0 shadow-sm text-center p-3"
            style={{ backgroundColor: "#6f42c1", color: "white" }}
          >
            <h6 className="mb-1 fw-bold">Misc Expenses</h6>
            <h3 className="fw-bold mb-0">RS{totalExpenses.toFixed(0)}</h3>
            <small className="opacity-75">{expenses.length} entries</small>
          </div>
        </div>

        <div className="col-md-4">
          <div
            className={`card border-0 shadow-sm text-center p-3 text-white ${netProfit >= 0 ? "bg-success" : "bg-danger"}`}
          >
            <h6 className="mb-1 fw-bold">Net Profit</h6>
            <h3 className="fw-bold mb-0">RS{netProfit.toFixed(0)}</h3>
            <small className="opacity-75">After expenses</small>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="row g-4">
        {/* Top Products */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Top Selling Products</h5>
            </div>
            <div className="card-body p-0">
              <div
                className="table-responsive"
                style={{ maxHeight: "300px", overflowY: "auto" }}
              >
                <table className="table table-sm mb-0">
                  <thead className="table-light sticky-top">
                    <tr>
                      <th>Product</th>
                      <th className="text-center">Qty</th>
                      <th className="text-end">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.topProducts?.length > 0 ? (
                      reportData.topProducts.map((p, i) => (
                        <tr key={i}>
                          <td>{p.name}</td>
                          <td className="text-center">{p.qty}</td>
                          <td className="text-end fw-bold">
                            RS{p.revenue.toFixed(0)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="text-center py-3 text-muted">
                          No sales
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Credit Status */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Credit Status</h5>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-3 pb-3 border-bottom">
                <span className="fw-bold">Permanent</span>
                <span className="fw-bold text-danger">
                  RS{(reportData.permanentRemaining || 0).toFixed(0)}
                </span>
              </div>

              <div className="d-flex justify-content-between mb-3 pb-3 border-bottom">
                <span className="fw-bold">Temporary</span>
                <span className="fw-bold text-warning">
                  RS{(reportData.temporaryRemaining || 0).toFixed(0)}
                </span>
              </div>

              <div className="d-flex justify-content-between py-3 bg-light rounded">
                <span className="fw-bold">Total</span>
                <span className="fw-bold text-primary">
                  RS
                  {(
                    (reportData.permanentRemaining || 0) +
                    (reportData.temporaryRemaining || 0)
                  ).toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
