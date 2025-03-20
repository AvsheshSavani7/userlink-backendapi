const mongoose = require("mongoose");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const Memory = require("lowdb/adapters/Memory");

// Models
const User = require("../models/User");
const ChatThread = require("../models/ChatThread");
const Message = require("../models/Message");
const Assistant = require("../models/Assistant");
const File = require("../models/File");

let db;

// Initialize database connection
const initializeDb = async () => {
  if (process.env.NODE_ENV === "production" && process.env.MONGODB_URI) {
    try {
      // Connect to MongoDB in production
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log("Connected to MongoDB");
      return { type: "mongodb", connection: mongoose.connection };
    } catch (error) {
      console.error("MongoDB connection error:", error);
      console.log("Falling back to in-memory database");

      // Fallback to in-memory if MongoDB connection fails
      const adapter = new Memory();
      db = low(adapter);
      setupLowDb(db);
      return { type: "lowdb", connection: db };
    }
  } else {
    // Use lowdb for development
    const adapter = new FileSync("db.json");
    db = low(adapter);
    setupLowDb(db);
    return { type: "lowdb", connection: db };
  }
};

// Set up default lowdb structure
const setupLowDb = (db) => {
  db.defaults({
    users: [],
    assistants: [],
    files: [],
    chat_threads: [],
    messages: []
  }).write();
};

module.exports = { initializeDb };
