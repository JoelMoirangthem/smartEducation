import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import AuthLayout, { AuthField } from "../components/AuthLayout";

const LoginAdmin = () => {
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
                body: JSON.stringify({ email, password, role: "admin" }),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("user", JSON.stringify(data.user));
                window.location.href = "/admin/dashboard";
            } else {
                setError(data.message || "Login failed");
            }
        } catch {
            setError("Network error. Please try again.");
        } finally { setLoading(false); }
    };

    return (
        <AuthLayout
            title="Admin Sign In"
            subtitle="Access the institution control panel and settings"
            accentColor="#f43f5e"
            accentGlow="rgba(244,63,94,0.45)"
            Icon={ShieldCheck}
            role="admin"
            onSubmit={handleLogin}
            loading={loading}
            error={error}
        >
            <AuthField label="Email address" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" accentColor="#f43f5e" />
            <AuthField label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" accentColor="#f43f5e" />
        </AuthLayout>
    );
};

export default LoginAdmin;
