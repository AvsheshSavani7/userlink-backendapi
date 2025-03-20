const { v4: uuidv4 } = require("uuid");
const openaiApi = require("../utils/openai");

// Create a new assistant
const createAssistant = async (req, res) => {
  const { name, instructions, model, tools, userId } = req.body;
  const db = req.db;

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

    // Save assistant to local db
    const newAssistant = {
      id: uuidv4(),
      openai_id: openaiAssistant.id,
      name,
      instructions,
      model: model || "gpt-4-turbo-preview",
      tools: tools || [],
      threadId: openaiThread.id,
      createdAt: new Date().toISOString()
    };

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
  } catch (error) {
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

  try {
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
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get assistant by ID
const getAssistantById = async (req, res) => {
  const { id } = req.params;
  const db = req.db;

  try {
    const assistant = db.get("assistants").find({ id }).value();

    if (!assistant) {
      return res.status(404).json({ message: "Assistant not found" });
    }

    res.json(assistant);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update assistant
const updateAssistant = async (req, res) => {
  const { id } = req.params;
  const { name, instructions, model, tools } = req.body;
  const db = req.db;

  // Check if assistant exists
  const assistant = db.get("assistants").find({ id }).value();

  if (!assistant) {
    return res.status(404).json({ message: "Assistant not found" });
  }

  try {
    // Update in OpenAI
    const updateData = {
      name: name || assistant.name,
      instructions: instructions || assistant.instructions,
      model: model || assistant.model,
      tools: tools || assistant.tools
    };

    await openaiApi.updateAssistant(assistant.openai_id, updateData);

    // Update locally
    db.get("assistants")
      .find({ id })
      .assign({
        ...updateData,
        updatedAt: new Date().toISOString()
      })
      .write();

    const updatedAssistant = db.get("assistants").find({ id }).value();

    res.json(updatedAssistant);
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

  // Check if assistant exists
  const assistant = db.get("assistants").find({ id }).value();

  if (!assistant) {
    return res.status(404).json({ message: "Assistant not found" });
  }

  try {
    // Try to delete from OpenAI, but continue even if it fails
    try {
      await openaiApi.deleteAssistant(assistant.openai_id);
    } catch (openaiError) {
      console.error(
        "Error deleting assistant from OpenAI:",
        openaiError.message
      );
      // Continue with local deletion even if OpenAI deletion fails
    }

    // 1. Clean up any messages associated with this assistant's thread
    if (assistant.threadId) {
      db.get("messages").remove({ threadId: assistant.threadId }).write();
    }

    // 2. Find all files associated with this assistant
    const associatedFiles = db.get("files").filter({ assistantId: id }).value();

    // 3. Remove files from database
    if (associatedFiles.length > 0) {
      db.get("files").remove({ assistantId: id }).write();

      // Note: We're not deleting files from OpenAI here as they might be
      // used by other assistants or still needed. File cleanup should be
      // handled separately if needed.
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
