import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const verifier = readFileSync('scripts/verify-supabase-deployment.mjs', 'utf8');
const migration = readFileSync('supabase/migrations/021_auth_profile_media_hardening.sql', 'utf8');

describe('hosted deployment verifier security', () => {
  it('invokes only the read-only deployment manifest RPC', () => {
    const rpcPaths = [...verifier.matchAll(/\/rest\/v1\/rpc\/([a-z0-9_]+)/g)].map((match) => match[1]);
    expect(rpcPaths).toEqual(['get_backend_deployment_manifest']);
    expect(verifier).not.toContain("p_match_id");
    expect(verifier).not.toContain("p_product_key");
    expect(verifier).not.toContain("p_reported_id");
  });

  it('requires a server-only service role credential for manifest evidence', () => {
    expect(verifier).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(verifier).toContain('Authorization: `Bearer ${serviceRoleKey}`');
  });

  it('uses read-only OpenAPI inspection for anonymous RPC exposure', () => {
    expect(verifier).toContain("Accept: 'application/openapi+json'");
    expect(verifier).toContain('anonymousRpcExposures');
  });

  it('keeps the manifest service-only and stable', () => {
    expect(migration).toContain('stable');
    expect(migration).toContain('security definer');
    expect(migration).toContain('revoke all on function public.get_backend_deployment_manifest() from public, anon, authenticated');
    expect(migration).toContain('grant execute on function public.get_backend_deployment_manifest() to service_role');
  });
});
