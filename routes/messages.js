const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");

// Get all messages (with optional query filters)
router.get("/", messageController.getAllMessages);

// Get messages for a thread
router.get("/thread/:threadId", messageController.getThreadMessages);

// Get all messages for a user (across all threads)
router.get("/user/:userId", messageController.getUserMessages);

// Create a new message
router.post("/", messageController.createMessage);

// Create a new message for a thread (alternative endpoint)
router.post("/thread/:threadId", messageController.createThreadMessage);

// Ask question (special route for AI interaction)
router.post("/ask/:userId", messageController.askQuestion);

module.exports = router;
