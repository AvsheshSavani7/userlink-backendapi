// Load environment variables
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");
const socketIo = require("socket.io");
const { v4: uuidv4 } = require("uuid");

// DB setup
const { initializeDb } = require("./utils/db");

// Routes
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const chatThreadsRoutes = require("./routes/chat_threads");
const assistantsRoutes = require("./routes/assistants");
const filesRoutes = require("./routes/files");
const messagesRoutes = require("./routes/messages");

// Models for MongoDB
const Message = require("./models/Message");

// Initialize express app
const app = express();
const server = http.createServer(app);

// Database connection
let dbConnection;
let dbType;

await initializeDb();

app.use((req, res, next) => {
  req.db = {};
  req.dbType = "mongodb";
  next();
});
// Initialize database

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello World");
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/chat_threads", chatThreadsRoutes);
app.use("/api/assistants", assistantsRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/messages", messagesRoutes);

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
