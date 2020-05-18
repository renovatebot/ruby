import { GitHub, context } from '@actions/github';
import { Octokit } from '@octokit/rest';
import { Config } from '../types/builder';
import { getArg, getEnv, readBuffer } from '../util';

export { GitHub };

const ubuntu = getEnv('UBUNTU_VERSION') || '18.04';

function getName(cfg: Config, version: string): string {
  return `${cfg.image}-${version}-${ubuntu}.tar.xz`;
}

async function findRelease(
  api: GitHub,
  version: string
): Promise<Octokit.ReposGetReleaseByTagResponse | null> {
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

export async function uploadAsset(
  api: GitHub,
  cfg: Config,
  version: string
): Promise<void> {
  try {
    const rel = await findRelease(api, version);
    const url =
      rel == null
        ? (
            await api.repos.createRelease({
              ...context.repo,
              tag_name: version,
            })
          ).data.upload_url
        : rel.upload_url;

    const name = getName(cfg, version);
    const data = await readBuffer(`.cache/${name}.tar.xz`);

    await api.repos.uploadReleaseAsset({
      data,
      name,
      headers: {
        'content-type': 'application/octet-stream',
        'content-length': data.length,
      },
      url,
    });
  } catch (e) {
    if (e.status !== 404) {
      throw e;
    }
  }
}

export async function hasRelease(version: string): Promise<boolean> {
  const token = getArg('token', { required: true });

  const api = new GitHub(token);

  return null != (await findRelease(api, version));
}

export async function hasAsset(
  api: GitHub,
  cfg: Config,
  version: string
): Promise<boolean> {
  const rel = await findRelease(api, version);
  const name = getName(cfg, version);

  return rel?.assets.some((a) => a.name === name) ?? false;
}
