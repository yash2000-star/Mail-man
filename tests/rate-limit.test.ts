import { beforeEach, describe, expect, it, vi } from "vitest";

const counts = new Map<string, number>();
let failNext = false;

vi.mock("@/lib/mongodb", () => ({ default: vi.fn(async () => undefined) }));
vi.mock("@/models/RateLimit", () => ({
  default: {
    findOneAndUpdate: vi.fn((filter: { key: string }) => ({
      lean: async () => {
        if (failNext) {
          failNext = false;
          throw new Error("db down");
        }
        const count = (counts.get(filter.key) ?? 0) + 1;
        counts.set(filter.key, count);
        return { count };
      },
    })),
  },
}));

const { rateLimit, rateWindow, RATE_LIMITS } = await import("@/lib/rate-limit");

beforeEach(() => counts.clear());

describe("rateWindow", () => {
  it("puts times in fixed windows", () => {
    expect(rateWindow(0, 60)).toEqual({ index: 0, resetAt: 60_000 });
    expect(rateWindow(59_999, 60)).toEqual({ index: 0, resetAt: 60_000 });
    expect(rateWindow(60_000, 60)).toEqual({ index: 1, resetAt: 120_000 });
  });
});

describe("rateLimit", () => {
  const now = 1_000_000_000_000;

  it("allows requests up to the limit, then answers 429", async () => {
    const { limit } = RATE_LIMITS.send;
    for (let i = 0; i < limit; i++) expect(await rateLimit("a@x.com", "send", now)).toBeNull();
    const blocked = await rateLimit("a@x.com", "send", now);
    expect(blocked?.status).toBe(429);
    expect(Number(blocked?.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await blocked?.json()).code).toBe("RATE_LIMITED");
  });

  it("counts each user and action separately", async () => {
    const { limit } = RATE_LIMITS.send;
    for (let i = 0; i < limit; i++) await rateLimit("a@x.com", "send", now);
    expect(await rateLimit("b@x.com", "send", now)).toBeNull();
    expect(await rateLimit("a@x.com", "ai", now)).toBeNull();
  });

  it("starts over in the next window", async () => {
    const { limit, windowSec } = RATE_LIMITS.send;
    for (let i = 0; i <= limit; i++) await rateLimit("a@x.com", "send", now);
    expect(await rateLimit("a@x.com", "send", now + windowSec * 1000)).toBeNull();
  });

  it("lets requests through when the counter is unavailable", async () => {
    failNext = true;
    expect(await rateLimit("a@x.com", "ai", now)).toBeNull();
  });
});
