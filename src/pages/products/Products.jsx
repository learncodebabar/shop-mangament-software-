import { useState, useEffect } from "react";
import api from "../../api/api";
import Barcode from "react-barcode";
import { API_ENDPOINTS } from "../../api/EndPoints";
import { useNotifications } from "../../context/NotificationContext";
import "./product.css";
import { VITE_BACKEND_URL } from "../../config/config";
export default function Products() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 25;

  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    category: "",
    supplier: "",
    location: "",
    stock: 0,
    costPrice: 0,
    salePrice: 0,
    minStockAlert: 10,
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // Alert toast state
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });

  const { addNotification } = useNotifications();

  // Auto-hide alert after 2 seconds
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
    fetchProducts();
    fetchCategories();
    fetchLocations();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.PRODUCTS);
      const productsData = res.data.products || res.data || [];
      console.log("Fetched products:", productsData);
      setProducts(productsData);
      setFilteredProducts(productsData);
      setLoading(false);
    } catch (err) {
      console.error("Error loading products:", err);
      notify("error", "Error loading products");
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.CATEGORIES);
      setCategories(res.data.filter((c) => c.isActive) || []);
    } catch (err) {
      console.error("Failed to load categories");
    }
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.LOCATIONS);
      setLocations(res.data.filter((l) => l.isActive) || []);
    } catch (err) {
      console.error("Failed to load locations");
    }
  };

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.name?.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.barcode?.includes(query) ||
        p.category?.toLowerCase().includes(query),
    );
    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchQuery, products]);

  const indexOfLast = currentPage * productsPerPage;
  const indexOfFirst = indexOfLast - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const paginate = (page) => setCurrentPage(page);

  const generateBarcode = () => {
    let code = Math.floor(Math.random() * 900000000000) + 100000000000;
    code = code.toString();
    let sum = 0;
    for (let i = 0; i < 12; i++)
      sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    const checksum = (10 - (sum % 10)) % 10;
    return code + checksum;
  };

  // Notification helper function
  const notify = (type, message) => {
    setAlert({ show: true, type, message });
    addNotification(type, message);
  };

  // CSV EXPORT FUNCTION
  const exportToCSV = () => {
    if (products.length === 0) {
      notify("warning", "No products to export");
      return;
    }

    let csvContent = "Products Inventory Report\n\n";

    // Headers
    csvContent +=
      "ID,Name,SKU,Barcode,Category,Location,Supplier,Stock,Cost Price,Sale Price,Min Stock Alert,Inventory Value,Reorder Status\n";

    // Data rows
    products.forEach((product, index) => {
      const minAlert = product.minStockAlert ?? 10;
      const currentStock = product.stock ?? 0;
      const needsReorder = currentStock <= minAlert;
      const inventoryValue = currentStock * (product.costPrice ?? 0);

      csvContent += `${index + 1},"${product.name || ""}",${product.sku || ""},${product.barcode || ""},"${product.category || "All"}","${product.location || "All"}","${product.supplier || ""}",${currentStock},RS${(product.costPrice ?? 0).toFixed(2)},RS${(product.salePrice ?? 0).toFixed(2)},${minAlert},RS${inventoryValue.toFixed(2)},${needsReorder ? "Yes" : "No"}\n`;
    });

    // Create and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `products_inventory_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notify("success", "Products exported successfully!");
  };

  // PRINT SINGLE BARCODE
  const printSingleBarcode = (product) => {
    if (!product.barcode) {
      notify("warning", "This product doesn't have a barcode");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      notify("warning", "Please allow popups for printing");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Barcode - ${product.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          .barcode-container {
            text-align: center;
            border: 2px solid #000;
            padding: 20px;
            border-radius: 10px;
            background: white;
          }
          .product-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #333;
          }
          .product-info {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
          }
          .barcode-wrapper {
            margin: 20px 0;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div class="barcode-container">
          <div class="product-name">${product.name}</div>
          <div class="product-info">SKU: ${product.sku || "N/A"} | Price: RS${product.salePrice || 0}</div>
          <div class="barcode-wrapper">
            <svg id="barcode"></svg>
          </div>
        </div>
        <script>
          JsBarcode("#barcode", "${product.barcode}", {
            format: "EAN13",
            width: 2,
            height: 100,
            displayValue: true,
            fontSize: 16
          });
          setTimeout(() => window.print(), 500);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // PRINT ALL BARCODES
  const printAllBarcodes = () => {
    const productsWithBarcodes = products.filter(
      (p) => p.barcode && p.barcode.length === 13,
    );

    if (productsWithBarcodes.length === 0) {
      notify("warning", "No products with valid barcodes found");
      return;
    }

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>All Product Barcodes</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #000;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            color: #333;
          }
          .header p {
            margin: 5px 0;
            color: #666;
          }
          .barcodes-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            page-break-inside: avoid;
          }
          .barcode-item {
            border: 2px solid #ddd;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            background: #fff;
            page-break-inside: avoid;
          }
          .product-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #333;
          }
          .product-details {
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
          }
          .barcode-wrapper {
            margin: 10px 0;
          }
          @media print {
            body { padding: 10px; }
            .barcodes-grid { gap: 15px; }
          }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
      </head>
      <body>
        <div class="header">
          <h1>Product Barcodes List</h1>
          <p>Total Products: ${productsWithBarcodes.length}</p>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        <div class="barcodes-grid">
          ${productsWithBarcodes
            .map(
              (product, index) => `
            <div class="barcode-item">
              <div class="product-name">${product.name}</div>
              <div class="product-details">
                SKU: ${product.sku || "N/A"} | 
                Category: ${product.category || "All"} | 
                Price: RS${product.salePrice || 0}
              </div>
              <div class="barcode-wrapper">
                <svg id="barcode-${index}"></svg>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
        <script>
          ${productsWithBarcodes
            .map(
              (product, index) => `
            JsBarcode("#barcode-${index}", "${product.barcode}", {
              format: "EAN13",
              width: 2,
              height: 80,
              displayValue: true,
              fontSize: 14
            });
          `,
            )
            .join("\n")}
          setTimeout(() => window.print(), 1000);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let barcodeValue = formData.barcode.trim() || generateBarcode();

    const data = new FormData();
    data.append("name", formData.name);
    data.append("sku", formData.sku);
    data.append("barcode", barcodeValue);

    if (formData.category.trim()) {
      data.append("category", formData.category.trim());
    }

    data.append("supplier", formData.supplier);

    if (formData.location.trim()) {
      data.append("location", formData.location.trim());
    }

    data.append("stock", formData.stock);
    data.append("costPrice", formData.costPrice);
    data.append("salePrice", formData.salePrice);
    data.append("minStockAlert", formData.minStockAlert);
    if (imageFile) data.append("image", imageFile);

    try {
      if (editingProduct) {
        await api.put(API_ENDPOINTS.PRODUCT_BY_ID(editingProduct._id), data);
        notify("success", "Product updated successfully!");
      } else {
        await api.post(API_ENDPOINTS.PRODUCTS, data);
        notify("success", "Product added successfully!");
      }
      setShowModal(false);
      resetForm();
      await fetchProducts();
    } catch (err) {
      notify("error", err.response?.data?.message || "Failed to save product");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(API_ENDPOINTS.PRODUCT_BY_ID(id));
      notify("success", "Product deleted successfully!");
      await fetchProducts();
    } catch (err) {
      notify("error", "Failed to delete product");
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      category: product.category || "",
      supplier: product.supplier || "",
      location: product.location || "",
      stock: product.stock ?? 0,
      costPrice: product.costPrice ?? 0,
      salePrice: product.salePrice ?? 0,
      minStockAlert: product.minStockAlert ?? 10,
    });
    setImagePreview(
      product.image
        ? `${VITE_BACKEND_URL}${product.image}`
        : "",
    );
    setImageFile(null);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "",
      barcode: "",
      category: "",
      supplier: "",
      location: "",
      stock: 0,
      costPrice: 0,
      salePrice: 0,
      minStockAlert: 10,
    });
    setImageFile(null);
    setImagePreview("");
  };

 const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Remove any leading /api if it exists in the path
    const cleanPath = imagePath.replace(/^\/api/, '');
    
    // Ensure the path starts with a slash
    const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    
    return `${VITE_BACKEND_URL}${normalizedPath}`;
  };


  return (
    <div className="container-fluid">
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

      <div className="d-flex justify-content-between align-items-center mb-4 product-head">
        <h2 className="product-heading">Products / Inventory</h2>
        <div className="d-flex gap-2 product-header">
          <button
            className="btn btn-success csv-btn"
            onClick={exportToCSV}
            disabled={products.length === 0}
            style={{ width: "208px" }}
          >
            <i className="bi bi-download me-2"></i> Export CSV
          </button>
          <button
            className="btn btn-info text-white barcode-btn"
            onClick={printAllBarcodes}
            disabled={products.filter((p) => p.barcode).length === 0}
          >
            <i className="bi bi-upc-scan me-2"></i> Print All Barcodes
          </button>
          <button
            className="btn add-btn bg-primary text-white add-btn"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <i className="bi bi-plus-circle me-2 text-white"></i> Add New
            Product
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS - Purchase & Inventory Report */}
      <div className="row g-3 mb-4">
        {/* Total Products */}
        <div className="col-md-4 col-lg-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="rounded-circle bg-primary bg-opacity-10 p-2">
                  <i className="bi bi-box-seam text-primary fs-5"></i>
                </div>
                <span className="badge bg-primary">Total</span>
              </div>
              <h3 className="mb-1 fw-bold">{products.length}</h3>
              <p className="text-muted small mb-0">Total Products</p>
            </div>
          </div>
        </div>

        {/* Total Purchase Value (Cost Price) */}
        <div className="col-md-4 col-lg-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="rounded-circle bg-warning bg-opacity-10 p-2">
                  <i className="bi bi-cash-stack text-warning fs-5"></i>
                </div>
                <span className="badge bg-warning text-dark">Purchase</span>
              </div>
              <h3 className="mb-1 fw-bold">
                RS{" "}
                {products
                  .reduce(
                    (sum, p) => sum + (p.stock ?? 0) * (p.costPrice ?? 0),
                    0,
                  )
                  .toLocaleString()}
              </h3>
              <p className="text-muted small mb-0">Total Purchase Value</p>
            </div>
          </div>
        </div>

        {/* Total Stock Units */}
        <div className="col-md-4 col-lg-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="rounded-circle bg-info bg-opacity-10 p-2">
                  <i className="bi bi-boxes text-info fs-5"></i>
                </div>
                <span className="badge bg-info">Units</span>
              </div>
              <h3 className="mb-1 fw-bold">
                {products
                  .reduce((sum, p) => sum + (p.stock ?? 0), 0)
                  .toLocaleString()}
              </h3>
              <p className="text-muted small mb-0">Total Stock Units</p>
            </div>
          </div>
        </div>

        {/* Total Inventory Value (Sale Price) */}
        <div className="col-md-4 col-lg-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="rounded-circle bg-success bg-opacity-10 p-2">
                  <i className="bi bi-currency-dollar text-success fs-5"></i>
                </div>
                <span className="badge bg-success">Inventory</span>
              </div>
              <h3 className="mb-1 fw-bold">
                RS{" "}
                {products
                  .reduce(
                    (sum, p) => sum + (p.stock ?? 0) * (p.salePrice ?? 0),
                    0,
                  )
                  .toLocaleString()}
              </h3>
              <p className="text-muted small mb-0">Inventory Value</p>
            </div>
          </div>
        </div>

        {/* Expected Profit */}
        <div className="col-md-4 col-lg-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="rounded-circle bg-success bg-opacity-10 p-2">
                  <i className="bi bi-graph-up-arrow text-success fs-5"></i>
                </div>
                <span className="badge bg-success">Profit</span>
              </div>
              <h3 className="mb-1 fw-bold">
                RS{" "}
                {(
                  products.reduce(
                    (sum, p) => sum + (p.stock ?? 0) * (p.salePrice ?? 0),
                    0,
                  ) -
                  products.reduce(
                    (sum, p) => sum + (p.stock ?? 0) * (p.costPrice ?? 0),
                    0,
                  )
                ).toLocaleString()}
              </h3>
              <p className="text-muted small mb-0">Expected Profit</p>
            </div>
          </div>
        </div>

        {/* Products Needing Reorder */}
        <div className="col-md-4 col-lg-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <div className="rounded-circle bg-danger bg-opacity-10 p-2">
                  <i className="bi bi-exclamation-triangle text-danger fs-5"></i>
                </div>
                <span className="badge bg-danger">Alert</span>
              </div>
              <h3 className="mb-1 fw-bold">
                {
                  products.filter(
                    (p) => (p.stock ?? 0) <= (p.minStockAlert ?? 10),
                  ).length
                }
              </h3>
              <p className="text-muted small mb-0">Need Reorder</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="position-relative">
            <input
              type="text"
              className="form-control form-control-lg ps-5 rounded-pill"
              placeholder="Search by name, SKU, barcode or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm table-bordered table-hover mb-0 align-middle">
              <thead className="bg-light text-muted small text-uppercase">
                <tr>
                  <th className="px-2 py-1">ID</th>
                  <th className="px-2 py-1">Product</th>
                  <th className="px-2 py-1">Name</th>
                  <th className="px-2 py-1 text-center">Price</th>
                  <th className="px-2 py-1 text-center">Location</th>
                  <th className="px-2 py-1 text-center">Stock</th>
                  <th className="px-2 py-1 text-center">Value</th>
                  <th className="px-2 py-1 text-center">Reorder</th>
                  <th className="px-2 py-1 text-center">Level</th>
                  <th className="px-2 py-1 text-center">Category</th>
                  <th className="px-2 py-1 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="small">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary" />
                    </td>
                  </tr>
                ) : currentProducts.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-5 text-muted">
                      No products found
                    </td>
                  </tr>
                ) : (
                  currentProducts.map((product, index) => {
                    const globalIndex = indexOfFirst + index + 1;

                    const minAlert = product.minStockAlert ?? 10;
                    const currentStock = product.stock ?? 0;

                    const needsReorder = currentStock <= minAlert;
                    const inventoryValue =
                      currentStock * (product.costPrice ?? 0);

                    return (
                      <tr key={product._id}>
                        <td className="px-2 py-1 text-muted">#{globalIndex}</td>
                        <td className="px-2 py-1">
                          <div className="d-flex align-items-center gap-2">
                            {product.image ? (
                              <img
                               src={getImageUrl(product.image)}
                                alt={product.name}
                                className="rounded border"
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <div
                                className="bg-light border rounded d-flex align-items-center justify-content-center"
                                style={{ width: "30px", height: "30px" }}
                              >
                                <i className="bi bi-image text-muted small"></i>
                              </div>
                            )}
                            <div className="lh-sm">
                              <div className="fw-medium">
                                {product.name || "#N/A"}
                              </div>
                              <small className="text-muted">
                                SKU: {product.sku || "—"}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1">{product.name || "#N/A"}</td>
                        <td className="px-2 py-1 text-center">
                          RS {product.salePrice?.toLocaleString() || "—"}
                        </td>
                        <td className="px-2 py-1 text-center">
                          <span className="badge bg-warning text-dark px-2 py-0">
                             {locations.find(l => l._id === product.location)?.name || product.location || "All"}
                          </span>
                        </td>
                        <td
                          className="px-2 py-1 text-center fw-semibold"
                          style={{
                            color: needsReorder ? "#dc3545" : "inherit",
                          }}
                        >
                          {currentStock}
                        </td>
                        <td className="px-2 py-1 text-center">
                          RS {inventoryValue.toFixed(0)}
                        </td>
                        <td className="px-2 py-1 text-center">
                          <span
                            className={`badge ${needsReorder ? "bg-danger" : "bg-success"} px-2 py-0`}
                          >
                            {needsReorder ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-center">{minAlert}</td>
                        <td className="px-2 py-1 text-center">
                            {categories.find(c => c._id === product.category)?.name || product.category || "All"}
                          </td>
                        <td className="px-2 py-1 text-end">
                          {product.barcode && (
                            <button
                              className="btn btn-xs btn-outline-info me-1"
                              onClick={() => printSingleBarcode(product)}
                              title="Print Barcode"
                            >
                              <i className="bi bi-upc-scan"></i>
                            </button>
                          )}
                          <button
                            className="btn btn-xs btn-outline-primary me-1"
                            onClick={() => openEditModal(product)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-xs btn-outline-danger"
                            onClick={() => handleDelete(product._id)}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="card-footer bg-light">
              <div className="d-flex justify-content-between align-items-center py-2">
                <div className="text-muted small">
                  Showing {indexOfFirst + 1} to{" "}
                  {Math.min(indexOfLast, filteredProducts.length)} of{" "}
                  {filteredProducts.length}
                </div>
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li
                      className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                    >
                      <button
                        className="page-link"
                        onClick={() => paginate(currentPage - 1)}
                      >
                        Prev
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <li
                        key={i + 1}
                        className={`page-item ${currentPage === i + 1 ? "active" : ""}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => paginate(i + 1)}
                        >
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li
                      className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
                    >
                      <button
                        className="page-link"
                        onClick={() => paginate(currentPage + 1)}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingProduct ? "Edit Product" : "Add New Product"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Product Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">SKU</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.sku}
                        onChange={(e) =>
                          setFormData({ ...formData, sku: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Barcode</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Auto generate if empty"
                        value={formData.barcode}
                        onChange={(e) =>
                          setFormData({ ...formData, barcode: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary mt-2 w-100"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            barcode: generateBarcode(),
                          })
                        }
                      >
                        Generate
                      </button>
                    </div>

                    {formData.barcode && formData.barcode.length === 13 && (
                      <div className="col-12 text-center mt-3">
                        <Barcode
                          value={formData.barcode}
                          width={2}
                          height={100}
                          fontSize={16}
                        />
                      </div>
                    )}

                    <div className="col-md-4">
                      <label className="form-label">Category</label>
                      <select
                        className="form-select"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                      >
                        <option value="">All</option>
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Supplier</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.supplier}
                        onChange={(e) =>
                          setFormData({ ...formData, supplier: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Location</label>
                      <select
                        className="form-select"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData({ ...formData, location: e.target.value })
                        }
                      >
                        <option value="">All</option>
                        {locations.map((loc) => (
                          <option key={loc._id} value={loc.name}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Current Stock</label>
                      <input
                        type="number"
                        className="form-control"
                        required
                        value={formData.stock}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            stock: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Cost Price</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        required
                        value={formData.costPrice}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            costPrice: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Sale Price</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        required
                        value={formData.salePrice}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            salePrice: Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label">Low Stock Alert</label>
                      <input
                        type="number"
                        className="form-control"
                        value={formData.minStockAlert}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            minStockAlert: Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label">Product Image</label>
                      <input
                        type="file"
                        className="form-control"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                      {imagePreview && (
                        <div className="mt-3 text-center">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="img-fluid rounded border"
                            style={{ maxHeight: "250px" }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingProduct ? "Update" : "Add"} Product
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
