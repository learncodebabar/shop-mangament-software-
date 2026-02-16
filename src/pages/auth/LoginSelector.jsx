import { Link } from "react-router-dom";

const LoginSelector = () => {
  return (
    <div className="container">
      <div
        className="row justify-content-center align-items-center"
        style={{ minHeight: "100vh" }}
      >
        <div className="col-md-8">
          <div className="text-center mb-5">
            <h1 className="display-4 mb-3">Shop Management System</h1>
            <p className="text-muted">Choose your login type</p>
          </div>

          <div className="row g-4">
            <div className="col-md-6">
              <Link to="/owner-login" className="text-decoration-none">
                <div className="card shadow-sm h-100 hover-card">
                  <div className="card-body p-5 text-center">
                    <i
                      className="bi bi-shield-check text-primary"
                      style={{ fontSize: "4rem" }}
                    ></i>
                    <h3 className="mt-4">Owner Login</h3>
                    <p className="text-muted">
                      Access all features and settings
                    </p>
                  </div>
                </div>
              </Link>
            </div>

            <div className="col-md-6">
              <Link to="/employee-login" className="text-decoration-none">
                <div className="card shadow-sm h-100 hover-card">
                  <div className="card-body p-5 text-center">
                    <i
                      className="bi bi-person-badge text-success"
                      style={{ fontSize: "4rem" }}
                    ></i>
                    <h3 className="mt-4">Employee Login</h3>
                    <p className="text-muted">Manager, Cashier, Stock Keeper</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSelector;
