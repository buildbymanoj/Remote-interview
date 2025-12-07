import express from "express";
import path from "path";
import cors from "cors";
import { serve } from "inngest/express";
import { clerkMiddleware } from "@clerk/express";

import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";
import { inngest, functions } from "./lib/inngest.js";

import chatRoutes from "./routes/chatRoutes.js";
import sessionRoutes from "./routes/sessionRoute.js";

const app = express();

const __dirname = path.resolve();

// middleware
app.use(express.json());
// credentials:true meaning?? => server allows a browser to include cookies on request
app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));
console.log("CORS configured with origin:", ENV.CLIENT_URL);
app.use(clerkMiddleware()); // this adds auth field to request object: req.auth()

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/chat", chatRoutes);
app.use("/api/sessions", sessionRoutes);
console.log("Routes registered: /api/inngest, /api/chat, /api/sessions");

app.get("/health", (req, res) => {
  res.status(200).json({ msg: "api is up and running" });
});

// make our app ready for deployment
if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/{*any}", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

const startServer = async () => {
  try {
    console.log("Starting server...");
    console.log("Environment:", ENV.NODE_ENV);
    console.log("DB_URL set:", !!ENV.DB_URL);
    console.log("STREAM_API_KEY set:", !!ENV.STREAM_API_KEY);
    console.log("CLIENT_URL:", ENV.CLIENT_URL);
    
    await connectDB();
    const PORT = process.env.PORT || ENV.PORT || 3000; // Added fallback port for Render deployment
    app.listen(PORT, () => {
      console.log("✅ Server is running on port:", PORT);
      console.log("✅ Health check available at /health");
    });
  } catch (error) {
    console.error("💥 Error starting the server", error);
    process.exit(1);
  }
};

startServer();
