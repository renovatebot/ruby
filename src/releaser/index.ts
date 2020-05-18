import 'source-map-support/register';
import 'renovate/dist/util/cache/global/file';
import { setFailed } from '@actions/core';
import chalk from 'chalk';
import { ensureDir, existsSync, writeFile } from 'fs-extra';
import { get as getVersioning } from 'renovate/dist/versioning';
import shell from 'shelljs';
import { Config } from '../types/builder';
import { getWorkspace, isCI } from '../util';
import { getConfig } from '../utils/config';
import { SimpleGit, git, preparePages } from '../utils/git';
import log from '../utils/logger';

const verRe = /\/(?<name>(?<release>\d+\.\d+)\/[a-z]+-(?<version>\d+\.\d+\.\d+)\.tar\.xz)$/;

async function prepare(ws: string): Promise<SimpleGit> {
  const repo = await preparePages(ws, true);

  if (isCI()) {
    await repo.addConfig('user.name', 'Renovate Bot');
    await repo.addConfig('user.email', 'bot@renovateapp.com');
  }

  return git(`${ws}/data`);
}

async function updateReadme(cfg: Config, path: string): Promise<void> {
  const files = shell.find(`${path}/**/*.tar.xz`);
  log('Processing files:', files.length);
  const releases: Record<string, Record<string, string>> = Object.create(null);

  for (const file of files) {
    const m = verRe.exec(file);

    if (!m?.groups) {
      log.warn('Invalid file:', file);
      continue;
    }

    const { name, version, release } = m.groups;

    if (!releases[release]) {
      releases[release] = Object.create(null);
    }

    releases[release][version] = name;
  }

  const dockerVer = getVersioning('docker');
  const semver = getVersioning('semver');

  let md =
    `# ${cfg.image} releases\n\n` +
    `Prebuild ${cfg.image} builds for ubuntu\n\n`;
  for (const release of Object.keys(releases).sort(dockerVer.sortVersions)) {
    md += `\n\n## ubuntu ${release}\n\n`;

    const data = releases[release];

    for (const version of Object.keys(data).sort(semver.sortVersions)) {
      md += `* [${version}](${data[version]})\n`;
    }
  }

  await writeFile(`${path}/README.md`, md);
}

(async () => {
  try {
    log.info('Releaser started');
    const ws = getWorkspace();
    const data = `${ws}/data`;
    const cache = `${ws}/.cache`;

    const cfg = await getConfig();

    if (cfg.dryRun) {
      log.warn(chalk.yellow('[DRY_RUN] detected'));
    }

    log('Prepare worktree');
    const git = await prepare(ws);

    const versions = new Set<string>();
    const tags = new Set((await git.tags()).all);

    log.info('Checking for new builds');
    if (existsSync(cache)) {
      const files = shell.find(`${cache}/**/*.tar.xz`);
      log('Processing files:', files.length);

      for (const file of files) {
        const m = verRe.exec(file);

        if (!m?.groups) {
          log.warn('Invalid file:', file);
          continue;
        }
        log('Processing file:', file);

        const name = m.groups.name;
        const version = m.groups.version;

        await ensureDir(`${data}/${m.groups.release}`);

        shell.cp('-r', file, `${data}/${name}`);

        if (tags.has(version)) {
          log('Skipping existing version:', version);
          continue;
        }

        versions.add(version);
      }
    }

    log.info('Update readme');
    await updateReadme(cfg, data);

    log.info('Update releases');
    await git.add('.');
    const status = await git.status();
    if (!status.isClean()) {
      log('Commiting files');
      git.commit('updated files');
      if (cfg.dryRun) {
        log.warn(
          chalk.yellow('[DRY_RUN]'),
          chalk.blue('Would push:'),
          'releases'
        );
      } else {
        git.push('origin', 'releases', { '--force': true });
      }
    }

    log.info('Update tags');
    for (const version of versions) {
      log('Add tag', version);
      git.addTag(version);
    }

    log('Push tags');
    if (cfg.dryRun) {
      log.warn(chalk.yellow('[DRY_RUN]'), chalk.blue('Would push tags'));
    } else {
      git.pushTags();
    }
  } catch (error) {
    log(error.stack);
    setFailed(error.message);
  }
})();
