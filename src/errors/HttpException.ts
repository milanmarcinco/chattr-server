export default class HttpException extends Error {
  statusCode: number;

  constructor({ message, statusCode }: { message: string; statusCode: number }) {
    super(message);

    this.name = "RequestError";
    this.statusCode = statusCode;
  }
}
