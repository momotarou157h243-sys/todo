const taskInput = document.getElementById("taskInput");
const startInput = document.getElementById("startInput");
const dueInput = document.getElementById("dueInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const countLabel = document.getElementById("count");
const clearDoneBtn = document.getElementById("clearDone");
const filterButtons = document.querySelectorAll(".filter");
const viewButtons = document.querySelectorAll(".view-btn");
const listView = document.getElementById("listView");
const calendarView = document.getElementById("calendarView");
const listSelect = document.getElementById("listSelect");
const newListBtn = document.getElementById("newListBtn");
const renameListBtn = document.getElementById("renameListBtn");
const deleteListBtn = document.getElementById("deleteListBtn");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");
const themeFab = document.getElementById("themeFab");
const themeOverlay = document.getElementById("themeOverlay");
const themePopup = document.getElementById("themePopup");
const themeButtons = document.querySelectorAll(".theme-option");

// ===== テーマ（配色）切り替え =====
const THEME_KEY = "todoTheme";

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  themeButtons.forEach((b) => {
    b.classList.toggle("active", b.dataset.themeBtn === theme);
  });
}

function openThemePopup() {
  themeOverlay.classList.remove("hidden");
}

function closeThemePopup() {
  themeOverlay.classList.add("hidden");
}

// 起動時：保存されたテーマを復元（なければデフォルト）
applyTheme(localStorage.getItem(THEME_KEY) || "default");

const STORAGE_KEY = "todoData";

// データ構造: { lists: { "リスト名": [タスク...] }, current: "リスト名" }
function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { /* 壊れていたら作り直す */ }
  }
  // 旧バージョン（単一リスト）のデータがあれば引き継ぐ
  const old = localStorage.getItem("tasks");
  if (old) {
    try {
      return { lists: { "マイリスト": JSON.parse(old) }, current: "マイリスト" };
    } catch (e) { /* ignore */ }
  }
  return { lists: { "マイリスト": [] }, current: "マイリスト" };
}

let data = loadData();
let tasks = data.lists[data.current];   // 現在表示中リストのタスク配列
let currentFilter = "all";
let currentView = "list";
let calDate = new Date(); // カレンダーで表示中の月

function save() {
  data.lists[data.current] = tasks;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ===== リスト管理（A） =====
function renderListSelect() {
  listSelect.innerHTML = "";
  Object.keys(data.lists).forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name + "（" + data.lists[name].length + "件）";
    if (name === data.current) opt.selected = true;
    listSelect.appendChild(opt);
  });
}

function switchList(name) {
  if (!data.lists[name]) return;
  data.current = name;
  tasks = data.lists[name];
  save();
  renderListSelect();
  refresh();
}

function createList() {
  const name = prompt("新しいリストの名前を入力してください", "");
  if (name === null) return;
  const trimmed = name.trim();
  if (trimmed === "") { alert("名前を入力してください。"); return; }
  if (data.lists[trimmed]) { alert("同じ名前のリストがすでにあります。"); return; }
  data.lists[trimmed] = [];
  switchList(trimmed);
}

function renameList() {
  const oldName = data.current;
  const name = prompt("リスト名を変更します", oldName);
  if (name === null) return;
  const trimmed = name.trim();
  if (trimmed === "" || trimmed === oldName) return;
  if (data.lists[trimmed]) { alert("同じ名前のリストがすでにあります。"); return; }
  // 順序を保ったまま名前を付け替える
  const newLists = {};
  Object.keys(data.lists).forEach((key) => {
    newLists[key === oldName ? trimmed : key] = data.lists[key];
  });
  data.lists = newLists;
  data.current = trimmed;
  save();
  renderListSelect();
}

