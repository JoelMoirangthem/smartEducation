const jwt = require("jsonwebtoken");

const verifyToken = (token) => {
    if (!process.env.JWT_SECRET) {
        throw Object.assign(new Error("JWT_SECRET not configured"), { statusCode: 500 });
    }
    return jwt.verify(token, process.env.JWT_SECRET);
};

const protect = (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return res.status(401).json({ message: "Not authorized, no token" });
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.statusCode === 500) {
            console.error("JWT_SECRET not configured");
            return res.status(500).json({ message: "Server misconfiguration" });
        }
        console.error("Token verification failed:", error.message);
        res.status(401).json({ message: "Not authorized, token failed" });
    }
};

// Variant for browser-native file delivery (<a>/<window.open> cannot set
// Authorization headers): also accepts ?token=. Use ONLY on download-style
// routes — query-string tokens can end up in server/proxy logs.
const protectWithQueryToken = (req, res, next) => {
    if (!req.headers.authorization && req.query && req.query.token) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    return protect(req, res, next);
};

module.exports = protect;
module.exports.protect = protect;
module.exports.protectWithQueryToken = protectWithQueryToken;