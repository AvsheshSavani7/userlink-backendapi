const { v4: uuidv4 } = require("uuid");

// Create a new chat thread
const createChatThread = (req, res) => {
  const { name, description, userId } = req.body;
  const db = req.db;

  try {
    const newChatThread = {
      id: uuidv4(),
      name,
      description,
      createdBy: userId || "anonymous",
      members: userId ? [userId] : ["anonymous"], // Add creator as first member
      createdAt: new Date().toISOString()
    };

    // Save chat thread to db
    db.get("chat_threads").push(newChatThread).write();

    res.status(201).json(newChatThread);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all chat threads
const getAllChatThreads = (req, res) => {
  const db = req.db;

  try {
    const chatThreads = db.get("chat_threads").value();
    res.json(chatThreads);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get chat thread by ID
const getChatThreadById = (req, res) => {
  const { id } = req.params;
  const db = req.db;

  try {
    const chatThread = db.get("chat_threads").find({ id }).value();

    if (!chatThread) {
      return res.status(404).json({ message: "Chat thread not found" });
    }

    res.json(chatThread);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update chat thread
const updateChatThread = (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const db = req.db;

  // Check if chat thread exists
  const chatThread = db.get("chat_threads").find({ id }).value();

  if (!chatThread) {
    return res.status(404).json({ message: "Chat thread not found" });
  }

  try {
    // Update chat thread
    db.get("chat_threads")
      .find({ id })
      .assign({
        name: name || chatThread.name,
        description: description || chatThread.description,
        updatedAt: new Date().toISOString()
      })
      .write();

    const updatedChatThread = db.get("chat_threads").find({ id }).value();

    res.json(updatedChatThread);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete chat thread
const deleteChatThread = (req, res) => {
  const { id } = req.params;
  const db = req.db;

  // Check if chat thread exists
  const chatThread = db.get("chat_threads").find({ id }).value();

  if (!chatThread) {
    return res.status(404).json({ message: "Chat thread not found" });
  }

  try {
    // Delete all messages in the chat thread
    db.get("messages").remove({ chatThreadId: id }).write();

    // Delete chat thread
    db.get("chat_threads").remove({ id }).write();

    res.json({ message: "Chat thread deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get messages for a chat thread
const getChatThreadMessages = (req, res) => {
  const { id } = req.params;
  const db = req.db;

  try {
    // Check if chat thread exists
    const chatThread = db.get("chat_threads").find({ id }).value();

    if (!chatThread) {
      return res.status(404).json({ message: "Chat thread not found" });
    }

    // Get messages
    const messages = db
      .get("messages")
      .filter({ chatThreadId: id })
      .sortBy("timestamp")
      .value();

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send a message to a chat thread
const sendMessage = (req, res) => {
  const { id } = req.params;
  const { text, userId } = req.body;
  const db = req.db;

  try {
    // Check if chat thread exists
    const chatThread = db.get("chat_threads").find({ id }).value();

    if (!chatThread) {
      return res.status(404).json({ message: "Chat thread not found" });
    }

    // Create message
    const newMessage = {
      id: uuidv4(),
      text,
      userId: userId || "anonymous",
      chatThreadId: id,
      timestamp: new Date().toISOString()
    };

    // Save message to db
    db.get("messages").push(newMessage).write();

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createChatThread,
  getAllChatThreads,
  getChatThreadById,
  updateChatThread,
  deleteChatThread,
  getChatThreadMessages,
  sendMessage
};
