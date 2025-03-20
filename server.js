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
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Database connection
let dbConnection;
let dbType;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database
const startServer = async () => {
  try {
    const dbInfo = await initializeDb();
    dbType = dbInfo.type;
    dbConnection = dbInfo.connection;

    // Make db accessible to routes
    app.use((req, res, next) => {
      req.db = dbConnection;
      req.dbType = dbType;
      next();
    });

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

    // Socket.io connection
    io.on("connection", (socket) => {
      console.log("New client connected");

      // Join a chatroom
      socket.on("joinRoom", (roomId) => {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
      });

      // Leave a chatroom
      socket.on("leaveRoom", (roomId) => {
        socket.leave(roomId);
        console.log(`User left room: ${roomId}`);
      });

      // Send message
      socket.on("sendMessage", async (message) => {
        const newMessage = {
          id: message.id || uuidv4(),
          text: message.text,
          userId: message.userId || "anonymous",
          chatThreadId: message.chatThreadId,
          timestamp: message.timestamp || new Date().toISOString()
        };

        try {
          // Save message to database
          if (dbType === "mongodb") {
            await new Message(newMessage).save();
          } else {
            dbConnection.get("messages").push(newMessage).write();
          }

          // Broadcast message to the specific room
          io.to(message.chatThreadId).emit("newMessage", newMessage);
        } catch (error) {
          console.error("Error saving message:", error);
        }
      });

      // Disconnect
      socket.on("disconnect", () => {
        console.log("Client disconnected");
      });
    });

    // Start server
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();
module.exports = app;
