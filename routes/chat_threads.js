const express = require("express");
const router = express.Router();
const chatThreadController = require("../controllers/chatThreadController");
// const { authenticateToken } = require("../controllers/authController");

// Create a new chat thread
router.post("/", chatThreadController.createChatThread);

// Get all chat threads
router.get("/", chatThreadController.getAllChatThreads);

// Get chat thread by ID
router.get("/:id", chatThreadController.getChatThreadById);

// Update chat thread
router.put("/:id", chatThreadController.updateChatThread);

// Delete chat thread
router.delete("/:id", chatThreadController.deleteChatThread);

// Get messages for a chat thread
router.get("/:id/messages", chatThreadController.getChatThreadMessages);

// Send a message to a chat thread
router.post("/:id/messages", chatThreadController.sendMessage);

module.exports = router;
