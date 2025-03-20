const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

// Get all files
const getAllFiles = async (req, res) => {
  const db = req.db;
  const dbType = req.dbType;
  const { userId } = req.query;

  try {
    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const File = require("../models/File");

      // Query with filter if userId is provided
      let query = userId ? { userId } : {};
      const files = await File.find(query);

      res.json(files);
    } else {
      // For lowdb, use the existing logic
      let files = db.get("files").value();

      // Filter by userId if provided
      if (userId) {
        files = files.filter((file) => file.userId === userId);
      }

      res.json(files);
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get file by ID
const getFileById = async (req, res) => {
  const { id } = req.params;
  const db = req.db;
  const dbType = req.dbType;

  try {
    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const File = require("../models/File");

      const file = await File.findOne({ id });

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json(file);
    } else {
      // For lowdb, use the existing logic
      const file = db.get("files").find({ id }).value();

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      res.json(file);
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new file
const createFile = async (req, res) => {
  const { userId, name, size, type, openaiFileId, assistantId } = req.body;
  const db = req.db;
  const dbType = req.dbType;

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

    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const File = require("../models/File");

      // Convert to MongoDB format
      const mongoFile = new File({
        ...newFile,
        createdAt: new Date() // Use Date object instead of string
      });

      await mongoFile.save();
      res.status(201).json(mongoFile);
    } else {
      // For lowdb, use the existing logic
      db.get("files").push(newFile).write();
      res.status(201).json(newFile);
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete file
const deleteFile = async (req, res) => {
  const { id } = req.params;
  const db = req.db;
  const dbType = req.dbType;

  try {
    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const File = require("../models/File");

      // Find file first to check if it exists
      const file = await File.findOne({ id });

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Delete the file
      await File.deleteOne({ id });

      res.json({ message: "File deleted successfully" });
    } else {
      // For lowdb, use the existing logic
      const file = db.get("files").find({ id }).value();

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Delete file from db
      db.get("files").remove({ id }).write();

      res.json({ message: "File deleted successfully" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get file content (placeholder - in a real app, would retrieve from storage)
const getFileContent = async (req, res) => {
  const { id } = req.params;
  const db = req.db;
  const dbType = req.dbType;

  try {
    let file;

    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const File = require("../models/File");
      file = await File.findOne({ id });
    } else {
      // For lowdb, use the existing logic
      file = db.get("files").find({ id }).value();
    }

    if (!file) {
      console.log(`File not found with ID: ${id}`);
      return res.status(404).json({ message: "File not found" });
    }

    console.log(`File found: ${file.name}, type: ${file.type}`);

    // In a production app, this would retrieve the actual file content from storage
    // For this demo, we'll return information about the file that the client can display
    const host = req.get("host");
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}`;

    // For text files, we could return sample content
    // For other files, we'd return a URL that could be used to fetch the actual file
    let content = `Sample content for ${file.name}`;
    // In a real app, this would be a URL to download the actual file
    let url = `${baseUrl}/api/files/${file.id}/download`;

    if (file.type === "application/pdf") {
      content = `[PDF Content] - This is a PDF file: ${file.name}`;
    }

    res.json({
      content,
      url,
      name: file.name,
      size: file.size,
      type: file.type,
      id: file.id
    });
  } catch (error) {
    console.error("Error retrieving file content:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Download file
const downloadFile = async (req, res) => {
  const { id } = req.params;
  const db = req.db;
  const dbType = req.dbType;

  console.log(`Download request received for file ID: ${id}`);
  console.log(`Request headers:`, req.headers);

  try {
    let file;

    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const File = require("../models/File");
      file = await File.findOne({ id });
      console.log(
        `MongoDB lookup result:`,
        file ? `Found file: ${file.name}` : "No file found"
      );
    } else {
      // For lowdb, use the existing logic
      file = db.get("files").find({ id }).value();
      console.log(
        `LowDB lookup result:`,
        file ? `Found file: ${file.name}` : "No file found"
      );
    }

    if (!file) {
      console.log(`File not found for download: ${id}`);
      return res.status(404).json({ message: "File not found" });
    }

    console.log(`Preparing download for: ${file.name} (${file.type})`);

    // In a real application, this would stream the actual file from storage
    // For now, we'll just create a sample file with some content
    let fileContent;
    let mimeType;

    if (file.type === "text/plain") {
      fileContent = `This is a sample text file: ${
        file.name
      }\n\nCreated at: ${new Date().toISOString()}\n\nThis is a sample file for demonstration purposes.`;
      mimeType = "text/plain";
      console.log(`Created text file content for ${file.name}`);
    } else if (file.type === "application/pdf") {
      // For PDFs, we can't generate a real PDF without libraries
      // Just send a text file explaining this
      fileContent = `This would be a PDF file in a production environment.`;
      mimeType = "text/plain";
      // Adjust file name to indicate it's a placeholder
      file.name = `${file.name}.placeholder.txt`;
      console.log(`Created placeholder content for PDF: ${file.name}`);
    } else {
      fileContent = `File content placeholder for ${file.name}`;
      mimeType = "text/plain";
      console.log(`Created generic placeholder content for: ${file.name}`);
    }

    console.log(`Setting response headers for content-type: ${mimeType}`);

    // Set headers for file download
    res.setHeader(
      "Content-disposition",
      `attachment; filename=${encodeURIComponent(file.name)}`
    );
    res.setHeader("Content-type", mimeType);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Length", Buffer.byteLength(fileContent));

    console.log(
      `Sending file content with length: ${Buffer.byteLength(
        fileContent
      )} bytes`
    );

    // Send the file content
    return res.send(fileContent);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getAllFiles,
  getFileById,
  createFile,
  deleteFile,
  getFileContent,
  downloadFile
};
