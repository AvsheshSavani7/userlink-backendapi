const { v4: uuidv4 } = require("uuid");
const openaiApi = require("../utils/openai");

// Create a new assistant
const createAssistant = async (req, res) => {
  const { name, instructions, model, tools, userId } = req.body;
  const db = req.db;
  const dbType = req.dbType;

  try {
    // Create assistant in OpenAI
    const assistantData = {
      name,
      instructions,
      model: model || "gpt-4-turbo-preview",
      tools: tools || []
    };

    const openaiAssistant = await openaiApi.createAssistant(assistantData);

    // Create an OpenAI thread for this assistant
    const openaiThread = await openaiApi.createThread();

    // Prepare the new assistant object
    const newAssistant = {
      id: uuidv4(),
      openai_id: openaiAssistant.id,
      name,
      instructions,
      model: model || "gpt-4-turbo-preview",
      tools: tools || [],
      threadId: openaiThread.id,
      openaiThreadId: openaiThread.id,
      createdAt: new Date().toISOString()
    };

    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose models
      const Assistant = require("../models/Assistant");
      const User = require("../models/User");

      // Save assistant to MongoDB
      const mongoAssistant = new Assistant({
        id: newAssistant.id,
        name: newAssistant.name,
        description: newAssistant.instructions,
        assistantId: newAssistant.openai_id, // Store OpenAI ID in assistantId field
        openai_id: newAssistant.openai_id, // Also store in openai_id for consistency
        threadId: newAssistant.threadId,
        openaiThreadId: newAssistant.openaiThreadId,
        createdAt: new Date()
      });

      await mongoAssistant.save();

      // If userId is provided, also create a chat thread entry and update user
      if (userId) {
        // Update the user to link to this assistant
        await User.findOneAndUpdate(
          { id: userId },
          { assistantId: newAssistant.id }
        );

        // Create a chat thread in MongoDB
        const ChatThread = require("../models/ChatThread");
        const chatThread = new ChatThread({
          id: uuidv4(),
          name: `${name}'s Thread`,
          userId: userId,
          assistantId: newAssistant.id,
          openaiThreadId: openaiThread.id,
          createdAt: new Date()
        });

        await chatThread.save();
      }

      res.status(201).json(newAssistant);
    } else {
      // For lowdb, use the existing logic but add openaiThreadId
      newAssistant.openaiThreadId = openaiThread.id;
      db.get("assistants").push(newAssistant).write();

      // If userId is provided, also create a chat thread entry
      if (userId) {
        // Create a chat thread that maps the OpenAI thread to the user and assistant
        const chatThread = {
          id: uuidv4(),
          name: `${name}'s Thread`,
          userId: userId,
          assistantId: newAssistant.id,
          openaiThreadId: openaiThread.id,
          createdAt: new Date().toISOString()
        };

        db.get("chat_threads").push(chatThread).write();

        // Update the user to link to this assistant
        db.get("users")
          .find({ id: userId })
          .assign({ assistantId: newAssistant.id })
          .write();
      }

      res.status(201).json(newAssistant);
    }
  } catch (error) {
    console.error("Error creating assistant:", error);
    res.status(500).json({
      message: "Error creating assistant",
      error: error.response?.data || error.message
    });
  }
};

