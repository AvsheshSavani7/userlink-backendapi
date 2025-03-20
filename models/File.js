const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  filename: {
    type: String
  },
  size: {
    type: Number
  },
  type: {
    type: String
  },
  fileId: {
    type: String
  },
  openaiFileId: {
    type: String
  },
  purpose: {
    type: String
  },
  userId: {
    type: String,
    required: true
  },
  assistantId: {
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

module.exports = mongoose.model("File", fileSchema);