function deleteList() {
  const name = data.current;
  const names = Object.keys(data.lists);
  if (names.length <= 1) {
    if (!confirm("「" + name + "」の中のタスクをすべて削除して空にします。よろしいですか？")) return;
    data.lists[name] = [];
    tasks = data.lists[name];
    save();
    renderListSelect();
    refresh();
    return;
  }
  if (!confirm("リスト「" + name + "」を削除します。よろしいですか？")) return;
  delete data.lists[name];
  const next = Object.keys(data.lists)[0];
  switchList(next);
}

// ===== ファイルへの保存・読み込み（B） =====
function exportFile() {
  const payload = { name: data.current, tasks: tasks };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = data.current + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

function importFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      let name, importedTasks;
      if (Array.isArray(parsed)) {
        // タスク配列だけのファイル
        name = file.name.replace(/\.json$/i, "");
        importedTasks = parsed;
      } else if (parsed && Array.isArray(parsed.tasks)) {
        name = (parsed.name || file.name.replace(/\.json$/i, "")).trim();
        importedTasks = parsed.tasks;
      } else {
        alert("このファイルはタスクデータとして読み込めませんでした。");
        return;
      }
      // 同名がある場合は別名にする
      let finalName = name || "読み込んだリスト";
      let i = 2;
      while (data.lists[finalName]) {
        finalName = name + " (" + i + ")";
        i++;
      }
      data.lists[finalName] = importedTasks;
      switchList(finalName);
      alert("「" + finalName + "」として読み込みました（" + importedTasks.length + "件）。");
    } catch (e) {
      alert("ファイルの読み込みに失敗しました。JSON形式のファイルを選んでください。");
    }
  };
  reader.readAsText(file);
}

