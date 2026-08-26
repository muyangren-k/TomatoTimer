use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, WindowEvent,
};

// 导出学习数据：弹出原生保存对话框，将 JSON 写入指定位置
#[tauri::command]
fn export_study_data(data: String, file_name: String) -> Result<(), String> {
    if let Some(path) = rfd::FileDialog::new()
        .set_title("导出学习数据")
        .set_file_name(&file_name)
        .add_filter("JSON", &["json"])
        .save_file()
    {
        std::fs::write(&path, data).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// 系统托盘图标：主窗隐藏（灵动岛驻留）后，应用仅在托盘运行，可通过托盘恢复主界面或退出。
fn setup_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let show_i = MenuItem::with_id(app, "show_main", "显示主界面", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit_app", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

    let mut builder = TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            // 交由前端 restoreMainWindow() 统一恢复主窗与灵动胶囊状态
            "show_main" => {
                let _ = app.emit("tray-restore", ());
            }
            "quit_app" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = tray.app_handle().emit("tray-restore", ());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![export_study_data])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      // 系统托盘入口
      setup_tray(app.handle())?;
      Ok(())
    })
    .on_window_event(|window, event| {
      // 主窗口销毁时一并关闭灵动岛，避免进程残留
      if window.label() == "main" && matches!(event, WindowEvent::Destroyed) {
        if let Some(island) = window.app_handle().get_webview_window("island") {
          let _ = island.close();
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
