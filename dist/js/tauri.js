    /* ================= Tauri 环境适配 ================= */
    const isIsland = new URLSearchParams(location.search).has('island');
    const tauriAPI = window.__TAURI__ ? {
      getCurrentWindow: window.__TAURI__.window.getCurrentWindow,
      WebviewWindow: window.__TAURI__.webviewWindow.WebviewWindow,
      emit: window.__TAURI__.event.emit,
      listen: window.__TAURI__.event.listen,
      invoke: window.__TAURI__.core.invoke,
      LogicalPosition: window.__TAURI__.dpi.LogicalPosition,
      PhysicalPosition: window.__TAURI__.dpi.PhysicalPosition,
      LogicalSize: window.__TAURI__.dpi.LogicalSize,
      PhysicalSize: window.__TAURI__.dpi.PhysicalSize
    } : null;
    const mainWin = tauriAPI ? tauriAPI.getCurrentWindow() : null;
