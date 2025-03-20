const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  filename: {
    type: String,
    required: true
  },
  fileId: {
    type: String
  },
  purpose: {
    type: String
  },
  userId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("File", fileSchema);
