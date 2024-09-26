import { expect, test } from "bun:test"
import configLoader from "../../../../src/lib/config-loader";

test("configLoader should load all the files in the config path", async () => {
  const configPath = "./tests/storage-mock";
  const configStore = await configLoader(configPath);

  /**
   * Note:
   * The storage mock directory contains a service-unknown.unknown file
   * This file type does not have a parser, and should not be listed here
   */
  expect(Object.keys(configStore).sort()).toEqual([
    "service-env",
    "service-env-noext",
    "service-json",
    "service-toml",
    "service-yaml"
  ]);

  expect(configStore["service-env"]).toEqual({
    "name": "service-env"
  });

  expect(configStore["service-env-noext"]).toEqual({
    "name": "service-env-noext"
  });

  expect(configStore["service-json"]).toEqual({
    "name": "service-json"
  });

  expect(configStore["service-toml"]).toEqual({
    "name": "service-toml"
  });

  expect(configStore["service-yaml"]).toEqual({
    "name": "service-yaml"
  });
});
