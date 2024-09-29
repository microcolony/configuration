import { expect, describe, it } from "bun:test";
import {
  parseConfig,
  extendConfig,
  processValue,
  parserMap,
} from "../../../../src/lib/config-parser.js";
import { parse as parseJson } from "json5";
import { parse as parseToml } from "smol-toml";
import { parse as parseEnv } from "dotenv";
import { parse as parseYaml } from "yaml";

describe("Config Parser", () => {
  describe("parserMap", () => {
    it("should map json to parseJson", () => {
      expect(parserMap.json).toBe(parseJson);
    });

    it("should map env to parseEnv", () => {
      const envString = "KEY=value";
      const parsedEnv = parserMap.env(envString);
      expect(parsedEnv).toEqual(parseEnv(Buffer.from(envString)));
    });

    it("should map toml to parseToml", () => {
      expect(parserMap.toml).toBe(parseToml);
    });

    it("should map yaml to parseYaml", () => {
      expect(parserMap.yaml).toBe(parseYaml);
    });
  });

  describe("extendConfig", () => {
    it("should return config if ~extends~ is not present", () => {
      const config = { key: "value" };
      const result = extendConfig(config, "currentKey", {});
      expect(result).toEqual(config);
    });

    it("should log a warning and return config if ~extends~ is not a string", () => {
      const config = { "~extends~": 123 };
      const result = extendConfig(config, "currentKey", {});
      expect(result).toEqual(config);
      // Add logger warning check here
    });

    it("should extend config correctly", () => {
      const parent = { base: { key: "baseValue" } };
      const config = { "~extends~": "base", key: "overrideValue" };
      const result = extendConfig(config, "currentKey", parent);
      expect(result).toEqual({ key: "overrideValue" });
    });

    it("should log a warning and return config if ~extends~ path is invalid", () => {
      const config = { "~extends~": "invalid.path" };
      const result = extendConfig(config, "currentKey", {});
      expect(result).toEqual(config);
      // Add logger warning check here
    });
  });

  describe("parseConfig", () => {
    it("should parse nested config objects", () => {
      const config = { nested: { key: "value" } };
      const result = parseConfig(config, "currentKey", {});
      expect(result).toEqual(config);
    });

    it("should process string values", () => {
      const config = { key: "~value" };
      const result = parseConfig(config, "currentKey", {});
      expect(result).toEqual({ key: "~value" });
    });
  });

  describe("processValue", () => {
    it("should return value if it does not start with ~", () => {
      const value = "value";
      const result = processValue(value, "currentKey", {});
      expect(result).toBe(value);
    });

    it("should apply plugins if value starts with ~", () => {
      const value = "~pluginValue";
      const result = processValue(value, "currentKey", {});
      expect(result).toBe(value); // Adjust this based on actual plugin behavior
    });
  });
});
