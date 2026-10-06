import { test, expect } from '@playwright/test';

test.describe('06 - Winner Claim Security Boundaries', () => {
  test('Direct unauthenticated invocation of claim_bingo_authoritative is rejected', async ({ request }) => {
    // Attempting direct POST to PostgREST RPC as anon
    const rpcUrl = 'https://lfmavupbxfkxuzncfzzs.supabase.co/rest/v1/rpc/claim_bingo_authoritative';
    const response = await request.post(rpcUrl, {
      headers: {
        'apikey': 'sb_publishable_M84R1OrB_UAz9qVvbVNciQ_YYwyG-iG',
        'Content-Type': 'application/json',
      },
      data: {
        p_draw_id: '00000000-0000-0000-0000-000000000000',
        p_card_id: '00000000-0000-0000-0000-000000000000',
        p_pattern: 'CARTON_LLENO',
      },
    });

    // Unauthenticated claim must be rejected (401 / 403 / 404 / 42501)
    expect([401, 403, 404, 400]).toContain(response.status());
  });
});
