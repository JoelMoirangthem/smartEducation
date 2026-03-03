import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function ProtectedRoute({ allowedRoles }) {
    const token = localStorage.getItem("token");

    if (!token) {
        return <Navigate to="/" />;
    }

    try {
        const decoded = jwtDecode(token);
        if (allowedRoles && !allowedRoles.includes(decoded.role)) {
            // Role not allowed, redirect to dashboard or home
            return <Navigate to="/dashboard" replace />;
        }
    } catch (error) {
        console.error("Invalid token:", error);
        localStorage.removeItem("token");
        return <Navigate to="/" />;
    }

    return <Outlet />;
}

export default ProtectedRoute;
