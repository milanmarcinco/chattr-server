import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import HttpException from "../errors/HttpException";

type GlobalRequestErrorHandler = (err: HttpException, req: Request, res: Response, next: NextFunction) => void;

const globalRequestErrorHandler: GlobalRequestErrorHandler = (err, _req, res, _next) => {
  res.status(err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
    error: err.message,
  });
};

export default globalRequestErrorHandler;
