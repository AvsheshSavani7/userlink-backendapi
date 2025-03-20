const { v4: uuidv4 } = require("uuid");

// Get all messages with optional filters
const getAllMessages = (req, res) => {
  const { threadId, userId } = req.query;
  const db = req.db;

  try {
    let messages = db.get("messages");

    // Filter by threadId if provided
    if (threadId) {
      messages = messages.filter({ threadId });
    }

    // Filter by userId if provided
    if (userId) {
      // First get the user
      const user = db.get("users").find({ id: userId }).value();

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has an assistant with a thread
      if (user.assistantId) {
        const assistant = db
          .get("assistants")
          .find({ id: user.assistantId })
          .value();

        if (assistant && assistant.threadId) {
          // Filter messages for this assistant's thread
          messages = messages.filter({ threadId: assistant.threadId });
        } else {
          // No thread found for this user's assistant
          return res.json([]);
        }
      } else {
        // No assistant found for this user
        return res.json([]);
      }
    }

    // Sort by creation date
    messages = messages.sortBy("createdAt").value();

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get messages for a specific thread
const getThreadMessages = (req, res) => {
  const { threadId } = req.params;
  const db = req.db;

  try {
    const messages = db
      .get("messages")
      .filter((message) => message.threadId === threadId)
      .sortBy("createdAt")
      .value();

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all user messages across threads
const getUserMessages = (req, res) => {
  const { userId } = req.params;
  const db = req.db;

  try {
    // Get messages from two sources:
    // 1. Local chat threads associated with the user
    // 2. OpenAI thread associated with the user's assistant

    let messages = [];

    // 1. First check local chat threads
    const threads = db
      .get("chat_threads")
      .filter((thread) => thread.userId === userId)
      .value();

    const threadIds = threads.map((thread) => thread.id);

    if (threadIds.length > 0) {
      // Get messages for these local threads
      const localMessages = db
        .get("messages")
        .filter((message) => threadIds.includes(message.threadId))
        .value();

      messages = [...messages, ...localMessages];
    }

    // 2. Check if user has an assistant with a thread
    const user = db.get("users").find({ id: userId }).value();

    if (user && user.assistantId) {
      const assistant = db
        .get("assistants")
        .find({ id: user.assistantId })
        .value();

      if (assistant && assistant.threadId) {
        // Get messages for this assistant's thread
        const assistantMessages = db
          .get("messages")
          .filter({ threadId: assistant.threadId })
          .value();

        messages = [...messages, ...assistantMessages];
      }
    }

    // Sort all messages by creation date
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new message
const createMessage = (req, res) => {
  const { threadId, content, role } = req.body;
  const db = req.db;

  try {
    // Remove the thread existence check that was causing the 404 error
    // We'll accept any threadId since it might be an OpenAI thread ID
    // that isn't stored in our chat_threads collection

    const newMessage = {
      id: uuidv4(),
      threadId,
      content,
      role: role || "user", // Default to user role if not specified
      createdAt: new Date().toISOString()
    };

    db.get("messages").push(newMessage).write();

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new message for a specific thread (from route params)
const createThreadMessage = (req, res) => {
  const { threadId } = req.params;
  const { content, role, userId } = req.body;
  const db = req.db;

  try {
    // Remove the thread existence check for consistency with createMessage
    // We'll accept any threadId since it might be an OpenAI thread ID

    const newMessage = {
      id: uuidv4(),
      threadId,
      content,
      role: role || "user", // Default to user role if not specified
      userId,
      createdAt: new Date().toISOString()
    };

    db.get("messages").push(newMessage).write();

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Simulate asking a question to assistant (using sample data for now)
const askQuestion = (req, res) => {
  const { userId } = req.params;
  const { question } = req.body;
  const db = req.db;

  try {
    // Find user
    const user = db.get("users").find({ id: userId }).value();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find or create a thread for this user
    let thread = db
      .get("chat_threads")
      .find((thread) => thread.userId === userId)
      .value();

    if (!thread) {
      thread = {
        id: uuidv4(),
        userId,
        assistantId: user.assistantId || null,
        openaiThreadId: `thread_${uuidv4()}`, // Mock OpenAI thread ID
        createdAt: new Date().toISOString()
      };
      db.get("chat_threads").push(thread).write();
    }

    // Create user message
    const userMessage = {
      id: uuidv4(),
      threadId: thread.id,
      content: question,
      role: "user",
      createdAt: new Date().toISOString()
    };
    db.get("messages").push(userMessage).write();

    // Create mock assistant response
    setTimeout(() => {
      const assistantMessage = {
        id: uuidv4(),
        threadId: thread.id,
        content: `This is a mock response to your question: "${question}"`,
        role: "assistant",
        createdAt: new Date().toISOString()
      };
      db.get("messages").push(assistantMessage).write();
    }, 1000);

    res.status(201).json(userMessage);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getAllMessages,
  getThreadMessages,
  getUserMessages,
  createMessage,
  createThreadMessage,
  askQuestion
};
