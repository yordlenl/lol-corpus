// 共用模組對外的型別。這個檔案只能放型別（不能有任何會執行的程式），
// 建置時會原樣發布成 shared/lol-shared.d.ts，學習 App 用 npm run sync-types 取得同一份。

// ---------- 遊戲資料 ----------

/** 三行對照的語言 */
export type Lang = 'en' | 'zh_TW' | 'zh_CN';

/** 同一段文字的三種語言版本 */
export interface Tri<T = string> {
  en: T;
  zh_TW: T;
  zh_CN: T;
}

/** 遊戲文字裡保留下來的少數樣式 */
export type TextStyle =
  | 'b'
  | 'num'
  | 'magic'
  | 'physical'
  | 'true'
  | 'heal'
  | 'shield'
  | 'mana'
  | 'status'
  | 'speed'
  | 'gold'
  | 'flavor';

/** 一小段帶樣式的文字：[文字, 樣式] */
export type StyledRun = [text: string, style: TextStyle];

/** 有格式的文字：沒有樣式時就是一般字串，否則是一串片段；換行用 \n */
export type Rich = string | Array<string | StyledRun>;

export interface Meta {
  schema: number;
  ddragon: string;
  cdragon: string;
  generatedAt: string;
  counts: Record<string, number>;
}

export interface ChampionSummary {
  id: string;
  key: string;
  name: Tri;
  title: Tri;
  tags: string[];
  /** 相對於資料根目錄的圖示路徑，例如 img/champion/Ahri.png */
  icon: string;
}

export interface Ability {
  name: Tri;
  description: Tri<Rich>;
  icon: string;
}

export interface Spell extends Ability {
  slot: 'Q' | 'W' | 'E' | 'R';
  cooldown: string;
  cost: string;
  range: string;
}

export interface Skin {
  id: string;
  num: number;
  name: Tri;
}

export type QuoteLang = Lang | 'ko';
export type TranslationKind = 'original' | 'official' | 'learning' | '';

/** 台詞：照 spec「台詞資料格式」存 */
export interface Quote {
  /** 例如 Aatrox/base/pick-1 */
  id: string;
  champion: string;
  /** 原版是 base，皮膚語音組用皮膚 id */
  voiceSet: string;
  /** 選用 pick、禁用 ban；之後會有首次移動、擊殺等 */
  event: string;
  text: Record<QuoteLang, string>;
  audio: Record<QuoteLang, string>;
  translation: Record<QuoteLang, TranslationKind>;
  source: string;
  /** 非語言聲音（嘶吼、樂器等） */
  nonverbal?: boolean;
  /** 虛構語言（例如納爾語） */
  fictionalLanguage?: boolean;
}

export interface Champion extends ChampionSummary {
  passive: Ability;
  spells: Spell[];
  skins: Skin[];
  quotes: Quote[];
}

export type ItemTier = 'starter' | 'consumable' | 'boots' | 'basic' | 'epic' | 'legendary';

export interface Item {
  id: string;
  name: Tri;
  plaintext: Tri;
  description: Tri<Rich>;
  gold: { total: number; base: number; sell: number };
  from: string[];
  into: string[];
  tags: string[];
  depth: number;
  tier: ItemTier;
  icon: string;
}

export interface Rune {
  id: number;
  key: string;
  name: Tri;
  short: Tri<Rich>;
  long: Tri<Rich>;
  icon: string;
}

export interface RuneTree {
  id: number;
  key: string;
  name: Tri;
  icon: string;
  /** slots[0] 是基石，其餘三排是小符文 */
  slots: Rune[][];
}

export interface StatShard {
  id: number;
  name: Tri;
  description: Tri<Rich>;
  icon: string;
}

export interface StatShardRow {
  label: Tri;
  shards: StatShard[];
}

export interface RuneData {
  trees: RuneTree[];
  shards: StatShardRow[];
}

export interface SummonerSpell {
  id: string;
  key: string;
  name: Tri;
  description: Tri<Rich>;
  cooldown: string;
  icon: string;
}

/** 詞典的一個詞條 */
export interface DictWord {
  /** 音標 */
  p?: string;
  /** 繁體釋義，多行用 \n 分隔 */
  t?: string;
  /** 1 表示生詞 */
  r?: 1;
  /** 柯林斯星級 */
  c?: number;
  /** 牛津 3000 核心詞 */
  o?: number;
  /** 考試標籤，例如 cet4 toefl */
  g?: string;
  /** 英國國家語料庫詞頻排名 */
  bnc?: number;
  /** 當代語料庫詞頻排名 */
  frq?: number;
}

/** 詞典本體（約 500KB，第一次點字時才下載） */
export interface Dictionary {
  meta: { count: number; forms: number; rare: number };
  /** 變形 → 原形 */
  forms: Record<string, string>;
  words: Record<string, DictWord>;
}

/** 哪些字不能點（檔案很小，一開始就載入） */
export interface Wordlists {
  /** 任何地方都不標註的功能詞 */
  skip: string[];
  /** 正文裡不標註、名稱裡可點的詞（遊戲自創詞、英雄名） */
  softSkip: string[];
}

/** 文字出現的位置：名稱（英雄名、技能名）或正文（描述、台詞） */
export type TextContext = 'name' | 'body';

/** 點英文單字時發出的事件內容（事件名稱 lol-word） */
export interface WordEventDetail {
  word: string;
  key: string;
  context: TextContext;
  /** 單字所在的整段英文 */
  sentence: string;
  /** 單字所在那一段的三種語言（純文字），收藏單字時存成例句 */
  text: Tri;
  source?: SourceRef;
  /** 點擊位置，查詞小視窗靠著它顯示 */
  anchor: { left: number; top: number; right: number; bottom: number };
}

