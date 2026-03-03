const express = require("express");
const { register, login, adminCreateUser } = require("../controllers/auth.controller.js");
const protect = require("../middlewares/auth.middleware.js");

const router = express.Router();
router.post("/register", register);
router.post("/login", login);
router.post("/admin/create-user", protect, adminCreateUser);

module.exports = router;