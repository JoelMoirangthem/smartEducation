const express = require("express");
const router = express.Router();
const { linkParent, getMyChildren, getStudentParents, unlinkParent } = require("../controllers/parent.controller");
const protect = require("../middlewares/auth.middleware");

router.use(protect);
router.post("/link", linkParent);
router.get("/my-children", getMyChildren);
router.get("/student/:studentId", getStudentParents);
router.delete("/:id", unlinkParent);

module.exports = router;
