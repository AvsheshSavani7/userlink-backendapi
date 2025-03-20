const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

// JWT secret
const JWT_SECRET = "userlink-secret-key-hardcoded"; // Hardcoded since we're not using .env JWT_SECRET

// Register a new user
const register = async (req, res) => {
  const { username, email, password } = req.body;
  const db = req.db;

  // Check if user already exists
  const userExists = db.get("users").find({ email }).value();

  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  try {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    // Save user to db
    db.get("users").push(newUser).write();

    // Create token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Login user
const login = async (req, res) => {
  const { email, password } = req.body;
  const db = req.db;

  try {
    // Find user
    const user = db.get("users").find({ email }).value();

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "1d"
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token" });
  }
};

module.exports = {
  register,
  login,
  authenticateToken
};
