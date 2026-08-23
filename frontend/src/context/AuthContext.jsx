import { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { initializeSocket, disconnectSocket, getSocket } from "../services/socket.service";

const AuthContext = createContext(null);

function parseUser(token) {
    if (!token) return null;
    try {
        const d = jwtDecode(token);
        // expiry check proactively
        if (d.exp && Date.now() >= d.exp * 1000) return null;
        return { id: d.id, role: d.role, name: d.name, classId: d.classId, exp: d.exp, token };
    } catch { return null; }
}

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [user, setUser] = useState(() => parseUser(localStorage.getItem("token")));

    // keep localStorage + decoded user in sync
    const setAuth = useCallback((nextToken, nextUserObj) => {
        if (nextToken) {
            localStorage.setItem("token", nextToken);
            if (nextUserObj) localStorage.setItem("user", JSON.stringify(nextUserObj));
        } else {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
        }
        setToken(nextToken || null);
        setUser(parseUser(nextToken));
    }, []);

    const logout = useCallback(() => {
        disconnectSocket();
        setAuth(null, null);
    }, [setAuth]);

    // Socket lifecycle bound to auth state ONLY — never to a page mount
    useEffect(() => {
        if (user?.id) {
            initializeSocket(user.id, user.classId, user.role);
        } else {
            disconnectSocket();
        }
        // do not disconnect on unmount — singleton lives with auth session
    }, [user?.id, user?.classId, user?.role]);

    // cross-tab sync
    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === "token") {
                setToken(e.newValue);
                setUser(parseUser(e.newValue));
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    // proactive expiry: check every 60s
    useEffect(() => {
        if (!user?.exp) return;
        const id = setInterval(() => {
            if (Date.now() >= user.exp * 1000) logout();
        }, 60000);
        return () => clearInterval(id);
    }, [user?.exp, logout]);

    const value = useMemo(() => ({
        user, token, isAuthenticated: !!user,
        setAuth, logout,
        getSocket,
    }), [user, token, setAuth, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};
