const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
// const { authenticateToken } = require("../controllers/authController");

// Create a new user
router.post("/", userController.createUser);

// Get all users
router.get("/", userController.getAllUsers);

// Get user by ID
router.get("/:id", userController.getUserById);

// Update user (full update)
router.put("/:id", userController.updateUser);

// Update user (partial update)
router.patch("/:id", userController.updateUser);

// Delete user
router.delete("/:id", userController.deleteUser);

module.exports = router;
