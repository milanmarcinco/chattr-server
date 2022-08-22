import { Handler } from "express";
import argon2 from "argon2";
import { StatusCodes } from "http-status-codes";

import prisma from "../../db/prisma";
import jwt from "../../lib/jwt";
import HttpException from "../../errors/HttpException";

import {
  registerBody,
  logInBody,
  renewTokensBody,
  changePasswordBody,
  logOutBody,
  logOutAllBody,
  deleteUserBody,
} from "./auth.dto";

//TODO: Respond with errors array/object containing error message for each request body field

export const register: Handler = async (req, res, next) => {
  try {
    const result = registerBody.safeParse(req.body);
    if (!result.success)
      throw new HttpException({ message: result.error.errors[0].message, statusCode: StatusCodes.BAD_REQUEST });

    const { email, password, firstName, lastName } = result.data;

    const match = await prisma.user.findFirst({ where: { email } });
    if (match) throw new HttpException({ message: "User already exists", statusCode: StatusCodes.CONFLICT });

    try {
      var passwordHash = await argon2.hash(password);
    } catch (err) {
      throw new HttpException({
        message: "Could not hash password",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    try {
      var user = await prisma.user.create({ data: { email, passwordHash, firstName, lastName }, select: { id: true } });
    } catch (err) {
      throw new HttpException({
        message: "Could not create a new user",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    const { accessToken, refreshToken } = jwt.generateTokens({ id: user.id });

    if (!accessToken || !refreshToken)
      throw new HttpException({
        message: "An error occurred while trying to log in the newly registered user",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });

    try {
      await prisma.user.update({
        where: { email },
        data: {
          refreshTokens: {
            push: refreshToken,
          },
        },
      });
    } catch {
      throw new HttpException({
        message: "An error occurred while trying to log in the newly registered user",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    res.status(StatusCodes.CREATED).json({
      error: null,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

export const logIn: Handler = async (req, res, next) => {
  try {
    const result = logInBody.safeParse(req.body);
    if (!result.success)
      throw new HttpException({ message: result.error.errors[0].message, statusCode: StatusCodes.BAD_REQUEST });

    const { email, password } = result.data;

    try {
      var user = await prisma.user.findFirst({ where: { email } });
    } catch (err) {
      throw new HttpException({
        message: "Could not find user",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    if (!user) throw new HttpException({ message: "User not found", statusCode: StatusCodes.NOT_FOUND });

    try {
      var passwordIsCorrect = await argon2.verify(user.passwordHash, password);
    } catch {
      throw new HttpException({
        message: "Failed to verify password",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    if (!passwordIsCorrect)
      throw new HttpException({ message: "Password is incorrect", statusCode: StatusCodes.UNAUTHORIZED });

    const { accessToken, refreshToken } = jwt.generateTokens({ id: user.id });

    if (!accessToken || !refreshToken)
      throw new HttpException({
        message: "An error occurred while trying to log in",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          refreshTokens: {
            push: refreshToken,
          },
        },
      });
    } catch {
      throw new HttpException({
        message: "An error occurred while trying to log in",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    res.status(200).json({
      error: null,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

export const renewTokens: Handler = async (req, res, next) => {
  try {
    const result = renewTokensBody.safeParse(req.body);
    if (!result.success)
      throw new HttpException({ message: result.error.errors[0].message, statusCode: StatusCodes.BAD_REQUEST });

    const { refreshToken } = result.data;

    const tokenPayload = jwt.verifyToken(refreshToken);
    if (!tokenPayload)
      throw new HttpException({ message: "Invalid refresh token", statusCode: StatusCodes.UNAUTHORIZED });

    const { id } = tokenPayload;

    try {
      var user = await prisma.user.findFirst({ where: { id } });
    } catch (err) {
      throw new HttpException({
        message: "Could not find user",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    if (!user) throw new HttpException({ message: "User does not exist", statusCode: StatusCodes.NOT_FOUND });

    if (!user.refreshTokens.includes(refreshToken))
      throw new HttpException({ message: "Invalid refresh token", statusCode: StatusCodes.UNAUTHORIZED });

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = jwt.generateTokens({ id });

    if (!newAccessToken || !newRefreshToken)
      throw new HttpException({
        message: "An error occurred while trying to renew the token",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });

    try {
      await prisma.user.update({
        where: { id },
        data: {
          refreshTokens: {
            set: [
              ...user.refreshTokens.filter((token) => token !== refreshToken && jwt.verifyToken(token)),
              newRefreshToken,
            ],
          },
        },
      });
    } catch (err) {
      throw new HttpException({
        message: "An error occurred while trying to renew the token",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    res.status(StatusCodes.OK).json({
      error: null,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword: Handler = async (req, res, next) => {
  try {
    const result = changePasswordBody.safeParse(req.body);
    if (!result.success)
      throw new HttpException({ message: result.error.errors[0].message, statusCode: StatusCodes.BAD_REQUEST });

    const { refreshToken, oldPassword, newPassword } = result.data;

    const tokenPayload = jwt.verifyToken(refreshToken);
    if (!tokenPayload)
      throw new HttpException({ message: "Invalid refresh token", statusCode: StatusCodes.UNAUTHORIZED });

    const { id } = tokenPayload;

    try {
      var user = await prisma.user.findFirst({ where: { id } });
    } catch (err) {
      throw new HttpException({
        message: "Could not find user",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    if (!user) throw new HttpException({ message: "User does not exist", statusCode: StatusCodes.NOT_FOUND });

    if (!user.refreshTokens.includes(refreshToken))
      throw new HttpException({ message: "Invalid refresh token", statusCode: StatusCodes.UNAUTHORIZED });

    try {
      var passwordIsCorrect = await argon2.verify(user.passwordHash, oldPassword);
    } catch {
      throw new HttpException({
        message: "Failed to verify password",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    if (!passwordIsCorrect)
      throw new HttpException({ message: "Password is incorrect", statusCode: StatusCodes.UNAUTHORIZED });

    try {
      var newPasswordHash = await argon2.hash(newPassword);
    } catch (err) {
      throw new HttpException({
        message: "Could not hash password",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    try {
      await prisma.user.update({
        where: { id },
        data: {
          passwordHash: newPasswordHash,
          refreshTokens: {
            set: [],
          },
        },
      });
    } catch {
      throw new HttpException({
        message: "An error occurred while trying to change password",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    res.status(StatusCodes.OK).json({
      error: null,
    });
  } catch (err) {
    next(err);
  }
};

export const logOut: Handler = async (req, res, next) => {
  try {
    const result = logOutBody.safeParse(req.body);
    if (!result.success)
      throw new HttpException({ message: result.error.errors[0].message, statusCode: StatusCodes.BAD_REQUEST });

    const { refreshToken } = result.data;

    const tokenPayload = jwt.verifyToken(refreshToken);
    if (!tokenPayload)
      throw new HttpException({ message: "Invalid refresh token", statusCode: StatusCodes.UNAUTHORIZED });

    const { id } = tokenPayload;

    try {
      var user = await prisma.user.findFirst({ where: { id } });
    } catch (err) {
      throw new HttpException({
        message: "Could not find user",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    if (!user) throw new HttpException({ message: "User does not exist", statusCode: StatusCodes.NOT_FOUND });

    if (!user.refreshTokens.includes(refreshToken))
      throw new HttpException({ message: "Invalid refresh token", statusCode: StatusCodes.UNAUTHORIZED });

    try {
      await prisma.user.update({
        where: { id },
        data: {
          refreshTokens: {
            set: [...user.refreshTokens.filter((token) => token !== refreshToken)],
          },
        },
      });
    } catch {
      throw new HttpException({
        message: "An error occurred while logging out",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    res.status(StatusCodes.OK).json({
      error: null,
    });
  } catch (err) {
    next(err);
  }
};

export const logOutAll: Handler = async (req, res, next) => {
  try {
    const result = logOutAllBody.safeParse(req.body);
    if (!result.success)
      throw new HttpException({ message: result.error.errors[0].message, statusCode: StatusCodes.BAD_REQUEST });

    const { refreshToken } = result.data;

    const tokenPayload = jwt.verifyToken(refreshToken);
    if (!tokenPayload)
      throw new HttpException({ message: "Invalid refresh token", statusCode: StatusCodes.UNAUTHORIZED });

    const { id } = tokenPayload;

    try {
      var user = await prisma.user.findFirst({ where: { id } });
    } catch (err) {
      throw new HttpException({
        message: "Could not find user",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    if (!user) throw new HttpException({ message: "User does not exist", statusCode: StatusCodes.NOT_FOUND });

    if (!user.refreshTokens.includes(refreshToken))
      throw new HttpException({ message: "Invalid refresh token", statusCode: StatusCodes.UNAUTHORIZED });

    try {
      await prisma.user.update({
        where: { id },
        data: { refreshTokens: { set: [] } },
      });
    } catch {
      throw new HttpException({
        message: "An error occurred while logging out",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    res.status(StatusCodes.OK).json({
      error: null,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteUser: Handler = async (req, res, next) => {
  try {
    const result = deleteUserBody.safeParse(req.body);
    if (!result.success)
      throw new HttpException({ message: result.error.errors[0].message, statusCode: StatusCodes.BAD_REQUEST });

    const { refreshToken, password } = result.data;

    const tokenPayload = jwt.verifyToken(refreshToken);
    if (!tokenPayload)
      throw new HttpException({ message: "Invalid refresh token", statusCode: StatusCodes.UNAUTHORIZED });

    const { id } = tokenPayload;

    try {
      var user = await prisma.user.findFirst({ where: { id } });
    } catch (err) {
      throw new HttpException({
        message: "Could not find user",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    if (!user) throw new HttpException({ message: "User does not exist", statusCode: StatusCodes.NOT_FOUND });

    if (!user.refreshTokens.includes(refreshToken))
      throw new HttpException({ message: "Invalid refresh token", statusCode: StatusCodes.UNAUTHORIZED });

    try {
      var passwordIsCorrect = await argon2.verify(user.passwordHash, password);
    } catch {
      throw new HttpException({
        message: "Failed to verify password",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    }

    if (!passwordIsCorrect)
      throw new HttpException({ message: "Password is incorrect", statusCode: StatusCodes.UNAUTHORIZED });

    try {
      await prisma.user.delete({ where: { id } });
    } catch {
      throw new HttpException({ message: "Failed to delete user", statusCode: StatusCodes.INTERNAL_SERVER_ERROR });
    }

    res.status(StatusCodes.OK).json({
      error: null,
    });
  } catch (err) {
    next(err);
  }
};
