import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import {
  sanitizeDirectoryName,
  generateClaudeMd,
  setupGitHooks,
} from "./init.js";

describe("init.ts helpers", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "thoughts-init-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("sanitizeDirectoryName()", () => {
    it("should keep valid names unchanged", () => {
      expect(sanitizeDirectoryName("my-project")).toBe("my-project");
      expect(sanitizeDirectoryName("project_123")).toBe("project_123");
      expect(sanitizeDirectoryName("Project-ABC")).toBe("Project-ABC");
    });

    it("should replace spaces with underscores", () => {
      expect(sanitizeDirectoryName("my project")).toBe("my_project");
    });

    it("should replace special characters with underscores", () => {
      expect(sanitizeDirectoryName("my@project")).toBe("my_project");
      expect(sanitizeDirectoryName("my/project")).toBe("my_project");
      expect(sanitizeDirectoryName("my.project")).toBe("my_project");
    });

    it("should handle empty string", () => {
      expect(sanitizeDirectoryName("")).toBe("");
    });

    it("should handle strings with only special characters", () => {
      expect(sanitizeDirectoryName("@@@")).toBe("___");
    });
  });

  describe("generateClaudeMd()", () => {
    it("should include repo name in output", () => {
      const result = generateClaudeMd(
        "~/thoughts",
        "repos",
        "my-project",
        "alice",
      );
      expect(result).toContain("my-project");
    });

    it("should include user name in output", () => {
      const result = generateClaudeMd(
        "~/thoughts",
        "repos",
        "my-project",
        "alice",
      );
      expect(result).toContain("alice");
    });

    it("should include symlink path information", () => {
      const result = generateClaudeMd(
        "~/thoughts",
        "repos",
        "my-project",
        "alice",
      );
      expect(result).toContain("~/thoughts/repos/my-project");
    });

    it("should mention searchable directory", () => {
      const result = generateClaudeMd(
        "~/thoughts",
        "repos",
        "my-project",
        "alice",
      );
      expect(result).toContain("searchable");
    });

    it("should mention pre-commit hook protection", () => {
      const result = generateClaudeMd(
        "~/thoughts",
        "repos",
        "my-project",
        "alice",
      );
      expect(result).toContain("pre-commit");
    });

    it("should replace home dir with ~ in paths", () => {
      const result = generateClaudeMd(
        os.homedir() + "/thoughts",
        "repos",
        "my-project",
        "alice",
      );
      expect(result).toContain("~/thoughts/repos/my-project");
      // Should NOT contain the full home dir
      expect(result).not.toContain(os.homedir() + "/thoughts/repos");
    });
  });

  describe("setupGitHooks()", () => {
    let gitRepo: string;

    beforeEach(() => {
      gitRepo = path.join(tmpDir, "git-repo");
      fs.mkdirSync(gitRepo, { recursive: true });
      execSync("git init", { cwd: gitRepo, stdio: "pipe" });
      // Create an initial commit so git is fully initialized
      fs.writeFileSync(path.join(gitRepo, "README.md"), "test");
      execSync("git add README.md", { cwd: gitRepo, stdio: "pipe" });
      execSync('git commit -m "init"', { cwd: gitRepo, stdio: "pipe" });
    });

    it("should create pre-commit and post-commit hooks", () => {
      const result = setupGitHooks(gitRepo);

      expect(result.updated).toContain("pre-commit");
      expect(result.updated).toContain("post-commit");

      const hooksDir = path.join(gitRepo, ".git", "hooks");
      expect(fs.existsSync(path.join(hooksDir, "pre-commit"))).toBe(true);
      expect(fs.existsSync(path.join(hooksDir, "post-commit"))).toBe(true);
    });

    it("should make hooks executable", () => {
      setupGitHooks(gitRepo);

      const hooksDir = path.join(gitRepo, ".git", "hooks");
      const preCommitStats = fs.statSync(path.join(hooksDir, "pre-commit"));
      const postCommitStats = fs.statSync(path.join(hooksDir, "post-commit"));

      // Check executable bit (owner execute = 0o100)
      expect(preCommitStats.mode & 0o111).toBeGreaterThan(0);
      expect(postCommitStats.mode & 0o111).toBeGreaterThan(0);
    });

    it("should include thoughts in hook content", () => {
      setupGitHooks(gitRepo);

      const hooksDir = path.join(gitRepo, ".git", "hooks");
      const preCommit = fs.readFileSync(
        path.join(hooksDir, "pre-commit"),
        "utf8",
      );
      const postCommit = fs.readFileSync(
        path.join(hooksDir, "post-commit"),
        "utf8",
      );

      expect(preCommit).toContain("thoughts");
      expect(postCommit).toContain("thoughts");
    });

    it("should include version markers in hooks", () => {
      setupGitHooks(gitRepo);

      const hooksDir = path.join(gitRepo, ".git", "hooks");
      const preCommit = fs.readFileSync(
        path.join(hooksDir, "pre-commit"),
        "utf8",
      );

      expect(preCommit).toMatch(/# Version: \d+/);
    });

    it("should backup existing non-thoughts hooks", () => {
      const hooksDir = path.join(gitRepo, ".git", "hooks");
      fs.mkdirSync(hooksDir, { recursive: true });

      // Create an existing pre-commit hook that's not from thoughts
      fs.writeFileSync(
        path.join(hooksDir, "pre-commit"),
        "#!/bin/bash\necho 'my custom hook'",
      );
      fs.chmodSync(path.join(hooksDir, "pre-commit"), "755");

      setupGitHooks(gitRepo);

      // Old hook should be backed up
      expect(fs.existsSync(path.join(hooksDir, "pre-commit.old"))).toBe(true);
      const backup = fs.readFileSync(
        path.join(hooksDir, "pre-commit.old"),
        "utf8",
      );
      expect(backup).toContain("my custom hook");

      // New hook should reference the backup
      const newHook = fs.readFileSync(
        path.join(hooksDir, "pre-commit"),
        "utf8",
      );
      expect(newHook).toContain("thoughts");
    });

    it("should not re-create hooks if already up to date", () => {
      // First setup
      setupGitHooks(gitRepo);

      // Second setup should return empty updated list
      const result = setupGitHooks(gitRepo);
      expect(result.updated).toEqual([]);
    });

    it("should pre-commit hook block thoughts/ directory", () => {
      setupGitHooks(gitRepo);

      const hooksDir = path.join(gitRepo, ".git", "hooks");
      const preCommit = fs.readFileSync(
        path.join(hooksDir, "pre-commit"),
        "utf8",
      );

      expect(preCommit).toContain("thoughts/");
      expect(preCommit).toContain("Cannot commit thoughts/");
    });

    it("should post-commit hook skip worktrees", () => {
      setupGitHooks(gitRepo);

      const hooksDir = path.join(gitRepo, ".git", "hooks");
      const postCommit = fs.readFileSync(
        path.join(hooksDir, "post-commit"),
        "utf8",
      );

      // Should check for .git file (worktree indicator)
      expect(postCommit).toContain("if [ -f .git ]");
    });
  });
});
