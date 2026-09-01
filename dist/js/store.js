    /* ================= 统计与历史数据存储 ================= */
    function getTodayStr() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    let studyHistory = JSON.parse(localStorage.getItem('pomodoro_history_data') || '{}');

    function saveHistoryData() {
      localStorage.setItem('pomodoro_history_data', JSON.stringify(studyHistory));
    }

    function formatDurationText(totalSec) {
      const hours = totalSec > 0 ? totalSec / 3600 : 0;
      return t('stats.hours', { n: hours.toFixed(1) });
    }

    /* ================= 状态管理 ================= */
    const RADIUS = 80;
    const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

    // 主界面窗口大小预设（设置 → 主界面窗口大小），键对应 body.layout-* 类名
    const WINDOW_LAYOUTS = {
      compact:  { w: 720,  h: 480 },
      standard: { w: 900,  h: 600 },
      wide:     { w: 1080, h: 720 },
      large:    { w: 1280, h: 800 }
    };

    let defaultTimerType = 'COUNTDOWN';
    let defaultCountdownMinutes = 45;
    let minStudyMinutes = 5;
    let islandEnabled = true;
    let islandInUse = false; // 主窗隐藏、灵动岛胶囊驻留中
    let islandPos = 'top-center';
    let islandPosX = 400;
    let islandPosY = 200;
    let islandWidth = 240;
    let islandHeight = 56;
    let suppressIslandClickUntil = 0; // 拖动结束后短暂屏蔽「点击返回主界面」
    let windowLayout = 'standard';    // 主界面窗口布局：compact | standard | wide | large

    let timerType = 'COUNTDOWN';
    let currentMode = 'IDLE';
    let sessionDateStr = null; // 当前学习计时归属的日期；跨天时仍记录到开始计时的那一天
    let studyView = 'RING';    // 学习卡片子视图：'RING' 圆环（倒计时/正向计时）| 'ALARM' 闹钟面板；仅切换显示，不打断运行中的计时

    let selectedMinutes = 45;
    let countupSeconds = 0;
    let remainSeconds = 45 * 60;
    let breakTotalSeconds = 0;
    let breakRatio = 5;
    let timer = null;

    let targetHours = 8;
    let totalStudiedSeconds = studyHistory[getTodayStr()] || 0;

    let isDevSpeed = false;
    let enableManualInsert = false;

    let selectedMonthStr = getTodayStr().substring(0, 7);

    let language = 'zh';   // 界面语言：'zh' 中文 | 'en' English

    /* ================= 设置持久化（localStorage） ================= */
    const SETTINGS_KEY = 'pomodoro_settings';
    const DEFAULT_SETTINGS = {
      defaultTimerType: 'COUNTDOWN',
      defaultCountdownMinutes: 45,
      minStudyMinutes: 5,
      islandEnabled: true,
      islandPos: 'top-center',
      islandPosX: 400,
      islandPosY: 200,
      islandWidth: 240,
      islandHeight: 56,
      windowLayout: 'standard',
      breakRatio: 5,
      targetHours: 8,
      isDevSpeed: false,
      enableManualInsert: false,
      alarmDurationSec: 0,
      useCustomAudio: false,
      ringtone: 'watch',
      customAlarmName: '',
      language: 'zh'
    };
    function loadSettings() {
      let saved = {};
      try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) {}
      const s = Object.assign({}, DEFAULT_SETTINGS, saved);
      defaultTimerType = s.defaultTimerType;
      defaultCountdownMinutes = s.defaultCountdownMinutes;
      minStudyMinutes = s.minStudyMinutes;
      islandEnabled = s.islandEnabled !== false;
      islandPos = s.islandPos || 'top-center';
      islandPosX = s.islandPosX || 400;
      islandPosY = s.islandPosY || 200;
      islandWidth = s.islandWidth || 240;
      islandHeight = s.islandHeight || 56;
      windowLayout = WINDOW_LAYOUTS[s.windowLayout] ? s.windowLayout : 'standard';
      breakRatio = s.breakRatio;
      targetHours = s.targetHours;
      isDevSpeed = s.isDevSpeed;
      enableManualInsert = s.enableManualInsert;
      alarmDurationSec = s.alarmDurationSec;
      useCustomAudio = !!s.useCustomAudio;
      ringtone = (s.ringtone === 'alarmclock' || s.ringtone === 'watch') ? s.ringtone : 'watch';
      customAlarmName = s.customAlarmName || '';
      language = (s.language === 'en') ? 'en' : 'zh';
      setLanguage(language);
    }
    function saveSettings() {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        defaultTimerType, defaultCountdownMinutes, minStudyMinutes, islandEnabled, islandPos, islandPosX, islandPosY, islandWidth, islandHeight, windowLayout, breakRatio,
        targetHours, isDevSpeed, enableManualInsert, alarmDurationSec, useCustomAudio, ringtone, customAlarmName, language
      }));
    }

    /* IndexedDB：持久化自定义铃声文件，重启后仍可恢复 */
    const ALARM_DB_NAME = 'pomodoro_alarm_db';
    const ALARM_DB_STORE = 'files';
    let alarmDbInstance = null;
    function openAlarmDb() {
      return new Promise((resolve, reject) => {
        if (alarmDbInstance) return resolve(alarmDbInstance);
        const req = indexedDB.open(ALARM_DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(ALARM_DB_STORE);
        req.onsuccess = () => { alarmDbInstance = req.result; resolve(alarmDbInstance); };
        req.onerror = () => reject(req.error);
      });
    }
    function saveAlarmFile(blob) {
      return openAlarmDb().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(ALARM_DB_STORE, 'readwrite');
        tx.objectStore(ALARM_DB_STORE).put(blob, 'custom_alarm');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      }));
    }
    function loadAlarmFile() {
      return openAlarmDb().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(ALARM_DB_STORE, 'readonly');
        const req = tx.objectStore(ALARM_DB_STORE).get('custom_alarm');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      }));
    }
    // 启动时从 IndexedDB 恢复自定义铃声
    async function restoreCustomAlarm() {
      if (!useCustomAudio) return;
      try {
        const blob = await loadAlarmFile();
        if (blob) {
          if (customAudioUrl) URL.revokeObjectURL(customAudioUrl);
          customAudioUrl = URL.createObjectURL(blob);
          radioCustomSound.checked = true;
          fileBtnLabel.innerText = customAlarmName ? t('settings.fileLoaded', { name: customAlarmName.substring(0, 12) }) : t('settings.fileLoadedCustom');
        } else {
          useCustomAudio = false;
          syncSoundRadios();
        }
      } catch (e) {
        useCustomAudio = false;
        syncSoundRadios();
      }
    }
