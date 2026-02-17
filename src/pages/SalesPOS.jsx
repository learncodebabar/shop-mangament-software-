import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../api/api";
import { useNotifications } from "../context/NotificationContext";
import { useTheme } from "../context/ThemeContext";
import { API_ENDPOINTS } from "../api/EndPoints";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import "./SalesPOS.css";
import { VITE_BACKEND_URL } from "../config/config";

// Memoized Cart Item Component to prevent unnecessary re-renders
const CartItem = React.memo(({ item, isMobile, updateItem, updateQty, getImageUrl, itemTotal }) => {
  return (
    <div className={isMobile ? "cart-item-mobile" : "d-flex mb-4 pb-4 border-bottom"}>
      <img
        src={getImageUrl(item.image)}
        alt={item.name}
        className={isMobile ? "me-3" : "rounded me-3"}
        style={
          isMobile
            ? {}
            : {
                width: "80px",
                height: "80px",
                objectFit: "cover",
              }
        }
        onError={(e) => {
          e.target.src = "/placeholder-product.png";
        }}
      />
      <div className="flex-grow-1">
        <h6 className="mb-2">{item.name}</h6>

        <div className="row g-2 mt-2 cart-detail">
          <div className="col-6">
            <label className="small text-muted">Price (RS)</label>
            <input
              type="number"
              className="form-control form-control-sm"
              value={item.customPrice}
              onChange={(e) =>
                updateItem(item.cartItemId || item._id, "customPrice", e.target.value)
              }
              autoComplete="off"
            />
          </div>

          <div className="col-6">
            <label className="small text-muted">Item Discount (RS)</label>
            <input
              type="number"
              className="form-control form-control-sm"
              value={item.itemDiscount}
              onChange={(e) =>
                updateItem(item.cartItemId || item._id, "itemDiscount", e.target.value)
              }
              autoComplete="off"
            />
          </div>

          <div className="col-12">
            <label className="small text-muted">Qty</label>
            <div className="btn-group btn-group-sm w-100">
              <button
                className="btn btn-outline-secondary"
                onClick={() => updateQty(item._id, item.qty - 1, item.cartItemId)}
              >
                <i className="bi bi-dash"></i>
              </button>
              <button className="btn btn-outline-secondary px-3">
                {item.qty}
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => updateQty(item._id, item.qty + 1, item.cartItemId)}
              >
                <i className="bi bi-plus"></i>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2 text-end fw-bold text-primary">
          RS {itemTotal(item).toFixed(2)}
        </div>
      </div>
    </div>
  );
});

