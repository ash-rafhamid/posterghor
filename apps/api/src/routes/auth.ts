import { Router } from "express";
import { loginSchema, parseIdentifier, registerSchema, type LoginInput, type RegisterInput } from "@poster/shared";
import { DUMMY_HASH, hashPassword, signToken, verifyPassword } from "../lib/auth";
import { conflict, unauthorized } from "../lib/errors";
import { authLimiter } from "../middleware/rateLimit";
import { requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { User } from "../models/User";
import { toApiUser } from "../serializers";

export const authRouter = Router();

authRouter.post("/register", authLimiter, validate(registerSchema), async (req, res) => {
  const { name, identifier, password } = req.body as RegisterInput;
  const id = parseIdentifier(identifier)!;
  const taken = await User.exists(id.kind === "email" ? { email: id.value } : { phone: id.value });
  if (taken) throw conflict(id.kind === "email" ? "An account with this email already exists. Try signing in." : "An account with this mobile number already exists. Try signing in.", "ACCOUNT_EXISTS");

  const user = await User.create({
    name,
    ...(id.kind === "email" ? { email: id.value } : { phone: id.value }),
    passwordHash: await hashPassword(password),
    role: "user",
    lastLoginAt: new Date(),
  });
  res.status(201).json({ user: toApiUser(user), token: signToken({ sub: String(user._id), role: user.role }) });
});

authRouter.post("/login", authLimiter, validate(loginSchema), async (req, res) => {
  const { identifier, password } = req.body as LoginInput;
  const id = parseIdentifier(identifier)!;
  const user = await User.findOne(id.kind === "email" ? { email: id.value } : { phone: id.value }).select("+passwordHash");
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized("Incorrect email / mobile number or password", "BAD_CREDENTIALS");
  if (user.blocked) throw unauthorized("This account has been suspended. Please contact support.", "ACCOUNT_BLOCKED");
  user.lastLoginAt = new Date();
  await user.save();
  res.json({ user: toApiUser(user), token: signToken({ sub: String(user._id), role: user.role }) });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: toApiUser(req.user!) });
});
