import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { discoverSkills } from './skills.ts';

const createdDirectories: string[] = [];

function createSkill(dir: string, name: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: Test skill\n---\n\n# ${name}\n`
  );
}

afterEach(() => {
  for (const dir of createdDirectories.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('discoverSkills subpath resolution', () => {
  it('resolves a shorthand subpath from the conventional skills container', async () => {
    const repoDir = join(tmpdir(), `skills-discovery-${Date.now()}`);
    createdDirectories.push(repoDir);
    createSkill(join(repoDir, 'skills', 'frontend-design'), 'frontend-design');

    await expect(discoverSkills(repoDir, 'frontend-design')).resolves.toMatchObject([
      { name: 'frontend-design' },
    ]);
  });

  it('prefers an explicitly present repository subpath', async () => {
    const repoDir = join(tmpdir(), `skills-discovery-${Date.now()}-exact`);
    createdDirectories.push(repoDir);
    createSkill(join(repoDir, 'frontend-design'), 'exact-skill');
    createSkill(join(repoDir, 'skills', 'frontend-design'), 'contained-skill');

    await expect(discoverSkills(repoDir, 'frontend-design')).resolves.toMatchObject([
      { name: 'exact-skill' },
    ]);
  });
});
