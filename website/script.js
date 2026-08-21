const translations = {
  en: {
    nav_features: 'Features', nav_how: 'How it works', nav_privacy: 'Privacy', language: 'Language',
    hero_eyebrow: 'A YouTube singing practice tool made for people who love to sing',
    hero_title: 'Find your key.<br>Own the song.',
    hero_description: 'Transpose Key, change speed, set an A–B loop, and follow synced lyrics. Core audio processing runs on your device.',
    hero_progress: 'See current progress', hero_github: 'Open GitHub',
    demo_now: 'Now playing', demo_song: 'City Lights', demo_artist: 'Night Animals · Practice demo', demo_artist_short: 'Night Animals', reset: 'Reset',
    demo_lyric_current: 'In the city lights, I found my way', demo_lyric_next: 'The night is long, echoes circle near',
    status_ready: 'Core tools available', status_ready_detail: 'Key, speed, A–B, playlists and lyrics',
    status_lab: '0.1.0 public beta', status_lab_detail: 'Collecting feedback across real songs and devices',
    status_store: 'Chrome Store preparation', status_store_detail: 'Currently tested in developer mode',
    workflow_title: 'One screen.<br>Focus on the song.', workflow_description: 'Practice controls and lyrics stay together, without constant page switching.',
    sheet_line_1a: 'In the city lights', sheet_line_1b: 'I found my way', sheet_line_2a: 'The night is long', sheet_line_2b: 'Echoes circle near',
    step_1: 'Find the right Key', step_1_detail: 'Adjust to your range, one semitone per step.',
    step_2: 'Slow difficult sections', step_2_detail: 'Lower the speed and lock in the melody.',
    step_3: 'Set an A–B loop', step_3_detail: 'Mark a section and repeat it.',
    step_4: 'Practice with two-line lyrics', step_4_detail: 'See the next line early and stay in rhythm.',
    progress_title: 'What works today?', progress_description: 'Work is separated into available, public-beta, and future updates so the practice basics stay reliable.',
    available: 'Available', available_detail: 'Stable and continuously refined', available_1: 'Real-time Key transpose', available_2: 'Speed control', available_3: 'A–B loop playback', available_4: 'Playlist management', available_5: 'Two-line lyric display',
    experimental: 'Public beta', experimental_detail: 'Validated through real-world feedback', experimental_1: 'Audio quality and song compatibility', experimental_2: 'Cross-device sync reliability', experimental_3: 'Four-language usability',
    planned: 'Future updates', planned_detail: 'Released only after verification', planned_1: 'More on-device audio tools', planned_2: 'Official Chrome Store release',
    story_title: 'Missing the note<br>doesn’t mean you can’t sing.', story_description: 'Karaoke Kaiju grew from the small frustrations that show up whenever you practice a song.',
    pain_1: 'The original key does not fit everyone.', pain_1_detail: 'A great song may not sit in your comfortable range.',
    pain_2: 'Replaying one section is often awkward.', pain_2_detail: 'A–B, speed, and lyrics should live in one place.',
    pain_3: 'Many versions only exist on YouTube.', pain_3_detail: 'Rare, live, and cover versions deserve a good practice flow.',
    trust_title: 'AI helps one creator<br>make expert tools more accessible.', trust_description: 'AI supports development and testing; the public build keeps core audio processing device-first.',
    trust_1: 'Device-first processing', trust_1_detail: 'Transpose and speed run on your device.', trust_2: 'No developer server', trust_2_detail: 'Personal data stays in the browser and Chrome Sync.', trust_3: 'Open source', trust_3_detail: 'Inspect the project, report issues, or contribute.',
    cta_title: 'Help make practice feel more natural.', cta_description: 'Karaoke Kaiju is still being tested and refined. Try it, share feedback, and help it improve.', cta_github: 'View the GitHub project', cta_privacy: 'Read the privacy notice',
    release_note: '0.1.0 public beta. Not yet officially published on the Chrome Web Store.', manual: 'User guide',
  },
  ja: {
    nav_features: '機能', nav_how: '使い方', nav_privacy: 'プライバシー', language: '言語',
    hero_eyebrow: '歌うことが好きな人のための YouTube 練習ツール',
    hero_title: '自分のキーで、<br>もっと自由に歌おう。',
    hero_description: 'キー変更、速度調整、A–B リピート、同期歌詞をひとつの画面で。主要な音声処理は端末上で行います。',
    hero_progress: '開発状況を見る', hero_github: 'GitHub を開く',
    demo_now: '再生中', demo_song: '街の灯り', demo_artist: '夜行動物 · 練習デモ', demo_artist_short: '夜行動物', reset: 'リセット',
    demo_lyric_current: '街の灯りの中で　道を見つけた', demo_lyric_next: '長い夜に　こだまが耳元を巡る',
    status_ready: '基本機能は利用可能', status_ready_detail: 'Key、速度、A–B、プレイリスト、歌詞',
    status_lab: '0.1.0 パブリックベータ', status_lab_detail: '実際の曲と端末でフィードバックを収集中',
    status_store: 'Chrome ストア準備中', status_store_detail: '現在はデベロッパーモードでテスト',
    workflow_title: 'ひとつの画面で、<br>歌に集中。', workflow_description: '練習操作と歌詞を同じ画面にまとめ、ページを行き来する必要をなくします。',
    sheet_line_1a: '街の灯りの中で', sheet_line_1b: '道を見つけた', sheet_line_2a: '長い夜に', sheet_line_2b: 'こだまが耳元を巡る',
    step_1: '合う Key を見つける', step_1_detail: '音域に合わせ、1ステップずつ半音調整。', step_2: '難しい部分を遅くする', step_2_detail: '速度を落として旋律を正確に。', step_3: 'A–B リピートを設定', step_3_detail: '練習したい範囲を繰り返し再生。', step_4: '2行歌詞で練習', step_4_detail: '次の歌詞を早めに表示して準備。',
    progress_title: '現在できること', progress_description: '利用可能・パブリックベータ・今後の更新を分け、まず基本の練習機能を確実に仕上げます。',
    available: '利用可能', available_detail: '安定機能・継続改善', available_1: 'リアルタイム Key 変更', available_2: '速度コントロール', available_3: 'A–B リピート', available_4: 'プレイリスト管理', available_5: '2行歌詞表示',
    experimental: 'パブリックベータ', experimental_detail: '実利用のフィードバックで検証', experimental_1: '音質と楽曲互換性', experimental_2: '端末間同期の安定性', experimental_3: '4言語の使いやすさ',
    planned: '今後の更新', planned_detail: '検証完了後に順次公開', planned_1: '端末内オーディオツールの拡充', planned_2: 'Chrome ストア正式公開',
    story_title: '届かない音があっても、<br>歌えないわけじゃない。', story_description: 'Karaoke Kaiju は、歌を練習するたびに感じる小さな不便から生まれました。',
    pain_1: '原曲の Key は全員に合うわけではない。', pain_1_detail: '好きな曲が自分の音域に合うとは限りません。', pain_2: '一部分だけ聴き直す操作が面倒。', pain_2_detail: 'A–B、速度、歌詞はひとつの画面に。', pain_3: 'YouTube にしかない版も多い。', pain_3_detail: 'ライブやカバーも気持ちよく練習したい。',
    trust_title: 'AI が、一人の開発でも<br>専門的な道具を身近にする。', trust_description: 'AI は開発とテストを支援し、公開版の主要な音声処理は端末優先です。',
    trust_1: '端末優先の処理', trust_1_detail: 'Key と速度は端末上で処理。', trust_2: '開発者サーバー不使用', trust_2_detail: '個人データはブラウザと Chrome Sync に保存。', trust_3: 'オープンソース', trust_3_detail: '確認、問題報告、貢献が可能。',
    cta_title: '歌の練習を、もっと直感的に。', cta_description: 'Karaoke Kaiju は現在もテストと改善を続けています。ぜひ試して感想を聞かせてください。', cta_github: 'GitHub プロジェクトを見る', cta_privacy: 'プライバシー説明を読む',
    release_note: '0.1.0 パブリックベータ。Chrome Web Store にはまだ正式公開していません。', manual: '使用ガイド',
  },
  'zh-CN': {
    nav_features: '功能', nav_how: '如何使用', nav_privacy: '隐私', language: '语言',
    hero_eyebrow: '为爱唱歌的人打造的 YouTube 练唱工具', hero_title: '找到适合你的 Key，<br>唱出你的歌。', hero_description: '实时升降 Key、调整速度、设置 A–B 循环与同步歌词；核心音频在你的设备上处理。', hero_progress: '查看当前进度', hero_github: '前往 GitHub',
    demo_now: '正在播放', demo_song: '城市的灯火', demo_artist: '夜行动物 · 练唱测试曲', demo_artist_short: '夜行动物', reset: '重置', demo_lyric_current: '在城市的灯火里　我找到方向', demo_lyric_next: '黑夜太漫长　回声在耳边徘徊',
    status_ready: '核心功能可用', status_ready_detail: '升降 Key、速度、A–B、歌单与歌词', status_lab: '0.1.0 公开测试中', status_lab_detail: '收集真实歌曲与设备反馈', status_store: 'Chrome 商店准备中', status_store_detail: '目前以开发者模式测试',
    workflow_title: '一个画面，<br>专心把歌唱好。', workflow_description: '所有练唱控制与歌词显示都在同一个界面，不必反复切换页面。',
    sheet_line_1a: '在城市的灯火里', sheet_line_1b: '我找到方向', sheet_line_2a: '黑夜太漫长', sheet_line_2b: '回声在耳边徘徊',
    step_1: '找到合适的 Key', step_1_detail: '根据音域调整，每格一个半音。', step_2: '放慢困难段落', step_2_detail: '调整速度，先把旋律唱准。', step_3: '设置 A–B 循环', step_3_detail: '圈选想练的片段，重复播放。', step_4: '跟着双行歌词练习', step_4_detail: '下一句提前显示，保持节奏。',
    progress_title: '目前做到哪里？', progress_description: '按照“已可用、公开测试中、后续更新”分阶段验收，先把基础练唱工具做好。',
    available: '已可用', available_detail: '稳定功能，持续优化', available_1: '实时移调（Key）', available_2: '速度控制（Speed）', available_3: 'A–B 循环播放', available_4: '歌单管理', available_5: '双行歌词显示',
    experimental: '公开测试中', experimental_detail: '通过真实使用反馈验收', experimental_1: '跨歌曲音质与兼容性', experimental_2: '多设备同步稳定度', experimental_3: '四语界面与易用性', planned: '后续更新', planned_detail: '完成验证后才会逐步开放', planned_1: '更多本地音频工具', planned_2: 'Chrome 商店正式发布',
    story_title: '唱不上去，<br>不代表你不会唱。', story_description: 'Karaoke Kaiju 的诞生，来自每次想练歌时都会遇到的小困扰。', pain_1: '原调不一定适合每个人。', pain_1_detail: '好听的歌，未必在适合自己的 Key。', pain_2: '重听某段，操作总是不顺手。', pain_2_detail: 'A–B、速度与歌词应该在同一个界面。', pain_3: '许多版本只在 YouTube 找得到。', pain_3_detail: '稀有、现场与翻唱版本，也值得好好练习。',
    trust_title: 'AI 让一个人也能<br>把专业工具做得更普及。', trust_description: 'AI 协助开发与测试；公开版的核心音频处理仍以你的设备为优先。', trust_1: '本地优先处理', trust_1_detail: '移调、速度等核心处理在设备上完成。', trust_2: '不经过开发者服务器', trust_2_detail: '个人数据保留在浏览器与 Chrome Sync。', trust_3: '源代码公开', trust_3_detail: '项目可查看、反馈问题与贡献。',
    cta_title: '一起把练唱变得更直观。', cta_description: '目前仍在测试与打磨，欢迎一起试用、反馈，让 Karaoke Kaiju 变得更好。', cta_github: '查看 GitHub 项目', cta_privacy: '阅读隐私说明', release_note: '0.1.0 公开测试版；尚未在 Chrome Web Store 正式发布。', manual: '使用手册',
  },
};

