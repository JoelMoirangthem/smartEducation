import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import AuthLayout, { AuthField } from "../components/AuthLayout";

const RegisterAdmin = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            const res = await fetch("http://localhost:5000/api/v1/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, role: "admin" }),
            });
            const data = await res.json();
            if (res.ok) { navigate("/login/admin"); }
            else { setError(data.message || "Registration failed"); }
        } catch {
            setError("Network error. Please try again.");
        } finally { setLoading(false); }
    };

    return (
        <AuthLayout
            title="Admin Registration"
            subtitle="Set up your institution's administrative access"
            accentColor="#f43f5e"
            accentGlow="rgba(244,63,94,0.45)"
            Icon={ShieldCheck}
            role="admin"
            isRegister
            onSubmit={handleRegister}
            loading={loading}
            error={error}
        >
            <AuthField label="Full Name" id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Administrator name" accentColor="#f43f5e" />
            <AuthField label="Email address" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" accentColor="#f43f5e" />
            <AuthField label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password" accentColor="#f43f5e" />
        </AuthLayout>
    );
};

export default RegisterAdmin;
