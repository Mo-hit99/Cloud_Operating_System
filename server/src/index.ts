import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { authRoutes } from "./routes/auth";
import { serviceRoutes } from "./routes/services";
import { instanceRoutes } from "./routes/instances";
import { initDatabase } from "./config/database";
import { initRedis } from "./config/redis";
import { ContainerMonitor } from "./services/containerMonitor";
import { TerminalService } from "./services/terminalService";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL || "http://localhost:3000",
      "http://localhost:5000",
      "http://127.0.0.1:5000",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  },
});
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || "http://localhost:3000",
      "http://localhost:5000",
      "http://127.0.0.1:5000",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 1000, // 15 minutes
  max: 500, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware (only for development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// Handle preflight requests
app.options("*", (req, res) => {
  console.log(`🔧 OPTIONS preflight for ${req.path}`);
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Content-Length, X-Requested-With"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/instances", instanceRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Serve static files from the React app build directory
if (
  process.env.NODE_ENV === "production" ||
  process.env.NODE_ENV === "development"
) {
  app.use(express.static(path.join(__dirname, "../../client/build")));

  // Catch all handler: send back React's index.html file for any non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "../../client/build/index.html"));
  });
}

// Initialize container monitor and terminal service
let containerMonitor: ContainerMonitor;
const terminalService = new TerminalService();

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Send initial container status
  socket.emit("connection-established", {
    message: "Connected to real-time updates",
  });

  socket.on(
    "get-container-logs",
    async (data: { containerId: string; lines?: number }) => {
      try {
        const logs = await containerMonitor.getContainerLogs(
          data.containerId,
          data.lines
        );
        socket.emit("container-logs", { containerId: data.containerId, logs });
      } catch (error) {
        socket.emit("error", { message: "Failed to get container logs" });
      }
    }
  );

  socket.on("get-container-stats", async (data: { containerId: string }) => {
    try {
      const stats = await containerMonitor.getContainerStats(data.containerId);
      socket.emit("container-stats", { containerId: data.containerId, stats });
    } catch (error) {
      socket.emit("error", { message: "Failed to get container stats" });
    }
  });

  // Terminal event handlers
  socket.on(
    "create-terminal",
    async (data: { containerId: string; sessionId: string }) => {
      console.log(
        `🖥️ Terminal connection request: ${
          data.sessionId
        } -> ${data.containerId.substring(0, 12)}...`
      );
      await terminalService.createTerminalSession(
        socket,
        data.containerId,
        data.sessionId
      );
    }
  );

  socket.on("terminal-input", (data: { sessionId: string; input: string }) => {
    console.log(
      `📝 Terminal input: ${data.sessionId} -> ${data.input.replace(
        /\n/g,
        "\\n"
      )}`
    );
    terminalService.writeToTerminal(data.sessionId, data.input);
  });

  socket.on(
    "terminal-resize",
    (data: { sessionId: string; cols: number; rows: number }) => {
      terminalService.resizeTerminal(data.sessionId, data.cols, data.rows);
    }
  );

  socket.on("close-terminal", (data: { sessionId: string }) => {
    terminalService.closeSession(data.sessionId);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    terminalService.closeAllSessionsForSocket(socket);
  });
});

// Make io available globally for other modules
declare global {
  var io: Server;
}
global.io = io;

async function startServer() {
  try {
    await initDatabase();
    await initRedis();

    // Start container monitoring
    containerMonitor = new ContainerMonitor(io);
    containerMonitor.start();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server ready for real-time updates`);
    });

    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully");
      containerMonitor.stop();
      server.close(() => {
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