// Memoized Cart Content Component
const CartContent = React.memo(({ 
  cart, 
  isMobile = false, 
  updateItem, 
  updateQty, 
  getImageUrl, 
  itemTotal,
  subtotal,
  discount,
  setDiscount,
  serviceCharge,
  setServiceCharge,
  taxRate,
  setTaxRate,
  globalDiscountAmount,
  tax,
  total,
  loading,
  handleCompleteSale
}) => (
  <>
    <div
      className={
        isMobile
          ? "mobile-cart-body"
          : "card-body flex-grow-1 overflow-auto px-4"
      }
    >
      {cart.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-cart fs-1 mb-3 d-block"></i>
          <p>No items added yet</p>
          <small>Click on products or scan barcode</small>
        </div>
      ) : (
        cart.map((item) => (
          <CartItem
            key={item.cartItemId || item._id}
            item={item}
            isMobile={isMobile}
            updateItem={updateItem}
            updateQty={updateQty}
            getImageUrl={getImageUrl}
            itemTotal={itemTotal}
          />
        ))
      )}
    </div>

    {cart.length > 0 && (
      <div
        className={
          isMobile ? "mobile-cart-footer" : "card-footer border-0 p-4"
        }
      >
        <div className="mb-3">
          <div className="d-flex justify-content-between mb-2">
            <span>Subtotal</span>
            <span>RS{subtotal.toFixed(2)}</span>
          </div>
          <div className="d-flex justify-content-between mb-2 align-items-center">
            <span>Discount (%)</span>
            <div className="d-flex align-items-center gap-2">
              <input
                type="number"
                className="form-control form-control-sm"
                style={{ width: "80px" }}
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                min="0"
                autoComplete="off"
              />
              <span className="text-danger">
                -RS{globalDiscountAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="d-flex justify-content-between mb-2 align-items-center">
            <span>Service (RS)</span>
            <div className="d-flex align-items-center gap-2">
              <input
                type="number"
                className="form-control form-control-sm"
                style={{ width: "80px" }}
                value={serviceCharge}
                onChange={(e) =>
                  setServiceCharge(Number(e.target.value) || 0)
                }
                min="0"
                autoComplete="off"
              />
              <span className="text-primary">
                +RS{serviceCharge.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="d-flex justify-content-between mb-3 align-items-center">
            <span>Tax (%)</span>
            <div className="d-flex align-items-center gap-2">
              <input
                type="number"
                className="form-control form-control-sm"
                style={{ width: "80px" }}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                min="0"
                step="0.1"
                autoComplete="off"
              />
              <span className="text-primary">+RS{tax.toFixed(2)}</span>
            </div>
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
  </>
));

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
  const [serviceCharge, setServiceCharge] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [loading, setLoading] = useState(false);

  // Mobile Cart Modal State
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState("camera");
  const [scannerStarted, setScannerStarted] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [scannerError, setScannerError] = useState("");
  const html5QrcodeRef = useRef(null);
  const fileInputRef = useRef(null);

  // Shop Settings
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

  // Auto hide alert
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert({ show: false, type: "", message: "" });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [alert.show]);

  // Load data
  useEffect(() => {
    fetchProducts();
    fetchShopSettings();
    fetchPermanentCustomers();
  }, []);

  // ✅ IMPROVED Camera Scanner with Better Configuration
  useEffect(() => {
    let mounted = true;

    const startScanner = async () => {
      if (!showScanner || scanMode !== "camera" || scannerStarted) return;

      try {
        console.log("🎥 Starting camera scanner...");
        setScannerError("");
        const scanner = new Html5Qrcode("barcode-reader");
        html5QrcodeRef.current = scanner;

        // Get available cameras
        const cameras = await Html5Qrcode.getCameras();
        console.log("📸 Available cameras:", cameras);

        if (cameras && cameras.length > 0) {
          // ✅ IMPROVED: Enhanced camera configuration
          await scanner.start(
            { facingMode: cameraFacing },
            {
              fps: 10,
              qrbox: function (viewfinderWidth, viewfinderHeight) {
                // Dynamic QR box sizing
                const minEdgePercentage = 0.7;
                const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
                return {
                  width: qrboxSize,
                  height: qrboxSize,
                };
              },
              aspectRatio: 1.0,
              disableFlip: false,
              // ✅ CRITICAL: Support multiple barcode formats
              formatsToSupport: [
                Html5QrcodeSupportedFormats.QR_CODE,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
              ],
            },
            onScanSuccess,
            onScanError,
          );

          if (mounted) {
            setScannerStarted(true);
            setScannerError("");
            console.log("✅ Camera scanner started successfully!");
          }
        } else {
          console.error("❌ No cameras found");
          setScannerError("No camera found on this device!");
        }
      } catch (err) {
        console.error("❌ Scanner start error:", err);
        if (mounted) {
          setScannerError("Camera access denied. Try using Image Upload mode.");
          setShowScanner(false);
        }
      }
    };

    if (showScanner && scanMode === "camera") {
      setTimeout(() => {
        startScanner();
      }, 200);
    }

    return () => {
      mounted = false;
    };
  }, [showScanner, scanMode, cameraFacing]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const onScanSuccess = (decodedText) => {
    console.log("✅ Barcode scanned:", decodedText);

    const product = products.find(
      (p) => p.barcode === decodedText || p.sku === decodedText,
    );

    if (product) {
      console.log("✅ Product found:", product.name);
      addToCart(product);
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
    } else {
      console.error("❌ Product not found for barcode:", decodedText);
      console.log(
        "Available products with barcodes:",
        products
          .filter((p) => p.barcode || p.sku)
          .map((p) => ({
            name: p.name,
            barcode: p.barcode,
            sku: p.sku,
          })),
      );
      showAlertAndNotify("error", `Barcode "${decodedText}" not found!`);
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  };

  const onScanError = (errorMessage) => {
    // Silent - normal scanning errors
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current && scannerStarted) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
        html5QrcodeRef.current = null;
        setScannerStarted(false);
        console.log("🛑 Scanner stopped");
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const toggleScanner = async () => {
    if (showScanner) {
      await stopScanner();
      setShowScanner(false);
      setScannerError("");
    } else {
      setShowScanner(true);
    }
  };

  const switchCamera = async () => {
    console.log(
      "🔄 Switching camera from",
      cameraFacing,
      "to",
      cameraFacing === "environment" ? "user" : "environment",
    );
    await stopScanner();
    setCameraFacing(cameraFacing === "environment" ? "user" : "environment");
    setScannerStarted(false);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      console.log("📤 Uploading image for barcode scan...");
      showAlertAndNotify("info", "Scanning image...");

      const html5QrCode = new Html5Qrcode("image-reader");
      const result = await html5QrCode.scanFile(file, true);

      console.log("✅ Barcode detected from image:", result);

      const product = products.find(
        (p) => p.barcode === result || p.sku === result,
      );

      if (product) {
        console.log("✅ Product found:", product.name);
        addToCart(product);
        setShowScanner(false);
      } else {
        console.error("❌ Product not found for barcode:", result);
        showAlertAndNotify("error", `Barcode "${result}" not found!`);
      }
    } catch (err) {
      console.error("❌ Image scan error:", err);
      showAlertAndNotify(
        "error",
        "No barcode found in image. Make sure barcode is clear.",
      );
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

      // ✅ Debug logging
      console.log(" Products loaded:", prods.length);
      console.log(
        "📊 Products with barcodes:",
        prods.filter((p) => p.barcode || p.sku).length,
      );
      console.log(
        "Sample barcodes:",
        prods
          .filter((p) => p.barcode)
          .slice(0, 5)
          .map((p) => ({
            name: p.name,
            barcode: p.barcode,
          })),
      );
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
      setCart(prevCart =>
        prevCart.map((item) =>
          item._id === product._id 
            ? { ...item, qty: item.qty + 1 } 
            : item
        )
      );
    } else {
      // Add unique cartItemId to prevent input focus issues
      setCart(prevCart => [
        ...prevCart,
        {
          ...product,
          qty: 1,
          customPrice: product.salePrice,
          itemDiscount: 0,
          cartItemId: `${product._id}-${Date.now()}-${Math.random()}`, // Unique ID for cart item
        },
      ]);
    }

    showAlertAndNotify("success", `${product.name} added to cart`);
  };

  const updateItem = useCallback((cartItemId, field, value) => {
    const numValue = Number(value) || 0;
    setCart(prevCart =>
      prevCart.map((item) =>
        (item.cartItemId || item._id) === cartItemId 
          ? { ...item, [field]: numValue } 
          : item
      )
    );
  }, []);

  const updateQty = useCallback((productId, qty, cartItemId) => {
    setCart(prevCart => {
      const item = prevCart.find(i => (i.cartItemId || i._id) === (cartItemId || productId));
      const product = products.find((p) => p._id === productId);

      if (qty > product?.stock) {
        showAlertAndNotify("error", `Only ${product?.stock} in stock!`);
        return prevCart;
      }

      if (qty <= 0) {
        return prevCart.filter((item) => (item.cartItemId || item._id) !== (cartItemId || productId));
      } else {
        return prevCart.map((item) =>
          (item.cartItemId || item._id) === (cartItemId || productId)
            ? { ...item, qty: qty }
            : item
        );
      }
    });
  }, [products]);

  const itemTotal = (item) => {
    const priceAfterDiscount =
      (item.customPrice || 0) - (item.itemDiscount || 0);
    return priceAfterDiscount * item.qty;
  };

  const subtotal = cart.reduce((sum, item) => sum + itemTotal(item), 0);
  const globalDiscountAmount = (subtotal * discount) / 100;
  const tax = (subtotal - globalDiscountAmount) * (taxRate / 100);
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
    setShowMobileCart(false);
    setShowPaymentModal(true);
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
      payments: saleType === "cash" ? payments : [],
      paidAmount: saleType === "cash" ? totalPaid : 0,
      subtotal,
      discountPercent: discount,
      serviceCharge: serviceCharge,
      tax: tax,
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
    setServiceCharge(0);
    setTaxRate(0);
    setTempCustomer({ name: "", phone: "" });
    setSelectedCustomer("");
    setCustomerSearch("");
    setSaleType("cash");
    setPayments([{ method: "cash", amount: "", detail: "" }]);
    setShowSuccessModal(false);
  };

const handlePrintReceipt = () => {
  // Calculate values for receipt
  const receiptSubtotal = lastSaleItems.reduce((sum, item) => {
    const priceAfterDiscount = (item.customPrice || 0) - (item.itemDiscount || 0);
    return sum + (priceAfterDiscount * item.qty);
  }, 0);
  
  const receiptDiscountAmount = (receiptSubtotal * discount) / 100;
  const receiptTax = (receiptSubtotal - receiptDiscountAmount) * (taxRate / 100);
  
  // Format date and time
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB');
  const timeStr = now.toLocaleTimeString();
  
  // Generate receipt HTML
  const receiptHTML = `
    <div style="font-family: monospace; max-width: 300px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px;">${shopSettings?.shopName || 'My Shop'}</h2>
        <p style="margin: 5px 0;">${shopSettings?.address || 'Main Bazar'}</p>
        <p style="margin: 5px 0;">Tel: ${shopSettings?.phone || '03xx-xxxxxxx'}</p>
      </div>
      
      <hr style="border: dashed 1px #000; margin: 15px 0;">
      
      <div style="font-size: 13px; margin-bottom: 15px;">
        <p style="margin: 3px 0;"><strong>Date:</strong> ${dateStr}</p>
        <p style="margin: 3px 0;"><strong>Time:</strong> ${timeStr}</p>
        <p style="margin: 3px 0;"><strong>Receipt #:</strong> ${getShortSaleId()}</p>
        ${lastSaleCustomerName ? `<p style="margin: 3px 0;"><strong>Customer:</strong> ${lastSaleCustomerName}</p>` : ''}
        <p style="margin: 3px 0;"><strong>Cashier:</strong> ${shopSettings?.cashierName || 'POS User'}</p>
      </div>
      
      <hr style="border: dashed 1px #000; margin: 15px 0;">
      
      <table style="width: 100%; font-size: 13px; margin-bottom: 15px;">
        <thead>
          <tr>
            <th style="text-align: left; padding-bottom: 5px;">Item</th>
            <th style="text-align: center; padding-bottom: 5px;">Qty</th>
            <th style="text-align: right; padding-bottom: 5px;">Price</th>
            <th style="text-align: right; padding-bottom: 5px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${lastSaleItems.map(item => {
            const itemPrice = item.customPrice || 0;
            const itemDiscount = item.itemDiscount || 0;
            const finalPrice = itemPrice - itemDiscount;
            const itemTotal = finalPrice * item.qty;
            
            return `
              <tr>
                <td style="text-align: left; padding: 3px 0;">
                  ${item.name.length > 25 ? item.name.substring(0, 22) + '...' : item.name}
                  ${itemDiscount > 0 ? `<br><small style="color: #666;">Disc: -RS${itemDiscount}</small>` : ''}
                </td>
                <td style="text-align: center; padding: 3px 0;">${item.qty}</td>
                <td style="text-align: right; padding: 3px 0;">RS${finalPrice.toFixed(0)}</td>
                <td style="text-align: right; padding: 3px 0;">RS${itemTotal.toFixed(0)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <hr style="border: dashed 1px #000; margin: 15px 0;">
      
      <div style="text-align: right; font-size: 14px; margin-bottom: 15px;">
        <p style="margin: 5px 0;"><strong>Subtotal:</strong> RS${receiptSubtotal.toFixed(0)}</p>
        ${discount > 0 ? `<p style="margin: 5px 0;"><strong>Discount (${discount}%):</strong> -RS${receiptDiscountAmount.toFixed(0)}</p>` : ''}
        ${serviceCharge > 0 ? `<p style="margin: 5px 0;"><strong>Service Charge:</strong> RS${serviceCharge.toFixed(0)}</p>` : ''}
        ${taxRate > 0 ? `<p style="margin: 5px 0;"><strong>Tax (${taxRate}%):</strong> RS${receiptTax.toFixed(0)}</p>` : ''}
        <p style="margin: 10px 0; font-size: 18px; border-top: 2px solid #000; padding-top: 10px;">
          <strong>TOTAL:</strong> RS${lastSaleTotal.toFixed(0)}
        </p>
      </div>
      
      ${lastSaleChange > 0 ? `
        <div style="text-align: right; font-size: 14px; margin-bottom: 15px; color: #28a745;">
          <p style="margin: 5px 0;"><strong>Paid:</strong> RS${(lastSaleTotal + lastSaleChange).toFixed(0)}</p>
          <p style="margin: 5px 0;"><strong>Change:</strong> RS${lastSaleChange.toFixed(0)}</p>
        </div>
      ` : ''}
      
      <hr style="border: dashed 1px #000; margin: 20px 0;">
      
      <div style="text-align: center; font-size: 13px;">
        <p style="margin: 5px 0;">Thank you for shopping with us!</p>
        <p style="margin: 5px 0;">Please come again</p>
        ${shopSettings?.footerMessage ? `<p style="margin: 5px 0;">${shopSettings.footerMessage}</p>` : ''}
      </div>
      
      <div style="text-align: center; font-size: 11px; margin-top: 20px; color: #666;">
        <p style="margin: 2px 0;">** This is a computer generated receipt **</p>
        <p style="margin: 2px 0;">${new Date().toLocaleString()}</p>
      </div>
    </div>
  `;

  // Create print window
  const printWindow = window.open('', '_blank');
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${getShortSaleId()}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @media print {
            body { 
              margin: 0; 
              padding: 20px;
              background: white;
            }
          }
          body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 20px;
            background: #f8f9fa;
          }
          .receipt-container {
            max-width: 300px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          ${receiptHTML}
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { 
              window.close(); 
            }, 1000);
          };
        </script>
      </body>
    </html>
  `);
  
  printWindow.document.close();
};

  const getShortSaleId = () => {
    if (typeof lastSaleId === "string") {
      return lastSaleId.slice(-6).toUpperCase();
    }
    return lastSaleId;
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "/placeholder-product.png";
    if (imagePath.startsWith("http")) return imagePath;
    const backendBase = VITE_BACKEND_URL;
    const cleanPath = imagePath.startsWith("/")
      ? imagePath.slice(1)
      : imagePath;
    return `${VITE_BACKEND_URL}/${cleanPath}`;
  };

  return (
    <div className="pos-container">
      {/* TOP ALERT */}
      {alert.show && (
        <div
          className={`alert alert-${
            alert.type === "success"
              ? "success"
              : alert.type === "low-stock" || alert.type === "warning"
                ? "warning"
                : alert.type === "info"
                  ? "info"
                  : "danger"
          } position-absolute top-0 start-50 translate-middle-x mt-3 shadow-lg border-0 rounded-pill px-4 py-2 fw-bold text-white top-alert`}
        >
          {alert.message}
        </div>
      )}

      {/* Main Layout */}
      <div className="pos-main-layout">
        {/* Products Section */}
        <div className="products-section">
          {/* Search + Scanner */}
          <div className="bg-body rounded-3 shadow-sm p-3 mb-3 search-scanner-section">
            <div className="row g-2 align-items-end">
              <div className="col-12">
                <label className="form-label fw-bold mb-2 small">
                  Search Product
                </label>
                <div className="position-relative">
                  <input
                    type="text"
                    className="form-control form-control-sm rounded-pill ps-5"
                    placeholder="Search by name, barcode, or SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoComplete="off"
                  />
                  <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
                </div>
              </div>
              <div className="col-12">
                <button
                  className={`btn btn-sm w-100 ${
                    showScanner ? "btn-danger" : "btn-primary"
                  }`}
                  onClick={toggleScanner}
                >
                  <i
                    className={`bi ${
                      showScanner ? "bi-x-circle" : "bi-upc-scan"
                    } me-2`}
                  ></i>
                  {showScanner ? "Close Scanner" : "Scan Barcode"}
                </button>
              </div>
            </div>
          </div>

          {/* Scanner Modal */}
          {showScanner && (
            <div
              className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
              style={{
                backgroundColor: "rgba(0,0,0,0.9)",
                zIndex: 2050,
              }}
            >
              <div className="bg-white rounded-4 p-4 scanner-modal-mobile">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-upc-scan me-2"></i>Scan Barcode
                  </h5>
                  <button
                    className="btn btn-sm btn-danger rounded-circle"
                    onClick={toggleScanner}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>

                {/* Mode Selection */}
                <div className="btn-group w-100 mb-3" role="group">
                  <button
                    type="button"
                    className={`btn ${scanMode === "camera" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => {
                      setScanMode("camera");
                      setScannerError("");
                    }}
                  >
                    <i className="bi bi-camera me-2"></i>Camera
                  </button>
                  <button
                    type="button"
                    className={`btn ${scanMode === "image" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => {
                      stopScanner();
                      setScanMode("image");
                      setScannerError("");
                    }}
                  >
                    <i className="bi bi-image me-2"></i>Upload Image
                  </button>
                </div>

                {scannerError && (
                  <div className="alert alert-danger py-2 mb-3">
                    <small>{scannerError}</small>
                  </div>
                )}

                {scanMode === "camera" && (
                  <>
                    <div
                      id="barcode-reader"
                      style={{
                        width: "100%",
                        borderRadius: "12px",
                        overflow: "hidden",
                        minHeight: "250px",
                      }}
                    ></div>

                    <div className="text-center mt-3">
                      <button
                        className="btn btn-secondary w-100 mb-2"
                        onClick={switchCamera}
                        disabled={!scannerStarted}
                      >
                        <i className="bi bi-arrow-repeat me-2"></i>
                        Switch to{" "}
                        {cameraFacing === "environment" ? "Front" : "Back"}{" "}
                        Camera
                      </button>

                      {/* Quick switch to image upload if camera having issues */}
                      {scannerStarted && (
                        <button
                          className="btn btn-warning w-100 btn-sm"
                          onClick={() => {
                            stopScanner();
                            setScanMode("image");
                          }}
                        >
                          <i className="bi bi-image me-2"></i>
                          Camera Blur? Try Image Upload
                        </button>
                      )}
                    </div>
                  </>
                )}

                {scanMode === "image" && (
                  <>
                    <div id="image-reader" style={{ display: "none" }}></div>

                    <div className="text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: "none" }}
                      />

                      <div
                        className="border-2 border-dashed rounded-4 p-5 text-center cursor-pointer"
                        style={{ borderColor: "#dee2e6", cursor: "pointer" }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <i className="bi bi-cloud-upload fs-1 text-primary mb-3 d-block"></i>
                        <h6 className="mb-2">Upload Barcode Image</h6>
                        <p className="text-muted small mb-0">
                          Click to select image
                        </p>
                      </div>

                      <div className="alert alert-success mt-3 py-2">
                        <small>
                          <i className="bi bi-lightbulb me-2"></i>
                          <strong>Works Best:</strong> Screenshot barcode from
                          Google or product photo
                        </small>
                      </div>
                    </div>
                  </>
                )}

                <p className="text-center text-muted mt-3 mb-0 small">
                  <i className="bi bi-info-circle me-2"></i>
                  {scanMode === "camera"
                    ? "Point camera at barcode • Auto-detects when in view"
                    : "Upload any image containing a barcode"}
                </p>
              </div>
            </div>
          )}

          {/* Categories */}
         <div className="category-buttons-wrapper mb-3">
  <div className="d-flex gap-2 category-buttons">
    {categories.map((cat, index) => (
      <button
        key={index} // Use index as key since cat is a string
        className={`btn btn-sm ${
          selectedCategory === cat // Compare directly with the string
            ? "btn-primary text-white"
            : "btn-outline-secondary"
        }`}
        onClick={() => setSelectedCategory(cat)} // Set the category string
      >
        {cat} {/* Display the category string */}
      </button>
    ))}
  </div>
</div>

          {/* Products Grid */}
          <div className="flex-grow-1 overflow-auto products-grid">
            {filteredProducts.map((product) => (
              <div key={product._id}>
                <div
                  className="card product-card shadow-sm cursor-pointer position-relative"
                  onClick={() => addToCart(product)}
                >
                  <img
                    src={getImageUrl(product.image)}
                    alt={product.name}
                    className="card-img-top"
                    onError={(e) => {
                      e.target.src = "/placeholder-product.png";
                    }}
                  />
                  <div className="card-body p-2">
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
                      </small>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold text-primary">
                        RS {product.salePrice || "0.00"}
                      </span>
                      <button className="btn bg-primary product-add-btn ">
                        <i className="bi bi-plus text-white"></i>
                      </button>
                    </div>
                  </div>

                  {product.stock <= 0 && (
                    <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center rounded-4">
                      <span className="badge bg-danger px-3 py-2">
                        Out of Stock
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Cart */}
        <div className="cart-section">
          <div className="card border-0 shadow-sm h-100 d-flex flex-column rounded-4">
            <div className="card-header border-0 py-4 px-4">
              <h4 className="mb-0">Current Order</h4>
            </div>
            <CartContent 
              cart={cart}
              isMobile={false}
              updateItem={updateItem}
              updateQty={updateQty}
              getImageUrl={getImageUrl}
              itemTotal={itemTotal}
              subtotal={subtotal}
              discount={discount}
              setDiscount={setDiscount}
              serviceCharge={serviceCharge}
              setServiceCharge={setServiceCharge}
              taxRate={taxRate}
              setTaxRate={setTaxRate}
              globalDiscountAmount={globalDiscountAmount}
              tax={tax}
              total={total}
              loading={loading}
              handleCompleteSale={handleCompleteSale}
            />
          </div>
        </div>
      </div>

      {/* Floating Cart Button (Mobile Only) */}
      <button
        className="floating-cart-btn"
        onClick={() => setShowMobileCart(true)}
      >
        <i className="bi bi-cart3"></i>
        {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
      </button>

      {/* Mobile Cart Modal */}
      {showMobileCart && (
        <div className={`mobile-cart-modal ${showMobileCart ? "show" : ""}`}>
          <div className="mobile-cart-header">
            <h5 className="mb-0 fw-bold">
              <i className="bi bi-cart3 me-2"></i>Current Order
            </h5>
            <button
              className="btn btn-sm btn-close"
              onClick={() => setShowMobileCart(false)}
            ></button>
          </div>
          <CartContent 
            cart={cart}
            isMobile={true}
            updateItem={updateItem}
            updateQty={updateQty}
            getImageUrl={getImageUrl}
            itemTotal={itemTotal}
            subtotal={subtotal}
            discount={discount}
            setDiscount={setDiscount}
            serviceCharge={serviceCharge}
            setServiceCharge={setServiceCharge}
            taxRate={taxRate}
            setTaxRate={setTaxRate}
            globalDiscountAmount={globalDiscountAmount}
            tax={tax}
            total={total}
            loading={loading}
            handleCompleteSale={handleCompleteSale}
          />
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1050 }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered payment-modal-mobile">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  Complete Sale - RS{total.toFixed(0)}
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

                <div className="mb-4 p-3 border rounded bg-light">
                  <label className="form-label fw-bold mb-3">Sale Type</label>
                  <div className="btn-group w-100" role="group">
                    <button
                      type="button"
                      className={`btn ${saleType === "cash" ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setSaleType("cash")}
                    >
                      <i className="bi bi-cash-stack me-2"></i>Cash
                    </button>
                    <button
                      type="button"
                      className={`btn ${saleType === "permanent" ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setSaleType("permanent")}
                    >
                      <i className="bi bi-person-check me-2"></i>Permanent
                    </button>
                    <button
                      type="button"
                      className={`btn ${saleType === "temporary" ? "btn-primary" : "btn-outline-secondary"}`}
                      onClick={() => setSaleType("temporary")}
                    >
                      <i className="bi bi-clock-history me-2"></i>Temporary
                    </button>
                  </div>

                  {saleType === "permanent" && (
                    <div className="mt-3">
                      <label className="form-label small mb-1">
                        Search Customer
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm mb-2"
                        placeholder="Name or Phone..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        autoComplete="off"
                      />
                      <select
                        className="form-select"
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                      >
                        <option value="">Choose Customer *</option>
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
                          className="form-control"
                          placeholder="Customer Name *"
                          value={tempCustomer.name}
                          onChange={(e) =>
                            setTempCustomer({
                              ...tempCustomer,
                              name: e.target.value,
                            })
                          }
                          autoComplete="off"
                        />
                      </div>
                      <div className="col-6">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Phone Number"
                          value={tempCustomer.phone}
                          onChange={(e) =>
                            setTempCustomer({
                              ...tempCustomer,
                              phone: e.target.value,
                            })
                          }
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {saleType === "cash" && (
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
                                autoComplete="off"
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
                                    updatePayment(
                                      index,
                                      "detail",
                                      e.target.value,
                                    )
                                  }
                                  autoComplete="off"
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
                )}

                {saleType === "cash" && (
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
                )}
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
                  disabled={(saleType === "cash" && remaining > 0) || loading}
                >
                  {loading ? "Processing..." : "Complete Sale"}
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
          <div className="modal-dialog modal-md modal-dialog-centered success-modal-mobile">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  Sale Completed!
                </h5>
              </div>
              <div className="modal-body text-center py-4">
                <i className="bi bi-check-circle display-1 text-success mb-3 d-block"></i>
                <h4>RS{lastSaleTotal.toFixed(0)}</h4>
                {lastSaleChange > 0 && (
                  <p className="text-success fw-bold">
                    Change: RS{lastSaleChange.toFixed(0)}
                  </p>
                )}
                <p className="text-muted">Sale ID: #{getShortSaleId()}</p>
              </div>
              <div className="modal-footer justify-content-center gap-3">
                <button
                  className="btn btn-success btn-lg px-4"
                  onClick={handlePrintReceipt}
                >
                  <i className="bi bi-printer me-2"></i> Print
                </button>
                <button
                  className="btn btn-outline-primary btn-lg px-4"
                  onClick={resetAfterSale}
                >
                  New Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT */}
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
          <p style={{ margin: "0" }}>{shopSettings?.address || "Main Bazar"}</p>
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
            <p style={{ margin: "8px 0" }}>Subtotal: RS{subtotal.toFixed(0)}</p>
            {discount > 0 && (
              <p style={{ margin: "8px 0" }}>
                Discount: -RS{globalDiscountAmount.toFixed(0)}
              </p>
            )}
            {serviceCharge > 0 && (
              <p style={{ margin: "8px 0" }}>
                Service: RS{serviceCharge.toFixed(0)}
              </p>
            )}
            {tax > 0 && (
              <p style={{ margin: "8px 0" }}>Tax: RS{tax.toFixed(0)}</p>
            )}
            <p style={{ margin: "8px 0" }}>
              Total: RS{lastSaleTotal.toFixed(0)}
            </p>
          </div>

          <hr style={{ border: "dashed 1px #000", margin: "20px 0" }} />
          <p style={{ margin: "0", fontSize: "13px" }}>
            Thank You for Shopping!
          </p>
        </div>
      </div>
    </div>
  );
}