// Get all assistants
const getAllAssistants = async (req, res) => {
  const { userId } = req.query; // Get userId from query parameters if provided
  const db = req.db;
  const dbType = req.dbType;

  try {
    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const User = require("../models/User");
      const Assistant = require("../models/Assistant");

      if (userId) {
        // First, check if the user has an assistantId
        const user = await User.findOne({ id: userId });

        if (user && user.assistantId) {
          // Find the assistant by ID
          const assistant = await Assistant.findOne({ id: user.assistantId });
          return res.json(assistant ? [assistant] : []);
        } else {
          // If no assistantId is found on the user, return an empty array
          return res.json([]);
        }
      } else {
        // Get all assistants from MongoDB
        const assistants = await Assistant.find({});
        return res.json(assistants);
      }
    } else {
      // For lowdb, use the existing logic
      let assistants = db.get("assistants");

      // Filter by userId if provided
      if (userId) {
        // First, check if the user has an assistantId
        const user = db.get("users").find({ id: userId }).value();

        if (user && user.assistantId) {
          // Find the assistant by ID
          assistants = assistants.filter({ id: user.assistantId });
        } else {
          // If no assistantId is found on the user, return an empty array
          return res.json([]);
        }
      }

      // Get the final value
      assistants = assistants.value();

      res.json(assistants);
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get assistant by ID
const getAssistantById = async (req, res) => {
  const { id } = req.params;
  const db = req.db;
  const dbType = req.dbType;

  try {
    if (dbType === "mongodb") {
      // For MongoDB, use the Mongoose model
      const Assistant = require("../models/Assistant");

      // Find assistant by ID
      const assistant = await Assistant.findOne({ id });

      if (!assistant) {
        return res.status(404).json({ message: "Assistant not found" });
      }

      res.json(assistant);
    } else {
      // For lowdb, use the existing logic
      const assistant = db.get("assistants").find({ id }).value();

      if (!assistant) {
        return res.status(404).json({ message: "Assistant not found" });
      }

      res.json(assistant);
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update assistant
const updateAssistant = async (req, res) => {
  const { id } = req.params;
  const { name, instructions, model, tools } = req.body;
  const db = req.db;
  const dbType = req.dbType;

  try {
    // Find the assistant first
    let assistant;

    if (dbType === "mongodb") {
      const Assistant = require("../models/Assistant");
      assistant = await Assistant.findOne({ id });
    } else {
      assistant = db.get("assistants").find({ id }).value();
    }

    // Check if assistant exists
    if (!assistant) {
      return res.status(404).json({ message: "Assistant not found" });
    }

    // Update in OpenAI
    const updateData = {
      name: name || assistant.name,
      instructions: instructions || assistant.instructions,
      model: model || assistant.model,
      tools: tools || assistant.tools
    };

    await openaiApi.updateAssistant(
      assistant.openai_id || assistant.assistantId,
      updateData
    );

    // Prepare the data to update
    const updateFields = {
      ...(name && { name: name }),
      ...(instructions && { description: instructions }),
      updatedAt: new Date().toISOString()
    };

    let updatedAssistant;

    if (dbType === "mongodb") {
      // For MongoDB, use Mongoose to update
      const Assistant = require("../models/Assistant");
      updatedAssistant = await Assistant.findOneAndUpdate(
        { id },
        { $set: updateFields },
        { new: true } // Return the updated document
      );

      res.json(updatedAssistant);
    } else {
      // For lowdb, use the existing logic
      db.get("assistants")
        .find({ id })
        .assign({
          ...updateData,
          updatedAt: new Date().toISOString()
        })
        .write();

      updatedAssistant = db.get("assistants").find({ id }).value();
      res.json(updatedAssistant);
    }
  } catch (error) {
    res.status(500).json({
      message: "Error updating assistant",
      error: error.response?.data || error.message
    });
  }
};

// Delete assistant
const deleteAssistant = async (req, res) => {
  const { id } = req.params;
  const db = req.db;
  const dbType = req.dbType;

  try {
    // Find the assistant first
    let assistant;

    if (dbType === "mongodb") {
      const Assistant = require("../models/Assistant");
      assistant = await Assistant.findOne({ id });
    } else {
      assistant = db.get("assistants").find({ id }).value();
    }

    // Check if assistant exists
    if (!assistant) {
      return res.status(404).json({ message: "Assistant not found" });
    }

    // Try to delete from OpenAI, but continue even if it fails
    try {
      const openaiId = assistant.openai_id || assistant.assistantId;
      if (openaiId) {
        await openaiApi.deleteAssistant(openaiId);
      }
    } catch (openaiError) {
      console.error(
        "Error deleting assistant from OpenAI:",
        openaiError.message
      );
      // Continue with local deletion even if OpenAI deletion fails
    }

    if (dbType === "mongodb") {
      // For MongoDB, handle deletion with Mongoose
      const User = require("../models/User");
      const ChatThread = require("../models/ChatThread");
      const File = require("../models/File");
      const Message = require("../models/Message");

      // 1. Find the threadId of this assistant
      const threadId = assistant.threadId;

      // 2. Delete messages associated with this thread
      if (threadId) {
        await Message.deleteMany({ threadId });
      }

      // 3. Delete chat threads associated with this assistant
      await ChatThread.deleteMany({ assistantId: id });

      // 4. Update users that had this assistant
      await User.updateMany(
        { assistantId: id },
        { $unset: { assistantId: "" } }
      );

      // 5. Remove file associations
      await File.updateMany(
        { assistantId: id },
        { $unset: { assistantId: "" } }
      );

      // 6. Finally delete the assistant
      await Assistant.deleteOne({ id });

      res.json({ message: "Assistant deleted successfully" });
    } else {
      // For lowdb, use the existing logic
      // 1. Clean up any messages associated with this assistant's thread
      if (assistant.threadId) {
        db.get("messages").remove({ threadId: assistant.threadId }).write();
      }

      // 2. Find all files associated with this assistant
      const associatedFiles = db
        .get("files")
        .filter({ assistantId: id })
        .value();

      // 3. Remove files from database
      if (associatedFiles.length > 0) {
        db.get("files").remove({ assistantId: id }).write();
      }

      // 4. Update any users that had this assistant
      db.get("users")
        .filter({ assistantId: id })
        .each((user) => {
          db.get("users")
            .find({ id: user.id })
            .assign({ assistantId: null })
            .write();
        })
        .value();

      // 5. Delete from local db
      db.get("assistants").remove({ id }).write();

      res.json({ message: "Assistant deleted successfully" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error deleting assistant",
      error: error.response?.data || error.message
    });
  }
};

module.exports = {
  createAssistant,
  getAllAssistants,
  getAssistantById,
  updateAssistant,
  deleteAssistant
};
