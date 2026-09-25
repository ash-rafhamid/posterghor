import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { hashPassword, signToken, verifyPassword, verifyToken } from "../lib/auth";

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");

describe("passwords", () => {
  it("hashes with a per-password salt and verifies", async () => {
    const [a, b] = await Promise.all([hashPassword("Correct Horse 1"), hashPassword("Correct Horse 1")]);
    assert.notEqual(a, "Correct Horse 1");
    assert.notEqual(a, b, "salted");
    assert.ok(await verifyPassword("Correct Horse 1", a));
    assert.ok(!(await verifyPassword("correct horse 1", a)));
    assert.ok(!(await verifyPassword("", a)));
  });
});

describe("JWT", () => {
  it("round-trips the subject and role", () => {
    assert.deepEqual(verifyToken(signToken({ sub: "u1", role: "user" })), { sub: "u1", role: "user" });
    assert.deepEqual(verifyToken(signToken({ sub: "a1", role: "admin" })), { sub: "a1", role: "admin" });
  });

  it("rejects garbage, wrong secrets, expiry and unsigned tokens", () => {
    assert.equal(verifyToken(""), null);
    assert.equal(verifyToken("not.a.token"), null);
    assert.equal(verifyToken(jwt.sign({ sub: "u1", role: "admin" }, "some-other-secret-value-1234")), null, "signed with another secret");
    assert.equal(verifyToken(jwt.sign({ sub: "u1", role: "user" }, env.JWT_SECRET, { expiresIn: -10 })), null, "expired");
    const unsigned = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "u1", role: "admin" })}.`;
    assert.equal(verifyToken(unsigned), null, "alg:none must not be accepted");
    const good = signToken({ sub: "u1", role: "user" });
    const [h, , s] = good.split(".");
    assert.equal(verifyToken(`${h}.${b64({ sub: "u1", role: "admin" })}.${s}`), null, "tampered payload");
  });

  it("only HS256 is accepted", () => {
    assert.equal(verifyToken(jwt.sign({ sub: "u1", role: "user" }, env.JWT_SECRET, { algorithm: "HS512" })), null);
  });

  it("never trusts a role other than admin", () => {
    assert.equal(verifyToken(jwt.sign({ sub: "u1", role: "superadmin" }, env.JWT_SECRET))?.role, "user");
    assert.equal(verifyToken(jwt.sign({ sub: "u1" }, env.JWT_SECRET))?.role, "user");
  });

  it("needs a subject", () => {
    assert.equal(verifyToken(jwt.sign({ role: "admin" }, env.JWT_SECRET)), null);
  });
});
