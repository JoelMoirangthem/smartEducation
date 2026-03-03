import { useState } from "react";
import { Presentation } from "lucide-react";
import AuthLayout, { AuthField } from "../components/AuthLayout";

const LoginTeacher = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            const res = await fetch("http://localhost:5000/api/v1/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role: "teacher" }),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                window.location.href = "/dashboard";
            } else {
                setError(data.message || "Login failed");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally { setLoading(false); }
    };

    return (
        <AuthLayout
            title="Educator Sign In"
            subtitle="Manage your classes, marks, attendance, and more"
            accentColor="#06b6d4"
            accentGlow="rgba(6,182,212,0.45)"
            Icon={Presentation}
            role="teacher"
            onSubmit={handleLogin}
            loading={loading}
            error={error}
        >
            <AuthField label="Email address" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teacher@example.com" accentColor="#06b6d4" />
            <AuthField label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" accentColor="#06b6d4" />
        </AuthLayout>
    );
};

export default LoginTeacher;
