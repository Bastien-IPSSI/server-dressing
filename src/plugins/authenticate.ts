import { FastifyReply, FastifyRequest } from "fastify";
import { verifyToken } from "../lib/jwt";

declare module "fastify" {
  interface FastifyRequest {
    userId: bigint;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return reply.code(401).send({ error: "Authentification requise" });
  }

  try {
    const payload = verifyToken(token);
    request.userId = BigInt(payload.sub);
  } catch {
    return reply.code(401).send({ error: "Token invalide ou expiré" });
  }
}
