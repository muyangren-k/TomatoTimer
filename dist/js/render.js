    /* ================= 灵动岛同步更新 ================= */
    function showIslandIcon(name) {
      const icons = islandIcon.querySelectorAll('.ic-svg');
      icons.forEach(ic => {
        ic.style.display = (ic.dataset.icon === name) ? 'block' : 'none';
      });
    }

    function updateIslandButtons(mode) {
      const isIdle = mode === 'IDLE';
      btnIslandStart.disabled = !isIdle;
      btnIslandStop.disabled = isIdle && !islandStopEnabled;
    }

    function updateIslandDisplay() {
      if (currentMode === 'STUDY') {
        if (timerType === 'COUNTDOWN') {
          showIslandIcon('sandglass');
          islandTimeText.innerText = formatIslandTime(remainSeconds);
        } else {
          showIslandIcon('stopwatch');
          islandTimeText.innerText = formatIslandTime(countupSeconds);
        }
        islandTimeText.classList.remove('break-mode');
      } else if (currentMode === 'BREAK') {
        showIslandIcon('coffee');
        islandTimeText.innerText = formatIslandTime(remainSeconds);
        islandTimeText.classList.add('break-mode');
      } else {
        // IDLE：清理休息残留（文本/颜色复位）
        islandTimeText.classList.remove('break-mode');
        islandTimeText.innerText = formatIslandTime(timerType === 'COUNTDOWN' ? selectedMinutes * 60 : 0);
      }
      updateIslandButtons(currentMode);
    }

    /* ================= 界面渲染 ================= */
    function updateStudyDisplay() {
      const showAlarmView = (studyView === 'ALARM');

      // 模式按钮高亮：闹钟面板 ↔ 圆环（倒计时 / 正向计时）视图；始终反映「当前显示的视图」
      btnModeAlarm.classList.toggle('active', showAlarmView);
      btnModeCountdown.classList.toggle('active', !showAlarmView && timerType === 'COUNTDOWN');
      btnModeCountup.classList.toggle('active', !showAlarmView && timerType === 'COUNTUP');
      // 「停止铃声」按钮始终跟随当前是否在响铃（isAlarmActive），无论处于哪个子视图
      btnStopRing.style.display = isAlarmActive ? '' : 'none';

      if (showAlarmView) {
        // 闹钟视图：隐藏圆环与操作按钮，显示闹钟面板 + 新建按钮；运行中的计时在后台继续，不被打断
        studyRing.style.display = 'none';
        btnStartStudy.style.display = 'none';
        btnAddAlarm.style.display = '';
        alarmPanel.style.display = 'flex';
        updateIslandDisplay();
        return;
      }

      // 圆环 / 休息视图：恢复圆环与操作按钮（从闹钟视图切回时保证运行中的计时仍可见）
      studyRing.style.display = '';
      btnStartStudy.style.display = '';
      btnAddAlarm.style.display = 'none';
      alarmPanel.style.display = 'none';

      if (currentMode === 'IDLE') {
        studyCard.classList.remove('is-break');
        studyTitle.innerText = t('study.title');
        studyProgress.style.stroke = "var(--ring-study)";

        if (timerType === 'COUNTDOWN') {
          studyRing.classList.add('interactive');
          const ratio = selectedMinutes / 60;
          const offset = CIRCUMFERENCE * (1 - ratio);
          studyProgress.style.strokeDashoffset = offset;
          studyNeedle.style.transform = `rotate(${ratio * 360}deg)`;

          studyTimeText.innerText = formatTime(selectedMinutes * 60);
          const estBreak = Math.max(1, Math.round(selectedMinutes / breakRatio));
          studyStatusText.innerText = t('study.breakHint', { est: estBreak, ratio: breakRatio });
        } else {
          studyRing.classList.remove('interactive');
          studyProgress.style.strokeDashoffset = CIRCUMFERENCE;
          studyNeedle.style.transform = `rotate(0deg)`;

          studyTimeText.innerText = "00:00";
          studyStatusText.innerText = t('study.manualBreakHint', { ratio: breakRatio });
        }

        btnStartStudy.innerText = t('study.start');
        btnStartStudy.className = "action-btn";
      }
      else if (currentMode === 'STUDY') {
        studyCard.classList.remove('is-break');
        studyTitle.innerText = t('study.title');
        studyProgress.style.stroke = "var(--ring-study)";
        studyRing.classList.remove('interactive');

        if (timerType === 'COUNTDOWN') {
          const ratio = remainSeconds / (selectedMinutes * 60);
          const offset = CIRCUMFERENCE * (1 - ratio);
          studyProgress.style.strokeDashoffset = offset;
          studyNeedle.style.transform = `rotate(${ratio * 360}deg)`;

          studyTimeText.innerText = formatTime(remainSeconds);
          studyStatusText.innerText = t(isDevSpeed ? 'study.focus60x' : 'study.focus');
          btnStartStudy.innerText = t('study.abandon');
          btnStartStudy.className = "action-btn running";
        } else {
          const cycleSec = countupSeconds % 3600;
          const ratio = cycleSec / 3600;
          const offset = CIRCUMFERENCE * (1 - ratio);
          studyProgress.style.strokeDashoffset = offset;
          studyNeedle.style.transform = `rotate(${ratio * 360}deg)`;

          studyTimeText.innerText = formatTime(countupSeconds);
          studyStatusText.innerText = t(isDevSpeed ? 'study.countup60x' : 'study.countupHint');
          btnStartStudy.innerText = t('study.end');
          btnStartStudy.className = "action-btn countup-stop";
        }
      }
      else if (currentMode === 'BREAK') {
        studyCard.classList.add('is-break');
        studyTitle.innerText = t('study.breakTitle');
        studyProgress.style.stroke = "var(--ring-break)";
        studyRing.classList.remove('interactive');

        const ratio = breakTotalSeconds > 0 ? (remainSeconds / breakTotalSeconds) : 0;
        const offset = CIRCUMFERENCE * (1 - ratio);
        studyProgress.style.strokeDashoffset = offset;
        studyNeedle.style.transform = `rotate(${ratio * 360}deg)`;

        studyTimeText.innerText = formatTime(remainSeconds);
        studyStatusText.innerText = t('study.relax');
        btnStartStudy.innerText = t('study.skipBreak');
        btnStartStudy.className = "action-btn break-btn";
      }

      updateIslandDisplay();
    }

    /* ================= 目标模块渲染 ================= */
    function updateTargetDisplay() {
      const targetSeconds = targetHours * 3600;
      const rawRatio = totalStudiedSeconds / targetSeconds;
      const ratio = Math.min(rawRatio, 1);
      const percent = (rawRatio * 100).toFixed(1);

      const offset = CIRCUMFERENCE * (1 - ratio);
      targetProgress.style.strokeDashoffset = offset;

      // 超标：深色环表示超出量，深色指针指向超出段末端
      if (rawRatio > 1) {
        const overRatio = Math.min(rawRatio - 1, 1);
        targetProgressOver.style.strokeDashoffset = CIRCUMFERENCE * (1 - overRatio);
        targetProgressOver.style.display = 'block';
        targetNeedleOver.style.display = 'block';
        targetNeedleOver.style.transform = `rotate(${overRatio * 360}deg)`;
      } else {
        targetProgressOver.style.strokeDashoffset = CIRCUMFERENCE;
        targetProgressOver.style.display = 'none';
        targetNeedleOver.style.display = 'none';
      }

      // 原指针：达标前随进度，达标/超标后停在满格
      if (ratio > 0) {
        targetNeedle.style.display = "block";
        targetNeedle.style.transform = `rotate(${ratio * 360}deg)`;
      } else {
        targetNeedle.style.display = "none";
      }

      // 达标后「今日目标」切换按钮变绿
      if (btnModeTarget) {
        btnModeTarget.classList.toggle('done', totalStudiedSeconds >= targetSeconds);
      }

      targetPercentText.innerText = t('target.percent', { p: percent });

      const studiedMinutes = Math.floor(totalStudiedSeconds / 60);
      if (studiedMinutes < 60) {
        targetDetailText.innerText = t('target.detailMin', { m: studiedMinutes, h: targetHours });
      } else {
        const hours = (studiedMinutes / 60).toFixed(1);
        targetDetailText.innerText = t('target.detailHour', { h: hours, g: targetHours });
      }
    }

    /* ================= 语言切换后统一刷新界面文案 ================= */
    function refreshUiTexts() {
      applyStaticTranslations();
      updateStudyDisplay();
      updateTargetDisplay();
      renderTodoList();
      renderAlarmList();
      buildDayButtons();
      renderStatsModal();
      updateIslandButtonState();
      // applyStaticTranslations 会把文件/试听按钮重置为默认文案，按当前状态还原
      if (useCustomAudio) {
        fileBtnLabel.innerText = customAlarmName ? t('settings.fileLoaded', { name: customAlarmName.substring(0, 12) }) : t('settings.fileLoadedCustom');
      }
      previewSoundLabel.innerText = isPreviewing ? t('settings.stopPreview') : t('settings.preview');
    }
