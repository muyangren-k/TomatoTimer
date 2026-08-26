    /* ================= 待办清单模块 ================= */
    const TODOS_KEY = 'pomodoro_todo_list';

    let todos = loadTodos();
    let editingTodoId = null;   // 编辑中的待办 id
    let actionTodoId = null;    // 操作弹窗对应的待办 id
    let targetView = 'GOAL';    // 目标卡片视图：'GOAL' 今日目标 | 'TODO' 待办清单

    function loadTodos() {
      try { return JSON.parse(localStorage.getItem(TODOS_KEY) || '[]'); }
      catch (e) { return []; }
    }
    function saveTodos() {
      localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
    }
    function makeTodoId() {
      return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    /* ---------- 视图切换：今日目标 / 待办清单 ---------- */
    function switchTargetView(view) {
      targetView = view;
      const isTodo = view === 'TODO';
      targetRing.style.display = isTodo ? 'none' : '';
      btnSetTarget.style.display = isTodo ? 'none' : '';
      btnAddTodo.style.display = isTodo ? '' : 'none';
      todoPanel.style.display = isTodo ? 'flex' : 'none';
      btnModeTarget.classList.toggle('active', !isTodo);
      btnModeTodo.classList.toggle('active', isTodo);
      if (isTodo) renderTodoList();
    }
    btnModeTarget.addEventListener('click', () => switchTargetView('GOAL'));
    btnModeTodo.addEventListener('click', () => switchTargetView('TODO'));

    /* ---------- 列表渲染 ---------- */
    // 全部待办均被勾选（且存在待办）时，把「待办清单」切换滑块标记为已完成（绿色），
    // 复用 .mode-btn.done 样式，与「今日目标」达成时的 done 标记保持一致。
    function updateTodoDoneState() {
      const allDone = todos.length > 0 && todos.every(t => t.done);
      btnModeTodo.classList.toggle('done', allDone);
    }

    function renderTodoList() {
      updateTodoDoneState();
      todoList.innerHTML = '';
      if (!todos.length) {
        const empty = document.createElement('div');
        empty.className = 'todo-empty';
        empty.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="30" height="30"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>${t('todo.empty')}`;
        todoList.appendChild(empty);
        return;
      }
      const sorted = [...todos].sort((a, b) => ((a.order ?? a.createdAt) - (b.order ?? b.createdAt)));
      sorted.forEach(todo => {
        const item = document.createElement('div');
        item.className = 'todo-item' + (todo.done ? ' done' : '') + ' color-' + (todo.color || 'tomato');
        item.dataset.id = todo.id;

        const check = document.createElement('button');
        check.type = 'button';
        check.className = 'todo-check' + (todo.done ? ' on' : '');
        check.title = todo.done ? t('todo.uncheckTitle') : t('todo.checkTitle');
        check.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
        check.addEventListener('click', (e) => {
          e.stopPropagation();
          todo.done = !todo.done;
          saveTodos();
          renderTodoList();
        });

        const text = document.createElement('span');
        text.className = 'todo-text';
        text.textContent = todo.text;

        item.appendChild(check);
        item.appendChild(text);
        item.addEventListener('pointerdown', (e) => {
          if (e.button !== 0 || e.target.closest('.todo-check')) return;
          e.preventDefault(); // 阻止长按选中文本等默认行为
          startTodoDrag(e, item, todo.id);
        });
        item.addEventListener('click', () => {
          if (suppressNextClick) { suppressNextClick = false; return; }
          openTodoAction(todo.id);
        });
        todoList.appendChild(item);
      });
    }

    /* ---------- 长按拖拽排序 ---------- */
    let dragTodo = null;          // 拖拽状态（item 上长按 400ms 激活）
    let suppressNextClick = false; // 拖拽结束后吞掉一次点击，防止误开操作弹窗

    function startTodoDrag(e, item, id) {
      if (e.button !== 0 || e.target.closest('.todo-check')) return;
      dragTodo = {
        item, id,
        pointerId: e.pointerId,
        startX: e.clientX, startY: e.clientY,
        grabOffset: e.clientY - item.getBoundingClientRect().top, // 指针在项内的高度，保持贴合
        activated: false, dy: 0, pointerY: undefined, timer: null
      };
      dragTodo.timer = setTimeout(() => activateTodoDrag(), 400);
    }

    function activateTodoDrag() {
      if (!dragTodo) return;
      dragTodo.activated = true;
      const it = dragTodo.item;
      it.classList.add('dragging');
      // 捕获指针，保证拖拽中事件持续送达（即使指针移出元素）
      if (it.setPointerCapture) {
        try { it.setPointerCapture(dragTodo.pointerId); } catch (err) { /* 忽略 */ }
      }
    }

    // 让被拖项始终贴合指针：视觉顶部 = 指针相对列表位置 - 初始抓取偏移
    function updateDragTransform(d) {
      const listTop = todoList.getBoundingClientRect().top;
      const itemRect = d.item.getBoundingClientRect();
      const cur = parseFloat(d.item.style.transform.replace(/[^0-9.\-]/g, '')) || 0;
      const naturalTop = (itemRect.top - listTop) - cur; // 忽略 transform 后的自然顶部
      const target = (d.pointerY - listTop) - d.grabOffset - naturalTop;
      d.item.style.transform = `translateY(${target}px)`;
    }

    // 按指针落点决定插入位置，支持放到任意位置（含相邻项之间）
    function reorderTodoDuringDrag() {
      const d = dragTodo;
      const it = d.item;
      const items = Array.from(todoList.children).filter(el => el.classList.contains('todo-item'));
      if (items.length <= 1 || d.pointerY === undefined) return;
      // 找第一个中心在指针下方的兄弟 → 插到它前面；否则插到末尾
      let insertBeforeEl = null;
      for (let i = 0; i < items.length; i++) {
        const el = items[i];
        if (el === it) continue;
        const r = el.getBoundingClientRect();
        if (d.pointerY < r.top + r.height / 2) { insertBeforeEl = el; break; }
      }
      if (insertBeforeEl) {
        if (it.nextElementSibling !== insertBeforeEl) {
          todoList.insertBefore(it, insertBeforeEl);
        }
      } else if (todoList.lastElementChild !== it) {
        todoList.appendChild(it);
      }
    }

    window.addEventListener('pointermove', (e) => {
      if (!dragTodo) return;
      const d = dragTodo;
      if (!d.activated) {
        // 移动超阈值 → 立即激活拖拽（无需等满长按）；轻微抖动则继续等待 400ms
        if (Math.abs(e.clientY - d.startY) > 8 || Math.abs(e.clientX - d.startX) > 8) {
          clearTimeout(d.timer);
          activateTodoDrag();
          d.pointerY = e.clientY;
          updateDragTransform(d);
          reorderTodoDuringDrag();
          updateDragTransform(d);
        }
        return;
      }
      d.pointerY = e.clientY;
      updateDragTransform(d);
      reorderTodoDuringDrag();
      updateDragTransform(d);
    });

    window.addEventListener('pointerup', () => {
      if (!dragTodo) return;
      const d = dragTodo;
      if (d.activated) {
        suppressNextClick = true;
        d.item.classList.remove('dragging');
        d.item.style.transform = '';
        persistTodoOrder();
      }
      clearTimeout(d.timer);
      dragTodo = null;
    });
    window.addEventListener('pointercancel', () => {
      if (!dragTodo) return;
      const d = dragTodo;
      if (d.activated) {
        d.item.classList.remove('dragging');
        d.item.style.transform = '';
      }
      clearTimeout(d.timer);
      dragTodo = null;
    });

    // 按拖拽后的 DOM 顺序持久化（赋 order 字段）
    function persistTodoOrder() {
      const byId = {};
      todos.forEach(t => { byId[t.id] = t; });
      todos = Array.from(todoList.querySelectorAll('.todo-item'))
        .map(el => byId[el.dataset.id]).filter(Boolean);
      todos.forEach((t, i) => { t.order = i; });
      saveTodos();
      renderTodoList();
    }

    /* ---------- 新建 / 编辑弹窗 ---------- */
    const TODO_COLORS = ['tomato', 'leaf', 'amber', 'blue', 'purple', 'ink'];
    let selectedTodoColor = 'tomato'; // 新建时记忆上次选择的颜色

    function buildTodoColors() {
      todoColors.innerHTML = '';
      TODO_COLORS.forEach(id => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'todo-color-btn color-' + id;
        b.dataset.color = id;
        b.title = id;
        b.addEventListener('click', () => setTodoColor(id));
        todoColors.appendChild(b);
      });
    }
    function setTodoColor(id) {
      selectedTodoColor = id;
      Array.from(todoColors.querySelectorAll('.todo-color-btn')).forEach(b => {
        b.classList.toggle('on', b.dataset.color === id);
      });
    }
    function getSelectedTodoColor() {
      const on = todoColors.querySelector('.todo-color-btn.on');
      return on ? on.dataset.color : selectedTodoColor;
    }

    function openTodoModal(id) {
      editingTodoId = id || null;
      const todo = id ? todos.find(t => t.id === id) : null;
      todoModalTitle.innerText = todo ? t('todo.editTitle') : t('todo.newTitle');
      todoTextInput.value = todo ? todo.text : '';
      setTodoColor(todo ? (todo.color || 'tomato') : selectedTodoColor);
      todoModal.classList.add('active');
      todoTextInput.focus();
    }

    function saveTodoForm() {
      const text = todoTextInput.value.trim();
      if (!text) { showAlert(t('todo.alertText')); return; }
      const color = getSelectedTodoColor();
      if (editingTodoId) {
        const t = todos.find(x => x.id === editingTodoId);
        if (t) { t.text = text; t.color = color; }
      } else {
        todos.push({ id: makeTodoId(), text, done: false, color, createdAt: Date.now() });
      }
      saveTodos();
      todoModal.classList.remove('active');
      renderTodoList();
    }

    btnAddTodo.addEventListener('click', () => openTodoModal(null));
    btnSaveTodo.addEventListener('click', saveTodoForm);
    btnCancelTodo.addEventListener('click', () => todoModal.classList.remove('active'));

    /* ---------- 操作弹窗：编辑 / 删除 / 取消 ---------- */
    function openTodoAction(id) {
      const todo = todos.find(t => t.id === id);
      if (!todo) return;
      actionTodoId = id;
      todoActionText.innerText = todo.text;
      todoActionModal.classList.add('active');
    }
    btnTodoEdit.addEventListener('click', () => {
      todoActionModal.classList.remove('active');
      openTodoModal(actionTodoId);
    });
    btnTodoDelete.addEventListener('click', () => {
      todoActionModal.classList.remove('active');
      showConfirm(t('todo.deleteConfirm'), () => {
        todos = todos.filter(t => t.id !== actionTodoId);
        saveTodos();
        renderTodoList();
      });
    });
    btnTodoActionCancel.addEventListener('click', () => todoActionModal.classList.remove('active'));

    buildTodoColors();
