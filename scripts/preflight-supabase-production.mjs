import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

const remote = process.argv.includes('--remote');
const migrationDir = 'supabase/migrations';
const testFile = 'supabase/tests/database/backend_security.test.sql';
const errors = [];
const warnings = [];

function requireCondition(condition, message) {
  if (!condition) errors.push(message);
}

const migrationFiles = readdirSync(migrationDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();
const versions = migrationFiles.map((name) => Number(name.match(/^(\d{3})_[a-z0-9_]+\.sql$/)?.[1] ?? -1));

requireCondition(migrationFiles.length >= 14, 'Expected at least 14 ordered migrations.');
requireCondition(versions.every((version) => version > 0), 'Migration names must use NNN_snake_case.sql.');
requireCondition(versions.every((version, index) => version === index + 1), 'Migration versions must be contiguous from 001.');

const migrationSql = migrationFiles
  .map((name) => readFileSync(join(migrationDir, name), 'utf8'))
  .join('\n');
const forbiddenPlaceholders = ['your-project.supabase.co', 'SUPABASE_SERVICE_ROLE_KEY=', 'TODO_DEPLOY'];
for (const placeholder of forbiddenPlaceholders) {
  requireCondition(!migrationSql.includes(placeholder), `Migration SQL contains forbidden placeholder: ${placeholder}`);
}

const requiredContracts = [
  'create table public.profiles',
  'create table public.messages',
  'create table if not exists public.live_location_shares',
  'create table if not exists public.safety_action_events',
  'create table if not exists public.profile_match_attributes',
  'create table if not exists public.matching_preferences',
  'create table if not exists public.daily_match_recommendations',
  'create or replace function public.get_current_member_bootstrap',
  'create or replace function public.send_match_message',
  'create or replace function public.submit_member_report',
  'create or replace function public.save_matching_preferences',
  'create or replace function public.submit_match_feedback',
  'alter default privileges in schema public revoke all on tables from anon',
  'alter default privileges in schema public revoke execute on functions from public',
];
for (const contract of requiredContracts) {
  requireCondition(migrationSql.toLowerCase().includes(contract.toLowerCase()), `Missing database contract: ${contract}`);
}

const edgeFunctions = ['create-date-reservation-intent', 'create-gift-order', 'relationship-reminders'];
for (const functionName of edgeFunctions) {
  requireCondition(existsSync(`supabase/functions/${functionName}/index.ts`), `Missing Edge Function: ${functionName}`);
}

const databaseTest = readFileSync(testFile, 'utf8');
const assertionPattern = /\bselect\s+(?:ok|is|isnt|like|unlike|throws_ok|lives_ok|has_[a-z_]+|hasnt_[a-z_]+|col_[a-z_]+|function_[a-z_]+|results_eq|set_eq|bag_eq|is_empty|isnt_empty)\s*\(/gi;
const assertionCount = databaseTest.match(assertionPattern)?.length ?? 0;
requireCondition(assertionCount >= 75, `Expected at least 75 pgTAP assertions, found ${assertionCount}.`);

const publicFiles = ['.env.example', 'src/config/supabase.ts', 'src/lib/supabase.ts'];
for (const file of publicFiles) {
  const source = readFileSync(file, 'utf8');
  requireCondition(!/EXPO_PUBLIC_(?:SUPABASE_)?SERVICE_ROLE/i.test(source), `${file} exposes a service-role variable to the client.`);
}

if (remote) {
  const requiredEnvironment = [
    'SUPABASE_ACCESS_TOKEN',
    'SUPABASE_PROJECT_REF',
    'SUPABASE_DB_PASSWORD',
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  ];
  for (const name of requiredEnvironment) {
    requireCondition(Boolean(process.env[name]?.trim()), `Missing remote deployment variable: ${name}`);
  }
  requireCondition(
    process.env.SUPABASE_BASELINE_APPROVED === 'true',
    'SUPABASE_BASELINE_APPROVED=true is required after reviewing the existing profiles/messages schema.',
  );

  const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
  const publicUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  if (projectRef && publicUrl) {
    let urlRef = '';
    try {
      const parsed = new URL(publicUrl);
      requireCondition(parsed.protocol === 'https:', 'Hosted Supabase URL must use HTTPS.');
      urlRef = parsed.hostname.split('.')[0] ?? '';
    } catch {
      errors.push('EXPO_PUBLIC_SUPABASE_URL is not a valid URL.');
    }
    requireCondition(urlRef === projectRef, 'SUPABASE_PROJECT_REF does not match EXPO_PUBLIC_SUPABASE_URL.');
  }
} else {
  warnings.push('Remote credentials and existing-schema compatibility are checked only with --remote.');
}

const summary = {
  mode: remote ? 'remote' : 'source',
  migrations: migrationFiles.length,
  latestMigration: basename(migrationFiles.at(-1) ?? ''),
  pgTapAssertions: assertionCount,
  edgeFunctions: edgeFunctions.length,
  errors,
  warnings,
};

console.log(JSON.stringify(summary, null, 2));
if (errors.length) process.exit(1);
