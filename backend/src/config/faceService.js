const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';

const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (err) {
        if (err.name === 'AbortError') throw new Error(`Python face service timed out after ${timeoutMs}ms`);
        throw err;
    } finally {
        clearTimeout(timer);
    }
};

const deleteFace = async (studentId) => {
    try {
        const response = await fetchWithTimeout(`${PYTHON_SERVICE_URL}/delete-face/${studentId}`, { method: 'DELETE' }, 10000);
        const data = await response.json().catch(() => ({}));
        return response.ok ? { ok: true, data } : { ok: false, error: data.error || 'Face service error' };
    } catch (err) {
        return { ok: false, error: err.message };
    }
};

module.exports = { deleteFace, fetchWithTimeout };