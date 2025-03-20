const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");

// Create a new user
const createUser = async (req, res) => {
  // Accept either name or username from the request body
  const {
    username: usernameParam,
    name: nameParam,
    email,
    password,
    assistantId
  } = req.body;
  const name = nameParam || usernameParam; // Use name if provided, otherwise use username
  // Make sure we have a username value for MongoDB
  const username = usernameParam || nameParam; // Use username if provided, otherwise use name
  const db = req.db;
  const dbType = req.dbType;

  // Check if name is missing
  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }

  // Create new user object for lowDB
  const newUser = {
    id: uuidv4(),
    name, // Using name instead of username to match frontend
    email: email || null, // Make email optional
    password: null, // Will be set below if provided
    assistantId, // Added assistantId
    createdAt: new Date().toISOString()
  };

  try {
    // Hash password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      newUser.password = await bcrypt.hash(password, salt);
    }

    // Different handling based on database type
    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const User = require("../models/User");

      // Check if user already exists (if email provided)
      if (email) {
        const userExists = await User.findOne({ email });
        if (userExists) {
          return res.status(400).json({ message: "User already exists" });
        }
      }

      // Create a MongoDB-compatible user object
      const mongoUserData = {
        id: newUser.id,
        username: username, // Use username for MongoDB schema
        // Optional fields - only include if provided
        ...(email && { email: email }),
        ...(newUser.password && { password: newUser.password }),
        role: "user" // Default role from schema
        // Don't include createdAt as it's auto-generated
      };

      if (assistantId) {
        // If your schema doesn't have this field, you should add it with a schema update
        mongoUserData.assistantId = assistantId;
      }

      // Save user to MongoDB
      const mongoUser = new User(mongoUserData);
      await mongoUser.save();

      // Return user without password
      const userToReturn = mongoUser.toObject();
      delete userToReturn.password;

      res.status(201).json(userToReturn);
    } else {
      // For lowdb, use the existing logic
      // Check if user already exists (if email provided)
      if (email) {
        const userExists = db.get("users").find({ email }).value();
        if (userExists) {
          return res.status(400).json({ message: "User already exists" });
        }
      }

      // Save user to db
      db.get("users").push(newUser).write();

      // Return user without password
      const userToReturn = { ...newUser };
      delete userToReturn.password;

      res.status(201).json(userToReturn);
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  const db = req.db;
  const dbType = req.dbType;

  try {
    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const User = require("../models/User");

      // Get all users from MongoDB
      const users = await User.find({}, "-password"); // Exclude password field

      // Transform to match the expected format
      const formattedUsers = users.map((user) => ({
        id: user.id,
        name: user.name || user.username, // Support both name and username
        email: user.email,
        createdAt: user.createdAt
      }));

      res.json(formattedUsers);
    } else {
      // For lowdb, use the existing logic
      const users = db
        .get("users")
        .map((user) => ({
          id: user.id,
          name: user.name || user.username, // Support both name and username
          email: user.email,
          createdAt: user.createdAt
        }))
        .value();

      res.json(users);
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  const { id } = req.params;
  const db = req.db;
  const dbType = req.dbType;

  try {
    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const User = require("../models/User");

      // Find user by ID
      const user = await User.findOne({ id });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return formatted user
      res.json({
        id: user.id,
        name: user.username, // Use username as name for consistency
        email: user.email,
        createdAt: user.createdAt,
        assistantId: user.assistantId
      });
    } else {
      // For lowdb, use the existing logic
      const user = db.get("users").find({ id }).value();

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        name: user.name || user.username, // Support both name and username
        email: user.email,
        createdAt: user.createdAt,
        assistantId: user.assistantId
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, assistantId } = req.body;
  const db = req.db;
  const dbType = req.dbType;

  try {
    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const User = require("../models/User");

      // Find user by ID
      const user = await User.findOne({ id });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prepare update data
      const updateData = {};
      if (name) updateData.username = name; // Use username field in MongoDB
      if (email) updateData.email = email;
      if (assistantId !== undefined) updateData.assistantId = assistantId;

      // Update user
      const updatedUser = await User.findOneAndUpdate(
        { id },
        { $set: updateData },
        { new: true } // Return the updated document
      );

      // Return formatted user
      res.json({
        id: updatedUser.id,
        name: updatedUser.username, // Use username as name for consistency
        email: updatedUser.email,
        createdAt: updatedUser.createdAt,
        updatedAt: new Date().toISOString(), // Add updatedAt
        assistantId: updatedUser.assistantId
      });
    } else {
      // For lowdb, use the existing logic
      // Check if user exists
      const user = db.get("users").find({ id }).value();

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user
      db.get("users")
        .find({ id })
        .assign({
          name: name || user.name || user.username,
          email: email || user.email,
          assistantId:
            assistantId !== undefined ? assistantId : user.assistantId,
          updatedAt: new Date().toISOString()
        })
        .write();

      const updatedUser = db.get("users").find({ id }).value();

      res.json({
        id: updatedUser.id,
        name: updatedUser.name || updatedUser.username,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        assistantId: updatedUser.assistantId
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  const { id } = req.params;
  const db = req.db;
  const dbType = req.dbType;
  const openaiApi = require("../utils/openai");

  try {
    // Check if user exists
    let user;

    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const User = require("../models/User");
      user = await User.findOne({ id });
    } else {
      // For lowdb, use the existing logic
      user = db.get("users").find({ id }).value();
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 1. Find associated assistant
    let assistant = null;

    if (dbType === "mongodb") {
      if (user.assistantId) {
        const Assistant = require("../models/Assistant");
        assistant = await Assistant.findOne({ id: user.assistantId });
      }
    } else {
      assistant = user.assistantId
        ? db.get("assistants").find({ id: user.assistantId }).value()
        : null;
    }

    // Track OpenAI threadIds to delete messages for
    let openaiThreadIds = [];

    // 2. If user has an assistant, clean it up
    if (assistant) {
      // Add the assistant's threadId to our list if it exists
      if (assistant.threadId) {
        openaiThreadIds.push(assistant.threadId);

        // Try to delete the thread from OpenAI
        try {
          await openaiApi.deleteThread(assistant.threadId);
        } catch (error) {
          console.error("Error deleting OpenAI thread:", error.message);
          // Continue even if OpenAI thread deletion fails
        }
      }

      // Try to delete assistant from OpenAI
      try {
        const openaiId = assistant.openai_id || assistant.assistantId;
        if (openaiId) {
          await openaiApi.deleteAssistant(openaiId);
        }
      } catch (error) {
        console.error("Error deleting OpenAI assistant:", error.message);
        // Continue even if OpenAI deletion fails
      }

      // Get all files associated with this assistant
      let files = [];

      if (dbType === "mongodb") {
        const File = require("../models/File");
        files = await File.find({ assistantId: assistant.id });

        // Delete files from database
        if (files.length > 0) {
          await File.deleteMany({ assistantId: assistant.id });
        }

        // Delete the assistant from DB
        const Assistant = require("../models/Assistant");
        await Assistant.deleteOne({ id: assistant.id });
      } else {
        // For lowdb, use the existing logic
        files = db.get("files").filter({ assistantId: assistant.id }).value();

        // Clean up files in DB
        if (files.length > 0) {
          db.get("files").remove({ assistantId: assistant.id }).write();
        }

        // Delete the assistant from DB
        db.get("assistants").remove({ id: assistant.id }).write();
      }
    }

    // 3. Find and delete all chat threads for this user
    let chatThreads = [];
    let threadIds = [];

    if (dbType === "mongodb") {
      const ChatThread = require("../models/ChatThread");
      chatThreads = await ChatThread.find({ userId: id });
      threadIds = chatThreads.map((thread) => thread.id);

      // Collect OpenAI threadIds
      chatThreads.forEach((thread) => {
        if (thread.openaiThreadId) {
          openaiThreadIds.push(thread.openaiThreadId);
        }
      });

      // Delete messages for these threads
      if (threadIds.length > 0) {
        const Message = require("../models/Message");
        await Message.deleteMany({ threadId: { $in: threadIds } });
      }

      // Delete chat threads
      await ChatThread.deleteMany({ userId: id });
    } else {
      // For lowdb, use the existing logic
      chatThreads = db.get("chat_threads").filter({ userId: id }).value();

      if (chatThreads.length > 0) {
        // Get thread IDs for message deletion
        threadIds = chatThreads.map((thread) => thread.id);

        // Also collect any OpenAI threadIds from chat threads
        chatThreads.forEach((thread) => {
          if (thread.openaiThreadId) {
            openaiThreadIds.push(thread.openaiThreadId);
          }
        });

        // Delete all messages for these threads
        db.get("messages")
          .remove((message) => threadIds.includes(message.threadId))
          .write();

        // Delete the chat threads
        db.get("chat_threads").remove({ userId: id }).write();
      }
    }

    // 4. Delete the user
    if (dbType === "mongodb") {
      const User = require("../models/User");
      await User.deleteOne({ id });
    } else {
      db.get("users").remove({ id }).write();
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
