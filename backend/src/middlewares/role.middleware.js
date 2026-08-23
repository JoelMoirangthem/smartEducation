/**
 * Centralized RBAC — replaces scattered `if (req.user.role !== "admin")` checks.
 * Usage: router.post("/create", protect, requireRole("admin","teacher"), handler)
 */
function requireRole(...allowed) {
    const set = new Set(allowed);
    return (req, res, next) => {
        if (!req.user || !set.has(req.user.role)) {
            return res.status(403).json({ message: `Access denied. Required role: ${allowed.join(" | ")}` });
        }
        next();
    };
}

/**
 * Ownership guard for docs with createdBy/uploadedBy — admin bypasses.
 */
function requireOwnershipOrAdmin(getOwnerId) {
    return async (req, res, next) => {
        if (req.user.role === "admin") return next();
        try {
            const ownerId = await getOwnerId(req);
            if (!ownerId) return res.status(404).json({ message: "Resource not found" });
            if (String(ownerId) !== String(req.user.id)) {
                return res.status(403).json({ message: "Not authorized for this resource" });
            }
            next();
        } catch (e) {
            next(e);
        }
    };
}

module.exports = { requireRole, requireOwnershipOrAdmin };