export interface LookupResult {
  /** 點到的字 */
  surface: string;
  /** 查到的原形；查不到時等於 surface */
  lemma: string;
  entry: DictWord | null;
}

// ---------- 學習紀錄 ----------

/** 卡片出處 */
export interface SourceRef {
  type: 'champion' | 'passive' | 'spell' | 'skin' | 'quote' | 'item' | 'rune' | 'shard' | 'summoner';
  /** 例如 Ahri、Ahri/Q、3157、Aatrox/base/pick-1 */
  id: string;
  /** 顯示用名稱，例如「阿璃 Q」 */
  label?: Tri;
}

export type CardOrigin = 'corpus' | 'practice' | 'challenge';

/** ts-fsrs 的排程欄位（日期存成 ISO 字串，方便匯出匯入） */
export interface FsrsState {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
}

interface CardBase {
  id: string;
  addedAt: string;
  origin: CardOrigin;
  fsrs: FsrsState;
}

export interface WordCard extends CardBase {
  kind: 'word';
  word: string;
  lemma: string;
  /** 收藏時所在的句子 */
  context?: { text: Tri; source: SourceRef };
}

/**
 * 句子和中文對齊到哪一層：
 * sentence 逐句對齊；line 中文是同一行（英文那行有好幾句）；block 中文是整段
 */
export type Alignment = 'sentence' | 'line' | 'block';

/** 一段文字拆出來的一句（收藏句子時讓使用者挑） */
export interface SentenceUnit {
  text: Tri;
  alignment: Alignment;
}

export interface SentenceCard extends CardBase {
  kind: 'sentence';
  text: Tri;
  source: SourceRef;
  /** 有遊戲原聲時的音檔網址 */
  audio?: string;
  alignment?: Alignment;
}

export type StudyCard = WordCard | SentenceCard;

export interface ReviewLog {
  id?: number;
  cardId: string;
  /** FSRS 評分：1 Again、2 Hard、3 Good、4 Easy */
  rating: 1 | 2 | 3 | 4;
  reviewedAt: string;
  mode: string;
  hinted: boolean;
  /** 作答前是不是還沒學過的新卡（計算今日新學用） */
  wasNew?: boolean;
  /** 這次作答後排定的下次複習時間 */
  nextDue?: string;
}

/** 一次作答的結果 */
export interface ReviewOutcome {
  rating: ReviewLog['rating'];
  /** 練習方式，例如 word（看釋義寫單字） */
  mode: string;
  hinted: boolean;
}

export interface Settings {
  rows: Record<Lang, boolean>;
  dailyNew: number;
}

export interface ExportFile {
  app: 'lol-english';
  formatVersion: number;
  exportedAt: string;
  cards: StudyCard[];
  reviewLogs: ReviewLog[];
  settings: Settings;
}

// ---------- 共用模組的介面（學習 App 照這個呼叫） ----------

export interface LearningStoreApi {
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  putCard(card: StudyCard): Promise<void>;
  getCard(id: string): Promise<StudyCard | undefined>;
  listCards(kind?: StudyCard['kind']): Promise<StudyCard[]>;
  deleteCard(id: string): Promise<void>;
  addReviewLog(log: ReviewLog): Promise<number>;
  listReviewLogs(cardId?: string): Promise<ReviewLog[]>;
  exportAll(): Promise<ExportFile>;
  importAll(file: ExportFile, mode: 'replace' | 'merge'): Promise<{ cards: number; reviewLogs: number }>;
}

export interface SettingsApi extends EventTarget {
  readonly current: Settings;
  update(patch: Partial<Settings>): Promise<void>;
  setRow(lang: Lang, visible: boolean): Promise<void>;
  /** 重新從資料庫讀（例如匯入備份之後） */
  reload(): Promise<void>;
}

/** 生詞本與句子庫的收藏狀態；收藏有變動時發出 change 事件 */
export interface CollectionApi extends EventTarget {
  has(id: string): boolean;
  addWord(input: { word: string; lemma: string; context?: WordCard['context'] }): Promise<WordCard>;
  addSentence(input: { unit: SentenceUnit; source: SourceRef; audio?: string }): Promise<SentenceCard>;
  remove(id: string): Promise<void>;
  /** 重新從資料庫讀（例如匯入備份之後） */
  reload(): Promise<void>;
}

export interface SharedModule {
  /** 介面版本；有不相容的變動時加一 */
  API_VERSION: number;
  /** 載入設定與不可點字清單，並裝好查詞小視窗。頁面開始顯示前呼叫一次。 */
  initShared(): Promise<void>;
  loadMeta(): Promise<Meta>;
  loadChampionIndex(): Promise<ChampionSummary[]>;
  loadChampion(id: string): Promise<Champion>;
  loadItems(): Promise<Item[]>;
  loadRunes(): Promise<RuneData>;
  loadSummoners(): Promise<SummonerSpell[]>;
  lookupWord(key: string): Promise<LookupResult>;
  /** 語料庫裡的檔案網址，例如圖示 */
  corpusUrl(path: string): string;
  settings: SettingsApi;
  collection: CollectionApi;
  learningStore(): LearningStoreApi;
  /** 記下一次作答：用 ts-fsrs 排下次複習、存回卡片、寫一筆複習紀錄 */
  recordReview(card: StudyCard, outcome: ReviewOutcome, now?: Date): Promise<{ card: StudyCard; log: ReviewLog }>;
  /** 把一段文字拆成可以收藏的句子 */
  sentenceUnits(text: Tri<Rich>): SentenceUnit[];
}
