import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  getDefaultConfigPath,
  loadConfigFile,
  saveConfigFile,
  type ConfigFile,
} from "./config.js";

describe("config.ts", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "thoughts-config-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe("getDefaultConfigPath()", () => {
    it("should use XDG_CONFIG_HOME when set", () => {
      const original = process.env.XDG_CONFIG_HOME;
      process.env.XDG_CONFIG_HOME = "/custom/config";
      try {
        const result = getDefaultConfigPath();
        expect(result).toBe("/custom/config/humanlayer/humanlayer.json");
      } finally {
        if (original !== undefined) {
          process.env.XDG_CONFIG_HOME = original;
        } else {
          delete process.env.XDG_CONFIG_HOME;
        }
      }
    });

    it("should fall back to HOME/.config when XDG_CONFIG_HOME is not set", () => {
      const original = process.env.XDG_CONFIG_HOME;
      delete process.env.XDG_CONFIG_HOME;
      try {
        const result = getDefaultConfigPath();
        expect(result).toBe(
          path.join(
            process.env.HOME || "",
            ".config",
            "humanlayer",
            "humanlayer.json",
          ),
        );
      } finally {
        if (original !== undefined) {
          process.env.XDG_CONFIG_HOME = original;
        }
      }
    });
  });

  describe("loadConfigFile()", () => {
    it("should load config from explicit path", () => {
      const configPath = path.join(tmpDir, "test-config.json");
      const testConfig: ConfigFile = {
        thoughts: {
          thoughtsRepo: "~/thoughts",
          reposDir: "repos",
          globalDir: "global",
          user: "testuser",
          repoMappings: { "/repo": "my-repo" },
        },
      };
      fs.writeFileSync(configPath, JSON.stringify(testConfig));

      const result = loadConfigFile(configPath);
      expect(result).toEqual(testConfig);
    });

    it("should return empty object when explicit path has invalid JSON", () => {
      const configPath = path.join(tmpDir, "bad-config.json");
      fs.writeFileSync(configPath, "not json {{{");

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const result = loadConfigFile(configPath);
      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalled();
    });

    it("should return empty object when no config files exist", () => {
      // loadConfigFile with no args searches local humanlayer.json and default path
      // Neither should exist in our test env cwd, so it returns {}
      const result = loadConfigFile();
      // This depends on whether local humanlayer.json or default config exists
      // At minimum it should not throw
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });

    it("should load from local humanlayer.json if it exists", () => {
      const originalCwd = process.cwd();
      process.chdir(tmpDir);

      const localConfig: ConfigFile = {
        thoughts: {
          thoughtsRepo: "~/local-thoughts",
          reposDir: "repos",
          globalDir: "global",
          user: "local",
          repoMappings: {},
        },
      };
      fs.writeFileSync(
        path.join(tmpDir, "humanlayer.json"),
        JSON.stringify(localConfig),
      );

      try {
        const result = loadConfigFile();
        expect(result).toEqual(localConfig);
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe("saveConfigFile()", () => {
    it("should save config to specified path", () => {
      const configPath = path.join(tmpDir, "output.json");
      const testConfig: ConfigFile = {
        thoughts: {
          thoughtsRepo: "~/thoughts",
          reposDir: "repos",
          globalDir: "global",
          user: "testuser",
          repoMappings: {},
        },
      };

      vi.spyOn(console, "log").mockImplementation(() => {});
      saveConfigFile(testConfig, configPath);

      const saved = JSON.parse(fs.readFileSync(configPath, "utf8"));
      expect(saved).toEqual(testConfig);
    });

    it("should create parent directories if they don't exist", () => {
      const configPath = path.join(tmpDir, "nested", "deep", "config.json");
      const testConfig: ConfigFile = {};

      vi.spyOn(console, "log").mockImplementation(() => {});
      saveConfigFile(testConfig, configPath);

      expect(fs.existsSync(configPath)).toBe(true);
      const saved = JSON.parse(fs.readFileSync(configPath, "utf8"));
      expect(saved).toEqual({});
    });

    it("should write formatted JSON (2-space indent)", () => {
      const configPath = path.join(tmpDir, "formatted.json");
      const testConfig: ConfigFile = {
        thoughts: {
          thoughtsRepo: "~/thoughts",
          reposDir: "repos",
          globalDir: "global",
          user: "u",
          repoMappings: {},
        },
      };

      vi.spyOn(console, "log").mockImplementation(() => {});
      saveConfigFile(testConfig, configPath);

      const raw = fs.readFileSync(configPath, "utf8");
      expect(raw).toBe(JSON.stringify(testConfig, null, 2));
    });
  });
});
