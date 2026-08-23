/**
 * Unified pagination helper — consistent across all list endpoints.
 * Clamp limit 1..100, default 20, safe page >=1.
 */
function parsePagination(query, defaults = {}) {
    const defLimit = defaults.limit || 20;
    const defPage = defaults.page || 1;
    let page = parseInt(query.page, 10);
    let limit = parseInt(query.limit, 10);
    if (isNaN(page) || page < 1) page = defPage;
    if (isNaN(limit) || limit < 1) limit = defLimit;
    if (limit > 100) limit = 100;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

module.exports = { parsePagination };
