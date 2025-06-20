import { describe, it, expect } from "vitest";
import { getHello } from "./service";

describe("getHello", () => {
  it('should return "Hello world"', () => {
    const result = getHello();
    expect(result).toBe("Hello world");
  });
});
