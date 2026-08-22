import axios from 'axios';

// Relative base → requests go through the Vite dev proxy (and same-origin in
// prod). The proxy routes /api/v1/agent + /api/v1/ai/chat to the Python
// service and everything else to Express. Set VITE_API_URL to override
// (e.g. when the API lives on another origin).
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
    baseURL: API_BASE,
    timeout: 60000
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses globally (expired/invalid token)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const isAuthRoute = error.config?.url?.includes('/auth/');
            if (!isAuthRoute) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (!window.location.pathname.includes('/login')) {
                    // Role selection page — never assume the role of the
                    // session that just expired
                    window.location.href = '/';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;