const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");

// Create a new user
const createUser = async (req, res) => {
  // Accept either name or username from the request body
  const { username, name: nameParam, email, password, assistantId } = req.body;
  const name = nameParam || username; // Use name if provided, otherwise use username
  const db = req.db;

  // Check if name is missing
  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }

  // Check if user already exists (if email provided)
  if (email) {
    const userExists = db.get("users").find({ email }).value();

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }
  }

  try {
    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    // Create new user
    const newUser = {
      id: uuidv4(),
      name, // Using name instead of username to match frontend
      email,
      password: hashedPassword,
      assistantId, // Added assistantId
      createdAt: new Date().toISOString()
    };

    // Save user to db
    db.get("users").push(newUser).write();

    // Return user without password
    const userToReturn = { ...newUser };
    delete userToReturn.password;

    res.status(201).json(userToReturn);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all users
const getAllUsers = (req, res) => {
  const db = req.db;

  try {
    const users = db
      .get("users")
      .map((user) => ({
        id: user.id,
        name: user.name || user.username, // Support both name and username
        email: user.email,
        createdAt: user.createdAt,
        assistantId: user.assistantId
      }))
      .value();

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get user by ID
const getUserById = (req, res) => {
  const { id } = req.params;
  const db = req.db;

  try {
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
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update user
const updateUser = (req, res) => {
  const { id } = req.params;
  const { name, email, assistantId } = req.body;
  const db = req.db;

  // Check if user exists
  const user = db.get("users").find({ id }).value();

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  try {
    // Update user
    db.get("users")
      .find({ id })
      .assign({
        name: name || user.name || user.username,
        email: email || user.email,
        assistantId: assistantId !== undefined ? assistantId : user.assistantId,
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
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  const { id } = req.params;
  const db = req.db;
  const openaiApi = require("../utils/openai");

  // Check if user exists
  const user = db.get("users").find({ id }).value();

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  try {
    // 1. Find associated assistant
    const assistant = user.assistantId
      ? db.get("assistants").find({ id: user.assistantId }).value()
      : null;

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

      // Clean up messages associated with this assistant's thread
      // (Will be done later when we have all threadIds)

      // Try to delete assistant from OpenAI
      try {
        await openaiApi.deleteAssistant(assistant.openai_id);
      } catch (error) {
        console.error("Error deleting OpenAI assistant:", error.message);
        // Continue even if OpenAI deletion fails
      }

      // Get all files associated with this assistant
      const files = db
        .get("files")
        .filter({ assistantId: assistant.id })
        .value();

      // Clean up files (both in DB and OpenAI if needed)
      if (files.length > 0) {
        // Just remove from DB for now as we don't have the OpenAI file delete function here
        db.get("files").remove({ assistantId: assistant.id }).write();
      }

      // Delete the assistant from DB
      db.get("assistants").remove({ id: assistant.id }).write();
    }

    // 3. Find and delete all chat threads for this user
    const chatThreads = db.get("chat_threads").filter({ userId: id }).value();
    if (chatThreads.length > 0) {
      // Get thread IDs for message deletion
      const threadIds = chatThreads.map((thread) => thread.id);

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

      // Delete the threads
      db.get("chat_threads").remove({ userId: id }).write();
    }

    // 4. Now delete all messages for any OpenAI threadIds we found
    if (openaiThreadIds.length > 0) {
      db.get("messages")
        .remove((message) => openaiThreadIds.includes(message.threadId))
        .write();
    }

    // 5. Clean up any remaining files directly associated with user
    db.get("files").remove({ userId: id }).write();

    // 6. Clean up any remaining messages directly associated with user
    db.get("messages").remove({ userId: id }).write();

    // 7. Finally delete the user
    db.get("users").remove({ id }).write();

    res.json({ message: "User and all associated data deleted successfully" });
  } catch (error) {
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
