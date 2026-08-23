import React, { Suspense, lazy } from "react";
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import PageLoader from "./components/PageLoader";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastContainer } from 'react-toastify';
const PreLoginLayout = lazy(() => import("./components/PreLoginLayout"));
const PrivateLayout = lazy(() => import("./components/PrivateLayout"));
const SidebarLayout = lazy(() => import("./components/SidebarLayout"));

// Lazy — each page split into its own chunk (vercel bundle- dynamic imports)
const LoginRoleSelection = lazy(() => import("./pages/LoginRoleSelection"));
const LoginTeacher = lazy(() => import("./pages/LoginTeacher"));
const LoginStudent = lazy(() => import("./pages/LoginStudent"));
const LoginAdmin = lazy(() => import("./pages/LoginAdmin"));
const RegisterAdmin = lazy(() => import("./pages/RegisterAdmin"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Notes = lazy(() => import("./pages/Notes"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Marks = lazy(() => import("./pages/Marks"));
const Notices = lazy(() => import("./pages/Notices"));
const Chat = lazy(() => import("./pages/Chat"));
const FaceRegister = lazy(() => import("./pages/FaceRegister"));
const FaceAttendance = lazy(() => import("./pages/FaceAttendance"));
const VideoAttendance = lazy(() => import("./pages/VideoAttendance"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ManageAcademic = lazy(() => import("./pages/admin/ManageAcademic"));
const ManageUsers = lazy(() => import("./pages/admin/ManageUsers"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <ToastContainer
                position="top-right"
                autoClose={4000}
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
                {/* Public */}
                <Route element={<PreLoginLayout />}>
                  <Route path="/" element={<LoginRoleSelection />} />
                  <Route path="login/teacher" element={<LoginTeacher />} />
                  <Route path="login/student" element={<LoginStudent />} />
                  <Route path="login/admin" element={<LoginAdmin />} />
                  <Route path="register/admin" element={<RegisterAdmin />} />
                </Route>

                {/* Protected */}
                <Route element={<PrivateLayout />}>
                  <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                    <Route element={<SidebarLayout />}>
                      <Route path="admin/dashboard" element={<AdminDashboard />} />
                      <Route path="admin/academic" element={<ManageAcademic />} />
                      <Route path="admin/users" element={<ManageUsers />} />
                    </Route>
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']} />}>
                    <Route element={<SidebarLayout />}>
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="profile" element={<Profile />} />
                      <Route path="notices" element={<Notices />} />
                      <Route path="chat" element={<Chat />} />
                    </Route>
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['teacher', 'student']} />}>
                    <Route element={<SidebarLayout />}>
                      <Route path="attendance" element={<Attendance />} />
                      <Route path="notes" element={<Notes />} />
                      <Route path="marks" element={<Marks />} />
                    </Route>
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                    <Route path="face-register" element={<FaceRegister />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
                    <Route path="face-attendance" element={<FaceAttendance />} />
                    <Route path="video-attendance/:sessionId" element={<VideoAttendance />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
