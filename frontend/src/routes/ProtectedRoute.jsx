import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

function ProtectedRoute({ allowedRoles }) {
    const token = localStorage.getItem("token");

    if (!token) {
        return <Navigate to="/" />;
    }

    let outcome = null; // 'denied' | 'invalid'
    try {
        const decoded = jwtDecode(token);
        if (allowedRoles && !allowedRoles.includes(decoded.role)) {
            // Role not allowed, redirect to dashboard or home
            outcome = 'denied';
        }
    } catch (error) {
        console.error("Invalid token:", error);
        localStorage.removeItem("token");
        outcome = 'invalid';
    }

    if (outcome === 'invalid') {
        return <Navigate to="/" />;
    }
    if (outcome === 'denied') {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}

export default ProtectedRoute;