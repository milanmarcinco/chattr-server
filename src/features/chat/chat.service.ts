import prisma from "../../db/prisma";

import { Socket } from "socket.io";
import { IMessageSendPayload, WSCallback } from "types";

export const onInit = async (socket: Socket, cb: WSCallback) => {
  const userId: string = socket.data.userId;

  const rooms = await prisma.room.findMany({
    where: {
      participants: {
        some: {
          userId,
        },
      },
    },

    orderBy: {
      updatedAt: "desc",
    },

    include: {
      participants: {
        where: {
          userId: {
            not: userId,
          },
        },

        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },

      messages: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  cb({ rooms });
};

export const onMessageSend = async (socket: Socket, payload: IMessageSendPayload, cb: WSCallback) => {
  const authorId = socket.data.userId;
  const targetRoomId = payload.targetRoomId;

  prisma.room.update({
    where: {
      id: targetRoomId,
    },

    data: {
      updatedAt: new Date().toISOString(),
    },
  });

  const participants = await prisma.participant.findMany({
    where: {
      roomId: targetRoomId,
    },

    include: {
      room: true,
    },
  });

  const participantIds = participants.map((participant) => participant.userId);

  const message = await prisma.message.create({
    data: {
      userId: authorId,
      roomId: targetRoomId,
      content: payload.content,
    },

    include: {
      user: {
        select: {
          id: true,
          firstName: true,
        },
      },
    },
  });

  socket.to(participantIds).emit("message:receive", message);
  cb(message);
};

export const onDisconnect = () => {};
