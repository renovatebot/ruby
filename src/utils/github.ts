import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import {
  ReposCreateReleaseResponseData,
  ReposGetReleaseResponseData,
} from '@octokit/types';
import { Config } from '../types/builder';
import { getEnv, readBuffer } from '../util';

export { getOctokit };

type GitHubOctokit = InstanceType<typeof GitHub>;

const ubuntu = getEnv('UBUNTU_VERSION') || '18.04';

function getName(cfg: Config, version: string): string {
  return `${cfg.image}-${version}-${ubuntu}.tar.xz`;
}

function getBody(cfg: Config, version: string): string {
  return `### Bug Fixes

* **deps:** update dependency ${cfg.image} to v${version}`;
}

async function findRelease(
  api: GitHubOctokit,
  version: string
): Promise<ReposGetReleaseResponseData | null> {
  try {
    const res = await api.repos.getReleaseByTag({
      ...context.repo,
      tag: version,
    });
    return res.data ?? null;
  } catch (e) {
    if (e.status !== 404) {
      throw e;
    }
  }
  return null;
}

async function createRelease(
  api: GitHubOctokit,
  cfg: Config,
  version: string
): Promise<ReposCreateReleaseResponseData> {
  const { data } = await api.repos.createRelease({
    ...context.repo,
    tag_name: version,
    name: version,
    body: getBody(cfg, version),
  });
  return data;
}

export async function updateRelease(
  api: GitHubOctokit,
  cfg: Config,
  version: string
): Promise<void> {
  const body = getBody(cfg, version);
  const rel = await findRelease(api, version);
  if (rel == null || (rel.name === version && rel.body === body)) {
    return;
  }
  await api.repos.updateRelease({
    ...context.repo,
    release_id: rel.id,
    name: version,
    body,
  });
}

export async function uploadAsset(
  api: GitHubOctokit,
  cfg: Config,
  version: string
): Promise<void> {
  try {
    const rel = await findRelease(api, version);
    let release_id = rel?.id ?? 0;

    if (rel == null) {
      const { id } = await createRelease(api, cfg, version);
      release_id = id;
    }

    const name = getName(cfg, version);
    const data = await readBuffer(`.cache/${name}`);

    await api.repos.uploadReleaseAsset({
      ...context.repo,
      release_id,
      data,
      name,
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': data.length,
      },
    });
  } catch (e) {
    if (e.status !== 404) {
      throw e;
    }
  }
}

export async function hasAsset(
  api: GitHubOctokit,
  cfg: Config,
  version: string
): Promise<boolean> {
  const rel = await findRelease(api, version);
  const name = getName(cfg, version);

  return rel?.assets.some((a) => a.name === name) ?? false;
}
