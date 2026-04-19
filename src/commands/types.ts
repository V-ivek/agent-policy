export interface CommandContext {
  cwd: string;
  configPath?: string;
  json: boolean;
  quiet: boolean;
}

export interface CommandResult {
  exitCode: number;
}
