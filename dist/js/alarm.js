    /* ================= 闹钟模块 ================= */
    const ALARMS_KEY = 'pomodoro_alarms';
    const ALARM_LASTFIRED_KEY = 'pomodoro_alarm_lastfired';
    function getDayLabels() { return [t('days.0'), t('days.1'), t('days.2'), t('days.3'), t('days.4'), t('days.5'), t('days.6')]; }
    function getDayNames() { return [t('daynames.0'), t('daynames.1'), t('daynames.2'), t('daynames.3'), t('daynames.4'), t('daynames.5'), t('daynames.6')]; }

    let alarms = loadAlarms();
    let editingAlarmId = null;   // 编辑中的闹钟 id
    let actionAlarmId = null;    // 操作弹窗对应的闹钟 id

    function loadAlarms() {
      try { return JSON.parse(localStorage.getItem(ALARMS_KEY) || '[]'); }
      catch (e) { return []; }
    }
    function saveAlarms() {
      localStorage.setItem(ALARMS_KEY, JSON.stringify(alarms));
    }
    function makeId() {
      return 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }
    function formatAlarmDays(days) {
      if (!days || !days.length) return '';
      const sorted = Array.from(new Set(days)).sort();
      if (sorted.length === 7) return t('alarm.everyday');
      if (sorted.join(',') === '1,2,3,4,5') return t('alarm.weekdays');
      return sorted.map(d => getDayNames()[d]).join(' ');
    }
    function formatAlarmDaysList(days) {
      if (!days || !days.length) return [];
      const sorted = Array.from(new Set(days)).sort();
      if (sorted.length === 7) return [{ label: t('alarm.everyday') }];
      if (sorted.join(',') === '1,2,3,4,5') return [{ label: t('alarm.weekdays') }];
      return sorted.map(d => ({ label: getDayNames()[d], weekend: (d === 0 || d === 6) }));
    }
    function periodLabel(time) {
      const h = Number(String(time).split(':')[0]);
      if (isNaN(h)) return '';
      return h < 12 ? t('alarm.am') : t('alarm.pm');
    }

    /* ---------- 模式切换：进入闹钟模式 ---------- */
    btnModeAlarm.addEventListener('click', () => {
      studyView = 'ALARM';
      if (currentMode !== 'IDLE') {
        // 计时 / 休息进行中：切到闹钟面板但不打断计时，计时在后台继续
        updateStudyDisplay();
        renderAlarmList();
        return;
      }
      timerType = 'ALARM';
      updateStudyDisplay();
      renderAlarmList();
    });

    /* ---------- 列表渲染 ---------- */
    function renderAlarmList() {
      alarmList.innerHTML = '';
      if (!alarms.length) {
        const empty = document.createElement('div');
        empty.className = 'alarm-empty';
        empty.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="30" height="30"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M5 3 2 6"/><path d="M22 6l-3-3"/><path d="M6 19l-2 2"/><path d="M18 19l2 2"/></svg>${t('alarm.empty')}`;
        alarmList.appendChild(empty);
        return;
      }
      const sorted = [...alarms].sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));
      sorted.forEach(alarm => {
        const item = document.createElement('div');
        item.className = 'alarm-item' + (alarm.enabled ? '' : ' disabled');
        item.dataset.id = alarm.id;

        const timeWrap = document.createElement('div');
        timeWrap.className = 'alarm-item-timewrap';
        const periodEl = document.createElement('div');
        periodEl.className = 'alarm-item-period';
        periodEl.textContent = periodLabel(alarm.time);
        const timeEl = document.createElement('div');
        timeEl.className = 'alarm-item-time';
        timeEl.textContent = alarm.time;
        timeWrap.appendChild(periodEl);
        timeWrap.appendChild(timeEl);

        const meta = document.createElement('div');
        meta.className = 'alarm-item-meta';
        const daysEl = document.createElement('div');
        daysEl.className = 'alarm-item-days';
        formatAlarmDaysList(alarm.days).forEach(ditem => {
          const span = document.createElement('span');
          span.className = 'alarm-item-day' + (ditem.weekend ? ' weekend' : '');
          span.textContent = ditem.label;
          daysEl.appendChild(span);
        });
        const noteEl = document.createElement('div');
        noteEl.className = 'alarm-item-note';
        noteEl.textContent = alarm.note || t('alarm.noteFallback');
        meta.appendChild(daysEl);
        meta.appendChild(noteEl);

        const sw = document.createElement('button');
        sw.className = 'alarm-switch' + (alarm.enabled ? ' on' : '');
        sw.title = alarm.enabled ? t('alarm.disableTitle') : t('alarm.enableTitle');
        sw.addEventListener('click', (e) => {
          e.stopPropagation();
          alarm.enabled = !alarm.enabled;
          saveAlarms();
          renderAlarmList();
        });

        item.appendChild(timeWrap);
        item.appendChild(meta);
        item.appendChild(sw);
        item.addEventListener('click', () => openAlarmAction(alarm.id));
        alarmList.appendChild(item);
      });
    }

    /* ---------- 新建 / 编辑弹窗 ---------- */
    function setDaysSelected(days) {
      Array.from(alarmDaysWrap.querySelectorAll('.alarm-day-btn')).forEach(b => {
        b.classList.toggle('on', days.includes(Number(b.dataset.day)));
      });
    }

    function buildDayButtons() {
      alarmDaysWrap.innerHTML = '';
      const shortcuts = document.createElement('div');
      shortcuts.className = 'alarm-days-shortcuts';
      const mkShortcut = (label, days) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'alarm-day-shortcut';
        b.textContent = label;
        b.addEventListener('click', () => setDaysSelected(days));
        shortcuts.appendChild(b);
      };
      mkShortcut(t('alarm.weekdays'), [1, 2, 3, 4, 5]);
      mkShortcut(t('alarm.selectAll'), [0, 1, 2, 3, 4, 5, 6]);
      alarmDaysWrap.appendChild(shortcuts);

      const grid = document.createElement('div');
      grid.className = 'alarm-days-grid';
      getDayLabels().forEach((label, d) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'alarm-day-btn';
        b.dataset.day = d;
        b.textContent = label;
        b.addEventListener('click', () => b.classList.toggle('on'));
        grid.appendChild(b);
      });
      alarmDaysWrap.appendChild(grid);
    }

    function openAlarmModal(id) {
      editingAlarmId = id || null;
      const alarm = id ? alarms.find(a => a.id === id) : null;
      alarmModalTitle.innerText = alarm ? t('alarm.edit') : t('alarm.new');
      alarmTimeInput.value = alarm ? alarm.time : '07:30';
      alarmNoteInput.value = alarm ? (alarm.note || '') : '';
      Array.from(alarmDaysWrap.querySelectorAll('.alarm-day-btn')).forEach(b => {
        const day = Number(b.dataset.day);
        b.classList.toggle('on', !!(alarm && alarm.days && alarm.days.includes(day)));
      });
      alarmModal.classList.add('active');
      if (alarmTimeInput) alarmTimeInput.focus();
    }

    function sameDays(a, b) {
      if (a.length !== b.length) return false;
      const sa = [...a].sort((x, y) => x - y).join(',');
      const sb = [...b].sort((x, y) => x - y).join(',');
      return sa === sb;
    }

    function saveAlarmForm() {
      const time = alarmTimeInput.value;
      if (!time) { showAlert(t('alarm.alertTime')); return; }
      const days = Array.from(alarmDaysWrap.querySelectorAll('.alarm-day-btn.on'))
        .map(b => Number(b.dataset.day));
      if (!days.length) { showAlert(t('alarm.alertDay')); return; }
      // 查重：时间 + 星期完全一致视为重复（编辑时排除自身）
      const isDup = alarms.some(a => {
        if (editingAlarmId && a.id === editingAlarmId) return false;
        return a.time === time && sameDays(a.days, days);
      });
      if (isDup) { showAlert(t('alarm.alertDup')); return; }
      const note = alarmNoteInput.value.trim();

      if (editingAlarmId) {
        const a = alarms.find(x => x.id === editingAlarmId);
        if (a) {
          const timeChanged = a.time !== time;
          const daysChanged = !sameDays(a.days, days);
          a.time = time; a.days = days; a.note = note;
          // 触发时间或星期改变时清除触发记录，否则同一天改后无法再次触发
          if (timeChanged || daysChanged) clearLastFiredFor(editingAlarmId);
        }
      } else {
        alarms.push({ id: makeId(), time, days, note, enabled: true });
      }
      saveAlarms();
      alarmModal.classList.remove('active');
      renderAlarmList();
    }

    btnAddAlarm.addEventListener('click', () => openAlarmModal(null));
    btnSaveAlarm.addEventListener('click', saveAlarmForm);
    btnCancelAlarm.addEventListener('click', () => alarmModal.classList.remove('active'));

    /* ---------- 操作弹窗：编辑 / 删除 / 取消 ---------- */
    function openAlarmAction(id) {
      const alarm = alarms.find(a => a.id === id);
      if (!alarm) return;
      actionAlarmId = id;
      alarmActionTime.innerText = periodLabel(alarm.time) + ' ' + alarm.time;
      alarmActionDays.innerText = formatAlarmDays(alarm.days);
      alarmActionNote.innerText = alarm.note || '';
      alarmActionModal.classList.add('active');
    }
    btnAlarmEdit.addEventListener('click', () => {
      alarmActionModal.classList.remove('active');
      openAlarmModal(actionAlarmId);
    });
    btnAlarmDelete.addEventListener('click', () => {
      alarmActionModal.classList.remove('active');
      showConfirm(t('alarm.deleteConfirm'), () => {
        alarms = alarms.filter(a => a.id !== actionAlarmId);
        saveAlarms();
        renderAlarmList();
      });
    });
    btnAlarmActionCancel.addEventListener('click', () => alarmActionModal.classList.remove('active'));

    /* ---------- 到点触发检查（主窗与灵动岛窗都运行） ---------- */
    function loadLastFired() {
      try { return JSON.parse(localStorage.getItem(ALARM_LASTFIRED_KEY) || '{}'); }
      catch (e) { return {}; }
    }
    function saveLastFired(last) {
      localStorage.setItem(ALARM_LASTFIRED_KEY, JSON.stringify(last));
    }
    // 清除某闹钟的所有触发记录（编辑时间/星期后，让新时间点当天也能触发）
    function clearLastFiredFor(id) {
      const last = loadLastFired();
      let changed = false;
      Object.keys(last).forEach(k => {
        if (k.indexOf(id + '_') === 0) {
          delete last[k];
          changed = true;
        }
      });
      if (changed) saveLastFired(last);
    }

    function alarmMatchesNow(alarm, now) {
      if (!alarm.enabled) return false;
      const parts = String(alarm.time).split(':');
      if (parts.length !== 2) return false;
      const h = Number(parts[0]), m = Number(parts[1]);
      if (now.getHours() !== h || now.getMinutes() !== m) return false;
      if (!alarm.days || !alarm.days.includes(now.getDay())) return false;
      return true;
    }

    function checkAlarms() {
      const now = new Date();
      const todayStr = getTodayStr();
      const last = loadLastFired();
      let changed = false;
      alarms.forEach(alarm => {
        if (!alarmMatchesNow(alarm, now)) return;
        const key = `${alarm.id}_${todayStr}`;
        if (last[key]) return; // 当天已触发过，防重复
        last[key] = 1;
        changed = true;
        fireAlarm(alarm);
      });
      if (changed) saveLastFired(last);
    }

    function fireAlarm(alarm) {
      if (tauriAPI && isIsland) {
        // 灵动岛窗：通知主窗恢复并播放铃声 + 弹窗（铃声统一由主窗播放，停止逻辑一致）
        tauriAPI.emit('alarm-fire', { time: alarm.time, note: alarm.note || '' });
      } else if (tauriAPI) {
        // 主窗：直接播放 + 弹窗；若驻留灵动岛则让胶囊闪动
        playAlarm();
        showAlarmFireModal(alarm);
        if (islandInUse) tauriAPI.emit('island-ring');
      } else {
        // 非 Tauri 环境（浏览器）：直接播放 + 弹窗
        playAlarm();
        showAlarmFireModal(alarm);
      }
    }

    function showAlarmFireModal(alarm) {
      alarmFireTime.innerText = periodLabel(alarm.time) + ' ' + alarm.time;
      alarmFireNote.innerText = alarm.note || '';
      alarmFireModal.classList.add('active');
    }
    btnDismissAlarm.addEventListener('click', () => {
      stopAlarm();
      alarmFireModal.classList.remove('active');
    });

    // 启动检查循环（秒级匹配时:分，lastFired 防同一天重复触发）
    buildDayButtons();
    setInterval(checkAlarms, 1000);
