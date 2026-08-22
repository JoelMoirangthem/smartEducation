const express = require("express");
const router = express.Router();
const { createRoute, getRoutes, assignStudent, getRouteDetails, removeStudent, updateRoute } = require("../controllers/transport.controller");
const protect = require("../middlewares/auth.middleware");

router.use(protect);
router.post("/", createRoute);
router.get("/", getRoutes);
router.get("/:id", getRouteDetails);
router.put("/:id", updateRoute);
router.post("/assign", assignStudent);
router.put("/unassign/:id", removeStudent);

module.exports = router;
