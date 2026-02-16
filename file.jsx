import { useState, useEffect } from "react";
import api from "../api/api";
import { useNotifications } from "../context/NotificationContext";
import { useTheme } from "../context/ThemeContext";
import { API_ENDPOINTS } from "../api/EndPoints";
import { ViteBackendIP } from "./src/api/Vite_React_Backend_Base";



export default function SalesPOS() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [saleType, setSaleType] = useState("cash");
  const [permanentCustomers, setPermanentCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [tempCustomer, setTempCustomer] = useState({ name: "", phone: "" });
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Shop Settings from DB
  const [shopSettings, setShopSettings] = useState(null);

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState([
    { method: "cash", amount: "", detail: "" },
  ]);

  // Success Modal & Receipt Data
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSaleId, setLastSaleId] = useState(null);
  const [lastSaleTotal, setLastSaleTotal] = useState(0);
  const [lastSaleChange, setLastSaleChange] = useState(0);
  const [lastSaleItems, setLastSaleItems] = useState([]);
  const [lastSaleCustomerName, setLastSaleCustomerName] = useState("");

  // Top Alert
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });

  const { addNotification } = useNotifications();
  const { theme } = useTheme();

  const paymentMethods = [
    { value: "cash", label: "Cash", icon: "bi-cash-stack", placeholder: "" },
    {
      value: "card",
      label: "Card",
      icon: "bi-credit-card",
      placeholder: "Last 4 digits",
    },
    { value: "upi", label: "UPI", icon: "bi-phone", placeholder: "UPI ID" },
    {
      value: "easypaisa",
      label: "EasyPaisa",
      icon: "bi-wallet2",
      placeholder: "Mobile Number",
    },
    {
      value: "jazzcash",
      label: "JazzCash",
      icon: "bi-wallet",
      placeholder: "Mobile Number",
    },
    {
      value: "bank",
      label: "Bank Transfer",
      icon: "bi-bank",
      placeholder: "Reference No",
    },
  ];

  // Auto hide top alert
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert({ show: false, type: "", message: "" });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [alert.show]);

  // Load data on mount
  useEffect(() => {
    fetchProducts();
    fetchShopSettings();
    if (saleType === "permanent") fetchPermanentCustomers();
  }, [saleType]);

  const fetchShopSettings = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.SHOP_SETTINGS);
      setShopSettings(res.data);
    } catch (err) {
      showAlertAndNotify("error", "Shop settings not loaded");
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.PRODUCTS);
      const prods = res.data || [];
      setProducts(prods);
      const uniqueCats = [
        "All",
        ...new Set(prods.map((p) => p.category || "").filter(Boolean)),
      ];
      setCategories(uniqueCats);
    } catch (err) {
      showAlertAndNotify("error", "Unable to load products");
    }
  };

  const fetchPermanentCustomers = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.PERMANENT);
      setPermanentCustomers(res.data || []);
    } catch (err) {
      showAlertAndNotify("error", "Unable to load customers");
    }
  };

  const showAlertAndNotify = (type, message) => {
    setAlert({ show: true, type, message });
    addNotification(type === "low-stock" ? "low-stock" : type, message);
  };

  const filteredPermanentCustomers = permanentCustomers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch),
  );

  const filteredProducts = products.filter((p) => {
    const catMatch =
      selectedCategory === "All" || p.category === selectedCategory;
    const searchMatch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery) ||
      p.sku?.includes(searchQuery);
    return catMatch && searchMatch;
  });

  const addToCart = (product) => {
    if (!product.salePrice) {
      showAlertAndNotify("error", "Price not available");
      return;
    }

    if (product.stock <= 0) {
      showAlertAndNotify("error", `${product.name} is out of stock!`);
      return;
    }

    const existing = cart.find((item) => item._id === product._id);
    if (existing) {
      if (existing.qty + 1 > product.stock) {
        showAlertAndNotify(
          "error",
          `Only ${product.stock} ${product.name}(s) available!`,
        );
        return;
      }
      setCart(
        cart.map((item) =>
          item._id === product._id ? { ...item, qty: item.qty + 1 } : item,
        ),
      );
    } else {
      if (1 > product.stock) {
        showAlertAndNotify("error", `${product.name} is out of stock!`);
        return;
      }
      setCart([
        ...cart,
        {
          ...product,
          qty: 1,
          customPrice: product.salePrice,
          itemDiscount: 0,
        },
      ]);
    }

    showAlertAndNotify("success", `${product.name} added to cart`);
  };

  const updateItem = (id, field, value) => {
    const numValue = Number(value) || 0;
    setCart(
      cart.map((item) =>
        item._id === id ? { ...item, [field]: numValue } : item,
      ),
    );
  };

  const updateQty = (id, qty) => {
    const item = cart.find((i) => i._id === id);
    const product = products.find((p) => p._id === id);

    if (qty > product.stock) {
      showAlertAndNotify("error", `Only ${product.stock} in stock!`);
      return;
    }

    if (qty <= 0) {
      setCart(cart.filter((item) => item._id !== id));
    } else {
      updateItem(id, "qty", qty);
    }
  };

  const itemTotal = (item) => {
    const priceAfterDiscount =
      (item.customPrice || 0) - (item.itemDiscount || 0);
    return priceAfterDiscount * item.qty;
  };

  const subtotal = cart.reduce((sum, item) => sum + itemTotal(item), 0);
  const globalDiscountAmount = (subtotal * discount) / 100;
  const serviceCharge = 20;
  const tax = (subtotal - globalDiscountAmount) * 0.05;
  const total = subtotal - globalDiscountAmount + serviceCharge + tax;

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const remaining = total - totalPaid;
  const change = remaining < 0 ? Math.abs(remaining) : 0;

  const addPaymentMethod = () => {
    setPayments([...payments, { method: "cash", amount: "", detail: "" }]);
  };

  const updatePayment = (index, field, value) => {
    const newPayments = [...payments];
    newPayments[index][field] = value;
    setPayments(newPayments);
  };

  const removePayment = (index) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      showAlertAndNotify("error", "Cart is empty");
      return;
    }

    // Validation
    if (saleType === "permanent" && !selectedCustomer) {
      showAlertAndNotify("error", "Select a customer for permanent Credit");
      return;
    }
    if (saleType === "temporary" && !tempCustomer.name.trim()) {
      showAlertAndNotify("error", "Enter customer name for temporary Credit");
      return;
    }

    if (saleType === "cash") {
      setShowPaymentModal(true);
    } else {
      processSale();
    }
  };

  const processSale = async () => {
    let customerId = null;
    let customerInfo = null;
    let customerName = "";

    if (saleType === "permanent") {
      if (!selectedCustomer) {
        showAlertAndNotify("error", "Select a customer");
        return;
      }
      const cust = permanentCustomers.find((c) => c._id === selectedCustomer);
      customerId = selectedCustomer;
      customerName = cust?.name || "";
    } else if (saleType === "temporary") {
      if (!tempCustomer.name.trim()) {
        showAlertAndNotify("error", "Enter customer name");
        return;
      }
      customerInfo = tempCustomer;
      customerName = tempCustomer.name;
    }

    const saleData = {
      items: cart.map((item) => ({
        product: item._id,
        name: item.name,
        qty: item.qty,
        price: item.customPrice,
        itemDiscount: item.itemDiscount,
      })),
      customer: customerId,
      customerInfo: customerInfo,
      saleType: saleType,
      payments: [],
      paidAmount: saleType === "cash" ? totalPaid : 0,
      subtotal,
      discountPercent: discount,
      serviceCharge,
      tax,
      total,
    };

    try {
      setLoading(true);
      const response = await api.post(API_ENDPOINTS.SALE, saleData);

      const newSale = response.data;

      setLastSaleId(newSale._id || `SALE-${Date.now()}`);
      setLastSaleTotal(total);
      setLastSaleChange(change);
      setLastSaleItems([...cart]);
      setLastSaleCustomerName(customerName);

      showAlertAndNotify(
        "success",
        `Sale #${newSale._id
          ?.slice(-6)
          .toUpperCase()} completed! RS${total.toFixed(0)}`,
      );

      const lowStockItems = cart.filter(
        (item) => (item.stock || 0) - item.qty < 5 && item.qty > 0,
      );
      if (lowStockItems.length > 0) {
        const names = lowStockItems.map((i) => i.name).join(", ");
        showAlertAndNotify("low-stock", `Low stock: ${names}`);
      }

      setShowPaymentModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      showAlertAndNotify(
        "error",
        "Sale failed: " + (err.response?.data?.message || err.message),
      );
    } finally {
      setLoading(false);
    }
  };

  const resetAfterSale = () => {
    setCart([]);
    setDiscount(0);
    setTempCustomer({ name: "", phone: "" });
    setSelectedCustomer("");
    setCustomerSearch("");
    setPayments([{ method: "cash", amount: "", detail: "" }]);
    setShowSuccessModal(false);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const getShortSaleId = () => {
    if (typeof lastSaleId === "string") {
      return lastSaleId.slice(-6).toUpperCase();
    }
    return lastSaleId;
  };

  return (
    <div className="h-100 d-flex flex-column bg-body position-relative">
      {/* TOP INSTANT ALERT */}
      {alert.show && (
        <div
          className={`alert alert-${
            alert.type === "success"
              ? "success"
              : alert.type === "low-stock" || alert.type === "warning"
                ? "warning"
                : "danger"
          } position-absolute top-0 start-50 translate-middle-x mt-3 shadow-lg border-0 rounded-pill px-4 py-2 fw-bold text-white`}
          style={{
            zIndex: 2000,
            minWidth: "300px",
            animation: "slideDown 0.4s ease-out",
          }}
        >
          {alert.message}
        </div>
      )}

      {/* Main Layout */}
      <div className="flex-grow-1 d-flex gap-4 overflow-hidden p-4">
        {/* Left: Products */}
        <div className="flex-grow-1 d-flex flex-column">
          {/* Sale Type + Search Row */}
          <div className="bg-body rounded-3 shadow-sm p-3 mb-3">
            <div className="row g-2 align-items-end">
              <div className="col-12 col-md-3">
                <label className="form-label fw-bold mb-1 small">
                  Sale Type
                </label>
                <select
                  className="form-select form-select-sm"
                  value={saleType}
                  onChange={(e) => setSaleType(e.target.value)}
                >
                  <option value="cash">Cash Sale</option>
                  <option value="permanent">Permanent Credit</option>
                  <option value="temporary">Temporary Credit</option>
                </select>
              </div>
              <div className="col-12 col-md-9">
                <label className="form-label fw-bold mb-1 small">
                  Search Product
                </label>
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control form-control-sm rounded-pill ps-5"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                </div>
              </div>
            </div>

            {saleType === "permanent" && (
              <div className="mt-3">
                <label className="form-label small mb-1">Search Customer</label>
                <input
                  type="text"
                  className="form-control form-control-sm mb-2"
                  placeholder="Name or Phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                <select
                  className="form-select form-select-sm"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                >
                  <option value="">Choose Customer</option>
                  {filteredPermanentCustomers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.phone || "No phone"}) - Due: RS
                      {c.remainingDue || 0}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {saleType === "temporary" && (
              <div className="row g-2 mt-3">
                <div className="col-6">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Name *"
                    value={tempCustomer.name}
                    onChange={(e) =>
                      setTempCustomer({ ...tempCustomer, name: e.target.value })
                    }
                  />
                </div>
                <div className="col-6">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Phone"
                    value={tempCustomer.phone}
                    onChange={(e) =>
                      setTempCustomer({
                        ...tempCustomer,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="d-flex gap-2 flex-wrap mb-4">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`btn ${
                  selectedCategory === cat
                    ? "btn-primary text-white"
                    : "btn-outline-secondary"
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <div key={product._id}>
                <div
                  className="card product-card border-0 shadow-sm rounded-4 cursor-pointer position-relative"
                  onClick={() => addToCart(product)}
                >
                  <img
                    src={`${ViteBackendIP}${product.image}`}
                    alt={product.name}
                    className="card-img-top"
                  />
                  <div className="card-body p-2 d-flex flex-column justify-content-between">
                    <h6 className="fw-bold mb-1 text-truncate">
                      {product.name || "Unnamed"}
                    </h6>

                    <div className="mb-2">
                      <small
                        className={`fw-bold ${
                          product.stock <= 0
                            ? "text-danger"
                            : product.stock <= (product.minStockAlert || 10)
                              ? "text-warning"
                              : "text-muted"
                        }`}
                      >
                        Stock: {product.stock || 0}
                        {product.stock <= 0
                          ? " (Out of Stock)"
                          : product.stock <= (product.minStockAlert || 10)
                            ? " (Low)"
                            : ""}
                      </small>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold text-primary">
                        RS {product.salePrice || "0.00"}
                      </span>
                      <button className="btn rounded-circle p-0 bg-primary add-btn">
                        <i
                          className="bi bi-plus text-white"
                          style={{ padding: "5px" }}
                        ></i>
                      </button>
                    </div>
                  </div>

                  {product.stock <= 0 && (
                    <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center rounded-4">
                      <span className="badge bg-danger px-4 py-2">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Current Order */}
        <div className="w-30 ">
          <div className="card border-0 shadow-sm h-100 d-flex flex-column rounded-4">
            <div className="card-header border-0 py-4 px-4">
              <h4 className="mb-0">Current Order</h4>
            </div>

            <div className="card-body flex-grow-1 overflow-auto px-4">
              {cart.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-cart fs-1 mb-3"></i>
                  <p>No items added yet</p>
                  <small>Click on products to add</small>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item._id}
                    className="d-flex mb-4 pb-4 border-bottom"
                  >
                    <img
                      src={`${import.meta.env.VITE_REACT_BACKEND_BASE}${item.image}`}
                      alt={item.name}
                      className="rounded me-3"
                      style={{
                        width: "80px",
                        height: "80px",
                        objectFit: "cover",
                      }}
                    />
                    <div className="flex-grow-1">
                      <h6 className="mb-2">{item.name}</h6>

                      <div className="col g-2 mt-2">
                        <div className="col-12">
                          <label className="small text-muted">Price (RS)</label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={item.customPrice}
                            onChange={(e) =>
                              updateItem(
                                item._id,
                                "customPrice",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        <div className="col-12">
                          <label className="small text-muted">
                            Item Discount (RS)
                          </label>
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            value={item.itemDiscount}
                            onChange={(e) =>
                              updateItem(
                                item._id,
                                "itemDiscount",
                                e.target.value,
                              )
                            }
                          />
                        </div>

                        <div className="col-1">
                          <label className="small text-muted">Qty</label>
                          <div className="btn-group btn-group-sm w-100">
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() => updateQty(item._id, item.qty - 1)}
                            >
                              -
                            </button>
                            <button className="btn btn-outline-secondary px-3">
                              {item.qty}
                            </button>
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() => updateQty(item._id, item.qty + 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 text-end fw-bold text-primary">
                        RS {itemTotal(item).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="card-footer border-0 p-4">
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Subtotal</span>
                    <span>RS{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Global Discount (%)</span>
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        style={{ width: "80px" }}
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                      />
                      <span className="text-danger">
                        -RS{globalDiscountAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Service Charge</span>
                    <span>RS{serviceCharge.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span>Tax (5%)</span>
                    <span>RS{tax.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold fs-4 border-top pt-3">
                    <span>Total</span>
                    <span>RS{total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  className="btn btn-lg w-100 rounded-pill bg-primary text-white"
                  onClick={handleCompleteSale}
                  disabled={loading}
                >
                  {loading ? "Processing..." : "Complete Order"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPaymentModal && saleType === "cash" && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1050 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  Receive Payment - RS{total.toFixed(0)}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowPaymentModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <div className="text-center mb-4">
                  <h2 className="fw-bold">RS{total.toFixed(0)}</h2>
                  <p className="text-muted">Total Amount</p>
                </div>

                <div className="mb-4">
                  <h6 className="fw-bold mb-3">Payment Methods</h6>
                  {payments.map((payment, index) => {
                    const methodInfo = paymentMethods.find(
                      (m) => m.value === payment.method,
                    );
                    return (
                      <div
                        key={index}
                        className="mb-3 p-3 border rounded bg-body"
                      >
                        <div className="row g-3 align-items-center">
                          <div className="col-md-4">
                            <select
                              className="form-select"
                              value={payment.method}
                              onChange={(e) =>
                                updatePayment(index, "method", e.target.value)
                              }
                            >
                              {paymentMethods.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-4">
                            <input
                              type="number"
                              className="form-control"
                              placeholder="Amount"
                              value={payment.amount}
                              onChange={(e) =>
                                updatePayment(index, "amount", e.target.value)
                              }
                            />
                          </div>
                          {payment.method !== "cash" && (
                            <div className="col-md-3">
                              <input
                                type="text"
                                className="form-control"
                                placeholder={
                                  methodInfo?.placeholder || "Detail"
                                }
                                value={payment.detail || ""}
                                onChange={(e) =>
                                  updatePayment(index, "detail", e.target.value)
                                }
                              />
                            </div>
                          )}
                          <div className="col-md-1">
                            {payments.length > 1 && (
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => removePayment(index)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            )}
                          </div>
                        </div>
                        <small className="text-muted mt-1 d-block">
                          <i className={`bi ${methodInfo?.icon} me-2`}></i>
                          {methodInfo?.label}
                        </small>
                      </div>
                    );
                  })}

                  <button
                    className="btn btn-outline-primary w-100 mt-2"
                    onClick={addPaymentMethod}
                  >
                    <i className="bi bi-plus-lg me-2"></i> Add Another Method
                  </button>
                </div>

                <div className="bg-body p-4 rounded">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Total Paid</span>
                    <span className="fw-bold text-success">
                      RS{totalPaid.toFixed(0)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Remaining</span>
                    <span
                      className={`fw-bold ${
                        remaining > 0 ? "text-danger" : "text-success"
                      }`}
                    >
                      RS{remaining.toFixed(0)}
                    </span>
                  </div>
                  {change > 0 && (
                    <div className="d-flex justify-content-between">
                      <span>Change</span>
                      <span className="fw-bold text-success">
                        RS{change.toFixed(0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-lg px-5 bg-primary text-white"
                  onClick={processSale}
                  disabled={remaining > 0 || loading}
                >
                  {loading ? "Processing..." : "Complete Payment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1060 }}
        >
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  Sale Completed Successfully!
                </h5>
              </div>
              <div className="modal-body text-center py-4">
                <i className="bi bi-check-circle display-1 text-success mb-3"></i>
                <h4>RS{lastSaleTotal.toFixed(0)}</h4>
                {lastSaleChange > 0 && (
                  <p className="text-success fw-bold">
                    Change Returned: RS{lastSaleChange.toFixed(0)}
                  </p>
                )}
                <p className="text-muted">Sale ID: #{getShortSaleId()}</p>
              </div>
              <div className="modal-footer justify-content-center gap-3">
                <button
                  className="btn btn-success btn-lg px-5"
                  onClick={handlePrintReceipt}
                >
                  <i className="bi bi-printer me-2"></i> Print Receipt
                </button>
                <button
                  className="btn btn-outline-primary btn-lg px-5"
                  onClick={resetAfterSale}
                >
                  New Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REAL RECEIPT */}
      <div id="print-receipt" style={{ display: "none" }}>
        <div
          style={{
            fontFamily: "monospace",
            padding: "15px",
            maxWidth: "300px",
            margin: "0 auto",
            textAlign: "center",
            fontSize: "14px",
            lineHeight: "1.5",
          }}
        >
          <h2 style={{ margin: "0 0 10px", fontSize: "18px" }}>
            {shopSettings?.shopName || "My Shop"}
          </h2>
          <p style={{ margin: "0" }}>
            {shopSettings?.address || "Main Bazar, City"}
          </p>
          <p style={{ margin: "0 0 15px" }}>
            Phone: {shopSettings?.phone || "03xx-xxxxxxx"}
          </p>
          <hr style={{ border: "dashed 1px #000", margin: "15px 0" }} />

          <div style={{ textAlign: "left", fontSize: "13px" }}>
            <p style={{ margin: "5px 0" }}>
              <strong>Date:</strong> {new Date().toLocaleDateString("en-GB")}
            </p>
            <p style={{ margin: "5px 0" }}>
              <strong>Time:</strong> {new Date().toLocaleTimeString()}
            </p>
            <p style={{ margin: "5px 0" }}>
              <strong>Sale ID:</strong> #{getShortSaleId()}
            </p>
            {lastSaleCustomerName && (
              <p style={{ margin: "5px 0" }}>
                <strong>Customer:</strong> {lastSaleCustomerName}
              </p>
            )}
          </div>

          <hr style={{ border: "dashed 1px #000", margin: "15px 0" }} />

          <table style={{ width: "100%", fontSize: "13px" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Item</th>
                <th style={{ textAlign: "center" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lastSaleItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: "left", padding: "2px 0" }}>
                    {item.name.length > 20
                      ? item.name.substring(0, 20) + "..."
                      : item.name}
                  </td>
                  <td style={{ textAlign: "center", padding: "2px 0" }}>
                    {item.qty}
                  </td>
                  <td style={{ textAlign: "right", padding: "2px 0" }}>
                    RS{itemTotal(item).toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr style={{ border: "dashed 1px #000", margin: "15px 0" }} />

          <div
            style={{ textAlign: "right", fontSize: "15px", fontWeight: "bold" }}
          >
            <p style={{ margin: "8px 0" }}>
              Total: RS{lastSaleTotal.toFixed(0)}
            </p>
            {lastSaleChange > 0 && (
              <p style={{ margin: "8px 0" }}>
                Change: RS{lastSaleChange.toFixed(0)}
              </p>
            )}
            <p style={{ margin: "8px 0" }}>
              Paid: RS{(lastSaleTotal - lastSaleChange).toFixed(0)}
            </p>
          </div>

          <hr style={{ border: "dashed 1px #000", margin: "20px 0" }} />
          <p style={{ margin: "0", fontSize: "13px" }}>
            Thank You for Shopping!
          </p>
          <p style={{ margin: "5px 0 0", fontSize: "12px" }}>Come Again :)</p>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-receipt, #print-receipt * { visibility: visible; }
          #print-receipt { position: absolute; left: 0; top: 0; display: block !important; }
        }

        @keyframes slideDown {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
