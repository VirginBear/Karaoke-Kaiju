// Diaochang (調唱) — macOS Inspired Frontend Logic & Multilingual Engine

const TRANSLATIONS = {
  'zh-TW': {
    nav_features: '功能',
    nav_platforms: '支援平台',
    nav_philosophy: '理念',
    nav_shortcuts: '快捷鍵',
    nav_support: '支援與問答',
    btn_install: '取得擴充功能',
    hero_badge: '本機優先 · 個人測試版 · 零追蹤',
    hero_title: '在瀏覽器中，<br>擁有專業級的練唱工作台。',
    hero_subtitle: '調唱 (Diaochang) 是專為歌唱訓練與樂器練習設計的側邊欄工具。支援 ±36 半音精準移調、Varispeed 磁帶連動、人聲消減、多段樂句循環、BPM 測速與雙行動態歌詞。',
    btn_add_chrome: '加到 Chrome 瀏覽器',
    btn_manual: '閱讀使用手冊',
    trait_dsp: '即時音訊 DSP',
    trait_local: '本機優先運算',
    trait_sync: 'Google 帳號同步',
    demo_transpose: '移調控制 (KEY)',
    demo_reset: '重設',
    demo_vocal: '人聲消減',
    demo_bpm: '節拍速度',
    demo_pause: '暫停',
    demo_play: '播放',
    platforms_label: '廣泛相容',
    platforms_heading: '在常用的音樂與影音網站中直接使用',
    platforms_desc: '無須繁瑣匯入，開啟播放頁面即可自動連接控制',
    feat_label: '核心能力',
    feat_heading: '精心打造的音訊練習工具',
    feat_desc: '結合專業 DSP 演算法與 macOS 風格的操作手感',
    f1_t: '±36 半音精準移調',
    f1_d: '嚴格遵循十二平均律標準，支援 ±6 至 ±36 半音微調，升降調與播放速度完全分離，男女轉換音域輕鬆自如。',
    f2_t: 'Varispeed 磁帶連動',
    f2_d: '音高與速度以物理連動模式即時處理，避免額外時間拉伸；極端設定仍可能產生音質偽影。',
    f3_t: 'Vocal Reducer 人聲消減',
    f3_d: '以中置聲道降低主唱人聲；效果依混音而異，並非完整 AI 分軌，仍可保留鼓與 Bass 的部分成分。',
    f4_t: '3 段等化器 (Equalizer)',
    f4_d: '低音 100Hz、中音 1kHz、高音 8kHz 獨立增益微調，內建人聲增強與重低音等多種實用預設。',
    f5_t: '多段 Loop 片段與循序練習',
    f5_d: '同一首歌可儲存多個命名循環片段（主歌、副歌、Solo），支援自訂階梯式提速訓練（0.75× → 0.90× → 1.0×）。',
    f6_t: 'BPM 測速與節拍器',
    f6_d: '提供音訊自動偵測、Tap Tempo 手動測速與 4/4 拍視覺脈衝燈號；自動結果仍可手動微調。',
    phil_t: '純粹、專注，為音樂人而生。',
    phil_d: '我們相信好工具應該是順手、安靜且尊重使用者。「調唱」目前維持個人測試版、不放橫幅廣告；核心音訊在瀏覽器本機處理，AI 歌詞只有在你主動同意後才會送往 Groq。',
    spec1_t: '本機優先',
    spec1_d: '移調、變速與 BPM 透過 Web Audio 在瀏覽器處理；AI 歌詞是明確同意後的選用外部服務。',
    spec2_t: '零廣告與追蹤',
    spec2_d: '沒有追蹤代碼與干擾廣告，提供純粹沉浸的練唱體驗。',
    spec3_t: '目前個人測試版',
    spec3_d: '目前不設定付費牆；正式發布與服務條件尚未決定。',
    short_label: '鍵盤操作',
    short_heading: '防衝突快捷鍵設計',
    short_desc: '專門避開 YouTube 原生熱鍵，輸入文字時自動暫停觸發',
    sk_pitch: '升降半音 (±1 Key)',
    sk_reset: '重設原調 (Reset Key)',
    sk_fine: '音高微調 (±5 Cents)',
    sk_ab: '標記 A–B 樂句循環點',
    sk_loop: '開啟 / 清除循環段落',
    sk_speed: '微調播放速度 (±0.05×)',
    faq_label: '常見問題',
    faq_heading: '支援中心與使用指南',
    faq_desc: '快速搜尋或選擇分類查看詳細解答',
  },
  'zh-CN': {
    nav_features: '功能',
    nav_platforms: '支持平台',
    nav_philosophy: '理念',
    nav_shortcuts: '快捷键',
    nav_support: '支持与问答',
    btn_install: '获取扩展',
    hero_badge: '本地优先 · 个人测试版 · 零追踪',
    hero_title: '在浏览器中，<br>拥有专业级的练唱工作台。',
    hero_subtitle: '调唱 (Diaochang) 是专为歌唱训练与乐器练习设计的侧边栏工具。支持 ±36 半音精准移调、Varispeed 磁带连动、人声消减、多段乐句循环、BPM 测速与双行动态歌词。',
    btn_add_chrome: '添加到 Chrome 浏览器',
    btn_manual: '阅读使用手册',
    trait_dsp: '实时音频 DSP',
    trait_local: '本地优先运算',
    trait_sync: 'Google 账号同步',
    demo_transpose: '移调控制 (KEY)',
    demo_reset: '重置',
    demo_vocal: '人声消减',
    demo_bpm: '节拍速度',
    demo_pause: '暂停',
    demo_play: '播放',
    platforms_label: '广泛兼容',
    platforms_heading: '在常用的音乐与视频网站中直接使用',
    platforms_desc: '无需繁琐导入，打开播放页面即可自动连接控制',
    feat_label: '核心能力',
    feat_heading: '精心打造的音频练习工具',
    feat_desc: '结合专业 DSP 算法与 macOS 风格的操作手感',
    f1_t: '±36 半音精准移调',
    f1_d: '严格遵循十二平均律标准，支持 ±6 至 ±36 半音微调，升降调与播放速度完全分离，男女转换音域轻松自如。',
    f2_t: 'Varispeed 磁带连动',
    f2_d: '音高与速度纯物理连动，绕过时间拉伸（Time-stretching）数字运算，杜绝金属伪影与毛边，音质干净清透。',
    f3_t: 'Vocal Reducer 人声消减',
    f3_d: '以中置声道降低主唱人声；效果依混音而异，并非完整 AI 分轨，仍可能保留鼓与 Bass 的部分成分。',
    f4_t: '3 段均衡器 (Equalizer)',
    f4_d: '低音 100Hz、中音 1kHz、高音 8kHz 独立增益微调，内置人声增强与重低音等多种实用预设。',
    f5_t: '多段 Loop 片段与循序练习',
    f5_d: '同一首歌可保存多个命名循环片段（主歌、副歌、Solo），支持自定义阶梯式提速训练（0.75× → 0.90× → 1.0×）。',
    f6_t: 'BPM 测速与节拍器',
    f6_d: '提供音频自动检测、Tap Tempo 手动测速与 4/4 拍视觉脉冲灯号；自动结果仍可手动微调。',
    phil_t: '纯粹、专注，为音乐人而生。',
    phil_d: '我们相信好工具应该是顺手、安静且尊重使用者。“调唱”目前维持个人测试版、不放横幅广告；核心音频在浏览器本地处理，AI 歌词仅在你主动同意后发送至 Groq。',
    spec1_t: '本地优先',
    spec1_d: '移调、变速与 BPM 通过 Web Audio 在浏览器处理；AI 歌词是明确同意后的可选外部服务。',
    spec2_t: '零广告与追踪',
    spec2_d: '没有追踪代码与干扰广告，提供纯粹沉浸的练唱体验。',
    spec3_t: '目前个人测试版',
    spec3_d: '目前不设置付费墙；正式发布与服务条件尚未决定。',
    short_label: '键盘操作',
    short_heading: '防冲突快捷键设计',
    short_desc: '专门避开 YouTube 原生热键，输入文字时自动暂停触发',
    sk_pitch: '升降半音 (±1 Key)',
    sk_reset: '重置原调 (Reset Key)',
    sk_fine: '音高微调 (±5 Cents)',
    sk_ab: '标记 A–B 乐句循环点',
    sk_loop: '开启 / 清除循环段落',
    sk_speed: '微调播放速度 (±0.05×)',
    faq_label: '常见问题',
    faq_heading: '支持中心与使用指南',
    faq_desc: '快速搜索或选择分类查看详细解答',
  },
  'en': {
    nav_features: 'Features',
    nav_platforms: 'Platforms',
    nav_philosophy: 'Philosophy',
    nav_shortcuts: 'Shortcuts',
    nav_support: 'Support & FAQ',
    btn_install: 'Get Extension',
    hero_badge: 'Local-First · Personal Beta · No Tracking',
    hero_title: 'A professional audio workbench<br>right inside your browser.',
    hero_subtitle: 'Diaochang is a focused sidebar tool crafted for vocal training and instrument practice. Featuring ±36 semitone transpose, Varispeed tape mode, vocal reduction, loop clips, BPM detection, and dual-line lyrics.',
    btn_add_chrome: 'Add to Chrome',
    btn_manual: 'User Manual',
    trait_dsp: 'Real-time DSP',
    trait_local: 'Local-First Engine',
    trait_sync: 'Google Account Sync',
    demo_transpose: 'KEY TRANSPOSE',
    demo_reset: 'Reset',
    demo_vocal: 'Vocal Reducer',
    demo_bpm: 'BPM Tempo',
    demo_pause: 'Pause',
    demo_play: 'Play',
    platforms_label: 'Broad Compatibility',
    platforms_heading: 'Works seamlessly on your favorite streaming platforms',
    platforms_desc: 'No manual imports needed — simply play any media to connect',
    feat_label: 'Core Capabilities',
    feat_heading: 'Carefully crafted practice tools',
    feat_desc: 'Combining professional DSP algorithms with native macOS interaction',
    f1_t: '±36 Semitone Pitch Shift',
    f1_d: 'Strictly aligned to 12-TET tuning with independent speed separation. Wide ranges are available, while extreme settings may still produce artifacts.',
    f2_t: 'Varispeed Tape Mode',
    f2_d: 'Pure physical pitch and speed linking. Bypasses time-stretching computation to eliminate metallic phase distortions.',
    f3_t: 'Vocal Reducer',
    f3_d: 'Reduces center-channel vocals; results vary by mix and this is not full AI stem separation. Some drums and bass may also be affected.',
    f4_t: '3-Band Equalizer',
    f4_d: 'Independent Low (100Hz), Mid (1kHz), and High (8kHz) gains with quick presets for vocal enhancement and bass boost.',
    f5_t: 'Loop Clips & Sequences',
    f5_d: 'Save unlimited named practice markers (Verse, Chorus, Solo) with step-by-step tempo drills (0.75x → 0.90x → 1.0x).',
    f6_t: 'BPM & Visual Metronome',
    f6_d: 'Audio auto-detection, Tap Tempo, and 4/4 visual pulses; always fine-tune the detected result against the song.',
    phil_t: 'Pure, focused, and crafted for musicians.',
    phil_d: 'We believe good tools should feel intuitive, quiet, and respectful. Diaochang is currently a personal beta with no banner ads; core audio stays in the browser, while AI lyrics are sent to Groq only after your explicit consent.',
    spec1_t: 'Local-First',
    spec1_d: 'Transpose, speed, and BPM run through Web Audio in the browser; AI lyrics are an optional, consent-based external service.',
    spec2_t: 'Zero Ads & Tracking',
    spec2_d: 'No tracking scripts or distracting popups. Pure focus on your singing.',
    spec3_t: 'Personal Beta',
    spec3_d: 'There is no paywall in this test build; final release and service terms are not decided yet.',
    short_label: 'Keyboard Controls',
    short_heading: 'Conflict-Free Shortcuts',
    short_desc: 'Specifically designed to avoid YouTube default keys, automatically paused during text input.',
    sk_pitch: 'Transpose (±1 Key)',
    sk_reset: 'Reset Key (0)',
    sk_fine: 'Fine Pitch (±5 Cents)',
    sk_ab: 'Set A–B Loop Points',
    sk_loop: 'Toggle / Clear Loop',
    sk_speed: 'Adjust Speed (±0.05×)',
    faq_label: 'Frequently Asked Questions',
    faq_heading: 'Support Center & Guide',
    faq_desc: 'Search or filter topics to find answers quickly',
  },
  'ja': {
    nav_features: '機能',
    nav_platforms: '対応サイト',
    nav_philosophy: '理念',
    nav_shortcuts: 'ショートカット',
    nav_support: 'サポート',
    btn_install: '拡張機能を入手',
    hero_badge: 'ローカル優先 · 個人ベータ · 追跡なし',
    hero_title: 'ブラウザの中に、<br>プロ仕様の練習ワークベンチを。',
    hero_subtitle: 'Diaochang（調唱）は、ボーカルや楽器練習のために設計された洗練されたサイドパネルツールです。±36半音キー変更、Varispeedテープ変速、ボーカル除去、多段ループ、BPM検出に対応。',
    btn_add_chrome: 'Chromeに追加',
    btn_manual: 'マニュアルを見る',
    trait_dsp: 'リアルタイムDSP',
    trait_local: 'ローカル優先処理',
    trait_sync: 'Google アカウント同期',
    demo_transpose: 'キー変更 (KEY)',
    demo_reset: 'リセット',
    demo_vocal: 'ボーカル除去',
    demo_bpm: 'テンポ (BPM)',
    demo_pause: '一時停止',
    demo_play: '再生',
    platforms_label: '幅広い互換性',
    platforms_heading: 'お気に入りの音楽・動画サイトでそのまま使える',
    platforms_desc: '面倒なファイル取り込みは不要。再生ページを開くだけで自動接続',
    feat_label: 'コア機能',
    feat_heading: 'こだわり抜いた音楽練習ツール',
    feat_desc: 'プロフェッショナルな音声DSPとmacOSライクな操作感を融合',
    f1_t: '±36半音 精密キー変更',
    f1_d: '十二平均律に厳密準拠。再生速度に影響を与えることなく、3オクターブにわたるキー調整が可能。',
    f2_t: 'Varispeed テープ連動',
    f2_d: '音高と速度を物理的に連動させ、タイムストレッチ演算のデジタルノイズを完全に排除した純粋な音質。',
    f3_t: 'Vocal Reducer ボーカル除去',
    f3_d: 'センター成分のボーカルを低減します。ミックスによって結果は異なり、完全な AI ステム分離ではありません。',
    f4_t: '3バンド・イコライザー',
    f4_d: '低域100Hz、中域1kHz、高域8kHzを個別に調整可能。ボーカル強調や重低音プリセットを標準搭載。',
    f5_t: '多段A-Bループ＆ステップ練習',
    f5_d: '曲ごとに複数の名前付きループ（Aメロ、サビ、ソロ）を保存。テンポを段階的に上げる反復練習に対応。',
    f6_t: 'BPM検出＆ビジュアルメトロノーム',
    f6_d: '音声自動検出、Tap Tempo 手動測速、4/4拍子の視覚的パルスを提供。検出結果は手動で微調整できます。',
    phil_t: 'シンプルで、静かで、音楽人のために。',
    phil_d: '優れたツールは直感的で、集中を妨げず、利用者を尊重するべきです。Diaochang は現在個人ベータで、コア音声はブラウザ内で処理し、AI 歌詞は同意後だけ Groq に送信します。',
    spec1_t: 'ローカル優先',
    spec1_d: '移調・速度・BPM はブラウザ内の Web Audio で処理。AI 歌詞は同意が必要な任意の外部サービスです。',
    spec2_t: '広告・トラッカーなし',
    spec2_d: '煩わしいバナーや追跡スクリプトは一切含まれていません。',
    spec3_t: '個人ベータ',
    spec3_d: 'このテスト版に有料壁はありません。正式公開とサービス条件は未定です。',
    short_label: 'キーボード操作',
    short_heading: '衝突しないショートカット',
    short_desc: 'YouTube標準のショートカットと干渉せず、テキスト入力時は自動で無効化されます',
    sk_pitch: 'キー変更 (±1 Key)',
    sk_reset: '原曲キーに戻す (Reset)',
    sk_fine: '音高微調 (±5 Cents)',
    sk_ab: 'A-B ループ地点設定',
    sk_loop: 'ループ切替 / 解除',
    sk_speed: '速度微調整 (±0.05×)',
    faq_label: 'よくある質問',
    faq_heading: 'サポートセンター＆ガイド',
    faq_desc: 'キーワード検索またはカテゴリから解決策を見つけられます',
  },
  'ko': {
    nav_features: '기능',
    nav_platforms: '지원 플랫폼',
    nav_philosophy: '철학',
    nav_shortcuts: '단축키',
    nav_support: '고객 지원',
    btn_install: '확장 프로그램 설치',
    hero_badge: '로컬 우선 · 개인 베타 · 추적 없음',
    hero_title: '브라우저 안에서 펼쳐지는<br>전문가급 보컬 연습 워크벤치.',
    hero_subtitle: 'Diaochang(조창)은 보컬 및 악기 연습을 위해 설계된 정교한 사이드바 도구입니다. ±36 반음 조절, 테이프 연동 Varispeed, 보컬 제거, 다중 루프, BPM 측정 지원.',
    btn_add_chrome: 'Chrome에 추가',
    btn_manual: '사용 설명서',
    trait_dsp: '실시간 DSP',
    trait_local: '로컬 우선 처리',
    trait_sync: 'Google 계정 동기화',
    demo_transpose: '키 조절 (KEY)',
    demo_reset: '초기화',
    demo_vocal: '보컬 제거',
    demo_bpm: '템포 (BPM)',
    demo_pause: '일시정지',
    demo_play: '재생',
    platforms_label: '폭넓은 호환성',
    platforms_heading: '자주 이용하는 모든 음악 및 영상 스트리밍에서 구동',
    platforms_desc: '별도 파일 변환 없이 브라우저 재생 화면에서 즉시 연결',
    feat_label: '핵심 기능',
    feat_heading: '정교하게 제작된 오디오 연습 도구',
    feat_desc: '전문적인 DSP 알고리즘과 macOS 스타일의 깔끔한 사용감',
    f1_t: '±36 반음 정밀 키 조절',
    f1_d: '12평균율 기준에 따라 재생 속도에 영향 없이 3옥타브 범위를 자유롭게 조절할 수 있습니다.',
    f2_t: 'Varispeed 테이프 연동',
    f2_d: '음높이와 속도를 물리적으로 연동하여 디지털 타임 스트레칭 특유의 금속성 왜곡을 제거합니다.',
    f3_t: 'Vocal Reducer 보컬 제거',
    f3_d: '센터 캔슬링 매트릭스와 140Hz 저역 통과 필터로 드럼과 베이스의 타격감을 유지하며 보컬만 감쇠.',
    f4_t: '3밴드 이퀄라이저 (EQ)',
    f4_d: '저음 100Hz, 중음 1kHz, 고음 8kHz 개별 조절 및 보컬 부스트/베이스 강화 프리셋 제공.',
    f5_t: '다중 루프 클립 & 단계별 연습',
    f5_d: '노래별로 여러 구간을 저장하고, 템포를 점진적으로 올리는 스텝 연습(0.75x → 0.90x → 1.0x)을 지원합니다.',
    f6_t: 'BPM 측정 & 비주얼 메트로놈',
    f6_d: '오디오 자동 감지, Tap Tempo 수동 측정, 4/4박자 시각 펄스를 제공하며 감지 결과를 직접 미세 조정할 수 있습니다.',
    phil_t: '순수하고 집중된, 음악인을 위한 도구.',
    phil_d: '좋은 도구는 조용하고 직관적이며 사용자를 존중해야 합니다. Diaochang은 현재 개인 베타이며, 핵심 오디오는 브라우저에서 처리하고 AI 가사는 동의 후에만 Groq로 전송합니다.',
    spec1_t: '로컬 우선',
    spec1_d: '피치·속도·BPM은 브라우저 Web Audio로 처리하며, AI 가사는 동의가 필요한 선택적 외부 서비스입니다.',
    spec2_t: '광고 및 추적 제로',
    spec2_d: '불필요한 배너나 추적 스크립트 없이 오직 연습에만 집중할 수 있습니다.',
    spec3_t: '개인 베타',
    spec3_d: '현재 테스트 빌드에는 유료벽이 없으며, 정식 공개 조건은 아직 정해지지 않았습니다.',
    short_label: '키보드 조작',
    short_heading: '충돌 없는 단축키 설계',
    short_desc: 'YouTube 기본 재생 단축키와 겹치지 않으며 텍스트 입력 시 자동으로 일시 중지됩니다.',
    sk_pitch: '반음 조절 (±1 Key)',
    sk_reset: '원키 초기화 (Reset)',
    sk_fine: '미세 조절 (±5 Cents)',
    sk_ab: 'A–B 구간 설정',
    sk_loop: '구간 반복 켜기 / 끄기',
    sk_speed: '속도 미세 조절 (±0.05×)',
    faq_label: '자주 묻는 질문',
    faq_heading: '고객 지원 & 도움말',
    faq_desc: '검색어나 카테고리를 선택해 해결 방법을 찾아보세요',
  },
  'es': {
    nav_features: 'Funciones',
    nav_platforms: 'Plataformas',
    nav_philosophy: 'Filosofía',
    nav_shortcuts: 'Atajos',
    nav_support: 'Soporte',
    btn_install: 'Obtener extensión',
    hero_badge: 'Procesamiento Local · Beta Personal · Sin Rastreo',
    hero_title: 'Un banco de audio profesional<br>directamente en tu navegador.',
    hero_subtitle: 'Diaochang es una herramienta de barra lateral diseñada para el entrenamiento vocal y la práctica instrumental. Cambio de tono de ±36 semitonos, Varispeed, reducción vocal, loops y metrónomo BPM.',
    btn_add_chrome: 'Añadir a Chrome',
    btn_manual: 'Manual de usuario',
    trait_dsp: 'DSP en tiempo real',
    trait_local: 'Motor Local-First',
    trait_sync: 'Sincronización Google',
    demo_transpose: 'CONTROL DE TONO',
    demo_reset: 'Reiniciar',
    demo_vocal: 'Reductor vocal',
    demo_bpm: 'Tempo BPM',
    demo_pause: 'Pausa',
    demo_play: 'Reproducir',
    platforms_label: 'Compatibilidad',
    platforms_heading: 'Funciona en tus plataformas favoritas',
    platforms_desc: 'Sin descargas manuales: reproduce cualquier canción para conectar',
    feat_label: 'Capacidades',
    feat_heading: 'Herramientas de práctica avanzadas',
    feat_desc: 'Algoritmos DSP profesionales con la experiencia de usuario nativa de macOS',
    f1_t: 'Tono exacto ±36 semitonos',
    f1_d: 'Ajuste estricto en temperamento igual sin alterar la velocidad de reproducción.',
    f2_t: 'Modo cinta Varispeed',
    f2_d: 'Enlace físico de tono y velocidad para evitar cualquier artefacto digital.',
    f3_t: 'Reductor vocal',
    f3_d: 'Reduce la voz del canal central; el resultado depende de la mezcla y no es una separación de stems con IA completa.',
    f4_t: 'Ecualizador de 3 bandas',
    f4_d: 'Control individual de graves, medios y agudos con preajustes para voz y bajo.',
    f5_t: 'Loops múltiples y secuencias',
    f5_d: 'Guarda múltiples fragmentos con práctica progresiva de velocidad (0.75x → 0.90x → 1.0x).',
    f6_t: 'Detector de BPM y metrónomo',
    f6_d: 'Detección automática de audio, Tap Tempo e indicador visual 4/4; ajusta manualmente el resultado detectado.',
    phil_t: 'Puro, enfocado y hecho para músicos.',
    phil_d: 'Creemos que las herramientas de calidad deben ser claras, silenciosas y respetuosas. Diaochang es una beta personal: el audio principal se procesa en el navegador y las letras con IA solo se envían a Groq con tu consentimiento.',
    spec1_t: 'Local-First',
    spec1_d: 'Tono, velocidad y BPM se procesan con Web Audio; las letras con IA son un servicio externo opcional con consentimiento.',
    spec2_t: 'Cero Publicidad',
    spec2_d: 'Sin anuncios ni herramientas de rastreo.',
    spec3_t: 'Beta Personal',
    spec3_d: 'Esta versión de prueba no tiene muro de pago; las condiciones de publicación final aún no están decididas.',
    short_label: 'Teclado',
    short_heading: 'Atajos sin conflictos',
    short_desc: 'Diseñados para no colisionar con YouTube ni al escribir texto.',
    sk_pitch: 'Tono (±1 semitono)',
    sk_reset: 'Restablecer tono',
    sk_fine: 'Microtono (±5 Cents)',
    sk_ab: 'Puntos de loop A–B',
    sk_loop: 'Activar / Limpiar loop',
    sk_speed: 'Ajustar velocidad (±0.05×)',
    faq_label: 'Preguntas Frecuentes',
    faq_heading: 'Centro de Ayuda',
    faq_desc: 'Busca o filtra temas para resolver cualquier duda',
  },
  'de': {
    nav_features: 'Funktionen',
    nav_platforms: 'Plattformen',
    nav_philosophy: 'Philosophie',
    nav_shortcuts: 'Tastenkürzel',
    nav_support: 'Hilfe & FAQ',
    btn_install: 'Erweiterung holen',
    hero_badge: 'Lokal zuerst · Persönliche Beta · Kein Tracking',
    hero_title: 'Ein professionelles Audio-Studio<br>direkt in deinem Browser.',
    hero_subtitle: 'Diaochang ist eine fokussierte Seitenleiste für Gesangs- und Instrumentaltraining. Mit ±36 Halbtönen Transposition, Varispeed-Bandmodus, Gesangsreduzierung, Loops und BPM-Erkennung.',
    btn_add_chrome: 'Zu Chrome hinzufügen',
    btn_manual: 'Handbuch lesen',
    trait_dsp: 'Echtzeit DSP',
    trait_local: 'Local-First-Engine',
    trait_sync: 'Google Sync',
    demo_transpose: 'TONHÖHE (KEY)',
    demo_reset: 'Reset',
    demo_vocal: 'Gesangsdämpfung',
    demo_bpm: 'Tempo (BPM)',
    demo_pause: 'Pause',
    demo_play: 'Abspielen',
    platforms_label: 'Kompatibilität',
    platforms_heading: 'Funktioniert auf all deinen Streaming-Diensten',
    platforms_desc: 'Kein Importieren nötig – einfach Wiedergabe starten',
    feat_label: 'Fähigkeiten',
    feat_heading: 'Präzise Werkzeuge für Musiker',
    feat_desc: 'Professionelle Audio-Algorithmen mit nativer macOS Ästhetik',
    f1_t: '±36 Halbtöne Tonhöhenanpassung',
    f1_d: 'Strikte 12-TET Stimmung ohne Einfluss auf die Wiedergabegeschwindigkeit.',
    f2_t: 'Varispeed Bandmodus',
    f2_d: 'Physische Kopplung von Tonhöhe und Tempo für glasklaren, artefaktfreien Klang.',
    f3_t: 'Vocal Reducer',
    f3_d: 'Reduziert Gesang im Mittensignal; das Ergebnis hängt vom Mix ab und ist keine vollständige KI-Stem-Trennung.',
    f4_t: '3-Band Equalizer',
    f4_d: 'Unabhängige Tiefen-, Mitten- und Höhenregelung mit praxisnahen Presets.',
    f5_t: 'Multi-Loops & Tempotraining',
    f5_d: 'Beliebig viele Abschnitte speichern und stufenweise beschleunigen (0.75x → 0.90x → 1.0x).',
    f6_t: 'BPM-Rechner & Metronom',
    f6_d: 'Audio-Autodetektion, Tap Tempo und 4/4-Takt-Pulsanzeige; das Ergebnis kann manuell feinjustiert werden.',
    phil_t: 'Pur, fokussiert und für Musiker gemacht.',
    phil_d: 'Gute Werkzeuge sollten intuitiv, leise und respektvoll sein. Diaochang ist derzeit eine persönliche Beta: Kern-Audio bleibt im Browser, KI-Lyrics werden nur mit deiner Zustimmung an Groq gesendet.',
    spec1_t: 'Local-First',
    spec1_d: 'Tonhöhe, Tempo und BPM laufen über Web Audio im Browser; KI-Lyrics sind ein optionaler externer Dienst mit Zustimmung.',
    spec2_t: 'Ohne Werbung',
    spec2_d: 'Keine Tracker oder nervige Banner.',
    spec3_t: 'Persönliche Beta',
    spec3_d: 'Diese Testversion hat keine Paywall; die Bedingungen der endgültigen Veröffentlichung stehen noch nicht fest.',
    short_label: 'Tastatur',
    short_heading: 'Konfliktfreie Tastenkürzel',
    short_desc: 'Stört niemals YouTube-Bedienelemente oder Texteingaben.',
    sk_pitch: 'Tonhöhe (±1 Halbton)',
    sk_reset: 'Tonhöhe zurücksetzen',
    sk_fine: 'Feinstimmung (±5 Cents)',
    sk_ab: 'A–B Loop Punkte',
    sk_loop: 'Loop umschalten / löschen',
    sk_speed: 'Tempo anpassen (±0.05×)',
    faq_label: 'Häufige Fragen',
    faq_heading: 'Support & Anleitung',
    faq_desc: 'Suche nach Antworten auf deine Fragen',
  },
  'fr': {
    nav_features: 'Fonctions',
    nav_platforms: 'Plateformes',
    nav_philosophy: 'Philosophie',
    nav_shortcuts: 'Raccourcis',
    nav_support: 'Support',
    btn_install: 'Installer',
    hero_badge: 'Local d’abord · Bêta personnelle · Sans traçage',
    hero_title: 'Un banc audio professionnel<br>au cœur de votre navigateur.',
    hero_subtitle: 'Diaochang est une barre latérale conçue pour l’entraînement vocal et instrumental. Transposition ±36 demi-tons, mode bande Varispeed, réduction vocale, boucles multiples et métronome BPM.',
    btn_add_chrome: 'Ajouter à Chrome',
    btn_manual: 'Consulter le manuel',
    trait_dsp: 'DSP temps réel',
    trait_local: 'Moteur local-first',
    trait_sync: 'Sync Google',
    demo_transpose: 'TRANSPOSITION (KEY)',
    demo_reset: 'Reset',
    demo_vocal: 'Atténuation vocale',
    demo_bpm: 'Tempo (BPM)',
    demo_pause: 'Pause',
    demo_play: 'Lecture',
    platforms_label: 'Compatibilité',
    platforms_heading: 'Fonctionne sur toutes vos plateformes de streaming',
    platforms_desc: 'Aucun import requis : lancez votre musique pour vous connecter',
    feat_label: 'Capacités',
    feat_heading: 'Outils conçus pour musiciens',
    feat_desc: 'Algorithmes DSP professionnels et ergonomie soignée inspirée de macOS',
    f1_t: 'Transposition ±36 demi-tons',
    f1_d: 'Respect strict de la gamme tempérée sans altérer la vitesse de lecture.',
    f2_t: 'Mode bande Varispeed',
    f2_d: 'Liaison physique du pitch et du tempo pour éliminer tout artefact numérique.',
    f3_t: 'Réduction vocale',
    f3_d: 'Réduit la voix du canal central ; le résultat dépend du mix et ne constitue pas une séparation complète des stems par IA.',
    f4_t: 'Égaliseur 3 bandes',
    f4_d: 'Ajustement précis des graves, médiums et aigus avec préréglages voix et basse.',
    f5_t: 'Multi-boucles & séquences',
    f5_d: 'Sauvegarde de repères nommés et entraînement progressif (0.75x → 0.90x → 1.0x).',
    f6_t: 'Détecteur BPM & métronome',
    f6_d: 'Détection audio automatique, mesure Tap Tempo et impulsions visuelles 4/4 ; le résultat reste ajustable manuellement.',
    phil_t: 'Pur, précis et dédié aux musiciens.',
    phil_d: 'Nous pensons qu’un bon outil doit être clair, discret et respectueux. Diaochang est actuellement une bêta personnelle : l’audio principal reste dans le navigateur et les paroles IA ne sont envoyées à Groq qu’après votre accord.',
    spec1_t: 'Local-first',
    spec1_d: 'Le pitch, la vitesse et le BPM sont traités via Web Audio ; les paroles IA sont un service externe optionnel avec consentement.',
    spec2_t: 'Zéro Publicité',
    spec2_d: 'Aucun script de suivi ni annonce intrusive.',
    spec3_t: 'Bêta personnelle',
    spec3_d: 'Cette version de test n’a pas de paywall ; les conditions de la publication finale ne sont pas encore décidées.',
    short_label: 'Clavier',
    short_heading: 'Raccourcis sans conflit',
    short_desc: 'Conçus pour ne pas interférer avec les touches YouTube par défaut.',
    sk_pitch: 'Tonalité (±1 demi-ton)',
    sk_reset: 'Tonalité d’origine',
    sk_fine: 'Micro-accordage (±5 Cents)',
    sk_ab: 'Points de boucle A–B',
    sk_loop: 'Activer / Effacer la boucle',
    sk_speed: 'Ajuster la vitesse (±0.05×)',
    faq_label: 'Questions Fréquentes',
    faq_heading: 'Centre d’Aide',
    faq_desc: 'Recherchez ou filtrez par catégorie pour trouver une réponse',
  },
};

