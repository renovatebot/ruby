import { existsSync } from 'fs-extra';
import simleGit from 'simple-git/promise'; // eslint-disable-line import/default
import log from './logger';

export { simleGit as git };

export type SimpleGit = simleGit.SimpleGit;

export async function preparePages(
  ws: string,
  tags?: boolean
): Promise<SimpleGit> {
  const git = simleGit(ws);

  await git.fetch('origin', 'releases', { '--tags': tags });

  if (!existsSync(`${ws}/data`)) {
    log('creating worktree');
    await git.raw([
      'worktree',
      'add',
      '--force',
      '--track',
      '-B',
      'releases',
      './data',
      'origin/releases',
    ]);
  }

  return git;
}
