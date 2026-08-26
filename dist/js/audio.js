    /* ================= 音频模块 ================= */
    let audioCtx = null;
    let customAudioUrl = null;
    let useCustomAudio = false;
    let ringtone = 'watch';   // 内置铃声：'watch' 电子表 | 'alarmclock' 电子闹钟
    let isAlarmActive = false;   // 是否有铃声正在播放
    let islandStopEnabled = false; // 灵动岛停止按钮是否强制可点击（响铃中）
    let alarmDurationSec = 0;   // 响铃时长（秒），0 = 完整播放
    let alarmTimer = null;
    let alarmLoopTimer = null;
    let alarmAudio = null;

    // 内置铃声资源（相对 frontendDist 根目录，打包进 exe）
    const RINGTONE_URLS = {
      watch: 'audio/watch.mp3',
      alarmclock: 'audio/alarm.mp3'
    };

    // 最终兜底：资源加载失败时的旧和弦音（不可选，仅保底）
    function playDefaultChime() {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0, audioCtx.currentTime + idx * 0.1);
          gain.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + idx * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + idx * 0.1 + 1.2);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(audioCtx.currentTime + idx * 0.1);
          osc.stop(audioCtx.currentTime + idx * 0.1 + 1.3);
        });
      } catch (e) {
        console.warn("音频播放异常:", e);
      }
    }

    function stopAlarm() {
      // 铃声停止：隐藏停止按钮，胶囊/停止按钮结束光芒律动
      isAlarmActive = false;
      if (btnStopRing) btnStopRing.style.display = 'none';
      if (tauriAPI && !isIsland) tauriAPI.emit('island-ring-stop');
      if (alarmTimer) { clearTimeout(alarmTimer); alarmTimer = null; }
      if (alarmLoopTimer) { clearInterval(alarmLoopTimer); alarmLoopTimer = null; }
      if (alarmAudio) {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
        alarmAudio = null;
      }
    }

    function playAlarm() {
      // 先打断上一个未结束的铃声，避免叠加播放
      stopAlarm();
      isAlarmActive = true;
      // 铃声开始：显示停止按钮，灵动岛胶囊边框光芒律动
      if (btnStopRing) btnStopRing.style.display = '';
      if (tauriAPI && !isIsland) tauriAPI.emit('island-ring');
      const durationSec = alarmDurationSec;
      // 自定义音频或内置铃声统一按 mp3 处理；都不可用时回退和弦音
      const url = (useCustomAudio && customAudioUrl) ? customAudioUrl : (RINGTONE_URLS[ringtone] || null);
      if (url) {
        alarmAudio = new Audio(url);
        if (durationSec > 0) {
          // 指定时长：文件不足则循环播放，到时停止
          alarmAudio.loop = true;
          alarmAudio.play().catch(() => { alarmAudio = null; playDefaultChime(); });
          alarmTimer = setTimeout(stopAlarm, durationSec * 1000);
        } else {
          // 完整播放完一段音频
          alarmAudio.onended = () => stopAlarm();
          alarmAudio.play().catch(() => { alarmAudio = null; playDefaultChime(); });
        }
        return;
      }

      // 默认和弦铃声：指定时长时按间隔重复播放
      playDefaultChime();
      if (durationSec > 0) {
        alarmLoopTimer = setInterval(playDefaultChime, 1300);
        alarmTimer = setTimeout(stopAlarm, durationSec * 1000);
      } else {
        // 单次和声播完即停
        alarmTimer = setTimeout(stopAlarm, 2000);
      }
    }
