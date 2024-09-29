import { applyPlugins } from "../../../../src/lib/config-plugins";
import { describe, it, expect } from "bun:test";

describe("applyPlugins", () => {
  const mockParent = {
    key1: "value1",
    key2: {
      nestedKey: "nestedValue",
    },
  };

  it("should return the original value if it does not start with ~ref~", () => {
    const value = "someValue";
    const result = applyPlugins(value, "key1", mockParent);
    expect(result).toBe(value);
  });

  it("should return the referenced value if the reference is valid", () => {
    const value = "~ref~key2.nestedKey";
    const result = applyPlugins(value, "key1", mockParent);
    expect(result).toBe("nestedValue");
  });

  it("should return an empty string and log a warning if the reference is invalid", () => {
    const value = "~ref~invalidKey";
    const result = applyPlugins(value, "key1", mockParent);
    expect(result).toBe("");
  });

  it("should handle references to the current key", () => {
    const value = "~ref~.key2.nestedKey";
    const result = applyPlugins(value, "key2", mockParent);
    expect(result).toBe("nestedValue");
  });

  it("should handle references with leading and trailing spaces", () => {
    const value = "~ref~ key2.nestedKey ";
    const result = applyPlugins(value, "key1", mockParent);
    expect(result).toBe("nestedValue");
  });
});
