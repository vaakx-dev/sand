import { describe, expect, test } from "bun:test";

import {
  booleanValue,
  jsonText,
  numberValue,
  objectSchema,
  objectValue,
  optionalNumber,
  optionalString,
  positiveInteger,
  requiredString,
  stringValue,
} from "../packages/extension-api/src/json.ts";

describe("extension JSON values", () => {
  test("normalizes untrusted primitive values", () => {
    expect(stringValue("sand", "fallback")).toBe("sand");
    expect(stringValue(1, "fallback")).toBe("fallback");
    expect(numberValue(4, 1)).toBe(4);
    expect(numberValue(Number.NaN, 1)).toBe(1);
    expect(booleanValue(true)).toBe(true);
    expect(booleanValue("true")).toBe(false);
  });

  test("accepts objects without accepting arrays or null", () => {
    expect(objectValue({ name: "sand" })).toEqual({ name: "sand" });
    expect(objectValue(["sand"])).toEqual({});
    expect(objectValue(null)).toEqual({});
  });

  test("validates required and optional values", () => {
    expect(requiredString({ name: "sand" }, "name")).toBe("sand");
    expect(() => requiredString({}, "name")).toThrow("name is required");
    expect(optionalString("")).toBeUndefined();
    expect(optionalString("sand")).toBe("sand");
    expect(optionalNumber(Number.NaN)).toBeUndefined();
    expect(optionalNumber(2)).toBe(2);
    expect(positiveInteger(3, 1)).toBe(3);
    expect(positiveInteger(0, 1)).toBe(1);
  });

  test("builds closed object schemas and readable JSON text", () => {
    expect(objectSchema({ path: { type: "string" } }, ["path"])).toEqual({
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
      additionalProperties: false,
    });
    expect(jsonText("sand")).toBe("sand");
    expect(jsonText({ name: "sand" })).toBe('{\n  "name": "sand"\n}');
  });
});
