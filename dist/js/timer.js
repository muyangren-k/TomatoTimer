    /* ================= 模式切换逻辑 ================= */
    btnModeCountdown.addEventListener('click', () => {
      studyView = 'RING';
      if (currentMode !== 'IDLE') {
        // 计时 / 休息进行中：仅切回圆环视图，不打断计时
        updateStudyDisplay();
        return;
      }
      timerType = 'COUNTDOWN';
      remainSeconds = selectedMinutes * 60;
      updateStudyDisplay();
    });

    btnModeCountup.addEventListener('click', () => {
      studyView = 'RING';
      if (currentMode !== 'IDLE') {
        // 计时 / 休息进行中：仅切回圆环视图，不打断计时
        updateStudyDisplay();
        return;
      }
      timerType = 'COUNTUP';
      countupSeconds = 0;
      updateStudyDisplay();
    });

    /* ================= 倒计时旋钮拖拽设置 ================= */
    let isDragging = false;

    function setMinutesByPointer(e) {
      if (currentMode !== 'IDLE' || timerType !== 'COUNTDOWN') return;

      const rect = studyRing.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);

      const dx = clientX - centerX;
      const dy = clientY - centerY;

      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;

      let min = Math.round((angle / 360) * 60);
      if (min < 1) min = 1;
      if (min > 60) min = 60;

      selectedMinutes = min;
      remainSeconds = min * 60;
      updateStudyDisplay();
    }

    studyRing.addEventListener('pointerdown', (e) => {
      if (currentMode !== 'IDLE' || timerType !== 'COUNTDOWN') return;
      isDragging = true;
      studyRing.setPointerCapture(e.pointerId);
      setMinutesByPointer(e);
    });

    studyRing.addEventListener('pointermove', (e) => {
      if (isDragging) setMinutesByPointer(e);
    });

    studyRing.addEventListener('pointerup', (e) => {
      if (isDragging) {
        isDragging = false;
        try { studyRing.releasePointerCapture(e.pointerId); } catch(err){}
      }
    });

    studyRing.addEventListener('pointercancel', () => { isDragging = false; });

    /* ================= 计时器主循环 ================= */
    function startTimerLoop() {
      if (timer) clearInterval(timer);
      let lastTickAt = Date.now();

      timer = setInterval(() => {
        const now = Date.now();
        let delta = Math.round((now - lastTickAt) / 1000);
        lastTickAt = now;
        if (delta < 1) delta = 1;
        if (isDevSpeed) delta *= 60;
        // 学习时长按「本次计时开始日期」记录，跨天不写到第二天
        const todayStr = sessionDateStr || getTodayStr();

        if (currentMode === 'STUDY' && timerType === 'COUNTDOWN') {
          if (remainSeconds > 0) {
            const d = Math.min(remainSeconds, delta);
            remainSeconds -= d;
            totalStudiedSeconds += d;

            studyHistory[todayStr] = totalStudiedSeconds;
            saveHistoryData();

            updateStudyDisplay();
            updateTargetDisplay();
          } else {
            clearInterval(timer);
            playAlarm();
            // 倒计时计满即为有效时长：胶囊绿闪提示已记录
            if (tauriAPI && islandInUse) tauriAPI.emit('island-flash-green');
            const breakMinutes = Math.max(1, Math.round(selectedMinutes / breakRatio));
            breakTotalSeconds = breakMinutes * 60;
            remainSeconds = breakTotalSeconds;
            currentMode = 'BREAK';
            // 学习阶段结束：若已跨天，界面累计切回当前日期的累计值
            if (sessionDateStr && sessionDateStr !== getTodayStr()) {
              totalStudiedSeconds = studyHistory[getTodayStr()] || 0;
            }
            sessionDateStr = null;
            updateTargetDisplay();
            updateStudyDisplay();
            startTimerLoop();
          }
        }
        else if (currentMode === 'STUDY' && timerType === 'COUNTUP') {
          const prevSec = countupSeconds;
          countupSeconds += delta;
          if (countupSeconds >= 3600) countupSeconds = 3600; // 正向计时上限 60 分钟
          totalStudiedSeconds += (countupSeconds - prevSec);

          studyHistory[todayStr] = totalStudiedSeconds;
          saveHistoryData();

          updateStudyDisplay();
          updateTargetDisplay();

          if (countupSeconds >= 3600) {
            // 达到 60 分钟：自动停止，进入休息
            clearInterval(timer);
            playAlarm();
            // 已满 60 分钟为有效时长：胶囊绿闪提示已记录
            if (tauriAPI && islandInUse) tauriAPI.emit('island-flash-green');
            const calcBreakSec = Math.round(3600 / breakRatio);
            breakTotalSeconds = Math.max(10, calcBreakSec);
            remainSeconds = breakTotalSeconds;
            currentMode = 'BREAK';
            // 学习阶段结束：若已跨天，界面累计切回当前日期的累计值
            if (sessionDateStr && sessionDateStr !== getTodayStr()) {
              totalStudiedSeconds = studyHistory[getTodayStr()] || 0;
            }
            sessionDateStr = null;
            updateTargetDisplay();
            updateStudyDisplay();
            startTimerLoop();
          }
        }
        else if (currentMode === 'BREAK') {
          if (remainSeconds > 0) {
            const d = Math.min(remainSeconds, delta);
            remainSeconds -= d;
            updateStudyDisplay();
          } else {
            clearInterval(timer);
            playAlarm();
            currentMode = 'IDLE';
            // 学习会话已结束：若跨天，界面累计切回当前日期的累计值
            if (sessionDateStr && sessionDateStr !== getTodayStr()) {
              totalStudiedSeconds = studyHistory[getTodayStr()] || 0;
            }
            sessionDateStr = null;
            updateTargetDisplay();
            if (timerType === 'COUNTDOWN') {
              remainSeconds = selectedMinutes * 60;
            } else {
              countupSeconds = 0;
            }
            updateStudyDisplay(); // 先刷新主窗为待机态，胶囊才能读到 "45:00"
            if (islandInUse) {
              // 休息结束仍保留在灵动岛：胶囊回到待机态，不打开主界面
              syncIslandIdle();
            } else {
              restoreMainWindow();
            }
          }
        }

        // 主窗口：把剩余时间与图标推送到灵动岛窗口（仅计时/休息中推送；待机由 syncIslandIdle 推送）
        if (tauriAPI && !isIsland && (currentMode === 'STUDY' || currentMode === 'BREAK')) {
          let icon = 'sandglass';
          if (currentMode === 'STUDY') icon = timerType === 'COUNTDOWN' ? 'sandglass' : 'stopwatch';
          else if (currentMode === 'BREAK') icon = 'coffee';
          tauriAPI.emit('timer-tick', {
            text: islandTimeText.innerText,
            breakMode: islandTimeText.classList.contains('break-mode'),
            icon,
            mode: currentMode
          });
        }
      }, 1000);
    }
