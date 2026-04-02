import { describe, it, expect } from "vitest";
import {
  generateId,
  generateToken,
  createToken,
  getUserIdFromToken,
  revokeToken,
  hashPassword,
  verifyPassword,
  isAdminRole,
  ADMIN_ROLE_SET,
} from "../src/lib/auth.js";

describe("generateId", () => {
  it("returns a valid UUID", () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe("generateToken", () => {
  it("returns a 64-character hex string", () => {
    const token = generateToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });
});

describe("token store", () => {
  it("createToken + getUserIdFromToken roundtrip works", () => {
    const userId = "test-user-123";
    const token = createToken(userId);
    expect(getUserIdFromToken(token)).toBe(userId);
  });

  it("getUserIdFromToken returns null for unknown token", () => {
    expect(getUserIdFromToken("nonexistent-token")).toBeNull();
  });

  it("revokeToken removes the token", () => {
    const userId = "test-user-456";
    const token = createToken(userId);
    expect(getUserIdFromToken(token)).toBe(userId);
    revokeToken(token);
    expect(getUserIdFromToken(token)).toBeNull();
  });

  it("revoking a nonexistent token does not throw", () => {
    expect(() => revokeToken("fake-token")).not.toThrow();
  });
});

describe("password hashing", () => {
  it("hashPassword returns salt:hash format", async () => {
    const hash = await hashPassword("testPassword123");
    expect(hash).toContain(":");
    const parts = hash.split(":");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toHaveLength(32);
  });

  it("verifyPassword returns true for correct password", async () => {
    const password = "mySecureP@ssw0rd";
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("verifyPassword returns false for wrong password", async () => {
    const hash = await hashPassword("correctPassword");
    const isValid = await verifyPassword("wrongPassword", hash);
    expect(isValid).toBe(false);
  });

  it("same password produces different hashes (salt is random)", async () => {
    const hash1 = await hashPassword("samePassword");
    const hash2 = await hashPassword("samePassword");
    expect(hash1).not.toBe(hash2);
  });
});

describe("admin role checks", () => {
  it("isAdminRole returns true for admin roles", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("super_admin")).toBe(true);
    expect(isAdminRole("ops_admin")).toBe(true);
    expect(isAdminRole("content_admin")).toBe(true);
    expect(isAdminRole("support_admin")).toBe(true);
  });

  it("isAdminRole returns false for regular user", () => {
    expect(isAdminRole("user")).toBe(false);
    expect(isAdminRole("")).toBe(false);
    expect(isAdminRole("moderator")).toBe(false);
  });

  it("ADMIN_ROLE_SET has exactly 5 roles", () => {
    expect(ADMIN_ROLE_SET.size).toBe(5);
  });
});
