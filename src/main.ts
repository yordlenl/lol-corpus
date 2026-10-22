import './style.css';
import { SITE } from './site';
import {
  detectOpenMode,
  formatTime,
  modeLabel,
  persistLabel,
  readMarks,
  requestPersist,
  siteLabel,
  writeMark,
} from './storage-probe';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <main class="page">
    <header class="masthead">
      <h1>${SITE.title}</h1>
      <p class="tagline">${SITE.tagline}</p>
    </header>

    <section class="panel">
      <h2>第一階段：空白首頁</h2>
      <p>${SITE.intro}</p>
      <a class="link" href="${SITE.other.href}">前往${SITE.other.label} →</a>
    </section>

    <section class="panel">
      <h2>共用資料測試</h2>
      <p class="hint">按「寫入測試資料」後，打開另一個網站，看「讀到的資料」裡有沒有這個網站寫的那一筆。請在 Safari 分頁和主畫面 App 各試一次。</p>
      <dl class="facts">
        <dt>目前開啟方式</dt><dd id="mode"></dd>
        <dt>持久儲存</dt><dd id="persist">查詢中…</dd>
      </dl>
      <div class="actions">
        <button type="button" id="write">寫入測試資料</button>
        <button type="button" id="reload" class="secondary">重新讀取</button>
      </div>
      <h3>讀到的資料</h3>
      <ul id="marks" class="marks"></ul>
    </section>

    <footer class="build">
      版本 ${__APP_VERSION__}・${__COMMIT__}・發布時間 ${formatTime(__BUILD_TIME__)}
    </footer>
  </main>
`;

const mode = detectOpenMode(window);
const marksList = app.querySelector<HTMLUListElement>('#marks')!;

app.querySelector('#mode')!.textContent = modeLabel(mode);

async function showMarks() {
  try {
    const marks = await readMarks();
    marksList.replaceChildren(
      ...(marks.length === 0
        ? [Object.assign(document.createElement('li'), { className: 'empty', textContent: '還沒有任何資料' })]
        : marks.map((m) => {
            const li = document.createElement('li');
            const self = m.site === SITE.id ? '（本站）' : '';
            li.textContent = `${siteLabel(m.site)}${self}・${modeLabel(m.mode)}・${formatTime(m.writtenAt)}`;
            return li;
          })),
    );
  } catch (error) {
    marksList.replaceChildren(
      Object.assign(document.createElement('li'), { className: 'error', textContent: `讀取失敗：${error}` }),
    );
  }
}

app.querySelector('#write')!.addEventListener('click', async () => {
  await writeMark({ site: SITE.id, mode, writtenAt: new Date().toISOString() });
  await showMarks();
});
app.querySelector('#reload')!.addEventListener('click', showMarks);

requestPersist(navigator.storage).then((result) => {
  app.querySelector('#persist')!.textContent = persistLabel(result);
});
showMarks();
