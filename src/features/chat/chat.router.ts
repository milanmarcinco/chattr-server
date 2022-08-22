import { Socket } from "socket.io";

import { onInit, onMessageSend, onDisconnect } from "./chat.service";

const registerHandlers = (socket: Socket) => {
  socket.on("init", (cb) => onInit(socket, cb));
  socket.on("message:send", (payload, cb) => onMessageSend(socket, payload, cb));
  socket.on("disconnect", onDisconnect);
};

export default registerHandlers;
