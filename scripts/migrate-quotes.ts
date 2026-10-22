// 一次性轉換：把 lol-english 的 content/voices.json 轉成 spec「台詞資料格式」，寫到 content/quotes.json。
// 已經執行過；之後 quotes.json 就是正本，可以直接修改。這個檔案留著，方便查當初怎麼轉的。
// 用法：node scripts/migrate-quotes.ts
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Quote } from '../src/shared/types.ts';
import { toTraditional } from './data/chinese.ts';
import { CONTENT_DIR } from './data/config.ts';
import type { QuotesFile } from './data/quotes.ts';

const SOURCE_COMMIT = '2cc207ffb5cd64c04100bb99b4ff8e0a923d0360';
const SOURCE_PATH = 'content/voices.json';

interface LolEnglishVoice {
  id: string;
  event: 'pick' | 'ban';
  textEn: string;
  textZh: string;
  translationKind: 'learning';
  audioEn: string;
  sourceUrl: string;
  nonverbal?: boolean;
  fictionalLanguage?: boolean;
}

interface LolEnglishVoices {
  schemaVersion: number;
  attribution: string;
  license: string;
  licenseUrl: string;
  champions: Record<string, LolEnglishVoice[]>;
}

export function convertVoice(champion: string, v: LolEnglishVoice): Quote {
  return {
    id: `${champion}/base/${v.id}`,
    champion,
    voiceSet: 'base',
    event: v.event,
    text: { en: v.textEn, zh_TW: toTraditional(v.textZh), zh_CN: v.textZh, ko: '' },
    audio: { en: v.audioEn, zh_TW: '', zh_CN: '', ko: '' },
    translation: { en: 'original', zh_TW: 'learning', zh_CN: 'learning', ko: '' },
    source: v.sourceUrl,
    ...(v.nonverbal ? { nonverbal: true } : {}),
    ...(v.fictionalLanguage ? { fictionalLanguage: true } : {}),
  };
}

if (import.meta.main) {
  const url = `https://raw.githubusercontent.com/carefreelove/lol-english/${SOURCE_COMMIT}/${SOURCE_PATH}`;
  const voices = (await (await fetch(url)).json()) as LolEnglishVoices;
  const out: QuotesFile = {
    schema: 1,
    attribution: voices.attribution,
    license: voices.license,
    licenseUrl: voices.licenseUrl,
    derivedFrom: `https://github.com/carefreelove/lol-english/blob/${SOURCE_COMMIT}/${SOURCE_PATH}`,
    quotes: Object.entries(voices.champions).flatMap(([champion, lines]) => lines.map((v) => convertVoice(champion, v))),
  };
  await writeFile(join(CONTENT_DIR, 'quotes.json'), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`content/quotes.json：${out.quotes.length} 條`);
}
