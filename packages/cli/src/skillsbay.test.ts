import { afterEach, describe, expect, it, vi } from 'vitest';

describe('fetchApiRead', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retries a transient network failure before returning a response', async () => {
    vi.stubGlobal('__SKILLSBAY_API_URL__', 'https://skillsbay.dev');
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response('ok'));
    vi.stubGlobal('fetch', fetchMock);

    const { fetchApiRead } = await import('./skillsbay.ts');

    await expect(fetchApiRead('https://skillsbay.dev/v1/health')).resolves.toMatchObject({
      status: 200,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
