    /* ================= 设置弹窗逻辑 ================= */
    function setDefaultTimerTypeUI(type) {
      defaultTimerType = type;
      btnDefCountdown.classList.toggle('active', type === 'COUNTDOWN');
      btnDefCountup.classList.toggle('active', type === 'COUNTUP');
      defaultCountdownBox.style.display = type === 'COUNTDOWN' ? 'flex' : 'none';
    }

    // 按当前状态同步铃声单选组（电子表 / 电子闹钟 / 自定义）
    function syncSoundRadios() {
      radioWatchSound.checked = !useCustomAudio && ringtone !== 'alarmclock';
      radioAlarmSound.checked = !useCustomAudio && ringtone === 'alarmclock';
      radioCustomSound.checked = !!useCustomAudio;
    }

    // 语言滑块：`.on` 状态 = 中文；点击切换待保存语言
    function syncLangToggle() {
      btnToggleLang.classList.toggle('on', language === 'zh');
      btnToggleLang.setAttribute('aria-checked', String(language === 'zh'));
    }
    btnToggleLang.addEventListener('click', () => {
      language = language === 'zh' ? 'en' : 'zh';
      syncLangToggle();
    });

    /* ---- 主界面窗口大小布局 ---- */
    const layoutOptionButtons = document.querySelectorAll('#windowLayoutGrid .layout-option');
    let pendingWindowLayout = windowLayout;   // 弹窗内暂选值（保存时生效）
    let windowLayoutChanged = false;          // 仅当用户改了预设才真正调整窗口尺寸

    function syncWindowLayoutPicker() {
      layoutOptionButtons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.layout === pendingWindowLayout);
      });
    }
    layoutOptionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.layout;
        if (!WINDOW_LAYOUTS[id]) return;
        if (id !== pendingWindowLayout) windowLayoutChanged = true;
        pendingWindowLayout = id;
        syncWindowLayoutPicker();
      });
    });

    // 应用布局：body 类名驱动内容适配；Tauri 下同步调整主窗口尺寸并居中。返回尺寸调整 Promise，启动时可用于「等尺寸就绪再显示」。
    function applyWindowLayout(id) {
      windowLayout = WINDOW_LAYOUTS[id] ? id : 'standard';
      document.body.classList.remove('layout-compact', 'layout-standard', 'layout-wide', 'layout-large');
      document.body.classList.add('layout-' + windowLayout);
      if (tauriAPI && !isIsland) {
        return applyMainWindowSize(windowLayout);
      }
    }
    async function applyMainWindowSize(id) {
      const p = WINDOW_LAYOUTS[id];
      if (!p) return;
      try {
        if (await mainWin.isMaximized()) {
          await mainWin.unmaximize();
        }
        await mainWin.setSize(new tauriAPI.LogicalSize(p.w, p.h));
        if (mainWin.center) await mainWin.center();
      } catch (e) {}
    }

    btnDefCountdown.addEventListener('click', () => setDefaultTimerTypeUI('COUNTDOWN'));
    btnDefCountup.addEventListener('click', () => setDefaultTimerTypeUI('COUNTUP'));

    btnOpenSettingsModal.addEventListener('click', () => {
      btnToggleLang.classList.toggle('on', language === 'zh');
      btnToggleLang.setAttribute('aria-checked', String(language === 'zh'));
      syncSoundRadios();
      defaultCountdownMinutesInput.value = defaultCountdownMinutes;
      minMinutesInput.value = minStudyMinutes;
      setDefaultTimerTypeUI(defaultTimerType);

      ratioInput.value = breakRatio;
      // 读取最新位置设置（可能被灵动岛拖动更新为自定义坐标）
      try {
        const sSaved = JSON.parse(localStorage.getItem('pomodoro_settings') || '{}');
        if (sSaved.islandPos) islandPos = sSaved.islandPos;
        if (sSaved.islandPosX != null) islandPosX = sSaved.islandPosX;
        if (sSaved.islandPosY != null) islandPosY = sSaved.islandPosY;
      } catch (e) {}
      islandPosSelect.value = islandPos;
      islandPosXInput.value = islandPosX;
      islandPosYInput.value = islandPosY;
      islandPosCustomRow.style.display = (islandPos === 'custom') ? '' : 'none';
      islandWidthInput.value = islandWidth;
      islandHeightInput.value = islandHeight;
      chkDev60x.checked = isDevSpeed;
      chkDevManualInsert.checked = enableManualInsert;
      alarmDurationSelect.value = String(alarmDurationSec);
      pendingWindowLayout = windowLayout;
      windowLayoutChanged = false;
      syncWindowLayoutPicker();
      settingsModal.classList.add('active');
    });

    btnCloseSettingsModal.addEventListener('click', () => {
      stopPreview();
      settingsModal.classList.remove('active');
    });

    islandPosSelect.addEventListener('change', () => {
      islandPosCustomRow.style.display = (islandPosSelect.value === 'custom') ? '' : 'none';
    });

    btnSaveSettings.addEventListener('click', () => {
      stopPreview();
      const countdownMinVal = parseInt(defaultCountdownMinutesInput.value);

      if (isNaN(countdownMinVal) || countdownMinVal < 1 || countdownMinVal > 180) {
        showAlert(t('settings.alertCountdown'));
        return;
      }
      defaultCountdownMinutes = countdownMinVal;

      const minMinVal = parseInt(minMinutesInput.value);
      if (isNaN(minMinVal) || minMinVal < 1 || minMinVal > 180) {
        showAlert(t('settings.alertMinStudy'));
        return;
      }
      minStudyMinutes = minMinVal;

      const val = parseInt(ratioInput.value);
      if (val >= 1 && val <= 20) {
        breakRatio = val;
      } else {
        showAlert(t('settings.alertRatio'));
        return;
      }

      islandPos = islandPosSelect.value;
      islandPosX = parseInt(islandPosXInput.value) || 0;
      islandPosY = parseInt(islandPosYInput.value) || 0;
      const wVal = parseInt(islandWidthInput.value);
      const hVal = parseInt(islandHeightInput.value);
      if (isNaN(wVal) || wVal < 200 || wVal > 420) {
        showAlert(t('settings.alertIslandWidth'));
        return;
      }
      if (isNaN(hVal) || hVal < 36 || hVal > 100) {
        showAlert(t('settings.alertIslandHeight'));
        return;
      }
      islandWidth = wVal;
      islandHeight = hVal;

      isDevSpeed = chkDev60x.checked;
      enableManualInsert = chkDevManualInsert.checked;
      alarmDurationSec = parseInt(alarmDurationSelect.value) || 0;

      if (isDevSpeed) {
        btnDevSpeedTag.style.display = 'inline-flex';
      } else {
        btnDevSpeedTag.style.display = 'none';
      }

      if (currentMode === 'IDLE') {
        timerType = defaultTimerType;
        if (timerType === 'COUNTDOWN') {
          selectedMinutes = defaultCountdownMinutes;
          remainSeconds = selectedMinutes * 60;
        } else {
          countupSeconds = 0;
        }
      }

      if (currentMode !== 'IDLE') {
        startTimerLoop();
      }

      // 仅在用户选择过不同预设时调整窗口尺寸（避免打扰手动调整过的尺寸）
      if (windowLayoutChanged) {
        applyWindowLayout(pendingWindowLayout);
      }

      setLanguage(language);
      refreshUiTexts();
      saveSettings();
      settingsModal.classList.remove('active');
    });

    audioFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (customAudioUrl) URL.revokeObjectURL(customAudioUrl);
        customAudioUrl = URL.createObjectURL(file);
        useCustomAudio = true;
        radioCustomSound.checked = true;
        customAlarmName = file.name;
        fileBtnLabel.innerText = t('settings.fileLoaded', { name: file.name.substring(0, 12) });
        // 持久化文件到 IndexedDB，重启 exe 后仍可恢复
        saveAlarmFile(file).catch(() => {});
        saveSettings();
      }
    });

    radioWatchSound.addEventListener('change', () => {
      useCustomAudio = false;
      ringtone = 'watch';
      saveSettings();
    });
    radioAlarmSound.addEventListener('change', () => {
      useCustomAudio = false;
      ringtone = 'alarmclock';
      saveSettings();
    });
    radioCustomSound.addEventListener('change', () => {
      if (customAudioUrl) {
        useCustomAudio = true;
      } else {
        showAlert(t('settings.alertCustomAudio'));
        syncSoundRadios();
      }
    });

    let isPreviewing = false;
    let previewTimer = null;
    function stopPreview() {
      stopAlarm();
      if (previewTimer) { clearInterval(previewTimer); previewTimer = null; }
      isPreviewing = false;
      btnPreviewSound.classList.remove('previewing');
      previewSoundLabel.innerText = t('settings.preview');
    }
    btnPreviewSound.addEventListener('click', () => {
      if (isPreviewing) {
        stopPreview();
        return;
      }
      stopAlarm();
      isPreviewing = true;
      btnPreviewSound.classList.add('previewing');
      previewSoundLabel.innerText = t('settings.stopPreview');
      const url = (useCustomAudio && customAudioUrl) ? customAudioUrl : (RINGTONE_URLS[ringtone] || null);
      if (url) {
        alarmAudio = new Audio(url);
        alarmAudio.loop = true;
        alarmAudio.play().catch(() => { alarmAudio = null; playDefaultChime(); });
      } else {
        playDefaultChime();
        previewTimer = setInterval(playDefaultChime, 1300);
      }
    });
