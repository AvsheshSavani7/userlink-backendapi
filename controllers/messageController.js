const { v4: uuidv4 } = require("uuid");

// Get all messages with optional filters
const getAllMessages = async (req, res) => {
  const { threadId, userId } = req.query;
  const db = req.db;
  const dbType = req.dbType;

  try {
    console.log(
      `getAllMessages called with threadId=${threadId}, userId=${userId}, dbType=${dbType}`
    );

    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose models
      const Message = require("../models/Message");
      const User = require("../models/User");
      const Assistant = require("../models/Assistant");

      console.log("Using MongoDB for message retrieval");

      if (threadId) {
        // Simple case: filter by threadId
        console.log(`Searching for messages with threadId: ${threadId}`);
        const messages = await Message.find({ threadId }).sort({
          createdAt: 1
        });
        console.log(
          `Found ${messages.length} messages with threadId=${threadId}`
        );
        return res.json(messages);
      }

      if (userId) {
        // Find the user's assistant and get its thread
        console.log(`Searching for user with id: ${userId}`);
        const user = await User.findOne({ id: userId });

        if (!user) {
          console.log(`User not found with id=${userId}`);
          return res.status(404).json({ message: "User not found" });
        }

        console.log(`User found: ${user.id}, assistantId=${user.assistantId}`);

        if (user.assistantId) {
          console.log(`Looking for assistant with id=${user.assistantId}`);
          const assistant = await Assistant.findOne({ id: user.assistantId });

          if (assistant && assistant.threadId) {
            // Get messages for this thread
            console.log(
              `Searching for messages with assistant's threadId=${assistant.threadId}`
            );
            const messages = await Message.find({
              threadId: assistant.threadId
            }).sort({ createdAt: 1 });

            console.log(
              `Found ${messages.length} messages for user's assistant thread`
            );
            return res.json(messages);
          } else {
            console.log(
              `Assistant has no threadId or assistant not found for id=${user.assistantId}`
            );
          }
        } else {
          console.log(`User has no assistantId: ${userId}`);
        }

        // No thread found for this user
        return res.json([]);
      }

      // If no filters, get all messages
      console.log("No filters provided, returning all messages");
      const messages = await Message.find().sort({ createdAt: 1 });
      console.log(`Found ${messages.length} total messages`);
      return res.json(messages);
    } else {
      // For lowdb, use the existing logic
      console.log("Using LowDB for message retrieval");
      let messages = db.get("messages");

      // Filter by threadId if provided
      if (threadId) {
        console.log(`Filtering by threadId: ${threadId}`);
        messages = messages.filter({ threadId });
      }

      // Filter by userId if provided
      if (userId) {
        // First get the user
        console.log(`Finding user with id: ${userId}`);
        const user = db.get("users").find({ id: userId }).value();

        if (!user) {
          console.log(`User not found with id=${userId}`);
          return res.status(404).json({ message: "User not found" });
        }

        console.log(`User found: ${user.id}, assistantId=${user.assistantId}`);

        // Check if user has an assistant with a thread
        if (user.assistantId) {
          console.log(`Looking for assistant with id=${user.assistantId}`);
          const assistant = db
            .get("assistants")
            .find({ id: user.assistantId })
            .value();

          if (assistant && assistant.threadId) {
            // Filter messages for this assistant's thread
            console.log(
              `Filtering messages by assistant's threadId=${assistant.threadId}`
            );
            messages = messages.filter({ threadId: assistant.threadId });
          } else {
            console.log(
              `Assistant has no threadId or not found for id=${user.assistantId}`
            );
            // No thread found for this user's assistant
            return res.json([]);
          }
        } else {
          console.log(`User has no assistantId: ${userId}`);
          // No assistant found for this user
          return res.json([]);
        }
      }

      // Sort by creation date
      console.log("Sorting messages by createdAt");
      messages = messages.sortBy("createdAt").value();
      console.log(`Returning ${messages.length} messages`);

      res.json(messages);
    }
  } catch (error) {
    console.error("Error in getAllMessages:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get messages for a specific thread
const getThreadMessages = async (req, res) => {
  const { threadId } = req.params;
  const db = req.db;
  const dbType = req.dbType;

  try {
    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const Message = require("../models/Message");

      const messages = await Message.find({ threadId }).sort({ createdAt: 1 });
      return res.json(messages);
    } else {
      // For lowdb, use the existing logic
      const messages = db
        .get("messages")
        .filter((message) => message.threadId === threadId)
        .sortBy("createdAt")
        .value();

      res.json(messages);
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all user messages across threads
const getUserMessages = async (req, res) => {
  const { userId } = req.params;
  const db = req.db;
  const dbType = req.dbType;

  try {
    console.log(
      `getUserMessages called for userId=${userId}, dbType=${dbType}`
    );

    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose models
      const Message = require("../models/Message");
      const User = require("../models/User");
      const Assistant = require("../models/Assistant");
      const ChatThread = require("../models/ChatThread");

      let messages = [];

      // 1. Find all threads for this user
      console.log(`Finding chat threads for userId=${userId}`);
      const threads = await ChatThread.find({ userId });
      console.log(`Found ${threads.length} chat threads`);

      // Collect both local threadIds and openaiThreadIds
      const threadIds = [];
      const openaiThreadIds = [];

      threads.forEach((thread) => {
        threadIds.push(thread.id);
        if (thread.openaiThreadId) {
          openaiThreadIds.push(thread.openaiThreadId);
        }
      });

      // Find messages with either local thread IDs or OpenAI thread IDs
      const threadCriteria = [];
      if (threadIds.length > 0) {
        threadCriteria.push({ threadId: { $in: threadIds } });
      }
      if (openaiThreadIds.length > 0) {
        threadCriteria.push({ threadId: { $in: openaiThreadIds } });
      }

      if (threadCriteria.length > 0) {
        // Get messages for these threads using $or operator to match either condition
        const threadMessages = await Message.find({
          $or: threadCriteria
        });
        console.log(
          `Found ${threadMessages.length} messages from chat threads`
        );
        messages = [...messages, ...threadMessages];
      }

      // 2. Check if user has an assistant with a thread
      console.log(`Finding user and assistant for userId=${userId}`);
      const user = await User.findOne({ id: userId });

      if (user && user.assistantId) {
        console.log(`User has assistantId=${user.assistantId}`);
        const assistant = await Assistant.findOne({ id: user.assistantId });

        if (assistant) {
          console.log(`Found assistant with id=${assistant.id}`);

          const assistantCriteria = [];

          // Add local thread ID if exists
          if (assistant.threadId) {
            console.log(`Assistant has threadId=${assistant.threadId}`);
            assistantCriteria.push({ threadId: assistant.threadId });
          }

          // Also check for messages with OpenAI thread IDs
          if (assistant.openaiThreadId) {
            console.log(
              `Assistant has openaiThreadId=${assistant.openaiThreadId}`
            );
            assistantCriteria.push({ threadId: assistant.openaiThreadId });
          }

          if (assistantCriteria.length > 0) {
            // Get messages for this assistant's thread using $or to match either condition
            const assistantMessages = await Message.find({
              $or: assistantCriteria
            });
            console.log(
              `Found ${assistantMessages.length} messages from assistant thread`
            );

            // Add any new messages not already included
            const existingIds = new Set(messages.map((m) => m.id));
            const newMessages = assistantMessages.filter(
              (m) => !existingIds.has(m.id)
            );

            messages = [...messages, ...newMessages];
          }
        }
      }

      // Sort all messages by creation date
      messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      console.log(
        `Returning ${messages.length} total messages for userId=${userId}`
      );

      return res.json(messages);
    } else {
      // For lowdb, use the existing logic but with similar improvements
      let messages = [];
      const messageIds = new Set(); // Track IDs to avoid duplicates

      // 1. First check local chat threads
      console.log(`Finding chat threads for userId=${userId} in lowdb`);
      const threads = db
        .get("chat_threads")
        .filter((thread) => thread.userId === userId)
        .value();
      console.log(`Found ${threads.length} chat threads`);

      // Collect both local threadIds and openaiThreadIds
      const threadIds = [];
      const openaiThreadIds = [];

      threads.forEach((thread) => {
        threadIds.push(thread.id);
        if (thread.openaiThreadId) {
          openaiThreadIds.push(thread.openaiThreadId);
        }
      });

      // Find messages with local thread IDs
      if (threadIds.length > 0) {
        const localMessages = db
          .get("messages")
          .filter((message) => threadIds.includes(message.threadId))
          .value();

        // Add unique messages
        localMessages.forEach((msg) => {
          if (!messageIds.has(msg.id)) {
            messageIds.add(msg.id);
            messages.push(msg);
          }
        });
      }

      // Find messages with OpenAI thread IDs
      if (openaiThreadIds.length > 0) {
        const openaiMessages = db
          .get("messages")
          .filter((message) => openaiThreadIds.includes(message.threadId))
          .value();

        // Add unique messages
        openaiMessages.forEach((msg) => {
          if (!messageIds.has(msg.id)) {
            messageIds.add(msg.id);
            messages.push(msg);
          }
        });
      }

      // 2. Check if user has an assistant with a thread
      console.log(`Finding user and assistant for userId=${userId} in lowdb`);
      const user = db.get("users").find({ id: userId }).value();

      if (user && user.assistantId) {
        console.log(`User has assistantId=${user.assistantId}`);
        const assistant = db
          .get("assistants")
          .find({ id: user.assistantId })
          .value();

        if (assistant) {
          console.log(`Found assistant with id=${assistant.id}`);

          // Check for messages with local thread ID
          if (assistant.threadId) {
            console.log(`Assistant has threadId=${assistant.threadId}`);
            const threadMessages = db
              .get("messages")
              .filter({ threadId: assistant.threadId })
              .value();

            // Add unique messages
            threadMessages.forEach((msg) => {
              if (!messageIds.has(msg.id)) {
                messageIds.add(msg.id);
                messages.push(msg);
              }
            });
          }
        }
      }

      // Sort all messages by creation date
      messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      console.log(
        `Returning ${messages.length} total messages for userId=${userId} from lowdb`
      );

      res.json(messages);
    }
  } catch (error) {
    console.error("Error in getUserMessages:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new message
const createMessage = async (req, res) => {
  const { threadId, content, role, openaiThreadId } = req.body;
  const db = req.db;
  const dbType = req.dbType;

  console.log(
    `Creating message with threadId=${threadId}, role=${role}, openaiThreadId=${
      openaiThreadId || "none"
    }`
  );

  try {
    const newMessage = {
      id: uuidv4(),
      threadId,
      content,
      role: role || "user", // Default to user role if not specified
      createdAt: new Date().toISOString()
    };

    // If OpenAI thread ID is provided, store it separately
    if (openaiThreadId) {
      newMessage.openaiThreadId = openaiThreadId;
    }

    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const Message = require("../models/Message");

      // Convert to MongoDB format
      const mongoMessage = new Message({
        ...newMessage,
        createdAt: new Date() // Use Date object instead of string
      });

      await mongoMessage.save();
      console.log(`Message created with id=${mongoMessage.id}`);
      return res.status(201).json(mongoMessage);
    } else {
      // For lowdb, use the existing logic
      db.get("messages").push(newMessage).write();
      console.log(`Message created with id=${newMessage.id}`);
      return res.status(201).json(newMessage);
    }
  } catch (error) {
    console.error("Error in createMessage:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new message for a specific thread (from route params)
const createThreadMessage = async (req, res) => {
  const { threadId } = req.params;
  const { content, role, userId } = req.body;
  const db = req.db;
  const dbType = req.dbType;

  try {
    const newMessage = {
      id: uuidv4(),
      threadId,
      content,
      role: role || "user", // Default to user role if not specified
      userId,
      createdAt: new Date().toISOString()
    };

    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const Message = require("../models/Message");

      // Convert to MongoDB format
      const mongoMessage = new Message({
        ...newMessage,
        createdAt: new Date() // Use Date object instead of string
      });

      await mongoMessage.save();
      return res.status(201).json(mongoMessage);
    } else {
      // For lowdb, use the existing logic
      db.get("messages").push(newMessage).write();
      return res.status(201).json(newMessage);
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Simulate asking a question to assistant (using sample data for now)
const askQuestion = async (req, res) => {
  const { userId } = req.params;
  const { question } = req.body;
  const db = req.db;
  const dbType = req.dbType;

  try {
    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose models
      const User = require("../models/User");
      const ChatThread = require("../models/ChatThread");
      const Message = require("../models/Message");

      // Find user
      const user = await User.findOne({ id: userId });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Find or create a thread for this user
      let thread = await ChatThread.findOne({ userId });

      if (!thread) {
        thread = new ChatThread({
          id: uuidv4(),
          userId,
          assistantId: user.assistantId || null,
          openaiThreadId: `thread_${uuidv4()}`, // Mock OpenAI thread ID
          createdAt: new Date()
        });

        await thread.save();
      }

      // Create user message
      const userMessage = new Message({
        id: uuidv4(),
        threadId: thread.id,
        content: question,
        role: "user",
        createdAt: new Date()
      });

      await userMessage.save();

      // Create mock assistant response after a delay
      setTimeout(async () => {
        const assistantMessage = new Message({
          id: uuidv4(),
          threadId: thread.id,
          content: `This is a mock response to your question: "${question}"`,
          role: "assistant",
          createdAt: new Date()
        });

        await assistantMessage.save();
      }, 1000);

      return res.status(201).json(userMessage);
    } else {
      // For lowdb, use the existing logic
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

      return res.status(201).json(userMessage);
    }
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