document.addEventListener('DOMContentLoaded', () => {
  let currentKey = 0;
  let isPlaying = true;

  // Theme Switcher Logic (Default: Light mode as requested)
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const sunIcon = themeToggleBtn ? themeToggleBtn.querySelector('.sun-icon') : null;
  const moonIcon = themeToggleBtn ? themeToggleBtn.querySelector('.moon-icon') : null;
  let currentTheme = localStorage.getItem('diaochang_theme') || 'light';

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('diaochang_theme', theme);
    if (theme === 'dark') {
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'block';
    } else {
      if (sunIcon) sunIcon.style.display = 'block';
      if (moonIcon) moonIcon.style.display = 'none';
    }
  }

  applyTheme(currentTheme);

  themeToggleBtn?.addEventListener('click', () => {
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
  });

  // Language Switcher Logic
  const langSelect = document.getElementById('lang-select');
  const storedLang = localStorage.getItem('diaochang_lang') || 'zh-TW';

  function applyLanguage(lang) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS['zh-TW'];
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.innerHTML = dict[key];
      }
    });
    localStorage.setItem('diaochang_lang', lang);
    if (langSelect) langSelect.value = lang;
  }

  if (langSelect) {
    langSelect.value = TRANSLATIONS[storedLang] ? storedLang : 'zh-TW';
    applyLanguage(langSelect.value);
    langSelect.addEventListener('change', (e) => applyLanguage(e.target.value));
  }

  // Interactive Pitch Demo Logic
  const displayKey = document.getElementById('display-key');
  const displayCents = document.getElementById('display-cents');
  const btnPitchDown = document.getElementById('btn-pitch-down');
  const btnPitchUp = document.getElementById('btn-pitch-up');
  const btnPitchReset = document.getElementById('btn-pitch-reset');

  function updateKeyDisplay() {
    if (!displayKey || !displayCents) return;
    const sign = currentKey > 0 ? '+' : '';
    displayKey.textContent = `${sign}${currentKey}`;
    const hz = Math.round(440 * Math.pow(2, currentKey / 12) * 100) / 100;
    displayCents.textContent = `${sign}${currentKey * 100} cents (${hz.toFixed(2)} Hz)`;
  }

  btnPitchDown?.addEventListener('click', () => {
    if (currentKey > -36) {
      currentKey -= 1;
      updateKeyDisplay();
    }
  });

  btnPitchUp?.addEventListener('click', () => {
    if (currentKey < 36) {
      currentKey += 1;
      updateKeyDisplay();
    }
  });

  btnPitchReset?.addEventListener('click', () => {
    currentKey = 0;
    updateKeyDisplay();
  });

  // Dynamic sweeping fill animation
  const line1Fill = document.getElementById('karaoke-fill-1');
  let progress = 0;
  setInterval(() => {
    if (!isPlaying) return;
    progress = (progress + 1.5) % 100;
    if (line1Fill) {
      line1Fill.style.clipPath = `inset(0 ${100 - progress}% 0 0)`;
    }
  }, 50);

  // Play / Pause Simulation
  const btnDemoToggle = document.getElementById('btn-demo-toggle');
  const demoPlayText = document.getElementById('demo-play-text');
  btnDemoToggle?.addEventListener('click', () => {
    isPlaying = !isPlaying;
    if (demoPlayText) {
      demoPlayText.textContent = isPlaying ? '暫停' : '播放';
    }
  });

  // Speed Pills Simulation
  document.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
  });

  // FAQ Search & Filter Logic
  const searchInput = document.getElementById('faq-search-input');
  const chips = document.querySelectorAll('.pill-filter');
  const faqItems = document.querySelectorAll('.faq-disclosure');

  function filterFaq() {
    const query = searchInput?.value.toLowerCase().trim() || '';
    const activeChip = document.querySelector('.pill-filter.is-active');
    const selectedCategory = activeChip?.getAttribute('data-filter') || 'all';

    faqItems.forEach((item) => {
      const category = item.getAttribute('data-category');
      const question = item.querySelector('.faq-summary')?.textContent.toLowerCase() || '';
      const answer = item.querySelector('.faq-content')?.textContent.toLowerCase() || '';

      const matchesCategory = selectedCategory === 'all' || category === selectedCategory;
      const matchesQuery = !query || question.includes(query) || answer.includes(query);

      if (matchesCategory && matchesQuery) {
        item.style.display = 'block';
      } else {
        item.style.display = 'none';
      }
    });
  }

  searchInput?.addEventListener('input', filterFaq);

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      filterFaq();
    });
  });
});
