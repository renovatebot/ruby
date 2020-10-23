import fs from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { endGroup, getInput, startGroup } from '@actions/core';
import { exec as _exec } from '@actions/exec';
import { ExecOptions as _ExecOptions } from '@actions/exec/lib/interfaces';
import log from './utils/logger';

const readFileAsync = promisify(fs.readFile);

export type ExecOptions = _ExecOptions;

export type ExecResult = {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
};

export async function exec(
  cmd: string,
  args: string[],
  options?: ExecOptions
): Promise<ExecResult> {
  let stdout = '';
  let stderr = '';
  let code: number;

  try {
    startGroup(`${cmd} ${args.join(' ')}`);
    code = await _exec(cmd, args, {
      ...options,
      listeners: {
        stdout: (data: Buffer) => {
          stdout += data.toString();
        },
        stderr: (data: Buffer) => {
          stderr += data.toString();
        },
      },
    });
  } finally {
    endGroup();
  }
  if (code) {
    log.error({ code });
    throw new Error('Command failed');
  }

  return { code, stdout, stderr };
}

/**
 * Get environment variable or empty string.
 * Used for easy mocking.
 * @param key variable name
 */
export function getEnv(key: string): string {
  return process.env[key] ?? '';
}

export function isCI(): boolean {
  return !!getEnv('CI');
}

export function isDryRun(): boolean {
  const val = getInput('dry-run') || getEnv('DRY_RUN');
  return (!!val && val === 'true') || !isCI();
}

export function getWorkspace(): string {
  return getEnv('GITHUB_WORKSPACE') || process.cwd();
}

export async function readJson<T = unknown>(file: string): Promise<T> {
  const path = join(getWorkspace(), file);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const res = await import(path);
  // istanbul ignore next
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-return
  return res?.default ?? res;
}

export async function readFile(file: string): Promise<string> {
  const path = join(getWorkspace(), file);
  return await readFileAsync(path, 'utf8');
}

export async function readBuffer(file: string): Promise<Buffer> {
  const path = join(getWorkspace(), file);
  return await readFileAsync(path);
}

export const MultiArgsSplitRe = /\s*(?:[;,]|$)\s*/;

export function getArg(name: string, opts?: { required?: boolean }): string;
export function getArg(
  name: string,
  opts?: { required?: boolean; multi: true }
): string[];
export function getArg(
  name: string,
  opts?: { required?: boolean; multi?: boolean }
): string | string[];
export function getArg(
  name: string,
  opts?: { required?: boolean; multi?: boolean }
): string | string[] {
  const val = getInput(name, opts);
  return opts?.multi ? val.split(MultiArgsSplitRe).filter(Boolean) : val;
}
