import { describe, expect, it } from "vitest";
import { publicError, AppError } from "../../src/lib/errors";
import { databaseEnvironment } from "../../src/lib/env";
describe("server boundary", () => {
  it("does not expose internal errors", () => { expect(JSON.stringify(publicError(new Error("postgres://secret@host"), "test-id"))).not.toContain("secret"); });
  it("preserves actionable domain conflicts", () => { expect(publicError(new AppError("CONFLICT", "Слот занят"), "id").code).toBe("CONFLICT"); });
  it("rejects missing or non-postgres configuration", () => { expect(() => databaseEnvironment({ DATABASE_URL: "https://example.com" })).toThrow("invalid"); expect(() => databaseEnvironment({})).toThrow("missing"); });
});
