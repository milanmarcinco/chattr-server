import { ExtendedError } from "socket.io/dist/namespace";

type INextFunction = (err?: ExtendedError) => void;
type WSCallback = (arg: any) => void;

interface IMessageSendPayload {
  targetRoomId: string;
  content: string;
}
