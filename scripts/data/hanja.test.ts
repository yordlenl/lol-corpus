// 漢諺混寫：官方韓文裡的漢字詞換成漢字、上面標諺文。這裡用寫死的斷詞結果和小詞典測轉換規則。
import { describe, expect, it } from 'vitest';
import { ruby, rubyToBase, rubyToReading } from '../../src/shared/text.ts';
import { HanjaConverter, type KoToken, parseHanjaDict, readsAs } from './hanja.ts';
import { HANJA_OVERRIDES } from './hanja-table.ts';

const DICT = parseHanjaDict(`# 註解
가:可:옳을 가
대:大:큰 대
대:待:기다릴 대
기:氣:기운 기
기:機:틀 기
력:力:힘 력
녀:女:계집 녀
왕:王:임금 왕
적:敵:대적할 적
피해:被害:
공격:攻擊:
공격:公格:
공격력:攻擊力:
대기:大氣:
대기:待機:
발사:發射:
최대:最大:
속박:束縛:
암살:暗殺:
사용:使用:
재사용:再使用:
나무:南無:
여왕:女王:
수도승:修道僧:
잘못된줄
한글:abc:
`);

/** 把「詞/詞性」排成 Kiwi 那樣的斷詞結果（照順序在原文裡找位置） */
function tokenizer(tagged: string) {
  return (text: string): KoToken[] => {
    let from = 0;
    return tagged.split(' ').map((item) => {
      const [str, tag] = item.split('/');
      const position = text.indexOf(str, from);
      from = position + str.length;
      return { str, tag, position, length: str.length };
    });
  };
}

const make = (tagged: string, keep: string[] = [], overrides?: Record<string, string>) => new HanjaConverter(tokenizer(tagged), DICT, keep, overrides ?? {}, []);
const show = (text: string) => text.replace(/￹([^￺]*)￺([^￻]*)￻/g, '$1($2)');

describe('讀漢字詞表', () => {
  it('詞（兩個字以上）照詞表順序收候選；單字記讀音；註解和格式不對的行跳過', () => {
    expect(DICT.words.get('공격')).toEqual(['攻擊', '公格']);
    expect(DICT.words.get('대기')).toEqual(['大氣', '待機']);
    expect(DICT.readings.get('大')).toEqual(new Set(['대']));
    expect(DICT.words.has('한글')).toBe(false);
  });

  it('檢查讀音：逐字對得上才算；詞頭的 ㄹ、ㄴ 變音（女 녀→여、力 력→역）也算', () => {
    expect(readsAs(DICT, '待機', '대기')).toBe(true);
    expect(readsAs(DICT, '大機', '대기')).toBe(true);
    expect(readsAs(DICT, '女王', '여왕')).toBe(true);
    expect(readsAs(DICT, '力', '역')).toBe(true);
    expect(readsAs(DICT, '大氣', '대가')).toBe(false);
    expect(readsAs(DICT, '大', '대기')).toBe(false);
  });
});

