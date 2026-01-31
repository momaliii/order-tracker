import { createRemoteJWKSet, jwtVerify } from 'jose';

type VerifiedUser = {
  sub: string;
  email?: string;
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (jwks) return jwks;
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) throw new Error('SUPABASE_URL is not configured');
  const jwksUrl = new URL('/auth/v1/.well-known/jwks.json', supabaseUrl);
  jwks = createRemoteJWKSet(jwksUrl);
  return jwks;
}

export async function verifySupabaseJwt(token: string): Promise<VerifiedUser> {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) throw new Error('SUPABASE_URL is not configured');

  const { payload } = await jwtVerify(token, getJwks(), {
    issuer: `${supabaseUrl.replace(/\/+$/, '')}/auth/v1`,
    audience: 'authenticated',
  });

  return {
    sub: String(payload.sub),
    email: typeof payload.email === 'string' ? payload.email : undefined,
  };
}

