-- Local D1 database seeder for SkillsBay
-- NEVER run this against remote databases. Use strictly with:
-- wrangler d1 execute skillsbay --local --file=db/seed.sql

-- Clear existing seeded catalog data
DELETE FROM sales;
DELETE FROM skills;

-- Insert author profiles
INSERT INTO author_profiles (wallet_address, username, created_at) VALUES
  ('0x8df2000000000000000000000000000000007a31', 'thegraph', CURRENT_TIMESTAMP),
  ('0xa92e0000000000000000000000000000000019b8', 'defi', CURRENT_TIMESTAMP),
  ('0x35be00000000000000000000000000000000820a', 'openai', CURRENT_TIMESTAMP),
  ('0x3a8100000000000000000000000000000000917f', 'solidity', CURRENT_TIMESTAMP),
  ('0x90c400000000000000000000000000000000ea12', 'data', CURRENT_TIMESTAMP)
ON CONFLICT(wallet_address) DO UPDATE SET username = excluded.username;

-- Insert skills catalog
INSERT INTO skills (id, namespace, slug, title, summary, category, price_usdc, paid_installs, trend, author, author_address, version, updated_at, featured) VALUES
  (
    'thegraph/substreams-deployer',
    'thegraph',
    'substreams-deployer',
    'Substreams Deployer',
    'Turn a protocol prompt into a deployable Substreams pipeline with production-ready indexing conventions.',
    'The Graph',
    '0.25',
    1842,
    28,
    'thegraph',
    '0x8df2000000000000000000000000000000007a31',
    '1.4.0',
    '2h ago',
    1
  ),
  (
    'defi/audited-automation',
    'defi',
    'audited-automation',
    'Audited DeFi Automation',
    'Guardrails and transaction policies for agents operating recurring DeFi workflows.',
    'DeFi',
    '0.80',
    912,
    16,
    'defi',
    '0xa92e0000000000000000000000000000000019b8',
    '1.2.1',
    '1d ago',
    0
  ),
  (
    'openai/evals-rig',
    'openai',
    'evals-rig',
    'Evals Rig',
    'A practical evaluation workflow for agent tools, prompts, and multi-step task harnesses.',
    'Agent tooling',
    '0.35',
    796,
    11,
    'openai',
    '0x35be00000000000000000000000000000000820a',
    '1.8.0',
    '3d ago',
    0
  ),
  (
    'solidity/incident-response',
    'solidity',
    'incident-response',
    'Incident Response',
    'Structured triage and containment playbooks for Solidity production incidents.',
    'Security',
    '1.20',
    605,
    8,
    'solidity',
    '0x3a8100000000000000000000000000000000917f',
    '2.0.0',
    '5d ago',
    0
  ),
  (
    'data/protocol-research',
    'data',
    'protocol-research',
    'Protocol Research',
    'Repeatable diligence workflows for onchain protocols using live Graph data.',
    'Research',
    '0.20',
    449,
    5,
    'data',
    '0x90c400000000000000000000000000000000ea12',
    '1.1.0',
    '6d ago',
    0
  );

-- Insert sales history
INSERT INTO sales (id, skill_id, buyer_address, amount_usdc, occurred_at, transaction_hash) VALUES
  (
    'sale-1',
    'thegraph/substreams-deployer',
    '0x2b1a000000000000000000000000000000000fd2',
    '0.25',
    '8 minutes ago',
    '0x4c1b8f8f6eb25dbad3db8f9b42c4f42d48b3d03f06e7e4b8c17e08b1a4e517d4'
  ),
  (
    'sale-2',
    'thegraph/substreams-deployer',
    '0x71c400000000000000000000000000000000e09a',
    '0.25',
    '1 hour ago',
    '0x6c1b8f8f6eb25dbad3db8f9b42c4f42d48b3d03f06e7e4b8c17e08b1a4e517d4'
  ),
  (
    'sale-3',
    'thegraph/substreams-deployer',
    '0x108b0000000000000000000000000000000075d3',
    '0.25',
    '3 hours ago',
    '0x7c1b8f8f6eb25dbad3db8f9b42c4f42d48b3d03f06e7e4b8c17e08b1a4e517d4'
  ),
  (
    'sale-4',
    'defi/audited-automation',
    '0x55aa000000000000000000000000000000001234',
    '0.80',
    '4 hours ago',
    '0x8c1b8f8f6eb25dbad3db8f9b42c4f42d48b3d03f06e7e4b8c17e08b1a4e517d4'
  );
