const express = require("express");
const router = express.Router();
const { addItem, getItems, updateItem, deleteItem, getInventoryStats } = require("../controllers/inventory.controller");
const protect = require("../middlewares/auth.middleware");

router.use(protect);
router.post("/", addItem);
router.get("/", getItems);
router.get("/stats", getInventoryStats);
router.put("/:id", updateItem);
router.delete("/:id", deleteItem);

module.exports = router;
