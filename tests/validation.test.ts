import { describe, expect, it } from "vitest";
import { validateLabel } from "@/lib/labels";
import { cleanDueDate, cleanTitle, normalizeTask } from "@/lib/tasks";

describe("validateLabel", () => {
  it("cleans a valid label", () => {
    expect(validateLabel({ name: "  Work   stuff ", prompt: " Emails from my team ", color: "green" }, []))
      .toEqual({ name: "Work stuff", prompt: "Emails from my team", color: "green" });
  });

  it("rejects missing fields, long names and duplicates", () => {
    expect(typeof validateLabel({ name: "", prompt: "x" }, [])).toBe("string");
    expect(typeof validateLabel({ name: "x".repeat(41), prompt: "x" }, [])).toBe("string");
    expect(typeof validateLabel({ name: "Work", prompt: "" }, [])).toBe("string");
    expect(typeof validateLabel({ name: "work", prompt: "x" }, [{ name: "Work", prompt: "y", color: "blue" }])).toBe("string");
    expect(typeof validateLabel(null, [])).toBe("string");
  });

  it("falls back to blue for unknown colours", () => {
    expect(validateLabel({ name: "A", prompt: "b", color: "javascript:alert(1)" }, [])).toMatchObject({ color: "blue" });
  });
});

describe("tasks", () => {
  it("accepts only real calendar dates", () => {
    expect(cleanDueDate("2026-02-28")).toBe("2026-02-28");
    expect(cleanDueDate("2026-02-30")).toBe("");
    expect(cleanDueDate("tomorrow")).toBe("");
    expect(cleanDueDate(123)).toBe("");
  });

  it("trims and limits titles", () => {
    expect(cleanTitle("  Pay   rent ")).toBe("Pay rent");
    expect(cleanTitle("x".repeat(500))).toHaveLength(300);
    expect(cleanTitle(42)).toBe("");
  });

  it("fills defaults for old tasks", () => {
    expect(normalizeTask({ id: "1", title: "Old", status: "weird" } as unknown as Parameters<typeof normalizeTask>[0])).toMatchObject({ status: "active", dueDate: "", isUrgent: false });
  });
});
