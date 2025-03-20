const mongoose = require("mongoose");

const chatThreadSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: false
  },
  name: {
    type: String,
    required: false
  },
  userId: {
    type: String,
    required: true
  },
  assistantId: {
    type: String,
    required: false
  },
  openaiThreadId: {
    type: String,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("ChatThread", chatThreadSchema);