const i18nNodes = [...document.querySelectorAll('[data-i18n]')];
const defaults = Object.fromEntries(i18nNodes.map((node) => [node.dataset.i18n, node.innerHTML]));
const html = document.documentElement;
const themeToggle = document.querySelector('#theme-toggle');
const languageSelect = document.querySelector('#language-select');
const metaDescription = document.querySelector('meta[name="description"]');

const localeMeta = {
  'zh-TW': { lang: 'zh-TW', title: 'Karaoke Kaiju — 找到你的 Key，唱出你的歌', description: 'Karaoke Kaiju 是為愛唱歌的人打造的 Chrome 側邊練唱工具，提供即時升降 Key、速度、A–B 循環、歌單與雙行動態歌詞。' },
  en: { lang: 'en', title: 'Karaoke Kaiju — Find your key. Own the song.', description: 'A Chrome side-panel practice tool for Key transpose, speed, A–B loops, playlists, and two-line synced lyrics on YouTube.' },
  ja: { lang: 'ja', title: 'Karaoke Kaiju — 自分のキーでもっと自由に歌おう', description: 'YouTube で Key、速度、A–B リピート、プレイリスト、2行同期歌詞を使える Chrome 練習ツール。' },
  'zh-CN': { lang: 'zh-CN', title: 'Karaoke Kaiju — 找到适合你的 Key，唱出你的歌', description: '为 YouTube 练唱打造的 Chrome 侧边工具，支持 Key、速度、A–B 循环、歌单与双行同步歌词。' },
};

