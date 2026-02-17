import { useState, useEffect } from "react";
import api from "../../api/api";
import { useNotifications } from "../../context/NotificationContext";
import { format, isValid, parseISO } from "date-fns";
import { API_ENDPOINTS } from "../../api/EndPoints";

export default function PermanentCredit() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [shopSettings, setShopSettings] = useState(null);
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.get(API_ENDPOINTS.SHOP_SETTINGS);
        setShopSettings(res.data || {});
      } catch (err) {
        console.error("Failed to load shop settings:", err);
      }
    };
    loadSettings();
  }, []);

  // Date filter
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // New Customer Form
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    gender: "male",
    address: "",
    cnic: "",
    creditLimit: 50000,
    dueDate: "",
  });

  const [paymentAmount, setPaymentAmount] = useState("");

  // Top Alert
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });

  const { addNotification } = useNotifications();

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
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.PERMANENT);
      setCustomers(res.data || []);
      setLoading(false);
    } catch (err) {
      notify("error", "Error loading customers");
      setLoading(false);
    }
  };

  const fetchSalesHistory = async (customerId) => {
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);

      const res = await api.get(
        `${API_ENDPOINTS.CUSTOMERS_SALE(customerId)}?${params.toString()}`,
      );
      const sales = res.data || [];

      // Fix dates
      const fixedSales = sales.map((sale) => ({
        ...sale,
        date: sale.createdAt || sale.date || new Date(),
      }));

      setSalesHistory(fixedSales);
    } catch (err) {
      console.error("Sales fetch error:", err);
      notify("error", "Failed to load purchase history");
      setSalesHistory([]);
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelected(customer);
    setFromDate("");
    setToDate("");
    fetchSalesHistory(customer._id);
  };

  const handleDateFilter = () => {
    if (selected) fetchSalesHistory(selected._id);
  };

  // SAFE DATE FORMAT
  const safeFormatDate = (dateInput) => {
    if (!dateInput) return "Invalid Date";
    let date =
      typeof dateInput === "string" ? parseISO(dateInput) : new Date(dateInput);
    return isValid(date)
      ? format(date, "dd MMM yyyy - hh:mm a")
      : "Invalid Date";
  };

  const formatReceiptDate = (dateInput) => {
    if (!dateInput) return "N/A";
    let date =
      typeof dateInput === "string" ? parseISO(dateInput) : new Date(dateInput);
    return isValid(date)
      ? format(date, "dd MMM yyyy, hh:mm:ss a")
      : "Invalid Date";
  };

  // Summary calculations
  const totalCustomers = customers.length;
  const totalCreditGiven = customers.reduce(
    (sum, c) => sum + ((c.totalCredit || 0) - (c.remainingDue || 0)),
    0,
  );
  const totalPaid = customers.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
  const totalRemaining = customers.reduce(
    (sum, c) => sum + (c.remainingDue || 0),
    0,
  );
  const customersWithDue = customers.filter(
    (c) => (c.remainingDue || 0) > 0,
  ).length;

  // CSV Export Function
  const exportToCSV = () => {
    if (customers.length === 0) {
      notify("warning", "No data to export");
      return;
    }

    let csvContent = "Permanent Credit Customers Report\n\n";

    // Summary
    csvContent += "SUMMARY\n";
    csvContent += `Total Customers:,${totalCustomers}\n`;
    csvContent += `Customers with Outstanding Due:,${customersWithDue}\n`;
    csvContent += `Total Credit Given:,RS${totalCreditGiven.toFixed(2)}\n`;
    csvContent += `Total Paid Amount:,RS${totalPaid.toFixed(2)}\n`;
    csvContent += `Total Remaining Due:,RS${totalRemaining.toFixed(2)}\n\n`;

    // Customer Details Header
    csvContent += "CUSTOMER DETAILS\n";
    csvContent +=
      "Name,Phone,Email,Gender,Address,CNIC,Credit Limit,Total Credit,Total Paid,Remaining Due,Due Date,Status\n";

    // Customer Data
    customers.forEach((customer) => {
      const remaining = customer.remainingDue || 0;
      const isPaid = remaining <= 0;

      csvContent += `"${customer.name || ""}",${customer.phone || ""},${customer.email || ""},${customer.gender || ""},${customer.address || ""},${customer.cnic || ""},RS${(customer.creditLimit || 0).toFixed(2)},RS${(customer.totalCredit || 0).toFixed(2)},RS${(customer.totalPaid || 0).toFixed(2)},RS${remaining.toFixed(2)},${customer.dueDate || ""},${isPaid ? "Paid" : "Unpaid"}\n`;
    });

    // Create and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `permanent_credit_customers_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notify("success", "Customer data exported successfully");
  };

  // ALL IN ONE RECEIPT - CONSISTENT STYLING
  const printAllInOneReceipt = () => {
    if (salesHistory.length === 0) {
      notify("error", "No sales to print");
      return;
    }

    if (!selected) return;

    let periodTotalCredit = 0;
    const allItems = [];

    salesHistory.forEach((sale) => {
      periodTotalCredit += sale.total;

      sale.items.forEach((item) => {
        const existing = allItems.find((i) => i.name === item.name);
        if (existing) {
          existing.qty += item.qty;
          existing.total += item.qty * item.price;
        } else {
          allItems.push({
            name: item.name,
            qty: item.qty,
            price: item.price,
            total: item.qty * item.price,
          });
        }
      });
    });

    const currentRemaining = selected.remainingDue || 0;
    const recoveredInPeriod = periodTotalCredit - currentRemaining;
    const recoveredAmount = recoveredInPeriod > 0 ? recoveredInPeriod : 0;

    const from = fromDate ? format(new Date(fromDate), "dd MMM yyyy") : "Start";
    const to = toDate ? format(new Date(toDate), "dd MMM yyyy") : "Today";

    const receiptHTML = `
      <div style="font-family: 'Courier New', monospace; max-width: 320px; margin: 0 auto; padding: 20px; background: white;">
        <!-- Shop Header -->
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 3px double #000; padding-bottom: 15px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${shopSettings?.shopName || 'My Shop'}</h1>
          <p style="margin: 5px 0; font-size: 13px;">${shopSettings?.address || 'Main Bazar, City'}</p>
          <p style="margin: 5px 0; font-size: 13px;">Tel: ${shopSettings?.phone || '03xx-xxxxxxx'}</p>
          ${shopSettings?.email ? `<p style="margin: 5px 0; font-size: 12px;">${shopSettings.email}</p>` : ''}
        </div>

        <!-- Title -->
        <div style="text-align: center; margin: 20px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
          <h2 style="margin: 0; font-size: 18px; color: #d32f2f;">CONSOLIDATED CREDIT STATEMENT</h2>
          <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">${from} to ${to}</p>
        </div>

        <!-- Customer Info -->
        <div style="margin-bottom: 20px; padding: 12px; background: #e3f2fd; border-radius: 5px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>Customer:</strong></span>
            <span>${selected.name}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>Phone:</strong></span>
            <span>${selected.phone || 'N/A'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span><strong>Total Receipts:</strong></span>
            <span>${salesHistory.length}</span>
          </div>
        </div>

        <!-- Items Table -->
        <table style="width: 100%; font-size: 13px; margin-bottom: 20px; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #000; border-top: 2px solid #000;">
              <th style="text-align: left; padding: 8px 0;">Item</th>
              <th style="text-align: center; padding: 8px 0;">Qty</th>
              <th style="text-align: right; padding: 8px 0;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${allItems
              .map(
                (item) => `
              <tr style="border-bottom: 1px dashed #ccc;">
                <td style="text-align: left; padding: 6px 0;">${item.name.length > 25 ? item.name.substring(0, 22) + '...' : item.name}</td>
                <td style="text-align: center; padding: 6px 0;">${item.qty}</td>
                <td style="text-align: right; padding: 6px 0;">RS${item.total.toLocaleString()}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <!-- Summary -->
        <div style="border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 15px 0; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 16px; color: #c00;">
            <span><strong>Total Credit Given:</strong></span>
            <span><strong>RS${periodTotalCredit.toLocaleString()}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 16px; color: #28a745;">
            <span><strong>Recovered in Period:</strong></span>
            <span><strong>RS${recoveredAmount.toLocaleString()}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 18px; color: #d32f2f; border-top: 1px dashed #000; padding-top: 8px;">
            <span><strong>Remaining Balance:</strong></span>
            <span><strong>RS${currentRemaining.toLocaleString()}</strong></span>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 30px; padding-top: 15px; border-top: 3px double #000;">
          <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">Thank you for your continued trust!</p>
          <p style="margin: 5px 0; font-size: 13px; color: #d32f2f;">Please clear remaining amount at your earliest</p>
          <p style="margin: 10px 0 0 0; font-size: 11px; color: #666;">Statement generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Credit Statement - ${selected.name}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @media print {
            body { margin: 0; padding: 15px; background: white; }
            .no-print { display: none; }
          }
          body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 20px;
            background: #f0f2f5;
          }
          .receipt-wrapper {
            max-width: 350px;
            margin: 0 auto;
          }
          .print-button {
            text-align: center;
            margin: 20px 0;
          }
          .btn-print {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 30px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
          }
          .btn-print:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="receipt-wrapper">
          ${receiptHTML}
          <div class="print-button no-print">
            <button class="btn-print" onclick="window.print(); setTimeout(() => window.close(), 1000);">
              🖨️ Print Statement
            </button>
          </div>
        </div>
        <script>
          setTimeout(() => {
            if (confirm('Print credit statement now?')) {
              window.print();
            }
          }, 500);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // SINGLE RECEIPT PRINT - CONSISTENT STYLING
  const printReceipt = (sale) => {
    if (!selected) return;

    const customerName = selected.name || "Customer";
    const customerPhone = selected.phone || "";

    const subtotal = sale.items?.reduce((sum, item) => {
      return sum + (item.qty * item.price);
    }, 0) || 0;

    const receiptHTML = `
      <div style="font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 20px; background: white;">
        <!-- Shop Header -->
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 15px;">
          <h2 style="margin: 0; font-size: 22px; font-weight: bold;">${shopSettings?.shopName || 'My Shop'}</h2>
          <p style="margin: 5px 0; font-size: 13px;">${shopSettings?.address || 'Main Bazar, City'}</p>
          <p style="margin: 5px 0; font-size: 13px;">Tel: ${shopSettings?.phone || '03xx-xxxxxxx'}</p>
        </div>

        <!-- Receipt Info -->
        <div style="margin-bottom: 15px; font-size: 13px; background: #f8f9fa; padding: 10px; border-radius: 5px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>Receipt #:</strong></span>
            <span>${sale._id?.slice(-8).toUpperCase() || 'N/A'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>Date:</strong></span>
            <span>${formatReceiptDate(sale.date)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span><strong>Customer:</strong></span>
            <span>${customerName}</span>
          </div>
          ${customerPhone ? `
            <div style="display: flex; justify-content: space-between;">
              <span><strong>Phone:</strong></span>
              <span>${customerPhone}</span>
            </div>
          ` : ''}
        </div>

        <!-- Items Table -->
        <table style="width: 100%; font-size: 13px; margin-bottom: 15px; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #000; border-top: 2px solid #000;">
              <th style="text-align: left; padding: 8px 0;">Item</th>
              <th style="text-align: center; padding: 8px 0;">Qty</th>
              <th style="text-align: right; padding: 8px 0;">Price</th>
              <th style="text-align: right; padding: 8px 0;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items
              .map(
                (item) => `
              <tr style="border-bottom: 1px dashed #ccc;">
                <td style="text-align: left; padding: 6px 0;">${item.name?.length > 20 ? item.name.substring(0, 17) + '...' : item.name || 'Product'}</td>
                <td style="text-align: center; padding: 6px 0;">${item.qty}</td>
                <td style="text-align: right; padding: 6px 0;">RS${item.price.toLocaleString()}</td>
                <td style="text-align: right; padding: 6px 0;">RS${(item.qty * item.price).toLocaleString()}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <!-- Summary -->
        <div style="border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 12px 0; margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Subtotal:</span>
            <span>RS${subtotal.toLocaleString()}</span>
          </div>
          ${sale.discountPercent ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #dc3545;">
              <span>Discount (${sale.discountPercent}%):</span>
              <span>-RS${((subtotal * sale.discountPercent) / 100).toLocaleString()}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 2px solid #000; font-size: 16px; font-weight: bold; color: #d32f2f;">
            <span>GRAND TOTAL:</span>
            <span>RS${sale.total.toLocaleString()}</span>
          </div>
        </div>

        <!-- Credit Notice -->
        <div style="background: #ffebee; padding: 12px; text-align: center; margin: 20px 0; border-radius: 5px; border-left: 4px solid #d32f2f;">
          <p style="margin: 0; font-size: 16px; font-weight: bold; color: #d32f2f;">
            CREDIT AMOUNT: RS${sale.total.toLocaleString()}
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px dashed #000;">
          <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">Thank you for your trust!</p>
          <p style="margin: 5px 0; font-size: 13px; color: #d32f2f;">Please clear dues on time</p>
          <p style="margin: 10px 0 0 0; font-size: 10px; color: #666;">Receipt generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      notify("error", "Allow popups for printing");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Credit Receipt - ${sale._id?.slice(-8).toUpperCase()}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @media print {
            body { margin: 0; padding: 15px; background: white; }
            .no-print { display: none; }
          }
          body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 20px;
            background: #f0f2f5;
          }
          .receipt-wrapper {
            max-width: 320px;
            margin: 0 auto;
          }
          .print-button {
            text-align: center;
            margin: 20px 0;
          }
          .btn-print {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 30px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
          }
          .btn-print:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="receipt-wrapper">
          ${receiptHTML}
          <div class="print-button no-print">
            <button class="btn-print" onclick="window.print(); setTimeout(() => window.close(), 1000);">
              🖨️ Print Receipt
            </button>
          </div>
        </div>
        <script>
          setTimeout(() => {
            if (confirm('Print receipt now?')) {
              window.print();
            }
          }, 500);
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  const notify = (type, message) => {
    setAlert({ show: true, type, message });
    addNotification(type, message);
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) return notify("error", "Name is required");
    if (!newCustomer.phone.trim()) return notify("error", "Phone is required");

    try {
      const res = await api.post(API_ENDPOINTS.PERMANENT, {
        ...newCustomer,
        creditLimit: Number(newCustomer.creditLimit) || 50000,
      });

      setCustomers([...customers, res.data]);
      setShowAddModal(false);
      setNewCustomer({
        name: "",
        phone: "",
        email: "",
        gender: "male",
        address: "",
        cnic: "",
        creditLimit: 50000,
        dueDate: "",
      });

      notify("success", `New customer "${res.data.name}" added!`);
    } catch (err) {
      notify("error", err.response?.data?.message || "Failed to add");
    }
  };

  const handlePayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) return notify("error", "Enter valid amount");
    if (amount > selected.remainingDue)
      return notify("error", "Amount exceeds due");

    try {
      const res = await api.post(
        `${API_ENDPOINTS.CUSTOMER_PAYMENT(selected._id)}`,
        {
          amount,
          method: "cash",
          detail: "Payment recorded",
          date: new Date(),
          saleId: selectedSale?._id || salesHistory[0]?._id,
        },
      );

      const updatedCustomer = res.data || {};

      const updated = customers.map((c) =>
        c._id === selected._id
          ? {
              ...c,
              totalPaid: (updatedCustomer.totalPaid || c.totalPaid) + amount,
              remainingDue: Math.max(
                0,
                (updatedCustomer.remainingDue || c.remainingDue) - amount,
              ),
            }
          : c,
      );

      setCustomers(updated);

      setSelected({
        ...selected,
        ...updatedCustomer,
        remainingDue:
          updatedCustomer.remainingDue ??
          Math.max(0, selected.remainingDue - amount),
        totalPaid: updatedCustomer.totalPaid ?? selected.totalPaid + amount,
      });

      setPaymentAmount("");
      notify("success", `Payment RS${amount} recorded!`);

      fetchSalesHistory(selected._id);
    } catch (err) {
      notify(
        "error",
        "Payment failed: " + (err.response?.data?.message || "Unknown error"),
      );
    }
  };

  // WhatsApp Reminder Function
  const sendWhatsAppReminder = (customer) => {
    if (!customer) return;

    const name = customer.name;
    const phone = customer.phone.replace(/[^0-9]/g, "");
    const remainingDue = customer.remainingDue || 0;
    const creditLimit = customer.creditLimit || 50000;
    const usedCredit = creditLimit - remainingDue;
    const usedPercentage = ((usedCredit / creditLimit) * 100).toFixed(1);

    // Format phone number for WhatsApp
    let whatsappNumber = phone;
    if (!phone.startsWith("92") && !phone.startsWith("+92")) {
      whatsappNumber = phone.startsWith("0")
        ? "92" + phone.substring(1)
        : "92" + phone;
    }

    const message = `Dear ${name},

This is a payment reminder from *${shopSettings?.shopName || "Shop Pro"}* regarding your credit account:

 *Outstanding Balance:* RS ${remainingDue.toLocaleString()}
 *Credit Limit:* RS ${creditLimit.toLocaleString()}
 *Credit Used:* ${usedPercentage}%

Please clear your outstanding balance at your earliest convenience. Thank you for your continued trust! ❤️

${shopSettings?.phone ? `Contact: ${shopSettings.phone}` : ""}`;

    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    window.open(whatsappURL, "_blank");

    notify("success", "WhatsApp opened with reminder message!");
  };

  return (
    <div className="container-fluid py-4 position-relative">
      {/* ALERT */}
      {alert.show && (
        <div
          className={`alert alert-${
            alert.type === "success" ? "success" : "danger"
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
                : "bi-x-circle-fill"
            } me-2 fs-5`}
          ></i>
          {alert.message}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4 cash-customer-header ">
        <h2 className="fw-bold">Permanent Credit Customers</h2>
        <div className="d-flex gap-3 history-filter">
          <button
            className="btn btn-success btn-lg rounded-pill shadow-sm px-4 credit-cstmr "
            onClick={exportToCSV}
            disabled={customers.length === 0}
            style={{ width: "208px" }}
          >
            <i className="bi bi-download me-2"></i> Export CSV
          </button>
          <button
            className="btn btn-primary btn-lg rounded-pill shadow-sm px-4 credit-cstmr"
            onClick={() => setShowAddModal(true)}
          >
            <i className="bi bi-person-plus-fill me-2"></i> Add New Customer
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm text-center p-4 bg-primary text-white rounded-3">
            <h6 className="mb-1">Total Customers</h6>
            <h3 className="fw-bold mb-0">{totalCustomers}</h3>
            <small className="opacity-75">{customersWithDue} with due</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm text-center p-4 bg-warning text-dark rounded-3">
            <h6 className="mb-1">Credit Given</h6>
            <h3 className="fw-bold mb-0">RS{totalCreditGiven.toFixed(0)}</h3>
            <small>Total credit provided</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm text-center p-4 bg-success text-white rounded-3">
            <h6 className="mb-1">Paid Amount</h6>
            <h3 className="fw-bold mb-0">RS{totalPaid.toFixed(0)}</h3>
            <small className="opacity-75">Recovered</small>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm text-center p-4 bg-danger text-white rounded-3">
            <h6 className="mb-1">Remaining Due</h6>
            <h3 className="fw-bold mb-0">RS{totalRemaining.toFixed(0)}</h3>
            <small className="opacity-75">Outstanding</small>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card border-0 shadow h-100">
            <div className="card-body p-0">
              <div
                className="list-group list-group-flush"
                style={{ maxHeight: "75vh", overflowY: "auto" }}
              >
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-people fs-1 mb-3 opacity-50"></i>
                    <p>No customers yet</p>
                  </div>
                ) : (
                  customers.map((c) => (
                    <button
                      key={c._id}
                      className={`list-group-item list-group-item-action text-start border-0 rounded-0 py-3 ${
                        selected?._id === c._id
                          ? "bg-primary text-white"
                          : "hover-bg-light"
                      }`}
                      onClick={() => handleCustomerSelect(c)}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="me-3 flex-grow-1">
                          <div className="fw-bold">{c.name}</div>
                          <small
                            className={
                              selected?._id === c._id
                                ? "text-white opacity-75"
                                : "text-muted"
                            }
                          >
                            {c.phone}
                          </small>
                        </div>
                        <div className="text-end">
                          <div className="mb-1">
                            <small
                              className={
                                selected?._id === c._id
                                  ? "text-white opacity-75"
                                  : "text-muted"
                              }
                            >
                              Credit: RS{(c.totalCredit ?? 0).toLocaleString()}
                            </small>
                          </div>
                          {c.remainingDue > 0 && (
                            <span
                              className={`badge rounded-pill ${selected?._id === c._id ? "bg-light text-dark" : "bg-danger"}`}
                            >
                              Due: RS{c.remainingDue.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          {selected ? (
            <div className="card border-0 shadow">
              <div className="card-header bg-primary text-white py-3">
                <h4 className="mb-0">
                  <i className="bi bi-person-circle me-2"></i>
                  {selected.name} - Credit Account
                </h4>
              </div>
              <div className="card-body">
                <div className="row g-4 mb-4">
                  <div className="col-md-4">
                    <small className="text-muted">Phone</small>
                    <p className="fw-bold fs-5 mb-1">{selected.phone}</p>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted">Total Credit</small>
                    <h4 className="text-warning fw-bold mb-0">
                      RS{(selected?.totalCredit ?? 0).toLocaleString()}
                    </h4>
                  </div>
                  <div className="col-md-4">
                    <small className="text-muted">Remaining Due</small>
                    <h4 className="text-danger fw-bold mb-0">
                      RS{(selected?.remainingDue ?? 0).toLocaleString()}
                    </h4>
                  </div>
                </div>

                {/* Payment Section */}
                <div className="card border-0 shadow-sm mt-4">
                  <div className="card-header bg-primary">
                    <h5 className="mb-0">Record Payment</h5>
                  </div>
                  <div className="card-body">
                    <div className="row g-3 align-items-end">
                      <div className="col-md-8">
                        <label className="form-label fw-medium">Amount</label>
                        <input
                          type="number"
                          className="form-control form-control-lg text-center"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="col-md-4">
                        <button
                          className="btn btn-success btn-lg w-100 h-100"
                          onClick={handlePayment}
                          disabled={
                            !paymentAmount ||
                            paymentAmount <= 0 ||
                            paymentAmount > selected.remainingDue
                          }
                        >
                          <i className="bi bi-cash-stack me-2"></i> Record
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Reminder Button */}
                <div className="card border-0 shadow-sm mt-3">
                  <div className="card-body">
                    <button
                      className="btn btn-success btn-lg w-100"
                      onClick={() => sendWhatsAppReminder(selected)}
                      disabled={
                        !selected.remainingDue || selected.remainingDue === 0
                      }
                    >
                      <i className="bi bi-whatsapp me-2"></i>
                      Send Payment Reminder via WhatsApp
                    </button>
                  </div>
                </div>

                {/* Date Filter with All-in-One Button */}
                <div className="card border-0 shadow-sm mb-4 mt-4">
                  <div className="card-header bg-primary d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Filter Purchase History</h5>
                    {salesHistory.length > 0 && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={printAllInOneReceipt}
                      >
                        <i className="bi bi-printer me-2"></i> Print All in One
                      </button>
                    )}
                  </div>
                  <div className="card-body">
                    <div className="row g-3 align-items-end">
                      <div className="col-md-4">
                        <label className="form-label">From Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">To Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <button
                          className="btn btn-primary w-100"
                          onClick={handleDateFilter}
                        >
                          <i className="bi bi-funnel me-2"></i> Apply Filter
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purchase History */}
                <h5 className="mb-3">
                  Purchase History ({salesHistory.length} receipts)
                </h5>
                {salesHistory.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="bi bi-receipt fs-1 mb-3 opacity-50"></i>
                    <p>No purchases found</p>
                  </div>
                ) : (
                  <div className="row g-3">
                    {salesHistory.map((sale) => (
                      <div key={sale._id} className="col-md-6">
                        <div className="card border shadow-sm h-100">
                          <div className="card-header bg-primary d-flex justify-content-between align-items-center">
                            <div>
                              <small className="text-muted">
                                Receipt #{sale._id?.slice(-6).toUpperCase()}
                              </small>
                              <br />
                              <small>{safeFormatDate(sale.date)}</small>
                            </div>
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => printReceipt(sale)}
                            >
                              <i className="bi bi-printer"></i> Print
                            </button>
                          </div>
                          <div className="card-body small">
                            <p className="mb-1">
                              <strong>Total:</strong> RS
                              {sale.total.toLocaleString()}
                            </p>
                            <p className="mb-2">
                              <strong>Items:</strong> {sale.items.length}
                            </p>
                            <ul className="list-unstyled mb-0">
                              {sale.items.slice(0, 4).map((item, i) => (
                                <li key={i}>
                                  • {item.name} × {item.qty} = RS
                                  {(item.qty * item.price).toLocaleString()}
                                </li>
                              ))}
                              {sale.items.length > 4 && (
                                <li className="text-muted">
                                  ...and {sale.items.length - 4} more
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card border-0 shadow-sm h-100 d-flex align-items-center justify-content-center text-center text-muted">
              <div>
                <i className="bi bi-person-check fs-1 mb-3"></i>
                <h4>Select a customer</h4>
                <p>to view history and record payments</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-person-plus-fill me-2"></i>
                  Add New Permanent Credit Customer
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newCustomer.name}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Phone *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newCustomer.phone}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={newCustomer.email}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Gender</label>
                    <select
                      className="form-select"
                      value={newCustomer.gender}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          gender: e.target.value,
                        })
                      }
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Address</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={newCustomer.address}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          address: e.target.value,
                        })
                      }
                    ></textarea>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">CNIC (13 digits)</label>
                    <input
                      type="text"
                      className="form-control"
                      maxLength="13"
                      value={newCustomer.cnic}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          cnic: e.target.value.replace(/\D/g, ""),
                        })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Credit Limit (RS)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newCustomer.creditLimit}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          creditLimit: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Due Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newCustomer.dueDate}
                      onChange={(e) =>
                        setNewCustomer({
                          ...newCustomer,
                          dueDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary px-4"
                  onClick={handleAddCustomer}
                >
                  <i className="bi bi-check-lg me-2"></i> Add Customer
                </button>
              </div>
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