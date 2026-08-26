    /* ================= 灵动岛交互 ================= */
    function restoreMainWindow() {
      islandInUse = false;
      appWindow.classList.remove('minimized');
      dynamicIsland.classList.remove('active');
      if (tauriAPI) {
        tauriAPI.emit('island-hide');
        // 恢复主窗：退出「仅托盘」隐藏态、取消最小化并置前
        if (mainWin.setSkipTaskbar) mainWin.setSkipTaskbar(false);
        try { mainWin.unminimize(); } catch (e) {}
        mainWin.show();
        mainWin.setFocus();
      }
    }

    // 灵动岛驻留时：推送待机状态到胶囊（调用前需先 updateStudyDisplay 刷新主窗文本）
    function syncIslandIdle() {
      if (!tauriAPI || isIsland) return;
      tauriAPI.emit('timer-tick', {
        text: studyTimeText.innerText,
        breakMode: false,
        icon: timerType === 'COUNTDOWN' ? 'sandglass' : 'stopwatch',
        mode: 'IDLE'
      });
    }

    // 主窗口：灵动岛停止/关闭/就绪指令
    if (tauriAPI && !isIsland) {
      tauriAPI.listen('island-stop', () => {
        // 响铃中：先停止铃声，不打断计时
        if (isAlarmActive) {
          stopAlarm();
          return;
        }
        if (currentMode !== 'IDLE') btnStartStudy.click();
      });
      tauriAPI.listen('island-start', () => {
        if (currentMode === 'IDLE') btnStartStudy.click();
      });
      tauriAPI.listen('island-close', () => { restoreMainWindow(); });
      tauriAPI.listen('island-ready', () => {
        // 隐藏主窗并移出任务栏：应用仅驻留系统托盘 + 灵动胶囊
        if (mainWin.setSkipTaskbar) mainWin.setSkipTaskbar(true);
        mainWin.hide();
      });
      // 系统托盘「显示主界面」/ 左键点击 → 统一交由 restoreMainWindow() 恢复
      tauriAPI.listen('tray-restore', () => { restoreMainWindow(); });
      // 灵动岛窗触发闹钟：恢复主窗、播放铃声并弹窗
      tauriAPI.listen('alarm-fire', (e) => {
        restoreMainWindow();
        playAlarm();
        showAlarmFireModal({ time: e.payload.time, note: e.payload.note || '' });
      });
    }

    // 灵动岛窗口：进入岛模式，监听主窗口推送
    if (isIsland && tauriAPI) {
      document.body.classList.add('island-mode');
      const selfWin = tauriAPI.getCurrentWindow();
      let islandMode = 'IDLE';
      tauriAPI.listen('timer-tick', (e) => {
        islandMode = e.payload.mode || 'STUDY';
        islandTimeText.innerText = e.payload.text;
        islandTimeText.classList.toggle('break-mode', !!e.payload.breakMode);
        if (e.payload.icon) showIslandIcon(e.payload.icon);
        updateIslandButtons(islandMode);
      });
      let lastPlacedPos = null;
      tauriAPI.listen('island-show', async () => {
        islandWasDragged = false; // 每次进入岛会话重置拖动标记
        // 每次显示读取最新灵动岛设置（主窗保存后无需重启）
        const s = JSON.parse(localStorage.getItem('pomodoro_settings') || '{}');
        setLanguage(s.language === 'en' ? 'en' : 'zh');
        islandPos = s.islandPos || 'top-center';
        islandPosX = (s.islandPosX != null) ? s.islandPosX : 400;
        islandPosY = (s.islandPosY != null) ? s.islandPosY : 200;
        islandWidth = Math.max(200, s.islandWidth || 240);
        islandHeight = Math.max(36, s.islandHeight || 56);
        // 开始/停止按钮尺寸跟随灵动岛当前高度
        document.documentElement.style.setProperty('--island-h', islandHeight + 'px');
        const calcPos = () => {
          const W = islandWidth, H = islandHeight;
          const sw = window.screen.availWidth || window.screen.width || 1920;
          const sh = window.screen.availHeight || window.screen.height || 1080;
          switch (islandPos) {
            case 'top-left': return { x: 12, y: 8 };
            case 'top-right': return { x: sw - W - 12, y: 8 };
            case 'bottom-left': return { x: 12, y: sh - H - 12 };
            case 'bottom-center': return { x: Math.round((sw - W) / 2), y: sh - H - 12 };
            case 'bottom-right': return { x: sw - W - 12, y: sh - H - 12 };
            case 'custom': return { x: islandPosX, y: islandPosY };
            default: return { x: Math.round((sw - W) / 2), y: 8 };
          }
        };
        const place = async () => {
          // 方法1：逻辑坐标（CSS 像素，与窗口逻辑尺寸一致，不受 DPI 缩放影响）
          try {
            if (tauriAPI.LogicalSize) {
              await selfWin.setSize(new tauriAPI.LogicalSize(islandWidth, islandHeight));
            }
            const pos = calcPos();
            if (tauriAPI.LogicalPosition) {
              await selfWin.setPosition(new tauriAPI.LogicalPosition(Math.max(0, pos.x), Math.max(0, pos.y)));
              return true;
            }
          } catch (e) {}
          // 方法2：物理坐标（monitor 尺寸 × scaleFactor）
          try {
            const mon = await selfWin.primaryMonitor();
            if (mon) {
              const sf = mon.scaleFactor || window.devicePixelRatio || 1;
              const W = Math.round(islandWidth * sf), H = Math.round(islandHeight * sf);
              if (tauriAPI.LogicalSize) {
                await selfWin.setSize(new tauriAPI.PhysicalSize(W, H));
              }
              const sw = mon.size.width, sh = mon.size.height;
              let x, y;
              switch (islandPos) {
                case 'top-left': x = Math.round(mon.position.x + 12 * sf); y = Math.round(mon.position.y + 8 * sf); break;
                case 'top-right': x = Math.round(mon.position.x + sw - W - 12 * sf); y = Math.round(mon.position.y + 8 * sf); break;
                case 'bottom-left': x = Math.round(mon.position.x + 12 * sf); y = Math.round(mon.position.y + sh - H - 12 * sf); break;
                case 'bottom-center': x = Math.round(mon.position.x + (sw - W) / 2); y = Math.round(mon.position.y + sh - H - 12 * sf); break;
                case 'bottom-right': x = Math.round(mon.position.x + sw - W - 12 * sf); y = Math.round(mon.position.y + sh - H - 12 * sf); break;
                case 'custom': x = Math.round(islandPosX * sf); y = Math.round(islandPosY * sf); break;
                default: x = Math.round(mon.position.x + (sw - W) / 2); y = Math.round(mon.position.y + 8 * sf); break;
              }
              await selfWin.setPosition(new tauriAPI.PhysicalPosition(x, y));
              return true;
            }
          } catch (e) {}
          return false;
        };
        await place();
        await selfWin.show();
        // show 后 Windows 可能重排窗口位置，延迟再校正一次
        setTimeout(place, 150);
        // 记录本次定位后的预设位置（用于隐藏时判断是否被拖动）
        setTimeout(async () => {
          try {
            const pos = await selfWin.getPosition();
            const sf = await selfWin.scaleFactor();
            lastPlacedPos = { x: Math.round(pos.x / sf), y: Math.round(pos.y / sf) };
          } catch (e) {}
        }, 400);
        // 通知主窗口：胶囊已就绪，可以隐藏
        tauriAPI.emit('island-ready');
      });
      tauriAPI.listen('island-hide', async () => {
        // 本次会话实际拖动过：以当前位置兜底保存为自定义坐标（用 screenX/Y，不依赖 getPosition）
        if (islandWasDragged) {
          try { saveCustomIslandPos(Math.round(window.screenX), Math.round(window.screenY)); } catch (e) {}
        }
        await selfWin.hide();
      });
      // 计时不足最小时长：胶囊红框闪烁两次
      tauriAPI.listen('island-flash', () => {
        const el = islandContent;
        el.classList.remove('island-flashing');
        void el.offsetWidth; // 重启动画
        el.classList.add('island-flashing');
        setTimeout(() => el.classList.remove('island-flashing'), 900);
      });
      // 计时有效（已记录）：胶囊绿框闪烁两次
      tauriAPI.listen('island-flash-green', () => {
        const el = islandContent;
        el.classList.remove('island-flashing-green');
        void el.offsetWidth; // 重启动画
        el.classList.add('island-flashing-green');
        setTimeout(() => el.classList.remove('island-flashing-green'), 900);
      });
      // 铃声播放：胶囊与停止按钮边框光芒律动；停止按钮可点击停铃
      tauriAPI.listen('island-ring', () => {
        islandStopEnabled = true;
        islandContent.classList.add('island-ringing');
        btnIslandStop.classList.add('island-ringing');
        btnIslandStop.disabled = false;
      });
      tauriAPI.listen('island-ring-stop', () => {
        islandStopEnabled = false;
        islandContent.classList.remove('island-ringing');
        btnIslandStop.classList.remove('island-ringing');
        // 铃停后按当前模式恢复按钮可用/置灰
        updateIslandButtons(islandMode);
      });
      // 胶囊拖动：手动跟随鼠标搬移窗口。基准用 window.screenX/Y（Web 标准，零依赖，不经过 Tauri getPosition）。
      // pointer 事件为主、mouse 事件兜底（click 能触发说明 mouse 链路必然可用）。
      let dragState = null;
      let dragLastSaved = null;
      let dragFrame = null;
      let dragLastApplied = null;
      let islandWasDragged = false; // 本次岛会话是否实际拖动过（隐藏时兜底保存依据）
      function dbgDrag(m) {
        try { localStorage.setItem('_dbg_drag', JSON.stringify({ m, t: Date.now(), sx: window.screenX, sy: window.screenY })); } catch (e) {}
      }
      function saveCustomIslandPos(x, y) {
        islandPos = 'custom';
        islandPosX = x;
        islandPosY = y;
        try {
          const saved = JSON.parse(localStorage.getItem('pomodoro_settings') || '{}');
          saved.islandPos = 'custom';
          saved.islandPosX = x;
          saved.islandPosY = y;
          localStorage.setItem('pomodoro_settings', JSON.stringify(saved));
        } catch (e2) {}
      }
      function islandDragDown(e) {
        if (e.button !== 0) return;
        if (e.type === 'mousedown' && dragState && dragState.src === 'pointer') return; // pointer 已接管
        dragState = {
          src: e.type === 'pointerdown' ? 'pointer' : 'mouse',
          active: false,
          offsetX: e.clientX, // 按下时鼠标相对窗口的抓取偏移
          offsetY: e.clientY,
          targetX: null,
          targetY: null
        };
        dragLastSaved = null;
        dragLastApplied = null;
        try { islandIcon.setPointerCapture(e.pointerId); } catch (e) {}
        dbgDrag('down:' + Math.round(window.screenX) + ',' + Math.round(window.screenY));
      }
      function islandDragMove(e) {
        if (!dragState) return;
        if (dragState.src === 'pointer' && e.type === 'mousemove') return; // pointer 链路正常，忽略 mouse 兜底
        const dx = e.clientX - dragState.offsetX;
        const dy = e.clientY - dragState.offsetY;
        if (!dragState.active) {
          if (Math.abs(dx) + Math.abs(dy) <= 6) return; // 位移过小视为点击
          dragState.active = true;
          islandWasDragged = true;
          suppressIslandClickUntil = Date.now() + 800;
          dbgDrag('active');
          startDragFrame();
        }
        // 目标 = 鼠标屏幕坐标 - 抓取偏移（与窗口当前移动解耦，计算稳定不抖动）
        dragState.targetX = Math.max(0, Math.round(e.screenX - dragState.offsetX));
        dragState.targetY = Math.max(0, Math.round(e.screenY - dragState.offsetY));
      }
      function startDragFrame() {
        if (dragFrame) return;
        const loop = () => {
          if (!dragState) { dragFrame = null; return; }
          if (dragState.active && dragState.targetX != null) {
            // 每帧最多应用一次最新目标，避免 setPosition IPC 堆积造成抖动
            if (!dragLastApplied || dragLastApplied.x !== dragState.targetX || dragLastApplied.y !== dragState.targetY) {
              dragLastApplied = { x: dragState.targetX, y: dragState.targetY };
              selfWin.setPosition(new tauriAPI.LogicalPosition(dragLastApplied.x, dragLastApplied.y)).catch(() => {});
              if (!dragLastSaved || Math.abs(dragLastApplied.x - dragLastSaved.x) + Math.abs(dragLastApplied.y - dragLastSaved.y) > 2) {
                dragLastSaved = { x: dragLastApplied.x, y: dragLastApplied.y };
                saveCustomIslandPos(dragLastApplied.x, dragLastApplied.y);
              }
            }
          }
          dragFrame = requestAnimationFrame(loop);
        };
        dragFrame = requestAnimationFrame(loop);
      }
      function islandDragUp() {
        if (dragFrame) { cancelAnimationFrame(dragFrame); dragFrame = null; }
        if (dragState && dragState.active) {
          suppressIslandClickUntil = Date.now() + 500;
          const fx = (dragLastApplied ? dragLastApplied.x : Math.round(window.screenX));
          const fy = (dragLastApplied ? dragLastApplied.y : Math.round(window.screenY));
          saveCustomIslandPos(fx, fy);
          dbgDrag('up:' + fx + ',' + fy);
        }
        dragState = null;
      }
      // 仅图标区可拖动（长按图标搬移窗口）；主体其余区域保持"点击返回主界面"
      islandIcon.addEventListener('pointerdown', islandDragDown);
      islandIcon.addEventListener('pointermove', islandDragMove);
      islandIcon.addEventListener('pointerup', islandDragUp);
      islandIcon.addEventListener('pointercancel', () => { dragState = null; });
      // mouse 兜底（pointer 事件异常时仍可拖动）
      islandIcon.addEventListener('mousedown', islandDragDown);
      document.addEventListener('mousemove', islandDragMove);
      document.addEventListener('mouseup', islandDragUp);
    }

    // 点击胶囊：图标区为拖动，其余区域关闭胶囊返回主界面
    islandContent.addEventListener('click', (e) => {
      if (isIsland && tauriAPI) {
        if (e.target.closest('.island-icon')) return;
        // 拖动刚结束会附带一次 click，屏蔽掉，避免误收起
        if (Date.now() < suppressIslandClickUntil) return;
        // 通知主窗口恢复，灵动岛自行隐藏
        tauriAPI.emit('island-close');
      } else {
        restoreMainWindow();
      }
    });

    btnIslandStop.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isIsland && tauriAPI) {
        tauriAPI.emit('island-stop');
      } else {
        btnStartStudy.click();
      }
    });

    btnIslandStart.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isIsland && tauriAPI) {
        tauriAPI.emit('island-start');
      } else {
        btnStartStudy.click();
      }
    });

    // 通用弹窗：纯提示（无取消） / 确认（回调式）
    function showAlert(text) {
      confirmTitle.innerText = t('common.alert');
      confirmText.innerText = text;
      btnConfirmCancel.style.display = 'none';
      btnConfirmOk.innerText = t('common.gotit');
      confirmOkCallback = null;
      appConfirmModal.classList.add('active');
    }
    function showConfirm(text, onOk) {
      confirmTitle.innerText = t('common.confirm');
      confirmText.innerText = text;
      btnConfirmCancel.style.display = '';
      btnConfirmOk.innerText = t('common.ok');
      confirmOkCallback = onOk || null;
      appConfirmModal.classList.add('active');
    }
    btnConfirmOk.addEventListener('click', () => {
      appConfirmModal.classList.remove('active');
      if (confirmOkCallback) {
        const cb = confirmOkCallback;
        confirmOkCallback = null;
        cb();
      }
    });
    btnConfirmCancel.addEventListener('click', () => {
      appConfirmModal.classList.remove('active');
      confirmOkCallback = null;
    });

    /* ================= 开始 / 停止交互按钮 ================= */
    btnStopRing.addEventListener('click', () => {
      stopAlarm();
    });

    btnStartStudy.addEventListener('click', () => {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      if (currentMode === 'IDLE') {
        if (timerType === 'COUNTDOWN' && selectedMinutes <= minStudyMinutes) {
          showAlert(t('timer.minMinutes', { min: minStudyMinutes }));
          return;
        }
        currentMode = 'STUDY';
        if (timerType === 'COUNTDOWN') {
          remainSeconds = selectedMinutes * 60;
        } else {
          countupSeconds = 0;
        }
        updateStudyDisplay();
        startTimerLoop();
      }
      else if (currentMode === 'STUDY') {
        if (timerType === 'COUNTDOWN') {
          clearInterval(timer);
          const elapsedSec = selectedMinutes * 60 - remainSeconds;
          if (elapsedSec > minStudyMinutes * 60) {
            // 已学时长超过最小时长：进入休息（休息 = 已学时长 ÷ breakRatio）
            // 手动提前停止不触发铃声；有效时长胶囊绿闪提示已记录
            if (tauriAPI && islandInUse) tauriAPI.emit('island-flash-green');
            const calcBreakSec = Math.round(elapsedSec / breakRatio);
            breakTotalSeconds = Math.max(10, calcBreakSec);
            remainSeconds = breakTotalSeconds;
            currentMode = 'BREAK';
            updateStudyDisplay();
            startTimerLoop();
          } else {
            currentMode = 'IDLE';
            remainSeconds = selectedMinutes * 60;
            // 不足最小时长：本次不计入累计数据
            const todayStr = getTodayStr();
            totalStudiedSeconds = Math.max(0, totalStudiedSeconds - elapsedSec);
            studyHistory[todayStr] = totalStudiedSeconds;
            saveHistoryData();
            if (islandInUse) {
              // 灵动岛驻留：保留胶囊，回待机并红框闪烁
              updateStudyDisplay();
              updateTargetDisplay();
              syncIslandIdle();
              tauriAPI.emit('island-flash');
            } else {
              restoreMainWindow();
              updateStudyDisplay();
              updateTargetDisplay();
              showAlert(t('study.insufficient', { min: minStudyMinutes }));
            }
          }
        } else {
          clearInterval(timer);
          if (countupSeconds < minStudyMinutes * 60) {
            // 不足最小时长：回滚本次学习数据，不进入休息
            const todayStr = getTodayStr();
            totalStudiedSeconds = Math.max(0, totalStudiedSeconds - countupSeconds);
            studyHistory[todayStr] = totalStudiedSeconds;
            saveHistoryData();
            countupSeconds = 0;
            currentMode = 'IDLE';
            if (islandInUse) {
              // 灵动岛驻留：保留胶囊，回待机并红框闪烁
              updateStudyDisplay();
              syncIslandIdle();
              tauriAPI.emit('island-flash');
            } else {
              restoreMainWindow();
              updateStudyDisplay();
              showAlert(t('study.insufficient', { min: minStudyMinutes }));
            }
            return;
          }
          // 手动停止不触发铃声；有效时长胶囊绿闪提示已记录
          if (tauriAPI && islandInUse) tauriAPI.emit('island-flash-green');

          const calcBreakSec = Math.round(countupSeconds / breakRatio);
          breakTotalSeconds = Math.max(10, calcBreakSec);
          remainSeconds = breakTotalSeconds;

          currentMode = 'BREAK';
          updateStudyDisplay();
          startTimerLoop();
        }
      }
      else if (currentMode === 'BREAK') {
        clearInterval(timer);
        currentMode = 'IDLE';
        if (timerType === 'COUNTDOWN') {
          remainSeconds = selectedMinutes * 60;
        } else {
          countupSeconds = 0;
        }
        restoreMainWindow();
        updateStudyDisplay();
      }
    });

    /* ================= 目标设定弹窗 ================= */
    btnSetTarget.addEventListener('click', () => {
      targetHourInput.value = targetHours;
      targetModal.classList.add('active');
    });

    btnSaveTarget.addEventListener('click', () => {
      const val = parseInt(targetHourInput.value);
      if (val >= 1 && val <= 24) {
        targetHours = val;
        saveSettings();
        updateTargetDisplay();
        targetModal.classList.remove('active');
      } else {
        showAlert(t('target.alertHours'));
      }
    });

    btnCancelTarget.addEventListener('click', () => {
      targetModal.classList.remove('active');
    });

    /* ================= 灵动岛（独立按钮触发） ================= */
    function showIsland() {
      if (!tauriAPI) {
        dynamicIsland.classList.add('active');
        return;
      }
      islandInUse = true;
      // IDLE 时胶囊默认显示当前选中的计时模式（倒计时时长 / 正向计时）
      if (currentMode === 'IDLE') {
        tauriAPI.emit('timer-tick', {
          text: studyTimeText.innerText,
          breakMode: false,
          icon: timerType === 'COUNTDOWN' ? 'sandglass' : 'stopwatch',
          mode: 'IDLE'
        });
      }
      // 通知灵动岛窗口自行显示并定位；就绪后再隐藏主窗（避免胶囊未生成时主窗消失）
      tauriAPI.emit('island-show');
    }

    /* ================= 窗口控件（Tauri 原生窗口） ================= */
    btnMinimize.addEventListener('click', async () => {
      if (!tauriAPI) {
        appWindow.classList.toggle('minimized');
        if (appWindow.classList.contains('minimized')) {
          if (currentMode !== 'IDLE' && islandEnabled) dynamicIsland.classList.add('active');
        } else {
          dynamicIsland.classList.remove('active');
        }
        return;
      }
      // 灵动岛开关开启时：最小化改为隐藏主窗并显示胶囊（任务栏无图标，胶囊为恢复入口）
      if (islandEnabled) {
        showIsland();
        return;
      }
      await mainWin.minimize();
    });

    function updateIslandButtonState() {
      btnShowIsland.classList.toggle('island-on', islandEnabled);
      btnShowIsland.title = islandEnabled ? t('island.on') : t('island.off');
    }

    btnShowIsland.addEventListener('click', () => {
      islandEnabled = !islandEnabled;
      saveSettings();
      updateIslandButtonState();
      if (!islandEnabled) {
        // 关闭灵动岛：若主窗已隐藏（胶囊显示中），恢复主窗
        restoreMainWindow();
      }
    });

    btnMaximize.addEventListener('click', async () => {
      if (!tauriAPI) {
        appWindow.classList.toggle('maximized');
        return;
      }
      const isMax = await mainWin.isMaximized();
      if (isMax) await mainWin.unmaximize();
      else await mainWin.maximize();
    });

    btnClose.addEventListener('click', () => {
      showConfirm(t('app.exitConfirm'), () => {
        if (tauriAPI) {
          mainWin.close();
        } else {
          appWindow.style.opacity = '0';
          setTimeout(() => { appWindow.style.display = 'none'; }, 200);
        }
      });
    });

    // 初始启动
    loadSettings();
    restoreCustomAlarm();
    updateIslandButtonState();
    timerType = defaultTimerType;
    if (isDevSpeed) {
      btnDevSpeedTag.style.display = 'inline-flex';
    }
    // 应用主界面窗口布局（仅主窗；浏览器可用 ?layout=compact|standard|wide|large 预览各预设布局）。
    // 主窗在 config 中以 visible:false 启动，避免「先显示默认 900×600 再拉伸到目标尺寸」的闪烁；
    // 等目标布局尺寸应用完成后再显示并聚焦，保证启动即按设置尺寸呈现。
    if (!isIsland) {
      const urlLayout = new URLSearchParams(location.search).get('layout');
      const layout = (urlLayout && WINDOW_LAYOUTS[urlLayout]) ? urlLayout : windowLayout;
      const applied = applyWindowLayout(layout);
      if (tauriAPI) {
        (applied && applied.then) ? applied.then(() => { mainWin.show(); mainWin.setFocus(); })
                                 : (mainWin.show(), mainWin.setFocus());
      }
    }
    updateStudyDisplay();
    updateTargetDisplay();
    updateTodoDoneState();