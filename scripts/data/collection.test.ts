import { describe, expect, it } from 'vitest';
import type { ChampionSummary } from '../../src/shared/types.ts';
import { buildEmotes, buildLabels, buildSkins, cdragonAsset, COLLECTION_TABS, parseClientJson } from './collection.ts';
import { CDRAGON } from './config.ts';

const ahri: ChampionSummary = {
  id: 'Ahri',
  key: '103',
  name: { en: 'Ahri', zh_TW: '阿璃', zh_CN: '阿狸' },
  title: { en: 'the Nine-Tailed Fox', zh_TW: '九尾妖狐', zh_CN: '九尾妖狐' },
  tags: ['Mage'],
  icon: 'img/champion/Ahri.png',
};

describe('收藏頁資料', () => {
  it('圖片路徑換成 CommunityDragon 的網址（全部小寫）', () => {
    expect(cdragonAsset('/lol-game-data/assets/ASSETS/Characters/Ahri/Skins/Base/Images/ahri_splash_tile_0.jpg')).toBe(
      `${CDRAGON}/default/assets/characters/ahri/skins/base/images/ahri_splash_tile_0.jpg`,
    );
    expect(cdragonAsset('/lol-game-data/assets/v1/profile-icons/10005.jpg')).toBe(`${CDRAGON}/default/v1/profile-icons/10005.jpg`);
  });

  it('造型：只收 Data Dragon 也有的；原版叫英雄名；三語名稱與故事；炫彩依造型分組', () => {
    const skins = (lang: 'en' | 'zh_TW' | 'zh_CN') => [
      { id: 103000, isBase: true, name: lang === 'zh_CN' ? '九尾妖狐' : 'x', tilePath: '/lol-game-data/assets/a.jpg' },
      {
        id: 103001,
        isBase: false,
        name: { en: 'Dynasty Ahri', zh_TW: '宮廷 阿璃', zh_CN: '王朝 阿狸' }[lang],
        description: { en: 'A story.', zh_TW: '一段故事。', zh_CN: '' }[lang],
        chromas: [{ id: 103052, name: { en: 'Ruby', zh_TW: '紅寶石', zh_CN: '红宝石' }[lang], chromaPath: '/lol-game-data/assets/v1/c.png' }],
      },
      { id: 103999, isBase: false, name: 'Not in Data Dragon' },
    ];
    const out = buildSkins([ahri], new Map([['Ahri', new Set(['103001'])]]), { en: skins('en'), zh_TW: skins('zh_TW'), zh_CN: skins('zh_CN') });
    const list = out.perChampion.get('Ahri')!;
    expect(list.map((s) => s.num)).toEqual([0, 1]);
    expect(list[0].name).toEqual(ahri.name);
    expect(list[1].name.zh_TW).toBe('宮廷 阿璃');
    // 簡中沒有故事時用英文
    expect(list[1].description).toEqual({ en: 'A story.', zh_TW: '一段故事。', zh_CN: 'A story.' });
    expect(out.cards.map((c) => c.story)).toEqual([false, true]);
    expect(out.chromas[0].chromas[0].name).toEqual({ en: 'Ruby', zh_TW: '紅寶石', zh_CN: '红宝石' });
  });

  it('表情：沒有名稱或沒有圖示的不收', () => {
    const emotes = [
      { id: 1, name: 'Joy Pengu', inventoryIcon: '/lol-game-data/assets/a.png' },
      { id: 2, name: '', inventoryIcon: '/lol-game-data/assets/b.png' },
      { id: 3, name: 'No icon', inventoryIcon: '/lol-game-data/assets/' },
    ];
    expect(buildEmotes({ en: emotes, zh_TW: emotes, zh_CN: emotes }).map((e) => e.id)).toEqual([1]);
  });

  it('介面文字找不到的鍵就報錯，不自己寫；翻譯檔開頭的 BOM 會拿掉', () => {
    expect(parseClientJson('﻿{"a":"b"}')).toEqual({ a: 'b' });
    const trans = Object.fromEntries(COLLECTION_TABS.map(([, key]) => [key, key]));
    const table = { en: trans, zh_TW: trans, zh_CN: trans };
    expect(() => buildLabels(table, table, ['Sorcery'], 'x')).toThrow('perks_sorcery_short_desc_1');
  });
});
