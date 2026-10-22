import { describe, expect, it } from 'vitest';
import type { Quote } from '../../src/shared/types.ts';
import { convertVoice } from '../migrate-quotes.ts';
import { type QuotesFile, validateQuotes } from './quotes.ts';

const WIKI = 'https://wiki.leagueoflegends.com/en-us';

function quote(champion: string, event: 'pick' | 'ban', patch: Partial<Quote> = {}): Quote {
  return {
    id: `${champion}/base/${event}-1`,
    champion,
    voiceSet: 'base',
    event,
    text: { en: '"Hello."', zh_TW: '你好。', zh_CN: '你好。', ko: '' },
    audio: { en: `${WIKI}/images/a.mp3`, zh_TW: '', zh_CN: '', ko: '' },
    translation: { en: 'original', zh_TW: 'learning', zh_CN: 'learning', ko: '' },
    source: `${WIKI}/Ahri/Audio?oldid=123`,
    ...patch,
  };
}

const file = (quotes: Quote[]): QuotesFile => ({
  schema: 1,
  attribution: '',
  license: 'CC-BY-SA-3.0',
  licenseUrl: '',
  derivedFrom: '',
  quotes,
});

describe('台詞檢查', () => {
  it('每位英雄都有選用和禁用就通過', () => {
    expect(() => validateQuotes(file([quote('Ahri', 'pick'), quote('Ahri', 'ban')]), ['Ahri'])).not.toThrow();
  });

  it('缺禁用台詞會報錯', () => {
    expect(() => validateQuotes(file([quote('Ahri', 'pick')]), ['Ahri'])).toThrow('缺少禁用台詞：Ahri');
  });

  it('網址不是 LoL Wiki 會報錯', () => {
    const bad = quote('Ahri', 'pick', { audio: { en: 'https://evil.example/a.mp3', zh_TW: '', zh_CN: '', ko: '' } });
    expect(() => validateQuotes(file([bad, quote('Ahri', 'ban')]), ['Ahri'])).toThrow('LoL Wiki');
  });

  it('英文裡有中文字會報錯', () => {
    const bad = quote('Ahri', 'pick', { text: { en: '你好', zh_TW: '你好', zh_CN: '你好', ko: '' } });
    expect(() => validateQuotes(file([bad, quote('Ahri', 'ban')]), ['Ahri'])).toThrow('英文裡有中文字');
  });

  it('id 重複會報錯', () => {
    expect(() => validateQuotes(file([quote('Ahri', 'pick'), quote('Ahri', 'pick'), quote('Ahri', 'ban')]), ['Ahri'])).toThrow('重複');
  });
});

describe('從 lol-english 轉換', () => {
  it('轉成新格式，繁中由簡中字形轉換，兩行都標學習譯文', () => {
    const q = convertVoice('Aatrox', {
      id: 'pick-1',
      event: 'pick',
      textEn: '"Now, hear the silence of annihilation!"',
      textZh: '现在，聆听湮灭的寂静！',
      translationKind: 'learning',
      audioEn: `${WIKI}/images/a.mp3`,
      sourceUrl: `${WIKI}/Aatrox/Audio?oldid=1`,
    });
    expect(q.id).toBe('Aatrox/base/pick-1');
    expect(q.text).toEqual({ en: '"Now, hear the silence of annihilation!"', zh_TW: '現在，聆聽湮滅的寂靜！', zh_CN: '现在，聆听湮灭的寂静！', ko: '' });
    expect(q.translation).toEqual({ en: 'original', zh_TW: 'learning', zh_CN: 'learning', ko: '' });
    expect(q.audio.ko).toBe('');
  });
});
