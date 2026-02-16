import { useState, useEffect } from "react";
import api from "../api/api";
import { useNotifications } from "../context/NotificationContext";
import { API_ENDPOINTS } from "../api/EndPoints";
import { format } from "date-fns";
import "../pages/products/category.css";
export default function SaleHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const itemsPerPage = 10;

  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.SALE);
      const data = res.data || [];
      setSales(
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      );
      setLoading(false);
    } catch (err) {
      addNotification("error", "Failed to load sales history");
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

  const filteredSales = dateFilteredSales.filter((sale) => {
    const query = searchQuery.toLowerCase();
    return (
      sale._id?.toLowerCase().includes(query) ||
      sale.customer?.name?.toLowerCase().includes(query) ||
      sale.customer?.phone?.toLowerCase().includes(query) ||
      sale.customerInfo?.name?.toLowerCase().includes(query) ||
      sale.customerInfo?.phone?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  // Summary calculations based on filtered data
  const todayTotal = filteredSales.reduce((sum, s) => sum + s.total, 0);
  const cashSales = filteredSales.filter((s) => s.saleType === "cash");
  const creditSales = filteredSales.filter(
    (s) => s.saleType === "permanent" || s.saleType === "temporary",
  );

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

  // Customer Label
  const getCustomerLabel = (sale) => {
    if (sale.customer) {
      const name = sale.customer.name?.trim() || "Unknown Customer";
      return (
        <>
          <strong>{name}</strong>
          <br />
          <small className="text-primary fw-medium">Permanent Credit</small>
        </>
      );
    }

    if (sale.customerInfo) {
      const name = sale.customerInfo.name?.trim() || "Walk-in Customer";
      const phone = sale.customerInfo.phone || "No phone";
      return (
        <>
          <strong>{name}</strong>
          <br />
          <small className="text-warning fw-medium">
            Temporary Credit • {phone}
          </small>
        </>
      );
    }

    return <span className="text-success fw-bold">Cash Sale</span>;
  };

  const getPaymentMethodLabel = (sale) => {
    if (sale.saleType === "permanent" || sale.saleType === "temporary") {
      return (
        <span className="badge bg-warning text-dark rounded-pill px-3 py-2">
          Credit
        </span>
      );
    }

    if (sale.saleType === "cash") {
      if (sale.payments && sale.payments.length > 0) {
        const methods = sale.payments
          .map((p) => {
            const method = p.method?.toLowerCase() || "cash";
            if (method.includes("cash")) return "Cash";
            if (method.includes("easy") || method.includes("easypaisa"))
              return "EasyPaisa";
            if (method.includes("jazz") || method.includes("jazzcash"))
              return "JazzCash";
            if (method.includes("bank") || method.includes("transfer"))
              return "Bank Transfer";
            if (method.includes("card")) return "Card";
            if (method.includes("upi")) return "UPI";
            return method.charAt(0).toUpperCase() + method.slice(1);
          })
          .filter(Boolean);

        const uniqueMethods = [...new Set(methods)];
        return (
          <span className="badge bg-success text-white rounded-pill px-3 py-2">
            {uniqueMethods.join(" + ")}
          </span>
        );
      }

      return (
        <span className="badge bg-success text-white rounded-pill px-3 py-2">
          Cash
        </span>
      );
    }

    return (
      <span className="badge bg-secondary rounded-pill px-3 py-2">Unknown</span>
    );
  };

  // CSV Export Function
  const exportToCSV = () => {
    if (filteredSales.length === 0) {
      addNotification("warning", "No data to export");
      return;
    }

    let csvContent = "Sales History Report\n\n";

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
    csvContent += `Total Sales:,RS${todayTotal.toLocaleString()}\n`;
    csvContent += `Total Transactions:,${filteredSales.length}\n\n`;

    // Summary
    csvContent += "SUMMARY\n";
    csvContent += `Cash Sales:,${cashSales.length} transactions,RS${cashSales.reduce((sum, s) => sum + s.total, 0).toLocaleString()}\n`;
    csvContent += `Credit Sales:,${creditSales.length} transactions,RS${creditSales.reduce((sum, s) => sum + s.total, 0).toLocaleString()}\n\n`;

    // Sales Detail Header
    csvContent += "SALES DETAILS\n";
    csvContent +=
      "Date,Sale ID,Customer Name,Customer Type,Payment Method,Amount,Items\n";

    // Sales Data
    filteredSales.forEach((sale) => {
      const date = formatDate(sale.createdAt);
      const saleId = sale._id.slice(-6).toUpperCase();

      let customerName = "Cash Sale";
      let customerType = "Cash";

      if (sale.customer) {
        customerName = sale.customer.name || "Unknown Customer";
        customerType = "Permanent Credit";
      } else if (sale.customerInfo) {
        customerName = sale.customerInfo.name || "Walk-in Customer";
        customerType = "Temporary Credit";
      }

      let paymentMethod = "Cash";
      if (sale.saleType === "permanent" || sale.saleType === "temporary") {
        paymentMethod = "Credit";
      } else if (sale.payments && sale.payments.length > 0) {
        const methods = sale.payments.map((p) => {
          const method = p.method?.toLowerCase() || "cash";
          if (method.includes("cash")) return "Cash";
          if (method.includes("easy") || method.includes("easypaisa"))
            return "EasyPaisa";
          if (method.includes("jazz") || method.includes("jazzcash"))
            return "JazzCash";
          if (method.includes("bank") || method.includes("transfer"))
            return "Bank Transfer";
          if (method.includes("card")) return "Card";
          return method;
        });
        paymentMethod = [...new Set(methods)].join(" + ");
      }

      const amount = `RS${sale.total.toLocaleString()}`;
      const itemCount = sale.items?.length || 0;

      csvContent += `"${date}",${saleId},"${customerName}",${customerType},${paymentMethod},${amount},${itemCount}\n`;
    });

    csvContent += "\n\nDETAILED ITEMS BREAKDOWN\n";
    csvContent += "Sale ID,Item Name,Quantity,Unit Price,Discount,Line Total\n";

    filteredSales.forEach((sale) => {
      const saleId = sale._id.slice(-6).toUpperCase();
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const lineTotal = (item.price - (item.itemDiscount || 0)) * item.qty;
          csvContent += `${saleId},"${item.name}",${item.qty},RS${item.price},${item.itemDiscount || 0},RS${lineTotal.toLocaleString()}\n`;
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
      `sales_history_${dateRange}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addNotification("success", "Sales history exported successfully");
  };

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center">
        <div className="spinner-border text-primary" />
        <p className="mt-3">Loading sales...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 sale-history-header">
        <h2 className="fw-bold mb-0">Sales History</h2>

        <div className="d-flex gap-3 align-items-center history-filter">
          <select
            className="form-select filter-select"
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
              setPage(1);
            }}
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
                onChange={(e) => {
                  setCustomStart(e.target.value);
                  setPage(1);
                }}
              />
              <input
                type="date"
                className="form-control"
                value={customEnd}
                onChange={(e) => {
                  setCustomEnd(e.target.value);
                  setPage(1);
                }}
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
        <div className="col-md-4">
          <div
            className="card border-0 shadow-sm text-center p-4 text-white rounded-3"
            style={{ background: "rgb(253 126 20)" }}
          >
            <h5 className="mb-1">Total Sales</h5>
            <h3 className="fw-bold mb-1">RS{todayTotal.toLocaleString()}</h3>
            <small>{filteredSales.length} transactions</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm text-center p-4 bg-success text-white rounded-3">
            <h5 className="mb-1">Cash Sales</h5>
            <h3 className="fw-bold mb-1">
              RS
              {cashSales.reduce((sum, s) => sum + s.total, 0).toLocaleString()}
            </h3>
            <small>{cashSales.length} transactions</small>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm text-center p-4 bg-warning text-dark rounded-3">
            <h5 className="mb-1">Credit Sales</h5>
            <h3 className="fw-bold mb-1">
              RS
              {creditSales
                .reduce((sum, s) => sum + s.total, 0)
                .toLocaleString()}
            </h3>
            <small>{creditSales.length} transactions</small>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="row g-3 align-items-center">
            <div className="col-lg-8">
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control form-control-lg ps-5 rounded-pill"
                  placeholder="Search by Sale ID, Customer Name or Phone..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-5"></i>
              </div>
            </div>
            <div className="col-lg-4 text-lg-end">
              <small className="text-muted">
                Showing {paginatedSales.length} of {filteredSales.length} sales
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0 small">
              <thead className="bg-light border-bottom">
                <tr>
                  <th className="ps-3 py-2 text-uppercase text-muted fw-semibold">
                    Date
                  </th>
                  <th className="py-2 text-uppercase text-muted fw-semibold">
                    Sale ID
                  </th>
                  <th className="py-2 text-uppercase text-muted fw-semibold">
                    Customer
                  </th>
                  <th className="py-2 text-uppercase text-muted fw-semibold">
                    Payment
                  </th>
                  <th className="text-end pe-3 py-2 text-uppercase text-muted fw-semibold">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginatedSales.length > 0 ? (
                  paginatedSales.map((sale) => (
                    <tr
                      key={sale._id}
                      className="cursor-pointer border-bottom"
                      onClick={() => setSelectedSale(sale)}
                    >
                      <td className="ps-3 py-2 text-muted">
                        {formatDate(sale.createdAt)}
                      </td>

                      <td className="py-2 fw-semibold text-primary">
                        #{sale._id.slice(-6).toUpperCase()}
                      </td>

                      <td className="py-2 lh-sm">{getCustomerLabel(sale)}</td>

                      <td className="py-2">{getPaymentMethodLabel(sale)}</td>

                      <td className="text-end pe-3 py-2 fw-semibold text-success">
                        RS {sale.total.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                      No sales found for selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer bg-body border-top py-2 px-3">
            <div className="d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Page {page} of {totalPages}
              </small>

              <div className="btn-group btn-group-sm">
                <button
                  className="btn btn-outline-primary"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
                <button
                  className="btn btn-outline-primary"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-receipt me-2"></i>
                  Sale Details - #{selectedSale._id.slice(-6).toUpperCase()}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedSale(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-4 mb-4">
                  <div className="col-md-6">
                    <small className="text-muted">Date & Time</small>
                    <p className="fw-bold fs-5 mb-0">
                      {formatDate(selectedSale.createdAt)}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <small className="text-muted">Customer</small>
                    <p className="fw-bold fs-5 mb-0">
                      {getCustomerLabel(selectedSale)}
                    </p>
                  </div>
                </div>

                <h6 className="fw-bold mb-3">
                  Items Purchased ({selectedSale.items?.length || 0})
                </h6>
                <div className="table-responsive mb-4">
                  <table className="table table-bordered align-middle">
                    <thead className="bg-light">
                      <tr>
                        <th>#</th>
                        <th>Item Name</th>
                        <th className="text-center">Qty</th>
                        <th className="text-end">Unit Price</th>
                        <th className="text-end">Discount</th>
                        <th className="text-end">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSale.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="text-muted">{idx + 1}</td>
                          <td className="fw-medium">{item.name}</td>
                          <td className="text-center">{item.qty}</td>
                          <td className="text-end">
                            RS{item.price.toLocaleString()}
                          </td>
                          <td className="text-end text-danger">
                            -{item.itemDiscount || 0}
                          </td>
                          <td className="text-end fw-bold">
                            RS
                            {(
                              (item.price - (item.itemDiscount || 0)) *
                              item.qty
                            ).toLocaleString()}
                          </td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan="6" className="text-center py-4">
                            No items
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="row mt-4">
                  <div className="col-md-6">
                    <div className="bg-light p-3 rounded">
                      <small className="text-muted">Payment Method</small>
                      <p className="fw-bold mb-0 fs-5">
                        {getPaymentMethodLabel(selectedSale)}
                      </p>
                    </div>
                  </div>
                  <div className="col-md-6 text-end">
                    <div className="bg-primary text-white p-4 rounded">
                      <small className="opacity-75">Grand Total</small>
                      <h2 className="fw-bold mb-0">
                        RS{selectedSale.total.toLocaleString()}
                      </h2>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary px-4"
                  onClick={() => setSelectedSale(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
