class ApiError extends Error {
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.status = statusCode;
        this.details = details;
    }
    static badRequest(msg, details) { return new ApiError(400, msg, details); }
    static unauthorized(msg="Not authorized") { return new ApiError(401, msg); }
    static forbidden(msg="Forbidden") { return new ApiError(403, msg); }
    static notFound(msg="Not found") { return new ApiError(404, msg); }
    static conflict(msg) { return new ApiError(409, msg); }
}
module.exports = ApiError;
