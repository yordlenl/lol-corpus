// @vitest-environment happy-dom
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { collection } from './collection.ts';
import { LearningStore } from './db.ts';
import type { LookupResult, WordEventDetail } from './types.ts';

// 查詞換成假的：minions 查得到原形 minion，ahri 查不到
vi.mock('./dict.ts', () => ({
  lookupWord: async (key: string): Promise<LookupResult> =>
    key === 'minions'
      ? { surface: 'minions', lemma: 'minion', entry: { p: "'minjən", t: 'n. 小兵' } as LookupResult['entry'] }
      : { surface: key, lemma: key, entry: null },
}));

const { settings } = await import('./settings.ts');
const { canSpeak, pickVoice, speakWord, SLOW_RATE } = await import('./speech.ts');
await import('./components/word-popup.ts');

/** 假的系統語音：記下念了什麼、有沒有先停掉 */
class FakeUtterance {
  lang = '';
  rate = 1;
  voice: SpeechSynthesisVoice | null = null;
  text: string;
  constructor(text: string) {
    this.text = text;
  }
}
const voice = (name: string, lang: string) => ({ lang, localService: true, default: false, name }) as SpeechSynthesisVoice;
const synth = {
  speaking: false,
  pending: false,
  spoken: [] as FakeUtterance[],
  cancelled: 0,
  voices: [voice('Albert', 'en-US'), voice('Bubbles', 'en-US'), voice('Daniel', 'en-GB'), voice('Samantha', 'en-US')],
  cancel() {
    this.cancelled++;
    this.speaking = false;
  },
  speak(u: FakeUtterance) {
    this.spoken.push(u);
    this.speaking = true;
  },
  getVoices() {
    return this.voices;
  },
};

beforeAll(async () => {
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  const store = new LearningStore(new IDBFactory());
  await settings.load(store);
  await collection.load(store);
});
beforeEach(() => {
  synth.spoken = [];
  synth.cancelled = 0;
  synth.speaking = false;
});
afterEach(async () => {
  document.body.replaceChildren();
  await settings.update({ speech: { accent: 'en-US', rate: 'normal' } });
});

describe('什麼字可以念', () => {
  it('一般英文單字可以念，包含大寫開頭、撇號、連字號', () => {
    for (const w of ['minion', 'Minions', "champion's", 'well-being', 'go']) expect(canSpeak(w), w).toBe(true);
  });

  it('全大寫縮寫、單一字母、數字、符號、空白不念', () => {
    for (const w of ['AP', 'AD', 'CC', 'a', 'I', '100', 'Q2', '', 'two words', "'s"]) expect(canSpeak(w), w).toBe(false);
  });
});

describe('朗讀', () => {
  it('照設定的口音念，挑 Apple 的標準語音', () => {
    expect(speakWord('minion')).toBe(true);
    const [u] = synth.spoken;
    expect(u.text).toBe('minion');
    expect(u.lang).toBe('en-US');
    expect(u.rate).toBe(1);
    expect(u.voice?.name).toBe('Samantha');
  });

  it('英式、慢速', async () => {
    await settings.update({ speech: { accent: 'en-GB', rate: 'slow' } });
    speakWord('minion');
    const [u] = synth.spoken;
    expect(u.lang).toBe('en-GB');
    expect(u.rate).toBe(SLOW_RATE);
    expect(u.voice?.name).toBe('Daniel');
  });

  it('念到一半再按：先停掉再從頭念', () => {
    speakWord('minion');
    expect(synth.cancelled).toBe(0);
    speakWord('minion');
    expect(synth.cancelled).toBe(1);
    expect(synth.spoken).toHaveLength(2);
  });

  it('不能念的字不出聲', () => {
    expect(speakWord('AP')).toBe(false);
    expect(synth.spoken).toHaveLength(0);
  });

  it('不挑搞怪聲音；只有搞怪聲音或沒有相符口音時交給系統', () => {
    expect(pickVoice([voice('Albert', 'en-US'), voice('Zarvox', 'en-US')], 'en-US')).toBeNull();
    expect(pickVoice([voice('Thomas', 'fr-FR')], 'en-US')).toBeNull();
    expect(pickVoice([voice('Daniel', 'en_GB')], 'en-GB')?.name).toBe('Daniel');
  });

  it('有下載高品質版就優先用', () => {
    const voices = [voice('Samantha', 'en-US'), voice('Ava (Premium)', 'en-US'), voice('Samantha (Enhanced)', 'en-US')];
    expect(pickVoice(voices, 'en-US')?.name).toBe('Ava (Premium)');
    expect(pickVoice(voices.slice(0, 1).concat(voices[2]), 'en-US')?.name).toBe('Samantha (Enhanced)');
  });
});

describe('<lol-speak-button>', () => {
  async function button(word: string) {
    const el = Object.assign(document.createElement('lol-speak-button'), { word });
    document.body.append(el);
    await el.updateComplete;
    return el.shadowRoot!.querySelector('button');
  }

  it('按一下就念這個字', async () => {
    (await button('minion'))!.click();
    expect(synth.spoken.map((u) => u.text)).toEqual(['minion']);
  });

  it('不能念的字不顯示按鈕', async () => {
    expect(await button('AP')).toBeNull();
  });
});

describe('查詞小視窗的喇叭', () => {
  async function popupFor(word: string) {
    const popup = document.createElement('lol-word-popup');
    document.body.append(popup);
    const detail: WordEventDetail = {
      word,
      key: word.toLowerCase(),
      context: 'body',
      sentence: word,
      text: { en: word, zh_TW: '', zh_CN: '' },
      anchor: { left: 0, top: 0, right: 10, bottom: 10 },
    };
    await popup.open(detail);
    await popup.updateComplete;
    return popup.shadowRoot!.querySelector('lol-speak-button');
  }

  it('詞典有的字：音標旁邊有喇叭，念點到的字形', async () => {
    const speaker = await popupFor('minions');
    expect(speaker?.word).toBe('minions');
    expect(speaker?.previousElementSibling?.className).toBe('phonetic');
  });

  it('詞典沒有的字：沒有喇叭', async () => {
    expect(await popupFor('ahri')).toBeNull();
  });
});
