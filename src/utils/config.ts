import is from '@sindresorhus/is';
import { Config, ConfigFile } from '../types/builder';
import { getArg, isDryRun, readFile, readJson } from '../util';

const keys: (keyof ConfigFile)[] = [
  'datasource',
  'depName',
  'versioning',
  'latestVersion',
];

function checkArgs(
  cfg: ConfigFile,
  groups: Record<string, string | undefined>
): void {
  for (const key of keys) {
    if (!is.string(cfg[key]) && is.nonEmptyString(groups[key])) {
      cfg[key] = groups[key] as never;
    }
  }
}

async function readDockerConfig(cfg: ConfigFile): Promise<void> {
  const dockerFileRe = new RegExp(
    '# renovate: datasource=(?<datasource>.*?) depName=(?<depName>.*?)( versioning=(?<versioning>.*?))?\\s' +
      `(?:ENV|ARG) ${cfg.image.toUpperCase()}_VERSION=(?<latestVersion>.*)\\s`,
    'g'
  );
  const dockerfile = await readFile('Dockerfile');
  const m = dockerFileRe.exec(dockerfile);
  if (m && m.groups) {
    checkArgs(cfg, m.groups);
  }
}

export async function getConfig(): Promise<Config> {
  const cfg = await readJson<ConfigFile>(`builder.json`);

  await readDockerConfig(cfg);

  return {
    ...cfg,
    ignoredVersions: cfg.ignoredVersions ?? [],
    dryRun: isDryRun(),
    lastOnly: getArg('last-only') == 'true',
  };
}
