import { useState } from "react";
import { GraduationCap } from "lucide-react";
import AuthLayout, { AuthField } from "../components/AuthLayout";
import api from "../services/api";

const LoginStudent = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            const { data } = await api.post("/auth/login", { email, password, role: "student" });
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            window.location.href = "/dashboard";
        } catch (err) {
            setError(err.response?.data?.message || "Login failed. Please try again.");
        } finally { setLoading(false); }
    };

    return (
        <AuthLayout
            title="Student Sign In"
            subtitle="Access your dashboard, marks, notes and AI coach"
            accentColor="#6366f1"
            accentGlow="rgba(99,102,241,0.45)"
            Icon={GraduationCap}
            role="student"
            onSubmit={handleLogin}
            loading={loading}
            error={error}
        >
            <AuthField label="Email address" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com" accentColor="#6366f1" />
            <AuthField label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" accentColor="#6366f1" />
        </AuthLayout>
    );
};

export default LoginStudent;