function setTheme(theme) {
  html.dataset.theme = theme;
  localStorage.setItem('karaoke_kaiju_theme', theme);
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0b0d' : '#f5f5f7');
}

function setLanguage(locale) {
  const dictionary = translations[locale] ?? {};
  i18nNodes.forEach((node) => {
    const key = node.dataset.i18n;
    node.innerHTML = dictionary[key] ?? defaults[key] ?? node.innerHTML;
  });
  const meta = localeMeta[locale] ?? localeMeta['zh-TW'];
  html.lang = meta.lang;
  document.title = meta.title;
  metaDescription?.setAttribute('content', meta.description);
  languageSelect.value = locale;
  localStorage.setItem('karaoke_kaiju_lang', locale);
}

const oldTheme = localStorage.getItem('diaochang_theme');
const oldLanguage = localStorage.getItem('diaochang_lang');
const preferredTheme = localStorage.getItem('karaoke_kaiju_theme') || oldTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const preferredLanguage = localStorage.getItem('karaoke_kaiju_lang') || oldLanguage || 'zh-TW';
setTheme(preferredTheme === 'dark' ? 'dark' : 'light');
setLanguage(['zh-TW', 'en', 'ja', 'zh-CN'].includes(preferredLanguage) ? preferredLanguage : 'zh-TW');

