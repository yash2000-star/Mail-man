import crypto from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { decryptApiKey, encryptApiKey, needsReencryption } from "@/lib/encryption";

const KEY = "0123456789abcdef0123456789abcdef";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = KEY;
});

/** A value in the format used before AES-GCM (AES-256-CBC, "iv:data" in hex). */
function legacyCbc(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(KEY), iv);
  return `${iv.toString("hex")}:${Buffer.concat([cipher.update(text), cipher.final()]).toString("hex")}`;
}

describe("encryption", () => {
  it("round-trips a key with AES-GCM", () => {
    const stored = encryptApiKey("sk-test-1234567890");
    expect(stored.startsWith("v2:")).toBe(true);
    expect(stored).not.toContain("sk-test");
    expect(decryptApiKey(stored)).toBe("sk-test-1234567890");
  });

  it("uses a fresh IV every time", () => {
    expect(encryptApiKey("same")).not.toBe(encryptApiKey("same"));
  });

  it("still reads keys saved with AES-CBC", () => {
    expect(decryptApiKey(legacyCbc("AIzaSy-old-key"))).toBe("AIzaSy-old-key");
  });

  it("passes through keys saved before encryption existed", () => {
    expect(decryptApiKey("plainkey")).toBe("plainkey");
  });

  it("rejects a tampered value", () => {
    const stored = encryptApiKey("sk-test-1234567890");
    const parts = stored.split(":");
    const data = Buffer.from(parts[3], "base64url");
    data[0] ^= 1;
    parts[3] = data.toString("base64url");
    expect(() => decryptApiKey(parts.join(":"))).toThrow();
  });

  it("rejects a value encrypted with another key", () => {
    const stored = encryptApiKey("sk-test-1234567890");
    process.env.ENCRYPTION_KEY = "ffffffffffffffffffffffffffffffff";
    try {
      expect(() => decryptApiKey(stored)).toThrow();
    } finally {
      process.env.ENCRYPTION_KEY = KEY;
    }
  });

  it("flags only old formats for re-encryption", () => {
    expect(needsReencryption(encryptApiKey("x"))).toBe(false);
    expect(needsReencryption(legacyCbc("x"))).toBe(true);
    expect(needsReencryption("plainkey")).toBe(true);
    expect(needsReencryption("")).toBe(false);
    expect(needsReencryption(undefined)).toBe(false);
  });

  it("returns empty for empty input", () => {
    expect(encryptApiKey("")).toBe("");
    expect(decryptApiKey("")).toBe("");
  });
});
