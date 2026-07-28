import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "7d";

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in .env");
}

interface RegisterBody {
  email: string;
  password: string;
  username?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

function signToken(userId: bigint): string {
  return jwt.sign({ sub: userId.toString() }, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function serializeUser(user: { id: bigint; email: string; username: string | null }) {
  return { id: user.id.toString(), email: user.email, username: user.username };
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: RegisterBody }>("/register", async (request, reply) => {
    const { email, password, username } = request.body ?? {};

    if (!email || !password) {
      return reply.code(400).send({ error: "Email et mot de passe requis" });
    }

    // TODO: Add more validation for email and password
    if (password.length < 8) {
      return reply
        .code(400)
        .send({ error: "Le mot de passe doit contenir au moins 8 caractères" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: "Un compte existe déjà avec cet email" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, username },
    });

    const token = signToken(user.id);
    return reply.code(201).send({ user: serializeUser(user), token });
  });

  app.post<{ Body: LoginBody }>("/login", async (request, reply) => {
    const { email, password } = request.body ?? {};

    if (!email || !password) {
      return reply.code(400).send({ error: "Email et mot de passe requis" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(401).send({ error: "Identifiants invalides" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return reply.code(401).send({ error: "Identifiants invalides" });
    }

    const token = signToken(user.id);
    return reply.send({ user: serializeUser(user), token });
  });
}
