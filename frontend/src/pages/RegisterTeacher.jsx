import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Presentation } from "lucide-react";
import AuthLayout, { AuthField } from "../components/AuthLayout";

const RegisterTeacher = () => {
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
                body: JSON.stringify({ name, email, password, role: "teacher" }),
            });
            const data = await res.json();
            if (res.ok) { navigate("/login/teacher"); }
            else { setError(data.message || "Registration failed"); }
        } catch {
            setError("Network error. Please try again.");
        } finally { setLoading(false); }
    };

    return (
        <AuthLayout
            title="Join as Educator"
            subtitle="Create your account to manage classes and inspire students"
            accentColor="#06b6d4"
            accentGlow="rgba(6,182,212,0.45)"
            Icon={Presentation}
            role="teacher"
            isRegister
            onSubmit={handleRegister}
            loading={loading}
            error={error}
        >
            <AuthField label="Full Name" id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" accentColor="#06b6d4" />
            <AuthField label="Email address" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teacher@example.com" accentColor="#06b6d4" />
            <AuthField label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password" accentColor="#06b6d4" />
        </AuthLayout>
    );
};

export default RegisterTeacher;
