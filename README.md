# Userlink Backend

Backend for the userlink-chatroom application.

## Technology Stack

- Node.js/Express
- Socket.io for real-time communication
- MongoDB for persistent data storage (falls back to LowDB for development)

## Data Storage

The application supports two database modes:

1. **MongoDB (Production)**: When deployed to Vercel, the app will use MongoDB for persistent data storage.
2. **LowDB (Development)**: For local development, the app will use a file-based LowDB database.

## Deployment to Vercel

### Prerequisites

- A GitHub repository containing this code
- A Vercel account
- A MongoDB Atlas account (or another MongoDB provider)

### Steps to Deploy

1. Create a MongoDB Atlas cluster:
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a new cluster (the free tier works fine)
   - Set up a database user with password authentication
   - Configure network access (allow access from anywhere for Vercel)
   - Get your connection string, it should look like:
     ```
     mongodb+srv://username:password@cluster.mongodb.net/userlink?retryWrites=true&w=majority
     ```

2. Push your code to a GitHub repository

3. Go to [Vercel](https://vercel.com) and sign up/sign in

4. Click "Add New" > "Project"

5. Import your GitHub repository

6. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `userlink-backend` (if your repo contains multiple projects)
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

7. Environment Variables:
   - Add all environment variables from `.env.example`, including:
   - `MONGODB_URI` (your MongoDB connection string)
   - `OPENAI_API_KEY` and other required values

8. Click "Deploy"

## Local Development

1. Clone the repository
2. Navigate to the project directory
3. Create a `.env` file based on `.env.example`
   - For local development, MongoDB is optional. If not provided, it will use LowDB
4. Install dependencies:
   ```
   npm install
   ```
5. Start the development server:
   ```
   npm run dev
   ```

The server will be available at http://localhost:5001 (or the port specified in your .env file). 