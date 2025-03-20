const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

// Get all files
const getAllFiles = (req, res) => {
  const db = req.db;
  const { userId } = req.query;

  try {
    let files = db.get("files").value();

    // Filter by userId if provided
    if (userId) {
      files = files.filter((file) => file.userId === userId);
    }

    res.json(files);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get file by ID
const getFileById = (req, res) => {
  const { id } = req.params;
  const db = req.db;

  try {
    const file = db.get("files").find({ id }).value();

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    res.json(file);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new file
const createFile = (req, res) => {
  const { userId, name, size, type, openaiFileId, assistantId } = req.body;
  const db = req.db;

  try {
    const newFile = {
      id: uuidv4(),
      userId,
      name,
      size,
      type,
      openaiFileId,
      assistantId,
      createdAt: new Date().toISOString()
    };

    db.get("files").push(newFile).write();

    res.status(201).json(newFile);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete file
const deleteFile = (req, res) => {
  const { id } = req.params;
  const db = req.db;

  try {
    const file = db.get("files").find({ id }).value();

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Delete file from db
    db.get("files").remove({ id }).write();

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get file content (placeholder - in a real app, would retrieve from storage)
const getFileContent = (req, res) => {
  const { id } = req.params;
  const db = req.db;

  try {
    const file = db.get("files").find({ id }).value();

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // This is a placeholder. In a real app, you'd retrieve the file content from storage.
    res.json({
      content: `This is the content of file ${file.name}`,
      url: `https://example.com/files/${file.id}`
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getAllFiles,
  getFileById,
  createFile,
  deleteFile,
  getFileContent
};
