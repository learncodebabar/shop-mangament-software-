import { useState, useEffect } from "react";

import { useNotifications } from "../../context/NotificationContext";
import api from "../../api/api";
import { API_ENDPOINTS } from "../../api/EndPoints";
import "./category.css";
export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: "", isActive: true });

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
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.CATEGORIES);
      const data = res.data || [];
      setCategories(data);
      setFilteredCategories(data);
      setLoading(false);
    } catch (err) {
      notify("error", "Failed to load categories");
      setLoading(false);
    }
  };

  // Search
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    const filtered = categories.filter((c) =>
      c.name?.toLowerCase().includes(query),
    );
    setFilteredCategories(filtered);
    setCurrentPage(1);
  }, [searchQuery, categories]);

  // Pagination
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentCats = filteredCategories.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

  const notify = (type, message) => {
    setAlert({ show: true, type, message });
    addNotification(type, message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim())
      return notify("error", "Category name is required");

    try {
      let updatedCategory;

      if (editingCategory) {
        // Edit category
        const res = await api.put(
          API_ENDPOINTS.UPDATE_CATEGORY(editingCategory._id),
          formData,
        );
        updatedCategory = res.data;

        // Update local state
        setCategories(
          categories.map((c) =>
            c._id === editingCategory._id ? updatedCategory : c,
          ),
        );

        notify("success", `Category "${updatedCategory.name}" updated!`);
      } else {
        // Add new category
        const res = await api.post(API_ENDPOINTS.CATEGORIES, formData);
        updatedCategory = res.data;

        setCategories([...categories, updatedCategory]);
        notify("success", `Category "${updatedCategory.name}" added!`);
      }

      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error("Category operation error:", err);
      notify("error", err.response?.data?.message || "Operation failed");
    }
  };

  const handleToggleActive = async (id, name, currentStatus) => {
    try {
      const res = await api.patch(API_ENDPOINTS.TOGGLE_CATEGORY(id), {
        isActive: !currentStatus,
      });
      setCategories(categories.map((c) => (c._id === id ? res.data : c)));
      notify(
        "success",
        `Category "${name}" ${res.data.isActive ? "activated" : "deactivated"}`,
      );
    } catch (err) {
      notify("error", "Failed to update status");
    }
  };

  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `Delete category "${name}"? Products will lose this category.`,
      )
    )
      return;
    try {
      await api.delete(API_ENDPOINTS.DELETE_CATEGORY(id));
      setCategories(categories.filter((c) => c._id !== id));
      notify("success", `Category "${name}" deleted`);
    } catch (err) {
      notify("error", "Delete failed");
    }
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, isActive: cat.isActive });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({ name: "", isActive: true });
  };

  return (
    <div className="container-fluid py-4 position-relative">
      {/* TOP ALERT */}
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
            } me-2`}
          ></i>
          {alert.message}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Category Management</h2>
        <button
          className="btn bg-primary text-white rounded-pill px-4 shadow-sm cate-btn"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          <i className="bi bi-plus-circle me-2"></i> Add Category
        </button>
      </div>

      {/* Search */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body py-3">
          <div className="position-relative">
            <input
              type="text"
              className="form-control form-control-lg ps-5 rounded-pill"
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
          </div>
        </div>
      </div>

      {/* Categories Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm table-hover mb-0 align-middle">
              <thead className="bg-light text-muted small text-uppercase">
                <tr>
                  <th className="ps-3 py-2">ID</th>
                  <th className="py-2">Category Name</th>
                  <th className="py-2 text-center">Status</th>
                  <th className="py-2 text-center">Products</th>
                  <th className="py-2 text-end pe-3">Actions</th>
                </tr>
              </thead>
              <tbody className="small">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      <div className="spinner-border spinner-border-sm text-primary" />
                    </td>
                  </tr>
                ) : currentCats.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5 text-muted">
                      No categories found
                    </td>
                  </tr>
                ) : (
                  currentCats.map((cat, index) => {
                    const globalIndex = indexOfFirst + index + 1;
                    return (
                      <tr key={cat._id}>
                        <td className="ps-3 py-2 text-muted">#{globalIndex}</td>
                        <td className="py-2 fw-medium">{cat.name}</td>
                        <td className="py-2 text-center">
                          <span
                            className={`badge ${
                              cat.isActive ? "bg-success" : "bg-secondary"
                            } px-3 py-1`}
                          >
                            {cat.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-2 text-center">
                          {cat.productCount || 0}
                        </td>
                        <td className="py-2 text-end pe-3">
                          <button
                            className="btn btn-sm btn-outline-success me-2"
                            onClick={() =>
                              handleToggleActive(
                                cat._id,
                                cat.name,
                                cat.isActive,
                              )
                            }
                          >
                            <i
                              className={`bi ${
                                cat.isActive ? "bi-toggle-on" : "bi-toggle-off"
                              }`}
                            ></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary me-1"
                            onClick={() => openEditModal(cat)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(cat._id, cat.name)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer bg-light">
              <div className="d-flex justify-content-between align-items-center py-2">
                <div className="text-muted small">
                  Showing {indexOfFirst + 1} to{" "}
                  {Math.min(indexOfLast, filteredCategories.length)} of{" "}
                  {filteredCategories.length}
                </div>
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li
                      className={`page-item ${
                        currentPage === 1 ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                      >
                        Prev
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <li
                        key={i + 1}
                        className={`page-item ${
                          currentPage === i + 1 ? "active" : ""
                        }`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </button>
                      </li>
                    ))}
                    <li
                      className={`page-item ${
                        currentPage === totalPages ? "disabled" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1),
                          )
                        }
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <form onSubmit={handleSubmit}>
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    <i className="bi bi-tag-fill me-2"></i>
                    {editingCategory ? "Edit Category" : "Add New Category"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      Category Name *
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="activeSwitch"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                    />
                    <label
                      className="form-check-label fw-medium"
                      htmlFor="activeSwitch"
                    >
                      Active Category
                    </label>
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
                  <button type="submit" className="btn btn-primary px-4">
                    {editingCategory ? "Update" : "Add"} Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
