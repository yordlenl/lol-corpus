// 單字朗讀：用裝置內建的英文語音念（iPad 上是 iOS 的語音，不用下載，離線也能念）。
import { settings } from './settings.ts';

/** 慢速的語速（正常是 1） */
export const SLOW_RATE = 0.7;

/** 這個瀏覽器能不能朗讀 */
export function speechAvailable(): boolean {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
}

/**
 * 能不能念：一般英文單字（兩個字母以上，中間可以有 ' 或 -）。
 * 全大寫的縮寫（AP、AD、CC）不念，系統常把它們念成一般單字。
 * 詞典有沒有這個字由呼叫的地方判斷。
 */
export function canSpeak(word: string): boolean {
  if (!/^[A-Za-z]+(?:['’-][A-Za-z]+)*$/.test(word)) return false;
  const letters = word.replace(/[^A-Za-z]/g, '');
  return letters.length >= 2 && !/^[A-Z]+$/.test(letters);
}

/**
 * Apple 的標準英文語音，越前面越優先。蘋果裝置也有 Albert、Bubbles 這類搞怪聲音，不能讓它們念，
 * 所以只挑這份清單裡的；裝置上一個都沒有就不指定，交給系統依口音挑。
 */
const GOOD_VOICES: Record<string, string[]> = {
  'en-US': ['Samantha', 'Ava', 'Allison', 'Susan', 'Zoe', 'Evan', 'Nathan', 'Tom', 'Joelle', 'Noelle'],
  'en-GB': ['Daniel', 'Serena', 'Kate', 'Arthur', 'Martha', 'Oliver', 'Stephanie', 'Jamie'],
};

/** 有下載高品質版（Premium、Enhanced，中文介面是「優化音質」「高音質」）就優先用 */
function quality(name: string): number {
  if (/premium|高音質/i.test(name)) return 2;
  if (/enhanced|優化/i.test(name)) return 1;
  return 0;
}

/** 挑口音相符、聲音正常的語音；找不到回傳 null（交給系統） */
export function pickVoice(voices: SpeechSynthesisVoice[], accent: string): SpeechSynthesisVoice | null {
  const names = GOOD_VOICES[accent] ?? [];
  const rank = (v: SpeechSynthesisVoice) => names.indexOf(v.name.replace(/\s*\(.*\)\s*$/, ''));
  const good = voices.filter((v) => v.lang.replace('_', '-').toLowerCase() === accent.toLowerCase() && rank(v) >= 0);
  good.sort((a, b) => quality(b.name) - quality(a.name) || rank(a) - rank(b));
  return good[0] ?? null;
}

/** 照設定的口音和速度念一個字；念到一半再念會從頭開始。念不了回傳 false。 */
export function speakWord(word: string): boolean {
  if (!speechAvailable() || !canSpeak(word)) return false;
  const { accent, rate } = settings.current.speech;
  if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = accent;
  utterance.rate = rate === 'slow' ? SLOW_RATE : 1;
  const voice = pickVoice(speechSynthesis.getVoices(), accent);
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
  return true;
}
