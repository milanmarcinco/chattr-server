import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

// Middleware
import { wsAuthMiddleware } from "./features/auth/auth.middleware";

// HTTP Routes
import authRouter from "./features/auth/auth.router";

// WebSocket Routes
import registerHandlers from "./features/chat/chat.router";

import globalRequestErrorHandler from "./lib/globalRequestErrorHandler";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);

io.use(wsAuthMiddleware);

io.on("connection", (socket) => {
  registerHandlers(socket);
});

app.use(globalRequestErrorHandler);

const port = process.env.port || 4000;
server.listen(port, () => {
  console.log(`Server listening on port *:${port}...`);
});
