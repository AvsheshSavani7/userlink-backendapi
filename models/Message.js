const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  text: {
    type: String
  },
  threadId: {
    type: String,
    required: true
  },
  openaiThreadId: {
    type: String
  },
  chatThreadId: {
    type: String
  },
  userId: {
    type: String
  },
  role: {
    type: String,
    enum: ["user", "assistant", "system"],
    default: "user"
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  timestamp: {
    type: Date
  }
});

module.exports = mongoose.model("Message", messageSchema);
