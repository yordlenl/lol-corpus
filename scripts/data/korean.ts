// 把官方韓文接到三語資料上：每段文字多一個 ko 欄位（漢諺混寫，漢字上面標諺文）。
// 做法：同一套整理程式再跑一次，簡中那一格換成韓文，得到形狀一模一樣的資料，再把韓文一段一段搬過來。
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { richToPlain } from '../../src/shared/text.ts';
import type { Rich, Tri } from '../../src/shared/types.ts';
import { HANJA_DICT_URL, KIWI_MODEL_URL, ROOT } from './config.ts';
import { HanjaConverter, type KoTokenizer, parseHanjaDict, readsAs } from './hanja.ts';
import { HANJA_CONTEXT, HANJA_OVERRIDES } from './hanja-table.ts';
import { download, getText } from './http.ts';

const HAN = /\p{Script=Han}/u;

const isText = (v: unknown): v is Rich => typeof v === 'string' || Array.isArray(v);
const isTri = (v: unknown): v is Tri<Rich> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && isText((v as Tri<Rich>).en) && isText((v as Tri<Rich>).zh_TW) && isText((v as Tri<Rich>).zh_CN);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * main 是三語資料，alt 是「簡中那一格放韓文」的同一份資料。把 alt 的韓文轉成漢諺混寫，寫進 main 每段文字的 ko。
 * 不放韓文的情況：韓文和英文一樣（官方沒有韓文、退回英文）；那一格其實是寫死的中文（不是從官方語言檔來的）。
 * 回傳加了幾段。
 */
export function attachKo(main: unknown, alt: unknown, convert: (text: Rich) => Rich, skipKeys: ReadonlySet<string> = new Set(['quotes'])): number {
  if (Array.isArray(main)) {
    if (!Array.isArray(alt) || alt.length !== main.length) throw new Error('韓文資料的形狀和三語資料不一樣（清單長度不同）');
    return main.reduce<number>((n, item, i) => n + attachKo(item, alt[i], convert, skipKeys), 0);
  }
  if (typeof main !== 'object' || main === null || typeof alt !== 'object' || alt === null) return 0;
  if (isTri(main) && isTri(alt)) {
    const ko = alt.zh_CN;
    const plain = richToPlain(ko);
    if (!plain.trim() || same(ko, main.en)) return 0;
    if (same(ko, main.zh_CN) && HAN.test(plain)) return 0;
    main.ko = convert(ko);
    return 1;
  }
  let n = 0;
  for (const [key, value] of Object.entries(main)) {
    if (skipKeys.has(key)) continue;
    n += attachKo(value, (alt as Record<string, unknown>)[key], convert, skipKeys);
  }
  return n;
}

/** 準備漢字轉換：下載 Kiwi 的語言模型和漢字詞表（放在 .cache/），names 是不轉的專有名詞（英雄名） */
export async function createHanjaConverter(cacheDir: string, names: string[]): Promise<HanjaConverter> {
  const kiwiDir = join(cacheDir, 'kiwi');
  const modelDir = join(kiwiDir, 'models', 'cong', 'base');
  if (!existsSync(join(modelDir, 'cong.mdl'))) {
    await mkdir(kiwiDir, { recursive: true });
    await download(KIWI_MODEL_URL, join(kiwiDir, 'model.tgz'), { timeoutMs: 600_000 });
    execFileSync('tar', ['-xzf', 'model.tgz'], { cwd: kiwiDir });
  }
  const modelFiles: Record<string, Uint8Array> = {};
  for (const name of await readdir(modelDir)) modelFiles[name] = new Uint8Array(await readFile(join(modelDir, name)));
  const { KiwiBuilder } = await import('kiwi-nlp');
  const builder = await KiwiBuilder.create(join(ROOT, 'node_modules', 'kiwi-nlp', 'dist', 'kiwi-wasm.wasm'));
  const kiwi = await builder.build({
    modelFiles,
    modelType: 'cong',
    // 英雄名當成專有名詞教給 Kiwi，「럭스가」才會拆成「럭스」和助詞「가」
    userWords: names.map((word) => ({ word, tag: 'NNP' })),
  });
  const tokenize: KoTokenizer = (text) => kiwi.tokenize(text).map((t) => ({ str: t.str, tag: t.tag, position: t.position, length: t.length }));
  const dict = parseHanjaDict(await getText(HANJA_DICT_URL, join(cacheDir, 'hanja', 'hanja.txt')));
  // 對照表每一筆的漢字，讀音都要和諺文相符（防止手誤）
  const table: Array<[string, string]> = [...Object.entries(HANJA_OVERRIDES), ...HANJA_CONTEXT.map(([word, , hanja]): [string, string] => [word, hanja])];
  const wrong = table.filter(([key, hanja]) => hanja && !readsAs(dict, hanja, key.split('/')[0]));
  if (wrong.length) throw new Error(`漢字對照表裡讀音對不上的：${wrong.map(([k, h]) => `${k}→${h}`).join('、')}`);
  return new HanjaConverter(tokenize, dict, names);
}
