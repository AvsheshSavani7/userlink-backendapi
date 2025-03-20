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

// Add this function to ensure collections are created
const ensureCollectionsExist = async () => {
  if (mongoose.connection.readyState === 1) {
    // If connected to MongoDB
    try {
      // Create an empty document and then delete it to ensure collection creation
      // Only do this if the collection doesn't already exist
      const collections = await mongoose.connection.db
        .listCollections()
        .toArray();
      const collectionNames = collections.map((c) => c.name);

      const models = [User, ChatThread, Message, Assistant, File];

      for (const Model of models) {
        const collectionName = Model.collection.name;
        if (!collectionNames.includes(collectionName)) {
          console.log(`Creating collection: ${collectionName}`);
          // Create a dummy document and immediately delete it
          const dummy = new Model({});
          await dummy.save();
          if (dummy._id) {
            await Model.deleteOne({ _id: dummy._id });
          }
        }
      }
      console.log("All collections initialized");
    } catch (error) {
      console.error("Error ensuring collections exist:", error);
    }
  }
};

// Initialize database connection
const initializeDb = async () => {
  if (process.env.MONGODB_URI) {
    try {
      // Connect to MongoDB in any environment
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      // await syncIndexes();
      await ensureCollectionsExist();

      console.log("Connected to MongoDB");
      return { type: "mongodb", connection: mongoose.connection };
    } catch (error) {
      console.error("MongoDB connection error:", error);
      console.log("Falling back to in-memory database");

      // Fallback to in-memory if MongoDB connection fails
      const adapter = new Memory();
      db = low(adapter);
      setupLowDb(db);
      return { type: "mongodb", connection: db };
    }
  } else {
    console.log("No MONGODB_URI provided. Using local database");
    // Use lowdb as fallback if no MongoDB URI provided
    const adapter = new FileSync("db.json");
    db = low(adapter);
    setupLowDb(db);
    return { type: "lowdb", connection: db };
  }
};

/**
 * Sync all Mongoose model indexes dynamically
 */
async function syncIndexes() {
  try {
    const modelNames = mongoose.modelNames(); // Get all registered model names
    await Promise.all(
      modelNames.map((name) => mongoose.model(name).syncIndexes())
    );

    console.log("All model indexes synced dynamically");
  } catch (error) {
    console.error("Error syncing indexes", error);
  }
}

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
