import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import AuthLayout, { AuthField } from "../components/AuthLayout";

const RegisterStudent = () => {
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
                body: JSON.stringify({ name, email, password, role: "student" }),
            });
            const data = await res.json();
            if (res.ok) { navigate("/login/student"); }
            else { setError(data.message || "Registration failed"); }
        } catch {
            setError("Network error. Please try again.");
        } finally { setLoading(false); }
    };

    return (
        <AuthLayout
            title="Create Account"
            subtitle="Start your learning journey with EduSmart today"
            accentColor="#6366f1"
            accentGlow="rgba(99,102,241,0.45)"
            Icon={GraduationCap}
            role="student"
            isRegister
            onSubmit={handleRegister}
            loading={loading}
            error={error}
        >
            <AuthField label="Full Name" id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" accentColor="#6366f1" />
            <AuthField label="Email address" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="student@example.com" accentColor="#6366f1" />
            <AuthField label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a strong password" accentColor="#6366f1" />
        </AuthLayout>
    );
};

export default RegisterStudent;
