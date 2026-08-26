    /* ================= DOM 元素 ================= */
    const studyCard = document.getElementById('studyCard');
    const studyTitle = document.getElementById('studyTitle');
    const studyRing = document.getElementById('studyRing');
    const studyProgress = document.getElementById('studyProgress');
    const studyNeedle = document.getElementById('studyNeedle');
    const studyTimeText = document.getElementById('studyTimeText');
    const studyStatusText = document.getElementById('studyStatusText');
    const btnStartStudy = document.getElementById('btnStartStudy');
    const btnStopRing = document.getElementById('btnStopRing');
    const btnModeCountdown = document.getElementById('btnModeCountdown');
    const btnModeCountup = document.getElementById('btnModeCountup');

    const targetProgress = document.getElementById('targetProgress');
    const targetProgressOver = document.getElementById('targetProgressOver');
    const targetNeedle = document.getElementById('targetNeedle');
    const targetNeedleOver = document.getElementById('targetNeedleOver');
    const targetPercentText = document.getElementById('targetPercentText');
    const targetDetailText = document.getElementById('targetDetailText');
    const btnSetTarget = document.getElementById('btnSetTarget');

    // 灵动岛 DOM
    const dynamicIsland = document.getElementById('dynamicIsland');
    const islandContent = document.getElementById('islandContent');
    const islandIcon = document.getElementById('islandIcon');
    const islandTimeText = document.getElementById('islandTimeText');
    const btnIslandStop = document.getElementById('btnIslandStop');
    const btnIslandStart = document.getElementById('btnIslandStart');

    // 通用提示/确认弹窗 DOM
    const appConfirmModal = document.getElementById('appConfirmModal');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmText = document.getElementById('confirmText');
    const btnConfirmCancel = document.getElementById('btnConfirmCancel');
    const btnConfirmOk = document.getElementById('btnConfirmOk');
    let confirmOkCallback = null;

    // 设置弹窗 DOM
    const settingsModal = document.getElementById('settingsModal');
    const btnOpenSettingsModal = document.getElementById('btnOpenSettingsModal');
    const btnShowIsland = document.getElementById('btnShowIsland');
    const btnCloseSettingsModal = document.getElementById('btnCloseSettingsModal');
    const btnSaveSettings = document.getElementById('btnSaveSettings');

    const btnDefCountdown = document.getElementById('btnDefCountdown');
    const btnDefCountup = document.getElementById('btnDefCountup');
    const defaultCountdownBox = document.getElementById('defaultCountdownBox');
    const defaultCountdownMinutesInput = document.getElementById('defaultCountdownMinutesInput');
    const minMinutesInput = document.getElementById('minMinutesInput');
    const islandPosSelect = document.getElementById('islandPosSelect');
    const islandPosXInput = document.getElementById('islandPosXInput');
    const islandPosYInput = document.getElementById('islandPosYInput');
    const islandPosCustomRow = document.getElementById('islandPosCustomRow');
    const islandWidthInput = document.getElementById('islandWidthInput');
    const islandHeightInput = document.getElementById('islandHeightInput');

    const btnExportData = document.getElementById('btnExportData');
    const btnImportData = document.getElementById('btnImportData');
    const btnClearData = document.getElementById('btnClearData');
    const importFileInput = document.getElementById('importFileInput');

    const radioWatchSound = document.getElementById('radioWatchSound');
    const radioAlarmSound = document.getElementById('radioAlarmSound');
    const radioCustomSound = document.getElementById('radioCustomSound');
    const audioFileInput = document.getElementById('audioFileInput');
    const fileBtnLabel = document.getElementById('fileBtnLabel');
    const btnPreviewSound = document.getElementById('btnPreviewSound');
    const previewSoundLabel = document.getElementById('previewSoundLabel');
    const alarmDurationSelect = document.getElementById('alarmDurationSelect');
    const btnToggleLang = document.getElementById('btnToggleLang');

    const ratioInput = document.getElementById('ratioInput');
    const chkDev60x = document.getElementById('chkDev60x');
    const chkDevManualInsert = document.getElementById('chkDevManualInsert');
    const btnDevSpeedTag = document.getElementById('btnDevSpeedTag');
    const devEntryCard = document.getElementById('devEntryCard');

    // 统计与图表 DOM
    const statsModal = document.getElementById('statsModal');
    const btnOpenStatsModal = document.getElementById('btnOpenStatsModal');
    const btnCloseStatsModal = document.getElementById('btnCloseStatsModal');
    const monthStatsList = document.getElementById('monthStatsList');
    const monthYearSelect = document.getElementById('monthYearSelect');
    const calendarContainer = document.getElementById('calendarContainer');
    const calendarTitle = document.getElementById('calendarTitle');
    const chartContainer = document.getElementById('chartContainer');
    const chartGranularitySelect = document.getElementById('chartGranularitySelect');
    const chartTypeSelect = document.getElementById('chartTypeSelect');
    const metricStreak = document.getElementById('metricStreak');
    const metricAvgDay = document.getElementById('metricAvgDay');
    const metricMaxDay = document.getElementById('metricMaxDay');
    const metricStreakLabel = document.getElementById('metricStreakLabel');
    const metricAvgDayLabel = document.getElementById('metricAvgDayLabel');
    const metricMaxDayLabel = document.getElementById('metricMaxDayLabel');
    const metricSumLabel = document.getElementById('metricSumLabel');
    const metricGranularitySum = document.getElementById('metricGranularitySum');
    const devDateInput = document.getElementById('devDateInput');
    const devMinutesInput = document.getElementById('devMinutesInput');
    const btnDevAddRecord = document.getElementById('btnDevAddRecord');

    // 目标弹窗
    const targetModal = document.getElementById('targetModal');
    const targetHourInput = document.getElementById('targetHourInput');
    const btnSaveTarget = document.getElementById('btnSaveTarget');
    const btnCancelTarget = document.getElementById('btnCancelTarget');

    // 闹钟 DOM
    const btnModeAlarm = document.getElementById('btnModeAlarm');
    const alarmPanel = document.getElementById('alarmPanel');
    const btnAddAlarm = document.getElementById('btnAddAlarm');
    const alarmList = document.getElementById('alarmList');
    const alarmModal = document.getElementById('alarmModal');
    const alarmModalTitle = document.getElementById('alarmModalTitle');
    const alarmTimeInput = document.getElementById('alarmTimeInput');
    const alarmDaysWrap = document.getElementById('alarmDaysWrap');
    const alarmNoteInput = document.getElementById('alarmNoteInput');
    const btnSaveAlarm = document.getElementById('btnSaveAlarm');
    const btnCancelAlarm = document.getElementById('btnCancelAlarm');
    const alarmActionModal = document.getElementById('alarmActionModal');
    const alarmActionTime = document.getElementById('alarmActionTime');
    const alarmActionDays = document.getElementById('alarmActionDays');
    const alarmActionNote = document.getElementById('alarmActionNote');
    const btnAlarmEdit = document.getElementById('btnAlarmEdit');
    const btnAlarmDelete = document.getElementById('btnAlarmDelete');
    const btnAlarmActionCancel = document.getElementById('btnAlarmActionCancel');
    const alarmFireModal = document.getElementById('alarmFireModal');
    const alarmFireTime = document.getElementById('alarmFireTime');
    const alarmFireNote = document.getElementById('alarmFireNote');
    const btnDismissAlarm = document.getElementById('btnDismissAlarm');

    // 待办清单 DOM
    const targetRing = document.getElementById('targetRing');
    const btnModeTarget = document.getElementById('btnModeTarget');
    const btnModeTodo = document.getElementById('btnModeTodo');
    const todoPanel = document.getElementById('todoPanel');
    const todoList = document.getElementById('todoList');
    const btnAddTodo = document.getElementById('btnAddTodo');
    const todoModal = document.getElementById('todoModal');
    const todoModalTitle = document.getElementById('todoModalTitle');
    const todoTextInput = document.getElementById('todoTextInput');
    const todoColors = document.getElementById('todoColors');
    const btnSaveTodo = document.getElementById('btnSaveTodo');
    const btnCancelTodo = document.getElementById('btnCancelTodo');
    const todoActionModal = document.getElementById('todoActionModal');
    const todoActionText = document.getElementById('todoActionText');
    const btnTodoEdit = document.getElementById('btnTodoEdit');
    const btnTodoDelete = document.getElementById('btnTodoDelete');
    const btnTodoActionCancel = document.getElementById('btnTodoActionCancel');

    const appWindow = document.getElementById('appWindow');
    const windowHeader = document.getElementById('windowHeader');
    const btnMinimize = document.getElementById('btnMinimize');
    const btnMaximize = document.getElementById('btnMaximize');
    const btnClose = document.getElementById('btnClose');

    function formatTime(totalSec) {
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function formatIslandTime(totalSec) {
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    /* ================= Tauri 原生窗口（拖拽/缩放由系统处理） ================= */
    // 窗口右/下边缘拖拽缩放（灵动岛窗口保持固定尺寸，不绑定）
    if (tauriAPI && !isIsland) {
      const RESIZE_DIR = { east: 'East', south: 'South', southeast: 'Southeast' };
      document.querySelectorAll('.resize-handle').forEach((h) => {
        const dir = RESIZE_DIR[h.dataset.resize];
        if (!dir) return;
        h.addEventListener('mousedown', (e) => {
          e.preventDefault();
          mainWin.startResizeDragging(dir);
        });
      });
    }