// 日時を「6/3 14:30」のような形に整形
function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${m}/${day} ${h}:${min}`;
}

// ===== リスト表示 =====
function render() {
  taskList.innerHTML = "";

  const visible = tasks.filter((t) => {
    if (currentFilter === "active") return !t.done;
    if (currentFilter === "done") return t.done;
    return true;
  });

  if (visible.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "タスクはありません 🎉";
    taskList.appendChild(empty);
  }

  visible.forEach((task) => {
    const li = document.createElement("li");
    if (task.done) li.classList.add("done");

    const check = document.createElement("div");
    check.className = "check";
    check.textContent = task.done ? "✓" : "";
    check.onclick = () => toggleTask(task.id);

    const body = document.createElement("div");
    body.className = "body";

    const text = document.createElement("div");
    text.className = "text";
    text.textContent = task.text;
    body.appendChild(text);

    if (task.start || task.due) {
      const dates = document.createElement("div");
      dates.className = "dates";

      if (task.start) {
        const s = document.createElement("span");
        s.textContent = "🟢 開始 " + formatDateTime(task.start);
        dates.appendChild(s);
      }
      if (task.due) {
        const d = document.createElement("span");
        const isOverdue = !task.done && new Date(task.due) < new Date();
        if (isOverdue) d.className = "overdue";
        d.textContent = "🔴 期限 " + formatDateTime(task.due) + (isOverdue ? " (期限切れ)" : "");
        dates.appendChild(d);
      }
      body.appendChild(dates);
    }

    const del = document.createElement("button");
    del.className = "delete";
    del.textContent = "×";
    del.onclick = () => deleteTask(task.id);

    li.appendChild(check);
    li.appendChild(body);
    li.appendChild(del);
    taskList.appendChild(li);
  });

  const remaining = tasks.filter((t) => !t.done).length;
  countLabel.textContent = remaining + " 件の未完了タスク";
}

// ===== カレンダー表示 =====
function renderCalendar() {
  const grid = document.getElementById("calGrid");
  const title = document.getElementById("calTitle");
  grid.innerHTML = "";

  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  title.textContent = `${year}年 ${month + 1}月`;

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  weekdays.forEach((w, i) => {
    const wd = document.createElement("div");
    wd.className = "cal-weekday";
    if (i === 0) wd.classList.add("sun");
    if (i === 6) wd.classList.add("sat");
    wd.textContent = w;
    grid.appendChild(wd);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 月初までの空白セル
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-cell empty-cell";
    grid.appendChild(empty);
  }

  const today = new Date();

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "cal-cell";

    if (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    ) {
      cell.classList.add("today");
    }

    const dateLabel = document.createElement("div");
    dateLabel.className = "cal-date";
    dateLabel.textContent = day;
    cell.appendChild(dateLabel);

    // この日が開始日 or 期限日のタスクを表示
    const dayTasks = tasks.filter((t) => {
      const ref = t.start || t.due;
      if (!ref) return false;
      const d = new Date(ref);
      return (
        d.getFullYear() === year &&
        d.getMonth() === month &&
        d.getDate() === day
      );
    });

    dayTasks.forEach((t) => {
      const chip = document.createElement("div");
      chip.className = "cal-task" + (t.done ? " done" : "");
      chip.textContent = t.text;
      chip.title = t.text;
      cell.appendChild(chip);
    });

    grid.appendChild(cell);
  }
}

// ===== 操作 =====
function addTask() {
  const text = taskInput.value.trim();
  if (text === "") return;
  tasks.push({
    id: Date.now(),
    text: text,
    done: false,
    start: startInput.value || "",
    due: dueInput.value || "",
  });
  taskInput.value = "";
  startInput.value = "";
  dueInput.value = "";
  save();
  refresh();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.done = !task.done;
  save();
  refresh();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  save();
  refresh();
}

function refresh() {
  renderListSelect();
  if (currentView === "list") render();
  else renderCalendar();
}

// ===== イベント設定 =====
addBtn.onclick = addTask;
taskInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addTask();
});

clearDoneBtn.onclick = () => {
  tasks = tasks.filter((t) => !t.done);
  save();
  refresh();
};

filterButtons.forEach((btn) => {
  btn.onclick = () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  };
});

viewButtons.forEach((btn) => {
  btn.onclick = () => {
    viewButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentView = btn.dataset.view;
    if (currentView === "list") {
      listView.classList.remove("hidden");
      calendarView.classList.add("hidden");
    } else {
      listView.classList.add("hidden");
      calendarView.classList.remove("hidden");
    }
    refresh();
  };
});

document.getElementById("prevMonth").onclick = () => {
  calDate.setMonth(calDate.getMonth() - 1);
  renderCalendar();
};
document.getElementById("nextMonth").onclick = () => {
  calDate.setMonth(calDate.getMonth() + 1);
  renderCalendar();
};

// リスト管理（A）
listSelect.onchange = () => switchList(listSelect.value);
newListBtn.onclick = createList;
renameListBtn.onclick = renameList;
deleteListBtn.onclick = deleteList;

// テーマ切り替え（アイコン → ポップアップ）
themeFab.onclick = openThemePopup;

// 各テーマを選ぶと、適用してポップアップを閉じる
themeButtons.forEach((btn) => {
  btn.onclick = () => {
    applyTheme(btn.dataset.themeBtn);
    closeThemePopup();
  };
});

// オーバーレイ（ポップアップの外側）をクリックしたら閉じる
themeOverlay.onclick = (e) => {
  if (e.target === themeOverlay) closeThemePopup();
};

// Escキーでも閉じられるように
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeThemePopup();
});

// ファイル保存・読み込み（B）
exportBtn.onclick = exportFile;
importBtn.onclick = () => importInput.click();
importInput.onchange = () => {
  if (importInput.files.length > 0) importFile(importInput.files[0]);
  importInput.value = ""; // 同じファイルを連続で選べるようにリセット
};

renderListSelect();
refresh();

// ===== サービスワーカーの登録（PWA / オフライン対応） =====
// file:// で直接開いたときは動かないため、http(s) で配信されている場合のみ登録する。
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.log("Service Worker の登録に失敗しました:", err);
    });
  });
}
