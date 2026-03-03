import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Dashboard from "../pages/Dashboard";
import Login from "../pages/Login"; // Keeping original login for fallback/reference if needed
import Layout from "../components/Layout";
import LoginRoleSelection from "../pages/LoginRoleSelection";
import LoginAdmin from "../pages/LoginAdmin";
import RegisterAdmin from "../pages/RegisterAdmin";
import LoginTeacher from "../pages/LoginTeacher";
import RegisterTeacher from "../pages/RegisterTeacher";
import LoginStudent from "../pages/LoginStudent";
import RegisterStudent from "../pages/RegisterStudent";
import Profile from "../pages/Profile";
import Notifications from "../pages/Notifications";
import Notes from "../pages/Notes";
import MarksUpload from "../pages/MarksUpload";
import NoticeCreate from "../pages/NoticeCreate";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LoginRoleSelection />} />
          <Route path="login/admin" element={<LoginAdmin />} />
          <Route path="register/admin" element={<RegisterAdmin />} />
          <Route path="login/teacher" element={<LoginTeacher />} />
          <Route path="register/teacher" element={<RegisterTeacher />} />
          <Route path="login/student" element={<LoginStudent />} />
          <Route path="register/student" element={<RegisterStudent />} />
        </Route>

        {/* Protected Routes with Layout */}
        <Route element={<Layout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes"
            element={
              <ProtectedRoute>
                <Notes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marks/upload"
            element={
              <ProtectedRoute>
                <MarksUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notice/create"
            element={
              <ProtectedRoute>
                <NoticeCreate />
              </ProtectedRoute>
            }
          />
        </Route>
        {/* Kept specifically if you want direct access, otherwise accessible via role selection */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