describe('韓文 → 漢諺混寫', () => {
  it('名詞換成漢字、上面標諺文；助詞、語尾、外來語和固有詞照舊', () => {
    const text = '럭스가 빛의 구를 발사하여 최대 2명의 적 유닛을 속박하며 피해를 입힙니다.';
    const c = make('럭스/NNP 가/JKS 빛/NNG 의/JKG 구/NNG 를/JKO 발사/NNG 최대/NNG 명/NNB 의/JKG 적/NNG 유닛/NNG 을/JKO 속박/NNG 피해/NNG 를/JKO', [], { '적/NNG': '敵', '명/NNB': '名' });
    const out = c.convert(text);
    expect(show(out)).toBe('럭스가 빛의 구를 發射(발사)하여 最大(최대) 2名(명)의 敵(적) 유닛을 束縛(속박)하며 被害(피해)를 입힙니다.');
    // 漢字換回諺文就是官方原文
    expect(rubyToReading(out)).toBe(text);
    expect(rubyToBase(out)).toBe('럭스가 빛의 구를 發射하여 最大 2名의 敵 유닛을 束縛하며 被害를 입힙니다.');
  });

  it('詞典有好幾個寫法時取第一個；對照表可以改成別的，也可以指定不轉', () => {
    const tagged = '대기/NNG 나무/NNG';
    expect(show(make(tagged).convert('대기 나무'))).toBe('大氣(대기) 南無(나무)');
    expect(show(make(tagged, [], { 대기: '待機', 나무: '' }).convert('대기 나무'))).toBe('待機(대기) 나무');
  });

  it('連在一起的詞先整串查（재+사용 → 再使用、공격력），緊接的漢字合成一段', () => {
    const c = make('재/XPN 사용/NNG 대기/NNG 시간/NNG 이/JKS 공격력/NNG', [], { 대기: '待機' });
    expect(show(c.convert('재사용 대기시간이 공격력'))).toBe('再使用(재사용) 待機(대기)시간이 攻擊力(공격력)');
    const joined = make('피해/NNG 량/NNG', [], { '량/NNG': '量' });
    expect(joined.convert('피해량')).toBe(ruby('被害量', '피해량'));
  });

  it('詞典沒有整個詞時拆成兩段查（암살+자）；有一段查不到就整個不轉', () => {
    expect(show(make('암살자/NNG', [], { '자/XSN': '者' }).convert('암살자'))).toBe('暗殺者(암살자)');
    expect(make('암살꾼/NNG').convert('암살꾼')).toBe('암살꾼');
  });

  it('只有名詞類會查詞典：副詞、依存名詞、兩個字的專有名詞只看對照表', () => {
    expect(make('대기/MAG').convert('대기')).toBe('대기');
    expect(make('대기/NNP').convert('대기')).toBe('대기');
    expect(show(make('수도승/NNP').convert('수도승'))).toBe('修道僧(수도승)');
    expect(show(make('대기/MAG', [], { '대기/MAG': '待機' }).convert('대기'))).toBe('待機(대기)');
  });

  it('英雄名出現的地方整段不碰（「리 신」的 신 不是神）', () => {
    const c = make('리/NNP 신/NNG 이/JKS 적/NNG', ['리 신'], { '신/NNG': '神', '적/NNG': '敵' });
    expect(show(c.convert('리 신이 적'))).toBe('리 신이 敵(적)');
  });

  it('「맞은 적에게」的 적 是敵人；「본 적이 없다」（曾經）不轉', () => {
    expect(show(make('적/NNB 에게/JKB').convert('맞은 적에게'))).toBe('맞은 敵(적)에게');
    expect(make('적/NNB 이/JKS').convert('본 적이 없다')).toBe('본 적이 없다');
  });

  it('要看後面接什麼的詞：「이상」平常是以上，「이상한」是異常', () => {
    const context: Array<[string, RegExp, string]> = [['이상', /^(하|한|해)/, '異常']];
    const convert = (text: string) => show(new HanjaConverter(tokenizer('이상/NNG'), DICT, [], { 이상: '以上' }, context).convert(text));
    expect(convert('10 이상이면')).toBe('10 以上(이상)이면');
    expect(convert('이상한 나라')).toBe('異常(이상)한 나라');
  });

  it('原文的字和詞的原形不一樣（縮約、變形）就不碰', () => {
    const tokens = () => [{ str: '공격', tag: 'NNG', position: 0, length: 1 }];
    expect(new HanjaConverter(tokens, DICT, [], {}, []).convert('공')).toBe('공');
  });

  it('有格式的文字：整段一起斷詞，標註放回各個片段；跨片段的詞不轉', () => {
    const c = make('추가/NNG 피해/NNG 를/JKO 공격/NNG');
    const out = c.convertRich(['추가 ', ['피해', 'magic'], '를 공', ['격', 'num']]);
    expect(out).toEqual(['추가 ', [ruby('被害', '피해'), 'magic'], '를 공', ['격', 'num']]);
  });

  it('記下轉了哪些、哪些沒轉，給人工核對用', () => {
    const c = make('피해/NNG 유닛/NNG 피해/NNG');
    c.convert('피해 유닛 피해');
    expect(c.stats.converted.get('피해→被害')).toBe(2);
    expect(c.stats.kept.get('유닛/NNG')).toBe(1);
  });
});

describe('LoL 漢字對照表', () => {
  const entries = Object.entries(HANJA_OVERRIDES);

  it('鍵是「諺文」或「諺文/詞性」，值是同樣字數的漢字，或空字串（不轉）', () => {
    for (const [key, hanja] of entries) {
      const [word, tag] = key.split('/');
      expect(word, key).toMatch(/^[가-힣]+$/);
      if (tag) expect(tag, key).toMatch(/^[A-Z]+$/);
      if (hanja) {
        expect(hanja, key).toMatch(/^\p{Script=Han}+$/u);
        expect([...hanja].length, key).toBe(word.length);
      }
    }
  });

  it('照遊戲裡的意思：대기 是待機、수정 是水晶、주문 是呪文；固有詞和專有名詞不轉', () => {
    expect(HANJA_OVERRIDES).toMatchObject({ 대기: '待機', 수정: '水晶', 주문: '呪文', 기사: '騎士', '적/NNG': '敵', '초/NNB': '秒' });
    for (const word of ['동안', '나무', '사랑', '다음', '자운', '포로', '문도']) expect(HANJA_OVERRIDES[word], word).toBe('');
  });
});
