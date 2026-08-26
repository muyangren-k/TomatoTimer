    /* ================= 多维统计与图表核心逻辑 ================= */
    function getChartData(granularity) {
      const data = [];
      const now = new Date();

      if (granularity === '7days' || granularity === '14days' || granularity === '30days') {
        const count = granularity === '7days' ? 7 : (granularity === '14days' ? 14 : 30);
        for (let i = count - 1; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const fullDate = `${y}-${m}-${day}`;

          let label = '';
          if (count === 7) {
            label = i === 0 ? t('stats.today') : `${m}-${day}`;
          } else if (count === 14) {
            label = (i % 2 === 0 || i === count - 1) ? `${m}-${day}` : '';
          } else {
            label = (i % 4 === 0 || i === count - 1) ? `${m}-${day}` : '';
          }

          const sec = studyHistory[fullDate] || 0;
          const hoursVal = parseFloat((sec / 3600).toFixed(1));
          data.push({ label, fullLabel: fullDate, hours: hoursVal, seconds: sec });
        }
      } else if (granularity === '1year') {
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const monthPrefix = `${y}-${m}`;
          const label = t('stats.monthLabel', { m });

          let totalSec = 0;
          for (const [dStr, sec] of Object.entries(studyHistory)) {
            if (dStr.startsWith(monthPrefix)) {
              totalSec += sec;
            }
          }
          const hoursVal = parseFloat((totalSec / 3600).toFixed(1));
          data.push({ label, fullLabel: t('stats.yearMonthLabel', { y, m }), hours: hoursVal, seconds: totalSec });
        }
      }
      return data;
    }

    function renderChart() {
      const granularity = chartGranularitySelect.value;
      const chartType = chartTypeSelect.value;
      const data = getChartData(granularity);

      const maxHours = Math.max(...data.map(d => d.hours), 1.0);
      const width = 680;
      const height = 110;
      const paddingL = 25;
      const paddingR = 25;
      const chartW = width - paddingL - paddingR;
      const chartH = 65;

      let svgHtml = `<svg viewBox="0 0 ${width} ${height}" style="width:100%; height:100%;">`;

      svgHtml += `<line class="chart-grid-line" x1="0" y1="20" x2="${width}" y2="20" />`;
      svgHtml += `<line class="chart-grid-line" x1="0" y1="52" x2="${width}" y2="52" />`;
      svgHtml += `<line class="chart-grid-line" x1="0" y1="85" x2="${width}" y2="85" />`;

      if (chartType === 'bar') {
        const count = data.length;
        const itemW = chartW / count;
        const barW = Math.min(32, Math.max(5, itemW * 0.55));

        data.forEach((item, idx) => {
          const cx = paddingL + idx * itemW + itemW / 2;
          const x = cx - barW / 2;
          const barH = Math.max(item.hours > 0 ? (item.hours / maxHours) * chartH : 3, 3);
          const y = 85 - barH;

          svgHtml += `<rect class="chart-bar-rect" x="${x}" y="${y}" width="${barW}" height="${barH}">
                        <title>${t('stats.tooltipHours', { label: item.fullLabel, n: item.hours })}</title>
                      </rect>`;

          if (item.hours > 0 && (count <= 14 || idx % 2 === 0)) {
            svgHtml += `<text class="chart-val-text" x="${cx}" y="${y - 4}">${item.hours}h</text>`;
          }
          if (item.label) {
            svgHtml += `<text class="chart-label-text" x="${cx}" y="103">${item.label}</text>`;
          }
        });
      } else {
        const count = data.length;
        const stepX = count > 1 ? chartW / (count - 1) : 0;
        const points = data.map((item, idx) => {
          const x = paddingL + idx * stepX;
          const y = 85 - (item.hours / maxHours) * chartH;
          return { x, y, hours: item.hours, label: item.label, fullLabel: item.fullLabel };
        });

        let areaPath = `M ${points[0].x} 85`;
        points.forEach(p => { areaPath += ` L ${p.x} ${p.y}`; });
        areaPath += ` L ${points[points.length - 1].x} 85 Z`;

        svgHtml += `<path d="${areaPath}" fill="var(--chart-area)" />`;

        let linePath = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
          linePath += ` L ${points[i].x} ${points[i].y}`;
        }
        svgHtml += `<path d="${linePath}" stroke="var(--accent-chart)" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

        points.forEach((p, idx) => {
          svgHtml += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="var(--accent-chart)" stroke="#FFF9F0" stroke-width="1.5">
                        <title>${t('stats.tooltipHours', { label: p.fullLabel, n: p.hours })}</title>
                      </circle>`;

          if (p.hours > 0 && (count <= 14 || idx % 3 === 0 || idx === count - 1)) {
            svgHtml += `<text class="chart-val-text" x="${p.x}" y="${p.y - 6}">${p.hours}h</text>`;
          }
          if (p.label) {
            svgHtml += `<text class="chart-label-text" x="${p.x}" y="103">${p.label}</text>`;
          }
        });
      }

      svgHtml += `</svg>`;
      chartContainer.innerHTML = svgHtml;
    }

    let lastRenderedYear = null;

    function renderCombinedStats() {
      const yearsMap = {};
      const dates = Object.keys(studyHistory);

      dates.forEach(dateStr => {
        const year = dateStr.substring(0, 4);
        const monthStr = dateStr.substring(0, 7);
        if (!yearsMap[year]) yearsMap[year] = {};
        yearsMap[year][monthStr] = (yearsMap[year][monthStr] || 0) + studyHistory[dateStr];
      });

      const currentYear = new Date().getFullYear();
      if (!yearsMap[String(currentYear)]) yearsMap[String(currentYear)] = {};
      const years = Object.keys(yearsMap).sort().reverse();

      const prevYear = monthYearSelect.value;
      monthYearSelect.innerHTML = '';
      years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = t('stats.yearLabel', { y });
        monthYearSelect.appendChild(opt);
      });

      let targetYear = (prevYear && years.includes(prevYear)) ? prevYear : String(currentYear);
      monthYearSelect.value = targetYear;

      const monthsMap = yearsMap[targetYear] || {};
      const currentTodayMonth = getTodayStr().substring(0, 7);
      if (targetYear === String(currentYear) && !monthsMap[currentTodayMonth] && Object.keys(monthsMap).length === 0) {
        monthsMap[currentTodayMonth] = 0;
      }

      // 切换年份时，将选中月份重置为该年最近有数据的月份
      if (targetYear !== lastRenderedYear) {
        const months = Object.keys(monthsMap).sort();
        selectedMonthStr = months.length ? months[months.length - 1] : `${targetYear}-01`;
        lastRenderedYear = targetYear;
      }

      monthStatsList.innerHTML = '';
      const sortedMonths = Object.keys(monthsMap).sort().reverse();

      sortedMonths.forEach(m => {
        const row = document.createElement('div');
        const isActive = m === selectedMonthStr;
        row.className = `stats-row month-item ${isActive ? 'active' : ''}`;
        row.innerHTML = `<span>${m}</span><span class="time-val">${formatDurationText(monthsMap[m])}</span>`;
        row.addEventListener('click', () => {
          selectedMonthStr = m;
          renderCombinedStats();
        });
        monthStatsList.appendChild(row);
      });

      renderCalendar(selectedMonthStr);
    }

    monthYearSelect.addEventListener('change', () => { renderCombinedStats(); });

    function renderCalendar(yearMonthStr) {
      if (!yearMonthStr) yearMonthStr = getTodayStr().substring(0, 7);
      const [year, month] = yearMonthStr.split('-').map(Number);

      calendarTitle.innerText = t('stats.calendarWithDate', { ym: yearMonthStr });

      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      const totalDays = lastDay.getDate();
      const startDayOfWeek = firstDay.getDay();

      let html = `
        <div class="calendar-grid-header">
          <div>${t('days.0')}</div><div>${t('days.1')}</div><div>${t('days.2')}</div><div>${t('days.3')}</div><div>${t('days.4')}</div><div>${t('days.5')}</div><div>${t('days.6')}</div>
        </div>
        <div class="calendar-grid-body">
      `;

      for (let i = 0; i < startDayOfWeek; i++) {
        html += `<div class="calendar-cell empty"></div>`;
      }

      const todayStr = getTodayStr();

      for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const sec = studyHistory[dateStr] || 0;
        const isToday = dateStr === todayStr;

        let durationText = '';
        if (sec > 0) {
          const m = Math.floor(sec / 60);
          if (m >= 60) {
            durationText = `${(sec / 3600).toFixed(1)}h`;
          } else {
            durationText = `${m}m`;
          }
        }

        html += `
          <div class="calendar-cell ${isToday ? 'today' : ''} ${sec > 0 ? 'has-data' : ''}" data-date="${dateStr}">
            <div class="cell-day">${day}</div>
            ${durationText ? `<div class="cell-time">${durationText}</div>` : ''}
            ${sec > 0 ? `<button class="cell-delete-btn" data-date="${dateStr}" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>` : ''}
          </div>
        `;
      }

      html += `</div>`;
      calendarContainer.innerHTML = html;
    }

    // 点击有记录的日期显示删除按钮，再点删除该日记录
    calendarContainer.addEventListener('click', (e) => {
      const cell = e.target.closest('.calendar-cell');
      if (!cell || !cell.dataset.date) return;

      if (e.target.closest('.cell-delete-btn')) {
        const date = cell.dataset.date;
        showConfirm(t('stats.deleteDay', { date }), () => {
          delete studyHistory[date];
          saveHistoryData();
          if (date === getTodayStr()) {
            totalStudiedSeconds = 0;
            updateTargetDisplay();
          }
          renderStatsModal();
        });
        return;
      }

      if (cell.classList.contains('has-data')) {
        cell.classList.toggle('selected');
      }
    });

    function renderStatsModal() {
      const currentGranularity = chartGranularitySelect.value;
      const currentFilteredData = getChartData(currentGranularity);

      const activeUnitsCount = currentFilteredData.filter(d => d.seconds > 0).length;
      metricStreak.innerText = `${activeUnitsCount} ${t(currentGranularity === '1year' ? 'stats.unitsMonths' : 'stats.unitsDays')}`;

      const maxSec = currentFilteredData.length > 0 ? Math.max(...currentFilteredData.map(d => d.seconds), 0) : 0;
      metricMaxDay.innerText = t('stats.hours', { n: (maxSec / 3600).toFixed(1) });

      const sumAllSec = currentFilteredData.reduce((acc, cur) => acc + cur.seconds, 0);
      const avgSec = currentFilteredData.length > 0 ? Math.round(sumAllSec / currentFilteredData.length) : 0;
      metricAvgDay.innerText = t('stats.hours', { n: (avgSec / 3600).toFixed(1) });

      const metricLabelKeys = {
        '7days': { streak: 'stats.streak7', avg: 'stats.avg7', max: 'stats.max7', sum: 'stats.sum7' },
        '14days': { streak: 'stats.streak14', avg: 'stats.avg14', max: 'stats.max14', sum: 'stats.sum14' },
        '30days': { streak: 'stats.streak30', avg: 'stats.avg30', max: 'stats.max30', sum: 'stats.sum30' },
        '1year': { streak: 'stats.streak1y', avg: 'stats.avg1y', max: 'stats.max1y', sum: 'stats.sum1y' }
      };
      const mk = metricLabelKeys[currentGranularity] || {};
      if (metricStreakLabel) metricStreakLabel.innerText = t(mk.streak);
      if (metricAvgDayLabel) metricAvgDayLabel.innerText = t(mk.avg);
      if (metricMaxDayLabel) metricMaxDayLabel.innerText = t(mk.max);
      if (metricSumLabel) metricSumLabel.innerText = t(mk.sum);
      if (metricGranularitySum) {
        metricGranularitySum.innerText = t('stats.hours', { n: (sumAllSec / 3600).toFixed(1) });
      }

      if (enableManualInsert) {
        devEntryCard.classList.add('active');
      } else {
        devEntryCard.classList.remove('active');
      }

      renderChart();
      renderCombinedStats();
    }

    chartGranularitySelect.addEventListener('change', () => { renderStatsModal(); });
    chartTypeSelect.addEventListener('change', renderChart);

    btnOpenStatsModal.addEventListener('click', () => {
      devDateInput.value = getTodayStr();
      renderStatsModal();
      statsModal.classList.add('active');
    });

    btnCloseStatsModal.addEventListener('click', () => {
      statsModal.classList.remove('active');
    });

    btnDevAddRecord.addEventListener('click', () => {
      const dateVal = devDateInput.value;
      const minsVal = parseInt(devMinutesInput.value);

      if (!dateVal) { showAlert(t('stats.alertDate')); return; }
      if (isNaN(minsVal) || minsVal < 0) { showAlert(t('stats.alertMinutes')); return; }

      const secVal = minsVal * 60;
      studyHistory[dateVal] = secVal;
      saveHistoryData();

      if (dateVal === getTodayStr()) {
        totalStudiedSeconds = secVal;
        updateTargetDisplay();
      }

      renderStatsModal();
      devMinutesInput.value = '';
    });

    /* ================= 数据导入与导出逻辑（完全覆盖模式） ================= */
    function fallbackDownload(dataStr, fileName) {
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(dataStr));
      downloadAnchor.setAttribute("download", fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }

    btnExportData.addEventListener('click', async () => {
      const dataStr = JSON.stringify(studyHistory, null, 2);
      const fileName = `pomodoro_study_data_${getTodayStr()}.json`;
      // Tauri 桌面版：原生保存对话框选择导出位置
      if (tauriAPI && tauriAPI.invoke) {
        try {
          await tauriAPI.invoke('export_study_data', { data: dataStr, fileName });
        } catch (err) {
          showAlert(t('stats.exportFail', { err }));
        }
        return;
      }
      // 浏览器版：File System Access API 选择位置，不支持则降级下载
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: t('stats.exportType'), accept: { 'application/json': ['.json'] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(dataStr);
          await writable.close();
        } catch (err) {
          if (err.name !== 'AbortError') fallbackDownload(dataStr, fileName);
        }
        return;
      }
      fallbackDownload(dataStr, fileName);
    });

    btnImportData.addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      importFileInput.value = '';

      showConfirm(t('stats.importConfirm'), () => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const importedData = JSON.parse(event.target.result);
            if (typeof importedData === 'object' && importedData !== null) {
              // 完全覆盖旧数据
              studyHistory = importedData;
              saveHistoryData();

              totalStudiedSeconds = studyHistory[getTodayStr()] || 0;
              updateTargetDisplay();

              showAlert(t('stats.importSuccess'));
              if (statsModal.classList.contains('active')) {
                renderStatsModal();
              }
            } else {
              showAlert(t('stats.importBadFormat'));
            }
          } catch (err) {
            showAlert(t('stats.importReadFail'));
          }
        };
        reader.readAsText(file);
      });
    });

    btnClearData.addEventListener('click', () => {
      showConfirm(t('stats.clearConfirm'), () => {
        studyHistory = {};
        saveHistoryData();
        totalStudiedSeconds = 0;
        updateTargetDisplay();

        if (statsModal.classList.contains('active')) {
          renderStatsModal();
        }
        showAlert(t('stats.clearSuccess'));
      });
    });
