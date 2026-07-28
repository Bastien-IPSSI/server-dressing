import { FastifyInstance } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth, betterAuthBaseUrl } from "../lib/auth.js";

function requestBody(body: unknown): string | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }
  return typeof body === "string" ? body : JSON.stringify(body);
}

export async function authRoutes(app: FastifyInstance) {
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    async handler(request, reply) {
      try {
        const url = new URL(request.url, betterAuthBaseUrl);
        const response = await auth.handler(
          new Request(url, {
            method: request.method,
            headers: fromNodeHeaders(request.headers),
            body: requestBody(request.body),
          }),
        );

        reply.status(response.status);
        response.headers.forEach((value, key) => reply.header(key, value));

        return reply.send(response.body ? await response.text() : null);
      } catch (error) {
        request.log.error({ err: error }, "Better Auth request failed");
        return reply.status(500).send({
          error: "Erreur interne d'authentification",
          code: "AUTH_FAILURE",
        });
      }
    },
  });
}
