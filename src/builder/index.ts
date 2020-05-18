import 'source-map-support/register';
import 'renovate/dist/util/cache/global/file';
import { createWriteStream } from 'fs';
import { pipeline as _pipeline } from 'stream';
import { promisify } from 'util';
import { setFailed } from '@actions/core';
import chalk from 'chalk';
import lzma from 'lzma-native';
import { ReleaseResult, getPkgReleases } from 'renovate/dist/datasource';
import { get as getVersioning } from 'renovate/dist/versioning';
import shell from 'shelljs';
import tar from 'tar';
import { Config } from '../types/builder';
import { exec, getArg, getWorkspace } from '../util';
import { getConfig } from '../utils/config';
import { preparePages } from '../utils/git';
import { GitHub, hasAsset, uploadAsset } from '../utils/github';
import log from '../utils/logger';

const pipeline = promisify(_pipeline);

let builds = 1;

async function docker(...args: string[]): Promise<void> {
  await exec('docker', [...args]);
}
async function dockerRun(...args: string[]): Promise<void> {
  await docker('run', '--rm', ...args);
}

async function runBuilder(
  ws: string,
  path: string,
  version: string
): Promise<void> {
  await dockerRun(
    '--name',
    'builder',
    '--volume',
    `${ws}/.cache/${path}:/usr/local/${path}`,
    'builder',
    version,
    `/usr/local/${path}/${version}`
  );
}
let latestStable: string | undefined;

function getVersions(versions: string[]): ReleaseResult {
  return {
    releases: versions.map((version) => ({
      version,
    })),
  };
}

async function getBuildList({
  datasource,
  depName,
  versioning,
  startVersion,
  ignoredVersions,
  lastOnly,
  forceUnstable,
  versions,
  latestVersion,
}: Config): Promise<string[]> {
  log('Looking up versions');
  const ver = getVersioning(versioning as never);
  const pkgResult = versions
    ? getVersions(versions)
    : await getPkgReleases({
        datasource,
        depName,
        versioning,
      });
  if (!pkgResult) {
    return [];
  }
  let allVersions = pkgResult.releases
    .map((v) => v.version)
    .filter((v) => ver.isVersion(v) && ver.isCompatible(v, startVersion));
  log(`Found ${allVersions.length} total versions`);
  if (!allVersions.length) {
    return [];
  }
  allVersions = allVersions
    .filter(
      (v) => /* istanbul ignore next */ !ver.isLessThanRange?.(v, startVersion)
    )
    .filter((v) => !ignoredVersions.includes(v));

  if (!forceUnstable) {
    log('Filter unstable versions');
    allVersions = allVersions.filter((v) => ver.isStable(v));
  }

  log(`Found ${allVersions.length} versions within our range`);
  log(`Candidates:`, allVersions.join(', '));

  latestStable =
    latestVersion ||
    pkgResult.latestVersion ||
    allVersions.filter((v) => ver.isStable(v)).pop();
  log('Latest stable version is ', latestStable);

  if (latestStable && !allVersions.includes(latestStable)) {
    log.warn(
      `LatestStable '${latestStable}' not buildable, candidates: `,
      allVersions.join(', ')
    );
  }

  const lastVersion = allVersions[allVersions.length - 1];
  log('Most recent version is ', lastVersion);

  if (lastOnly) {
    log('Building last version only');
    allVersions = [latestStable && !forceUnstable ? latestStable : lastVersion];
  }

  if (allVersions.length) {
    log('Build list: ', allVersions.join(', '));
  } else {
    log('Nothing to build');
  }
  return allVersions;
}

(async () => {
  try {
    log.info('Builder started');
    const ws = getWorkspace();

    await preparePages(ws);

    const cfg = await getConfig();

    if (cfg.dryRun) {
      log.warn(chalk.yellow('[DRY_RUN] detected'));
      cfg.lastOnly = true;
    }

    const token = getArg('token', { required: true });
    const api = new GitHub(token);

    log('config:', JSON.stringify(cfg));

    const versions = await getBuildList(cfg);

    shell.mkdir('-p', `${ws}/.cache/${cfg.image}`);

    for (const version of versions) {
      if (hasAsset(api, cfg, version)) {
        if (cfg.dryRun) {
          log.warn(
            chalk.yellow('[DRY_RUN] Would skipp existing version:'),
            version
          );
        } else {
          log('Skipping existing version:', version);
          continue;
        }
      }

      if (builds-- < 0) {
        log('Build limit reached');
        break;
      }

      log('Building version:', version);
      await runBuilder(ws, cfg.image, version);

      log('Compressing version:', version);
      const output = createWriteStream(
        `./.cache/${cfg.image}-${version}.tar.xz`
      );
      const compressor = lzma.createCompressor();

      const input = tar.c(
        {
          cwd: `.cache/${cfg.image}`,
        },
        [version]
      );

      await pipeline(input, compressor, output);

      if (cfg.dryRun) {
        log.warn(
          chalk.yellow('[DRY_RUN] Would upload release asset:'),
          version
        );
      } else {
        uploadAsset(api, cfg, version);
      }
    }
  } catch (error) {
    log(error.stack);
    setFailed(error.message);
  }
})();
