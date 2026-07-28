import { FastifyReply, FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";

type AuthSession = typeof auth.$Infer.Session;

declare module "fastify" {
  interface FastifyRequest {
    authSession: AuthSession;
    userId: string;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      return reply.code(401).send({ error: "Authentification requise" });
    }

    request.authSession = session;
    request.userId = session.user.id;
  } catch {
    return reply.code(401).send({ error: "Session invalide ou expirée" });
  }
}
