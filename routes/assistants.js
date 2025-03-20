const express = require("express");
const router = express.Router();
const assistantController = require("../controllers/assistantController");

// Create a new assistant
router.post("/", assistantController.createAssistant);

// Get all assistants
router.get("/", assistantController.getAllAssistants);

// Get assistant by ID
router.get("/:id", assistantController.getAssistantById);

// Update assistant
router.put("/:id", assistantController.updateAssistant);

// Add PATCH route for partial updates
router.patch("/:id", assistantController.updateAssistant);

// Delete assistant
router.delete("/:id", assistantController.deleteAssistant);

module.exports = router;
