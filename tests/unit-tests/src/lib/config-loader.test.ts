import { expect, test } from "bun:test"
import configLoader from "../../../../src/lib/config-loader.js";

test("configLoader should load all the files in the config path", async () => {
  const configPath = "./tests/storage-mock";
  const configStore = await configLoader(configPath);
  const expectedConfigValue = {
    "base": {
      "name": "base",
      "someKey": "someValue"
    },
    "reference": {
      "key": "value"
    },
    "production": {
      "name": "production",
      "someKey": "someValue",
      "reference": "value" // This is a reference in the file
    },
    "development": {
      "~extends~": "unknown", // The config file references unknown parent
      "name": "development"
    }
  };
  const expectedServices = [
    "service-env",
    "service-env-noext",
    "service-json",
    "service-toml",
    "service-yaml"
  ]

  /**
   * Note:
   * The storage mock directory contains a service-unknown.unknown file
   * This file type does not have a parser, and should not be listed here
   */
  expect(Object.keys(configStore).sort()).toEqual(expectedServices.sort());

  /** We filter env as it doesn't support extends */
  for (const service of expectedServices.filter(service => !service.split("-").includes("env"))) {
    expect(configStore[service]).toEqual(expectedConfigValue);
  }
  expect(configStore["service-env"]).toEqual({
    "name": "service-env"
  });

  expect(configStore["service-env-noext"]).toEqual({
    "name": "service-env-noext"
  });
});
