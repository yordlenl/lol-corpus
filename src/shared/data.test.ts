import { afterEach, describe, expect, it, vi } from 'vitest';
import { corpusUrl, loadMeta, setCorpusBase } from './data.ts';

afterEach(() => vi.unstubAllGlobals());

describe('讀語料庫資料', () => {
  it('檔案網址都在語料庫底下', () => {
    setCorpusBase('https://yordlenl.github.io/lol-corpus/');
    expect(corpusUrl('img/item/3157.png')).toBe('https://yordlenl.github.io/lol-corpus/img/item/3157.png');
  });

  it('同一份資料只下載一次', async () => {
    setCorpusBase('https://yordlenl.github.io/lol-corpus/');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ddragon: '16.21.1' })));
    vi.stubGlobal('fetch', fetchMock);
    await loadMeta();
    await loadMeta();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://yordlenl.github.io/lol-corpus/data/meta.json');
  });

  it('讀取失敗不記住，下次會重試', async () => {
    setCorpusBase('https://yordlenl.github.io/lol-corpus/');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ddragon: '16.21.1' })));
    vi.stubGlobal('fetch', fetchMock);
    await expect(loadMeta()).rejects.toThrow('讀不到資料 meta.json');
    await expect(loadMeta()).resolves.toEqual({ ddragon: '16.21.1' });
  });
});
