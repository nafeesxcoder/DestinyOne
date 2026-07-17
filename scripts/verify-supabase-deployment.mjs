import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { deploymentContract } from './supabase-deployment-contract.mjs';

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const evidenceFileArgument = process.argv.find((argument) => argument.startsWith('--evidence-file='));
const evidenceFile = evidenceFileArgument?.slice('--evidence-file='.length);

const missingEnvironment = [
  ['EXPO_PUBLIC_SUPABASE_URL', url],
  ['EXPO_PUBLIC_SUPABASE_ANON_KEY', anonKey],
  ['SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey],
].filter(([, value]) => !value).map(([name]) => name);

if (missingEnvironment.length) {
  console.error(`Missing hosted verification variables: ${missingEnvironment.join(', ')}`);
  process.exit(2);
}

const fetchJson = async (endpoint, init) => {
  const response = await fetch(endpoint, {...init, signal: AbortSignal.timeout(10_000)});
  const body = await response.json().catch(() => ({}));
  return {response, body};
};

const authResult = await fetchJson(`${url}/auth/v1/settings`, {
  headers: {apikey: anonKey},
});

// This is the only RPC invoked by the verifier. The latest contract migration
// keeps it a stable, service-role-only metadata read with no member writes.
const manifestResult = await fetchJson(`${url}/rest/v1/rpc/get_backend_deployment_manifest`, {
  method: 'POST',
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
  },
  body: '{}',
});

const openApiResult = await fetchJson(`${url}/rest/v1/`, {
  headers: {
    apikey: anonKey,
    Accept: 'application/openapi+json',
  },
});

const manifest = manifestResult.body && typeof manifestResult.body === 'object'
  ? manifestResult.body
  : {};
const deployedTables = new Set(Array.isArray(manifest.tables) ? manifest.tables : []);
const deployedFunctions = new Set(Array.isArray(manifest.functions) ? manifest.functions : []);
const rlsDisabledTables = new Set(Array.isArray(manifest.rls_disabled_tables) ? manifest.rls_disabled_tables : []);
const openApiPaths = openApiResult.body && typeof openApiResult.body.paths === 'object'
  ? openApiResult.body.paths
  : {};

const missingTables = deploymentContract.tables.filter((name) => !deployedTables.has(name));
const missingRpcs = deploymentContract.rpcs.filter((name) => !deployedFunctions.has(name));
const requiredTablesWithoutRls = deploymentContract.tables.filter((name) => rlsDisabledTables.has(name));
const anonymousRpcExposures = deploymentContract.rpcs.filter((name) => Boolean(openApiPaths[`/rpc/${name}`]));

const anonymousTableChecks = await Promise.all(deploymentContract.tables.map(async (name) => {
  const response = await fetch(`${url}/rest/v1/${name}?select=*&limit=0`, {
    headers: {apikey: anonKey},
    signal: AbortSignal.timeout(10_000),
  });
  return {name, status: response.status, exposed: response.ok};
}));
const anonymousTableExposures = anonymousTableChecks.filter((item) => item.exposed).map((item) => item.name);
const unhealthyTableEndpoints = anonymousTableChecks.filter((item) => item.status >= 500).map((item) => item.name);

const auth = authResult.body;
const summary = {
  verifiedAt: new Date().toISOString(),
  target: process.env.DESTINYONE_DEPLOYMENT_TARGET ?? 'unspecified',
  commitSha: process.env.GITHUB_SHA ?? null,
  contract: {
    expectedId: deploymentContract.id,
    deployedId: manifest.contract_id ?? null,
    expectedSchemaVersion: deploymentContract.schemaVersion,
    deployedSchemaVersion: manifest.schema_version ?? null,
  },
  auth: {
    reachable: authResult.response.ok,
    email: auth?.external?.email === true,
    phone: auth?.external?.phone === true,
    google: auth?.external?.google === true,
    smsProvider: auth?.sms_provider ?? null,
  },
  manifestReachable: manifestResult.response.ok,
  openApiReachable: openApiResult.response.ok,
  expectedTables: deploymentContract.tables.length,
  expectedRpcs: deploymentContract.rpcs.length,
  missingTables,
  missingRpcs,
  requiredTablesWithoutRls,
  anonymousTableExposures,
  anonymousRpcExposures,
  unhealthyTableEndpoints,
};

console.log(JSON.stringify(summary, null, 2));

const failed =
  !authResult.response.ok ||
  !manifestResult.response.ok ||
  !openApiResult.response.ok ||
  manifest.contract_id !== deploymentContract.id ||
  manifest.schema_version !== deploymentContract.schemaVersion ||
  missingTables.length > 0 ||
  missingRpcs.length > 0 ||
  requiredTablesWithoutRls.length > 0 ||
  anonymousTableExposures.length > 0 ||
  anonymousRpcExposures.length > 0 ||
  unhealthyTableEndpoints.length > 0;

const evidence = {...summary, verified: !failed};
if (evidenceFile) {
  mkdirSync(dirname(evidenceFile), {recursive: true});
  writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`, {mode: 0o600});
}

if (failed) process.exit(1);
