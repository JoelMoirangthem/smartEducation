import React from "react";
import { ThemeProvider } from './context/ThemeContext';
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import LoginRoleSelection from "./pages/LoginRoleSelection";
import LoginTeacher from "./pages/LoginTeacher";
import LoginStudent from "./pages/LoginStudent";
import LoginAdmin from "./pages/LoginAdmin";
import RegisterTeacher from "./pages/RegisterTeacher";
import RegisterStudent from "./pages/RegisterStudent";
import RegisterAdmin from "./pages/RegisterAdmin";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Notes from "./pages/Notes";
import Attendance from "./pages/Attendance";
import Marks from "./pages/Marks";
import Notices from "./pages/Notices";
import Chat from "./pages/Chat";
import FaceRegister from "./pages/FaceRegister";
import FaceAttendance from "./pages/FaceAttendance";
import VideoAttendance from "./pages/VideoAttendance";
import ProtectedRoute from "./routes/ProtectedRoute";
import SidebarLayout from "./components/SidebarLayout";
import PreLoginLayout from "./components/PreLoginLayout";
import PrivateLayout from "./components/PrivateLayout";
import { ToastContainer } from 'react-toastify';

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageAcademic from "./pages/admin/ManageAcademic";
import ManageUsers from "./pages/admin/ManageUsers";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
        <Routes>
          {/* Public Authentication Routes */}
          <Route element={<PreLoginLayout />}>
            <Route path="/" element={<LoginRoleSelection />} />
            <Route path="login/teacher" element={<LoginTeacher />} />
            <Route path="login/student" element={<LoginStudent />} />
            <Route path="login/admin" element={<LoginAdmin />} />
            <Route path="register/teacher" element={<RegisterTeacher />} />
            <Route path="register/student" element={<RegisterStudent />} />
            <Route path="register/admin" element={<RegisterAdmin />} />
          </Route>

          {/* Protected Routes with Sidebar Navigation */}
          <Route element={<PrivateLayout />}>
            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route element={<SidebarLayout />}>
                <Route path="admin/dashboard" element={<AdminDashboard />} />
                <Route path="admin/academic" element={<ManageAcademic />} />
                <Route path="admin/users" element={<ManageUsers />} />
              </Route>
            </Route>

            {/* Routes accessible by Teacher, Student, and Admin */}
            <Route element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']} />}>
              <Route element={<SidebarLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="notices" element={<Notices />} />
                <Route path="chat" element={<Chat />} />
              </Route>
            </Route>

            {/* Routes accessible ONLY by Teacher and Student */}
            <Route element={<ProtectedRoute allowedRoles={['teacher', 'student']} />}>
              <Route element={<SidebarLayout />}>
                <Route path="attendance" element={<Attendance />} />
                <Route path="notes" element={<Notes />} />
                <Route path="marks" element={<Marks />} />
              </Route>
            </Route>

            {/* Student-only: Face Registration */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="face-register" element={<FaceRegister />} />
            </Route>

            {/* Teacher-only: Face Attendance */}
            <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
              <Route path="face-attendance" element={<FaceAttendance />} />
              <Route path="video-attendance/:sessionId" element={<VideoAttendance />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
