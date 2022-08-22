import { Handler } from "express";
import { Socket } from "socket.io";

import prisma from "../../db/prisma";
import jwt from "../../lib/jwt";

import { INextFunction } from "types";

// export const httpAuthMiddleware: Handler = async (req, res, next) => {
//   try {
//     const { authToken, refreshToken } = req.body;

//     let payload = jwtVerify(authToken, "auth", { ignoreExpiration: false });

//     if (!payload) {
//       payload = jwtVerify(refreshToken, "refresh", { ignoreExpiration: false });
//     }

//     if (!payload) {
//       throw { message: "User not authenticated", statusCode: 401 };
//     }

//     const user = await User.findById(payload._id).exec();
//     if (!user) throw { message: "User does not exist", statusCode: 404 };

//     const newAuthToken = await user.genToken("auth", { expiresIn: "30m" });

//     req.newAuthToken = newAuthToken;
//     req.user = user;

//     next();
//   } catch (err) {
//     next(err);
//   }
// };

export const wsAuthMiddleware = async (socket: Socket, next: INextFunction) => {
  try {
    const accessToken: string = socket.handshake.auth.accessToken;

    const tokenPayload = jwt.verifyToken(accessToken);
    if (!tokenPayload) throw new Error("Invalid access token");

    const { id } = tokenPayload;

    socket.join(id);
    socket.data.userId = id;

    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
};
