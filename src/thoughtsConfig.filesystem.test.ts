import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import {
  expandPath,
  getDefaultThoughtsRepo,
  getRepoNameFromPath,
  getRepoThoughtsPath,
  getGlobalThoughtsPath,
  ensureThoughtsRepoExists,
  createThoughtsDirectoryStructure,
  updateSymlinksForNewUsers,
  type ResolvedProfileConfig,
} from "./thoughtsConfig.js";

describe("thoughtsConfig.ts filesystem functions", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "thoughts-fs-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe("expandPath()", () => {
    it("should expand ~ to home directory", () => {
      const result = expandPath("~/thoughts");
      expect(result).toBe(path.join(os.homedir(), "thoughts"));
    });

    it("should expand ~/nested/path", () => {
      const result = expandPath("~/a/b/c");
      expect(result).toBe(path.join(os.homedir(), "a", "b", "c"));
    });

    it("should resolve relative paths", () => {
      const result = expandPath("relative/path");
      expect(path.isAbsolute(result)).toBe(true);
    });

    it("should keep absolute paths unchanged", () => {
      const result = expandPath("/absolute/path");
      expect(result).toBe("/absolute/path");
    });

    it("should handle ~ alone without slash", () => {
      // "~" without trailing "/" should be resolved as relative
      const result = expandPath("~");
      expect(path.isAbsolute(result)).toBe(true);
    });
  });

  describe("getDefaultThoughtsRepo()", () => {
    it("should return ~/thoughts", () => {
      expect(getDefaultThoughtsRepo()).toBe(
        path.join(os.homedir(), "thoughts"),
      );
    });
  });

  describe("getRepoNameFromPath()", () => {
    it("should extract last path segment", () => {
      expect(getRepoNameFromPath("/home/user/repos/my-project")).toBe(
        "my-project",
      );
    });

    it("should handle single segment", () => {
      expect(getRepoNameFromPath("my-project")).toBe("my-project");
    });

    it("should return fallback for empty string", () => {
      // Empty string splits to [""], last element is "", so fallback applies
      expect(getRepoNameFromPath("")).toBe("unnamed_repo");
    });
  });

  describe("getRepoThoughtsPath()", () => {
    it("should construct path with legacy signature", () => {
      const result = getRepoThoughtsPath(tmpDir, "repos", "my-project");
      expect(result).toBe(path.join(tmpDir, "repos", "my-project"));
    });

    it("should construct path with config signature", () => {
      const config: ResolvedProfileConfig = {
        thoughtsRepo: tmpDir,
        reposDir: "projects",
        globalDir: "global",
      };
      const result = getRepoThoughtsPath(config, "my-project");
      expect(result).toBe(path.join(tmpDir, "projects", "my-project"));
    });

    it("should expand ~ in thoughtsRepo", () => {
      const config: ResolvedProfileConfig = {
        thoughtsRepo: "~/thoughts",
        reposDir: "repos",
        globalDir: "global",
      };
      const result = getRepoThoughtsPath(config, "project");
      expect(result).toBe(
        path.join(os.homedir(), "thoughts", "repos", "project"),
      );
    });
  });

  describe("getGlobalThoughtsPath()", () => {
    it("should construct path with legacy signature", () => {
      const result = getGlobalThoughtsPath(tmpDir, "global");
      expect(result).toBe(path.join(tmpDir, "global"));
    });

    it("should construct path with config signature", () => {
      const config: ResolvedProfileConfig = {
        thoughtsRepo: tmpDir,
        reposDir: "repos",
        globalDir: "shared",
      };
      const result = getGlobalThoughtsPath(config);
      expect(result).toBe(path.join(tmpDir, "shared"));
    });
  });

  describe("ensureThoughtsRepoExists()", () => {
    it("should create repo with directories and initialize git", () => {
      const repoPath = path.join(tmpDir, "new-thoughts");
      ensureThoughtsRepoExists(repoPath, "repos", "global");

      expect(fs.existsSync(repoPath)).toBe(true);
      expect(fs.existsSync(path.join(repoPath, "repos"))).toBe(true);
      expect(fs.existsSync(path.join(repoPath, "global"))).toBe(true);
      expect(fs.existsSync(path.join(repoPath, ".git"))).toBe(true);
      expect(fs.existsSync(path.join(repoPath, ".gitignore"))).toBe(true);
    });

    it("should work with config signature", () => {
      const repoPath = path.join(tmpDir, "config-thoughts");
      const config: ResolvedProfileConfig = {
        thoughtsRepo: repoPath,
        reposDir: "projects",
        globalDir: "shared",
      };
      ensureThoughtsRepoExists(config);

      expect(fs.existsSync(path.join(repoPath, "projects"))).toBe(true);
      expect(fs.existsSync(path.join(repoPath, "shared"))).toBe(true);
      expect(fs.existsSync(path.join(repoPath, ".git"))).toBe(true);
    });

    it("should not reinitialize git if already exists", () => {
      const repoPath = path.join(tmpDir, "existing-repo");
      // First call creates it
      ensureThoughtsRepoExists(repoPath, "repos", "global");
      // Modify the gitignore to verify it's not overwritten
      const gitignorePath = path.join(repoPath, ".gitignore");
      fs.appendFileSync(gitignorePath, "\ncustom-entry");

      // Second call should not reinitialize
      ensureThoughtsRepoExists(repoPath, "repos", "global");

      const content = fs.readFileSync(gitignorePath, "utf8");
      expect(content).toContain("custom-entry");
    });
  });

  describe("createThoughtsDirectoryStructure()", () => {
    it("should create all required directories with legacy signature", () => {
      const repoPath = path.join(tmpDir, "thoughts-repo");
      fs.mkdirSync(path.join(repoPath, "repos"), { recursive: true });
      fs.mkdirSync(path.join(repoPath, "global"), { recursive: true });

      createThoughtsDirectoryStructure(
        repoPath,
        "repos",
        "global",
        "my-project",
        "testuser",
      );

      // Check repo-specific directories
      expect(
        fs.existsSync(path.join(repoPath, "repos", "my-project", "testuser")),
      ).toBe(true);
      expect(
        fs.existsSync(path.join(repoPath, "repos", "my-project", "shared")),
      ).toBe(true);

      // Check global directories
      expect(fs.existsSync(path.join(repoPath, "global", "testuser"))).toBe(
        true,
      );
      expect(fs.existsSync(path.join(repoPath, "global", "shared"))).toBe(true);

      // Check README files
      expect(
        fs.existsSync(path.join(repoPath, "repos", "my-project", "README.md")),
      ).toBe(true);
      expect(fs.existsSync(path.join(repoPath, "global", "README.md"))).toBe(
        true,
      );
    });

    it("should create directories with config signature", () => {
      const repoPath = path.join(tmpDir, "thoughts-repo2");
      fs.mkdirSync(path.join(repoPath, "projects"), { recursive: true });
      fs.mkdirSync(path.join(repoPath, "shared"), { recursive: true });

      const config: ResolvedProfileConfig = {
        thoughtsRepo: repoPath,
        reposDir: "projects",
        globalDir: "shared",
      };

      createThoughtsDirectoryStructure(config, "my-project", "user1");

      expect(
        fs.existsSync(path.join(repoPath, "projects", "my-project", "user1")),
      ).toBe(true);
      expect(
        fs.existsSync(path.join(repoPath, "projects", "my-project", "shared")),
      ).toBe(true);
      expect(fs.existsSync(path.join(repoPath, "shared", "user1"))).toBe(true);
    });

    it("should not overwrite existing README files", () => {
      const repoPath = path.join(tmpDir, "thoughts-repo3");
      fs.mkdirSync(path.join(repoPath, "repos", "proj"), { recursive: true });
      fs.mkdirSync(path.join(repoPath, "global"), { recursive: true });
      fs.writeFileSync(
        path.join(repoPath, "repos", "proj", "README.md"),
        "custom readme",
      );

      createThoughtsDirectoryStructure(
        repoPath,
        "repos",
        "global",
        "proj",
        "user",
      );

      const content = fs.readFileSync(
        path.join(repoPath, "repos", "proj", "README.md"),
        "utf8",
      );
      expect(content).toBe("custom readme");
    });
  });

  describe("updateSymlinksForNewUsers()", () => {
    it("should create symlinks for other users", () => {
      // Setup thoughts repo structure with multiple users
      const thoughtsRepo = path.join(tmpDir, "thoughts");
      const repoThoughts = path.join(thoughtsRepo, "repos", "project");
      fs.mkdirSync(path.join(repoThoughts, "alice"), { recursive: true });
      fs.mkdirSync(path.join(repoThoughts, "bob"), { recursive: true });
      fs.mkdirSync(path.join(repoThoughts, "shared"), { recursive: true });

      // Setup code repo with thoughts directory
      const codeRepo = path.join(tmpDir, "code-repo");
      const thoughtsDir = path.join(codeRepo, "thoughts");
      fs.mkdirSync(thoughtsDir, { recursive: true });

      // alice is the current user - her symlink should already exist
      fs.symlinkSync(
        path.join(repoThoughts, "alice"),
        path.join(thoughtsDir, "alice"),
        "dir",
      );

      const result = updateSymlinksForNewUsers(
        codeRepo,
        thoughtsRepo,
        "repos",
        "project",
        "alice",
      );

      expect(result).toEqual(["bob"]);
      expect(fs.existsSync(path.join(thoughtsDir, "bob"))).toBe(true);
      expect(fs.lstatSync(path.join(thoughtsDir, "bob")).isSymbolicLink()).toBe(
        true,
      );
    });

    it("should work with config signature", () => {
      const thoughtsRepo = path.join(tmpDir, "thoughts2");
      const repoThoughts = path.join(thoughtsRepo, "repos", "project");
      fs.mkdirSync(path.join(repoThoughts, "currentuser"), {
        recursive: true,
      });
      fs.mkdirSync(path.join(repoThoughts, "other"), { recursive: true });
      fs.mkdirSync(path.join(repoThoughts, "shared"), { recursive: true });

      const codeRepo = path.join(tmpDir, "code-repo2");
      const thoughtsDir = path.join(codeRepo, "thoughts");
      fs.mkdirSync(thoughtsDir, { recursive: true });

      fs.symlinkSync(
        path.join(repoThoughts, "currentuser"),
        path.join(thoughtsDir, "currentuser"),
        "dir",
      );

      const config: ResolvedProfileConfig = {
        thoughtsRepo: thoughtsRepo,
        reposDir: "repos",
        globalDir: "global",
      };

      const result = updateSymlinksForNewUsers(
        codeRepo,
        config,
        "project",
        "currentuser",
      );

      expect(result).toEqual(["other"]);
    });

    it("should skip hidden directories and shared", () => {
      const thoughtsRepo = path.join(tmpDir, "thoughts3");
      const repoThoughts = path.join(thoughtsRepo, "repos", "project");
      fs.mkdirSync(path.join(repoThoughts, "user1"), { recursive: true });
      fs.mkdirSync(path.join(repoThoughts, "shared"), { recursive: true });
      fs.mkdirSync(path.join(repoThoughts, ".hidden"), { recursive: true });

      const codeRepo = path.join(tmpDir, "code-repo3");
      const thoughtsDir = path.join(codeRepo, "thoughts");
      fs.mkdirSync(thoughtsDir, { recursive: true });

      const result = updateSymlinksForNewUsers(
        codeRepo,
        thoughtsRepo,
        "repos",
        "project",
        "user1",
      );

      // user1 is current user (skipped), shared is excluded, .hidden is excluded
      expect(result).toEqual([]);
    });

    it("should return empty array when thoughts dir does not exist", () => {
      const codeRepo = path.join(tmpDir, "no-thoughts");

      const result = updateSymlinksForNewUsers(
        codeRepo,
        tmpDir,
        "repos",
        "project",
        "user",
      );

      expect(result).toEqual([]);
    });

    it("should not recreate existing symlinks", () => {
      const thoughtsRepo = path.join(tmpDir, "thoughts4");
      const repoThoughts = path.join(thoughtsRepo, "repos", "project");
      fs.mkdirSync(path.join(repoThoughts, "alice"), { recursive: true });
      fs.mkdirSync(path.join(repoThoughts, "bob"), { recursive: true });
      fs.mkdirSync(path.join(repoThoughts, "shared"), { recursive: true });

      const codeRepo = path.join(tmpDir, "code-repo4");
      const thoughtsDir = path.join(codeRepo, "thoughts");
      fs.mkdirSync(thoughtsDir, { recursive: true });

      // Both symlinks already exist
      fs.symlinkSync(
        path.join(repoThoughts, "alice"),
        path.join(thoughtsDir, "alice"),
        "dir",
      );
      fs.symlinkSync(
        path.join(repoThoughts, "bob"),
        path.join(thoughtsDir, "bob"),
        "dir",
      );

      const result = updateSymlinksForNewUsers(
        codeRepo,
        thoughtsRepo,
        "repos",
        "project",
        "alice",
      );

      // bob's symlink already exists so nothing new added
      expect(result).toEqual([]);
    });
  });
});