themeToggle.addEventListener('click', () => setTheme(html.dataset.theme === 'dark' ? 'light' : 'dark'));
languageSelect.addEventListener('change', (event) => setLanguage(event.target.value));

let key = 2;
let speed = 90;
const keyValue = document.querySelector('#key-value');
const speedValue = document.querySelector('#speed-value');
const loopToggle = document.querySelector('#loop-toggle');

function renderDemo() {
  keyValue.textContent = key > 0 ? `+${key}` : String(key);
  speedValue.textContent = `${speed}%`;
}

document.querySelector('#key-down').addEventListener('click', () => { key = Math.max(-12, key - 1); renderDemo(); });
document.querySelector('#key-up').addEventListener('click', () => { key = Math.min(12, key + 1); renderDemo(); });
document.querySelector('#speed-down').addEventListener('click', () => { speed = Math.max(25, speed - 5); renderDemo(); });
document.querySelector('#speed-up').addEventListener('click', () => { speed = Math.min(200, speed + 5); renderDemo(); });
document.querySelector('#demo-reset').addEventListener('click', () => { key = 0; speed = 100; loopToggle.classList.remove('is-on'); loopToggle.setAttribute('aria-pressed', 'false'); renderDemo(); });
loopToggle.setAttribute('aria-pressed', 'true');
loopToggle.addEventListener('click', () => {
  const enabled = loopToggle.classList.toggle('is-on');
  loopToggle.setAttribute('aria-pressed', String(enabled));
});

const consolePlay = document.querySelector('#console-play');
let consolePlaying = true;
consolePlay.addEventListener('click', () => {
  consolePlaying = !consolePlaying;
  consolePlay.querySelector('span').textContent = consolePlaying ? 'Ⅱ' : '▶';
  consolePlay.setAttribute('aria-pressed', String(consolePlaying));
});

document.querySelectorAll('.workflow-steps li').forEach((step) => {
  step.addEventListener('click', () => {
    document.querySelectorAll('.workflow-steps li').forEach((item) => item.classList.remove('is-active'));
    step.classList.add('is-active');
  });
});

renderDemo();
