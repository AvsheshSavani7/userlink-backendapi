const mongoose = require("mongoose");

const assistantSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  assistantId: {
    type: String
  },
  openai_id: {
    type: String
  },
  userId: {
    type: String
  },
  threadId: {
    type: String
  },
  tools: {
    type: mongoose.Schema.Types.Mixed
  },
  model: {
    type: String
  },
  instructions: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

module.exports = mongoose.model("Assistant", assistantSchema);
