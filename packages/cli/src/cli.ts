#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pc from 'picocolors';
import { runAdd, parseAddOptions } from './add.ts';
import { runList } from './list.ts';
import { removeCommand, parseRemoveOptions } from './remove.ts';
import { isRunningInAgent } from './detect-agent.ts';
import { searchSkills, fetchSkillInfo, resolveSkillsbaySkillId, runSkillsbayAdd } from './skillsbay.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  } catch {
    return '0.2.2';
  }
}

const VERSION = getVersion();

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[38;5;102m';
const TEXT = '\x1b[38;5;145m';

const LOGO_LINES = [
  ' ███████╗██╗  ██╗██╗██╗     ██╗     ███████╗██████╗  █████╗ ██╗   ██╗',
  ' ██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝',
  ' ███████╗█████╔╝ ██║██║     ██║     ███████╗██████╔╝███████║ ╚████╔╝ ',
  ' ╚════██║██╔═██╗ ██║██║     ██║     ╚════██║██╔══██╗██╔══██║  ╚██╔╝  ',
  ' ███████║██║  ██╗██║███████╗███████╗███████║██████╔╝██║  ██║   ██║   ',
  ' ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝╚═════╝ ╚═╝  ╚═╝   ╚═╝   ',
];

const GRAYS = [
  '\x1b[38;5;250m',
  '\x1b[38;5;248m',
  '\x1b[38;5;245m',
  '\x1b[38;5;243m',
  '\x1b[38;5;240m',
  '\x1b[38;5;238m',
];

function showLogo(): void {
  console.log();
  LOGO_LINES.forEach((line, i) => {
    console.log(`${GRAYS[i]}${line}${RESET}`);
  });
}

function showBanner(): void {
  showLogo();
  console.log();
  console.log(`${DIM}Pay-per-skill package manager for AI agents${RESET}`);
  console.log();
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skillsbay add ${DIM}<skill>${RESET}        ${DIM}Purchase & install a skill${RESET}`
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skillsbay info ${DIM}<skill>${RESET}       ${DIM}Inspect a skill and pricing${RESET}`
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skillsbay search ${DIM}[query]${RESET}     ${DIM}Search the marketplace${RESET}`
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skillsbay list${RESET}                 ${DIM}List installed skills${RESET}`
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skillsbay remove ${DIM}[skills]${RESET}    ${DIM}Remove installed skills${RESET}`
  );
  console.log();
  console.log(`${DIM}try:${RESET} npx skillsbay add karapi/skillsbay`);
  console.log();
  console.log(`Explore skills at ${TEXT}https://skillsbay.dev${RESET}`);
  console.log();
}

function showHelp(): void {
  console.log(`
${BOLD}Usage:${RESET} skillsbay <command> [options]

${BOLD}Manage Skills:${RESET}
  add <skill>          Purchase and install a skill (alias: a, install, i)
                       e.g. karapi/skillsbay
                            https://github.com/vercel-labs/skills
  info <skill>         Inspect a skill and its marketplace details
  search [query]       Search skills on the marketplace (alias: find, s)
  list, ls             List installed skills across all agents
  remove [skills]      Remove installed skills (alias: rm)

${BOLD}Add Options:${RESET}
  -g, --global           Install skill globally instead of project-level
  -a, --agent <agents>   Specify agents to install to (e.g. claude-code, cursor)
  -y, --yes              Skip confirmation and prompts (auto-select agents)
  -f, --force            Replace conflicting local skill
  --wallet <mode>        auto or env (x402-funded agent wallet with SKILLSBAY_PRIVATE_KEY)
  --all                  Shorthand for --skill '*' --agent '*' -y
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const restArgs = args.slice(1);
  const inAgent = isRunningInAgent();

  if (!command) {
    showBanner();
    return;
  }

  switch (command) {
    case 'search':
    case 'find':
    case 's':
    case 'f': {
      if (!inAgent) showLogo();
      console.log();
      const query = restArgs[0] || '';
      try {
        const skills = await searchSkills(query);
        if (skills.length === 0) {
          console.log(pc.dim('No skills found matching query.'));
        } else {
          for (const skill of skills) {
            console.log(
              `${pc.bold(pc.cyan(skill.id))}\n  ${skill.title} · $${skill.priceUsdc} USDC · ${skill.paidInstalls.toLocaleString()} paid installs`
            );
          }
        }
      } catch (err: unknown) {
        console.error(pc.red(`Failed to search skills: ${err instanceof Error ? err.message : String(err)}`));
        process.exitCode = 1;
      }
      break;
    }

    case 'info': {
      const skillId = restArgs[0];
      if (!skillId) {
        console.error(pc.red('Error: Missing skill argument. Usage: skillsbay info <namespace/slug>'));
        process.exitCode = 1;
        break;
      }
      try {
        const info = await fetchSkillInfo(skillId);
        if (!info) {
          console.log(pc.yellow(`Skill "${skillId}" not found on Skillsbay.`));
        } else {
          console.log(JSON.stringify(info, null, 2));
        }
      } catch (err: unknown) {
        console.error(pc.red(`Failed to fetch info: ${err instanceof Error ? err.message : String(err)}`));
        process.exitCode = 1;
      }
      break;
    }

    case 'i':
    case 'install':
    case 'a':
    case 'add': {
      if (!inAgent) showLogo();
      const { source: addSource, options: addOpts, errors } = parseAddOptions(restArgs);
      if (errors.length > 0) {
        for (const error of errors) console.error(`Error: ${error}`);
        process.exitCode = 1;
        break;
      }
      const firstSource = addSource[0];
      const skillsbaySkillId = firstSource ? await resolveSkillsbaySkillId(firstSource) : null;
      if (skillsbaySkillId) {
        await runSkillsbayAdd(skillsbaySkillId, {
          global: addOpts.global,
          agent: addOpts.agent,
          yes: addOpts.yes,
        });
      } else {
        await runAdd(addSource, addOpts);
      }
      break;
    }

    case 'list':
    case 'ls': {
      await runList(restArgs);
      break;
    }

    case 'remove':
    case 'rm':
    case 'r': {
      const { skills, options: removeOptions } = parseRemoveOptions(restArgs);
      await removeCommand(skills, removeOptions);
      break;
    }

    case '--help':
    case '-h':
      showHelp();
      break;

    case '--version':
    case '-v':
      console.log(VERSION);
      break;

    default:
      console.log(`Unknown command: ${command}`);
      console.log(`Run ${BOLD}skillsbay --help${RESET} for usage.`);
      process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
