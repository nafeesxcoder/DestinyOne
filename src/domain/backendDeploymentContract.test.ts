import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const contractSource = readFileSync('scripts/supabase-deployment-contract.mjs', 'utf8');

function contractNames(key: 'tables' | 'rpcs') {
  const section = contractSource.match(new RegExp(`${key}: \\[([\\s\\S]*?)\\n  \\],`))?.[1] ?? '';
  return [...section.matchAll(/'([a-z0-9_]+)'/g)].map((match) => match[1]);
}

function uniqueMatches(source: string, pattern: RegExp) {
  return [...new Set([...source.matchAll(pattern)].map((match) => match[1]).filter((name): name is string => Boolean(name)))].sort();
}

const serviceSource = [
  'src/services/backend.ts',
  'src/services/billing.ts',
  'src/services/growth.ts',
].map((file) => readFileSync(file, 'utf8')).join('\n');

const edgeSource = [
  'supabase/functions/create-date-reservation-intent/index.ts',
  'supabase/functions/create-gift-order/index.ts',
  'supabase/functions/relationship-reminders/index.ts',
  'supabase/functions/marketplace-booking-webhook/index.ts',
  'supabase/functions/store-billing-webhook/index.ts',
].map((file) => readFileSync(file, 'utf8')).join('\n');

describe('complete backend deployment contract', () => {
  it('covers every RPC invoked by member services and Edge Functions', () => {
    const invokedRpcs = uniqueMatches(`${serviceSource}\n${edgeSource}`, /(?:\.rpc\(\s*'|\/rest\/v1\/rpc\/)([a-z0-9_]+)/g);
    expect(invokedRpcs.filter((rpc) => !contractNames('rpcs').includes(rpc))).toEqual([]);
  });

  it('covers every public table queried directly by member services', () => {
    const directTables = uniqueMatches(serviceSource, /supabase\s*(?:\r?\n\s*)?\.from\(\s*'([a-z0-9_]+)'/g);
    expect(directTables.filter((table) => !contractNames('tables').includes(table))).toEqual([]);
  });

  it('keeps a unique, explicitly versioned production inventory', () => {
    const tables = contractNames('tables');
    const rpcs = contractNames('rpcs');
    expect(contractSource).toContain("id: 'destinyone-backend-v27'");
    expect(contractSource).toContain('schemaVersion: 27');
    expect(new Set(tables).size).toBe(tables.length);
    expect(new Set(rpcs).size).toBe(rpcs.length);
    expect(tables.length).toBe(83);
    expect(rpcs.length).toBe(63);
  });
});
