const express = require("express");
const router = express.Router();
const fileController = require("../controllers/fileController");

// Get all files
router.get("/", fileController.getAllFiles);

// Get file by ID
router.get("/:id", fileController.getFileById);

// Create a new file
router.post("/", fileController.createFile);

// Delete file
router.delete("/:id", fileController.deleteFile);

// Get file content
router.get("/:id/content", fileController.getFileContent);

// Download file
router.get("/:id/download", fileController.downloadFile);

module.exports = router;
