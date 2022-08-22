import jwt from "jsonwebtoken";

const { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_EXP, REFRESH_TOKEN_EXP } = process.env as unknown as {
  ACCESS_TOKEN_SECRET: string;
  REFRESH_TOKEN_SECRET: string;
  ACCESS_TOKEN_EXP: string;
  REFRESH_TOKEN_EXP: string;
};

interface IPayload {
  id: string;
}

const generateTokens = (payload: IPayload) => {
  try {
    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXP + "m" });
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXP + "d" });

    return { accessToken, refreshToken };
  } catch {
    return { accessToken: null, refreshToken: null };
  }
};

const verifyToken = (token: string) => {
  try {
    try {
      const accessTokenPayload = jwt.verify(token, ACCESS_TOKEN_SECRET) as IPayload;
      return { id: accessTokenPayload.id };
    } catch (err) {
      const refreshTokenPayload = jwt.verify(token, REFRESH_TOKEN_SECRET) as IPayload;
      return { id: refreshTokenPayload.id };
    }
  } catch (err) {
    return null;
  }
};

export default { generateTokens, verifyToken };
