import { useState, useEffect } from "react";
import api from "../../api/api";
import { API_ENDPOINTS } from "../../api/EndPoints";

export default function TemporaryCredit() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null);
  const [paymentInput, setPaymentInput] = useState("");
  const [popupMsg, setPopupMsg] = useState("");
  const [popupType, setPopupType] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchTemporaryCredit();
  }, []);

  const fetchTemporaryCredit = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.TEMPORARY_SALES);
      const data = res.data || [];

      // ✅ FILTER: Only temporary sales
      const tempSales = data.filter((sale) => sale.saleType === "temporary");

      // ✅ Group by customer name + phone to get unique customers
      const customersMap = new Map();

      tempSales.forEach((sale) => {
        const name = sale.customerInfo?.name;
        const phone = sale.customerInfo?.phone || "";

        // ✅ Skip if no name
        if (!name || name.trim() === "") return;

        const key = `${name}-${phone}`;

        if (!customersMap.has(key)) {
          customersMap.set(key, {
            _id: key,
            customerInfo: { name, phone },
            sales: [],
            total: 0,
            paidAmount: 0,
            createdAt: sale.createdAt,
          });
        }

        const customer = customersMap.get(key);
        customer.sales.push(sale);
        customer.total += sale.total || 0;
        customer.paidAmount += sale.paidAmount || 0;

        // Keep latest date
        if (new Date(sale.createdAt) > new Date(customer.createdAt)) {
          customer.createdAt = sale.createdAt;
        }
      });

      // ✅ Convert to array and sort by latest
      const customers = Array.from(customersMap.values()).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      );

      setEntries(customers);
    } catch (err) {
      setPopupMsg("Error loading temporary credit data");
      setPopupType("error");
    } finally {
      setLoading(false);
    }
  };

  // Date filtering logic
  const getFilteredEntriesByDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateRange === "all") {
      return entries;
    }

    if (dateRange === "today") {
      return entries.filter((e) => new Date(e.createdAt) >= today);
    }

    if (dateRange === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayAfterYesterday = new Date(today);
      return entries.filter((e) => {
        const entryDate = new Date(e.createdAt);
        return entryDate >= yesterday && entryDate < dayAfterYesterday;
      });
    }

    if (dateRange === "last7") {
      const last7Days = new Date(today);
      last7Days.setDate(last7Days.getDate() - 7);
      return entries.filter((e) => new Date(e.createdAt) >= last7Days);
    }

    if (dateRange === "thisMonth") {
      return entries.filter((e) => {
        const date = new Date(e.createdAt);
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
      return entries.filter((e) => {
        const entryDate = new Date(e.createdAt);
        return entryDate >= start && entryDate <= end;
      });
    }

    return entries;
  };

  const dateFilteredEntries = getFilteredEntriesByDate();

  // Search filtering
  const filteredEntries = dateFilteredEntries.filter((entry) => {
    const query = searchQuery.toLowerCase();
    return (
      entry.customerInfo?.name?.toLowerCase().includes(query) ||
      entry.customerInfo?.phone?.toLowerCase().includes(query)
    );
  });

  // Summary calculations
  const totalCustomers = filteredEntries.length;
  const totalSalesAmount = filteredEntries.reduce(
    (sum, e) => sum + (e.total || 0),
    0,
  );
  const totalPaidAmount = filteredEntries.reduce(
    (sum, e) => sum + (e.paidAmount || 0),
    0,
  );
  const totalRemaining = totalSalesAmount - totalPaidAmount;
  const paidCustomers = filteredEntries.filter(
    (e) => (e.total || 0) - (e.paidAmount || 0) <= 0 && (e.paidAmount || 0) > 0,
  ).length;
  const unpaidCustomers = totalCustomers - paidCustomers;

  const openPaymentModal = (entry) => {
    setCurrentEntry(entry);
    setPaymentInput("");
    setPopupMsg("");
    setPopupType("");
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setCurrentEntry(null);
    setPaymentInput("");
    setPopupMsg("");
    setPopupType("");
  };

  const remainingAmount =
    (currentEntry?.total || 0) - (currentEntry?.paidAmount || 0);

  const handlePaymentChange = (e) => {
    let value = Number(e.target.value);
    if (value < 0) value = 0;
    if (value > remainingAmount) value = remainingAmount;
    setPaymentInput(value);
  };

  const savePayment = async () => {
    const newPayment = Number(paymentInput);
    if (!newPayment || newPayment <= 0) {
      setPopupMsg("Please enter valid amount");
      setPopupType("error");
      return;
    }

    try {
      // ✅ Update all sales for this customer
      const updatePromises = currentEntry.sales.map((sale) => {
        const saleRemaining = (sale.total || 0) - (sale.paidAmount || 0);
        if (saleRemaining <= 0) return null;

        const paymentForThisSale = Math.min(newPayment, saleRemaining);
        const newPaid = (sale.paidAmount || 0) + paymentForThisSale;
        const newRemaining = sale.total - newPaid;

        return api.patch(API_ENDPOINTS.SALE_BY_ID(sale._id), {
          paidAmount: newPaid,
          remainingDue: newRemaining > 0 ? newRemaining : 0,
        });
      });

      await Promise.all(updatePromises.filter(Boolean));

      setPopupMsg(`RS ${newPayment} payment recorded successfully!`);
      setPopupType("success");

      await fetchTemporaryCredit();

      setTimeout(() => {
        closePaymentModal();
      }, 1500);
    } catch (err) {
      console.error("Payment error:", err);
      setPopupMsg("Payment update failed");
      setPopupType("error");
    }
  };

  const formatDateTime = (dateString) =>
    new Date(dateString).toLocaleString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  // WhatsApp reminder function
  const sendWhatsAppReminder = (entry) => {
    const phone = entry.customerInfo?.phone?.replace(/[^0-9]/g, "");
    if (!phone) {
      alert("No phone number available for this customer");
      return;
    }

    const name = entry.customerInfo?.name || "Customer";
    const remaining = (entry.total || 0) - (entry.paidAmount || 0);
    const totalAmount = entry.total || 0;
    const paidAmount = entry.paidAmount || 0;
    const salesCount = entry.sales.length;

    const message = `السلام علیکم ${name}،

📋 *Credit Payment Reminder*

Total Sales: ${salesCount}
Total Amount: RS ${totalAmount.toFixed(2)}
Paid Amount: RS ${paidAmount.toFixed(2)}
*Remaining Due: RS ${remaining.toFixed(2)}*

براہ کرم جلد از جلد payment کر دیں۔
شکریہ!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(whatsappURL, "_blank");
  };

  // CSV Export Function
  const exportToCSV = () => {
    if (filteredEntries.length === 0) {
      alert("No data to export");
      return;
    }

    let csvContent = "Temporary Credit Report\n\n";

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
    csvContent += `Total Customers:,${totalCustomers}\n`;
    csvContent += `Total Sales Amount:,RS${totalSalesAmount.toFixed(2)}\n`;
    csvContent += `Total Paid Amount:,RS${totalPaidAmount.toFixed(2)}\n`;
    csvContent += `Total Remaining:,RS${totalRemaining.toFixed(2)}\n\n`;

    // Summary
    csvContent += "SUMMARY\n";
    csvContent += `Paid Customers:,${paidCustomers}\n`;
    csvContent += `Unpaid Customers:,${unpaidCustomers}\n\n`;

    // Customer Details Header
    csvContent += "CUSTOMER DETAILS\n";
    csvContent +=
      "Name,Phone,Total Sales,Total Amount,Paid Amount,Remaining,Last Sale Date,Status\n";

    // Customer Data
    filteredEntries.forEach((entry) => {
      const remaining = (entry.total || 0) - (entry.paidAmount || 0);
      const isPaid = remaining <= 0 && (entry.paidAmount || 0) > 0;

      csvContent += `"${entry.customerInfo?.name || "Unknown"}",${entry.customerInfo?.phone || "-"},${entry.sales.length},RS${entry.total.toFixed(2)},RS${entry.paidAmount.toFixed(2)},RS${remaining.toFixed(2)},"${formatDateTime(entry.createdAt)}",${isPaid ? "Paid" : "Unpaid"}\n`;
    });

    csvContent += "\n\nDETAILED SALES BREAKDOWN\n";
    csvContent +=
      "Customer Name,Phone,Sale ID,Sale Date,Sale Amount,Paid Amount,Remaining\n";

    filteredEntries.forEach((entry) => {
      entry.sales.forEach((sale) => {
        const saleRemaining = (sale.total || 0) - (sale.paidAmount || 0);
        csvContent += `"${entry.customerInfo?.name || "Unknown"}",${entry.customerInfo?.phone || "-"},${sale._id.slice(-8).toUpperCase()},"${formatDateTime(sale.createdAt)}",RS${sale.total.toFixed(2)},RS${(sale.paidAmount || 0).toFixed(2)},RS${saleRemaining.toFixed(2)}\n`;
      });
    });

    // Create and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `temporary_credit_${dateRange}_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 cash-customer-header">
        <h2 className="fw-bold mb-0">Temporary Credit Customers</h2>

        <div className="d-flex gap-3 align-items-center">
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
            className="btn btn-success d-flex align-items-center gap-2  history-csv"
            onClick={exportToCSV}
            disabled={filteredEntries.length === 0}
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
            <h6 className="mb-1">Total Customers</h6>
            <h3 className="fw-bold mb-0">{totalCustomers}</h3>
            <small className="opacity-75">Temporary credit</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm text-center p-4 bg-warning text-dark rounded-3">
            <h6 className="mb-1">Total Sales Amount</h6>
            <h3 className="fw-bold mb-0">RS{totalSalesAmount.toFixed(0)}</h3>
            <small>Total credit given</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm text-center p-4 bg-success text-white rounded-3">
            <h6 className="mb-1">Paid Amount</h6>
            <h3 className="fw-bold mb-0">RS{totalPaidAmount.toFixed(0)}</h3>
            <small className="opacity-75">Recovered</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm text-center p-4 bg-danger text-white rounded-3">
            <h6 className="mb-1">Remaining Due</h6>
            <h3 className="fw-bold mb-0">RS{totalRemaining.toFixed(0)}</h3>
            <small className="opacity-75">{unpaidCustomers} unpaid</small>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="position-relative">
            <input
              type="text"
              className="form-control form-control-lg ps-5 rounded-pill"
              placeholder="Search by Customer Name or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted fs-5"></i>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="ps-3 py-3">Name</th>
                  <th className="py-3">Phone</th>
                  <th className="py-3">Total Sales</th>
                  <th className="py-3">Total Amount</th>
                  <th className="py-3">Paid Amount</th>
                  <th className="py-3">Remaining</th>
                  <th className="py-3">Last Sale Date</th>
                  <th className="py-3">Status</th>
                  <th className="pe-3 py-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5">
                      <div className="spinner-border text-primary" />
                      <p className="mt-2 text-muted">Loading customers...</p>
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-1 d-block mb-2"></i>
                      No temporary credit customers found
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => {
                    const remaining =
                      (entry.total || 0) - (entry.paidAmount || 0);
                    const isPaid =
                      remaining <= 0 && (entry.paidAmount || 0) > 0;

                    return (
                      <tr key={entry._id}>
                        <td className="ps-3 py-3 fw-bold">
                          {entry.customerInfo?.name || "Unknown"}
                        </td>
                        <td className="py-3">
                          {entry.customerInfo?.phone || "-"}
                        </td>
                        <td className="py-3">
                          <span className="badge bg-info rounded-pill">
                            {entry.sales.length} sale(s)
                          </span>
                        </td>
                        <td className="py-3 fw-semibold">
                          RS{(entry.total || 0).toFixed(2)}
                        </td>
                        <td className="py-3 text-success fw-bold">
                          RS{(entry.paidAmount || 0).toFixed(2)}
                        </td>
                        <td
                          className={`py-3 fw-bold ${isPaid ? "text-success" : "text-danger"}`}
                        >
                          RS{remaining.toFixed(2)}
                        </td>
                        <td className="py-3 text-muted">
                          {formatDateTime(entry.createdAt)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`badge ${
                              isPaid ? "bg-success" : "bg-danger"
                            }`}
                          >
                            {isPaid ? "Paid" : "Unpaid"}
                          </span>
                        </td>
                        <td className="pe-3 py-3">
                          <div className="d-flex gap-2">
                            {!isPaid && (
                              <>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => openPaymentModal(entry)}
                                  title="Record Payment"
                                >
                                  <i className="bi bi-cash-coin"></i>
                                </button>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => sendWhatsAppReminder(entry)}
                                  title="Send WhatsApp Reminder"
                                >
                                  <i className="bi bi-whatsapp"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && currentEntry && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  Record Payment -{" "}
                  {currentEntry.customerInfo?.name || "Customer"}
                </h5>
                <button
                  className="btn-close btn-close-white"
                  onClick={closePaymentModal}
                />
              </div>

              <div className="modal-body text-center">
                <p>
                  Total Sales:{" "}
                  <strong className="badge bg-info">
                    {currentEntry.sales.length}
                  </strong>
                </p>
                <p>
                  Total Amount:{" "}
                  <strong>RS{currentEntry.total?.toFixed(2)}</strong>
                </p>
                <p>
                  Remaining: <strong>RS{remainingAmount.toFixed(2)}</strong>
                </p>

                <div className="input-group w-75 mx-auto">
                  <span className="input-group-text">RS</span>
                  <input
                    type="number"
                    className="form-control text-center"
                    value={paymentInput}
                    onChange={handlePaymentChange}
                    max={remainingAmount}
                    min="0"
                  />
                </div>

                {popupMsg && (
                  <div
                    className={`mt-3 alert ${
                      popupType === "success" ? "alert-success" : "alert-danger"
                    } py-2`}
                  >
                    {popupMsg}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={closePaymentModal}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-success px-4"
                  onClick={savePayment}
                  disabled={!paymentInput || paymentInput <= 0}
                >
                  Save Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
