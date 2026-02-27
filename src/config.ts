import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import chalk from "chalk";

// Load environment variables
dotenv.config();

export type RepoMappingObject = {
  repo: string;
  profile?: string;
};

export type ProfileConfig = {
  thoughtsRepo: string;
  reposDir: string;
  globalDir: string;
};

export type ConfigFile = {
  thoughts?: {
    thoughtsRepo: string;
    reposDir: string;
    globalDir: string;
    user: string;
    repoMappings: Record<string, string | RepoMappingObject>;
    profiles?: Record<string, ProfileConfig>;
  };
};

export function getDefaultConfigPath(): string {
  const xdgConfigHome =
    process.env.XDG_CONFIG_HOME || path.join(process.env.HOME || "", ".config");
  return path.join(xdgConfigHome, "humanlayer", "humanlayer.json");
}

export function loadConfigFile(configFile?: string): ConfigFile {
  if (configFile) {
    try {
      const configContent = fs.readFileSync(configFile, "utf8");
      return JSON.parse(configContent);
    } catch (error) {
      console.error(
        chalk.yellow(
          `Warning: Could not parse config file ${configFile}: ${error}`,
        ),
      );
      return {};
    }
  }

  // these do not merge today
  const configPaths = ["humanlayer.json", getDefaultConfigPath()];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, "utf8");
        return JSON.parse(configContent);
      }
    } catch (error) {
      console.error(
        chalk.yellow(
          `Warning: Could not parse config file ${configPath}: ${error}`,
        ),
      );
    }
  }

  return {};
}

export function saveConfigFile(config: ConfigFile, configFile?: string): void {
  const configPath = configFile || getDefaultConfigPath();

  console.log(chalk.yellow(`Writing config to ${configPath}`));

  // Create directory if it doesn't exist
  const configDir = path.dirname(configPath);
  fs.mkdirSync(configDir, { recursive: true });

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log(chalk.green("Config saved successfully"));
}
