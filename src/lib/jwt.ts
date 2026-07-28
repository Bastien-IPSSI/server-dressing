import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in .env");
}

export interface JwtPayload {
  sub: string;
}

export function signToken(userId: bigint): string {
  return jwt.sign({ sub: userId.toString() }, JWT_SECRET as string, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET as string) as JwtPayload;
}
