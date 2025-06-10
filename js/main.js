// === Утилиты работы с localStorage ===
function lsGet(key, def) {
  let v = localStorage.getItem(key);
  return v ? JSON.parse(v) : def;
}
function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// === Ежедневный "бэкап" данных ===
function backupDaily() {
  const today = new Date().toISOString().slice(0,10);
  if (localStorage.getItem('ftlastBackup') === today) return;
  const data = {
    groups: lsGet('ftgroups', ),
    exercises: lsGet('ftexercises', []),
    workouts: lsGet('ftworkouts', )
  };
  const backups = lsGet('ftbackups', {});
  backups[today] = data;
  lsSet('ftbackups', backups);
  localStorage.setItem('ftlastBackup', today);
}

// === Основные операции с данными ===
function addGroup(name) {
  const arr = lsGet('ftgroups', );
  arr.push({ id: genId(), name });
  lsSet('ftgroups', arr);
}
function addExercise(groupId, name) {
  const arr = lsGet('ftexercises', );
  arr.push({ id: genId(), groupId, name });
  lsSet('ftexercises', arr);
}
function addWorkout(o) {
  const arr = lsGet('ftworkouts', );
  arr.push(Object.assign({ id: genId() }, o));
  lsSet('ftworkouts', arr);
}
function deleteWorkoutsByDate(d) {
  let arr = lsGet('ftworkouts', );
  arr = arr.filter(w => w.date !== d);
  lsSet('ftworkouts', arr);
}

// === Переменные состояния ===
let state = {
  year: new Date().getFullYear(),
  month: new Date().getMonth()   // 0..11
};

// === Построение календаря ===
function buildCalendar(year, month) {
  const weeks = [];
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay()); // начало первой недели (вс)
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w*7 + d);
      week.push({
        date: day.toISOString().slice(0,10),
        dayNum: day.getDate(),
        inMonth: day.getMonth() === month
      });
    }
    weeks.push(week);
  }
  return weeks;
}

// === Рендер календаря ===
function renderCalendar() {
  // заголовок
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  document.getElementById('monthTitle').textContent =
    `${monthNames[state.month]} ${state.year}`;
  // соберём тренировки по дате
  const wArr = lsGet('ftworkouts', );
  const byDay = {};
  wArr.forEach(w => {
    byDayw.date = byDayw.date || ;
    byDayw.date.push(w);
  });
  // построим тело таблицы
  const cal = buildCalendar(state.year, state.month);
  const tbody = document.getElementById('calendarBody');
  tbody.innerHTML = '';
  cal.forEach(week => {
    const tr = document.createElement('tr');
    week.forEach(day => {
      const td = document.createElement('td');
      if (!day.inMonth) td.classList.add('bg-light','text-muted');
      // номер + кнопка
      const num = document.createElement('div');
num.innerHTML = `<span class="day-number">${day.dayNum}</span>
        <button class="btn btn-sm btn-success btn-add" data-date="${day.date}">+</button>`;
      td.append(num);
      // список тренировок
      const ul = document.createElement('ul');
      ul.className = 'small';
      (byDay[day.date]||[]).forEach(w => {
        const g = lsGet('ft_groups',[]).find(x=>x.id===w.groupId);
        const e = lsGet('ft_exercises',[]).find(x=>x.id===w.exerciseId);
        const li = document.createElement('li');
        li.textContent = `${g?.name||''} – ${e?.name||''} ${w.weight}кг×${w.sets}`;
        ul.append(li);
      });
      td.append(ul);
      // кнопка очистки дня
      if ((byDay[day.date]||[]).length) {
        const form = document.createElement('form');
        form.innerHTML = `<input type="hidden" name="date" value="${day.date}">
          <button class="btn btn-sm btn-danger mt-1">Очистить день</button>`;
        form.onsubmit = ev => {
          ev.preventDefault();
          if (!confirm(`Удалить все записи за ${day.date}?`)) return;
          deleteWorkoutsByDate(day.date);
          renderCalendar();
        };
        td.append(form);
      }
      tr.append(td);
    });
    tbody.append(tr);
  });
  // обновим селекты групп/упр-й
  const groups = lsGet('ft_groups',[]);
  const exercises = lsGet('ft_exercises',[]);
  const exSel = document.getElementById('exGroupSelect');
  const modalG = document.getElementById('modalGroup');
  const modalE = document.getElementById('modalExercise');
  [exSel, modalG].forEach(sel => {
    sel.innerHTML = '';
    groups.forEach(g => {
      const o = document.createElement('option');
      o.value = g.id; o.textContent = g.name;
      sel.append(o);
    });
  });
  // упражнения (с data-group)
  modalE.innerHTML = '';
  exercises.forEach(e => {
    const o = document.createElement('option');
    o.value = e.id; o.textContent = e.name;
    o.dataset.group = e.groupId;
    modalE.append(o);
  });
  filterExercises();
  // назначим кнопки "+"
  document.querySelectorAll('.btn-add').forEach(b => {
    b.onclick = () => {
      document.getElementById('modalDate').value = b.dataset.date;
      let mdl = new bootstrap.Modal(document.getElementById('addModal'));
      mdl.show();
    };
  });
}

// фильтруем упражнения в модалке
function filterExercises() {
  const selG = document.getElementById('modalGroup').value;
  const opts = document.querySelectorAll('#modalExercise option');
  opts.forEach(o => o.hidden = o.dataset.group !== selG);
  // ставим первый видимый
  for (let o of opts) if (!o.hidden) { o.selected = true; break; }
}

// === Рендер статистики ===
function renderStats() {
  const year = state.year;
  document.getElementById('statsYear').textContent = year;
  const wArr = lsGet('ft_workouts', []);
  // месячная статистика
  const monVol = Array(12).fill(0);
  wArr.forEach(w => {
    const d = new Date(w.date);
    if (d.getFullYear() !== year) return;
    monVol[d.getMonth()] += w.weight * w.sets;
  });
  // годовая (последние 5 лет)
  const curY = year;
  const yrs = [];
  const yrVol = [];
  for (let y = curY - 4; y <= curY; y++) {
    yrs.push(y);
    let sum = 0;
    wArr.forEach(w => {
      const d = new Date(w.date);
      if (d.getFullYear() === y) sum += w.weight * w.sets;
    });
    yrVol.push(sum);
  }

  // Chart.js
  const ctxM = document.getElementById('chartMonth').getContext('2d');
  new Chart(ctxM, {
    type: 'bar',
    data: {
      labels: ['Ян','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'],
      datasets: [{ label: 'Объём', data: monVol, backgroundColor: 'rgba(54,162,235,0.5)' }]
    }
  });
  const ctxY = document.getElementById('chartYear').getContext('2d');
  new Chart(ctxY, {
    type: 'line',
    data: {
      labels: yrs,
      datasets: [{ label: 'Годовой объём', data: yrVol, borderColor: 'rgba(255,99,132,0.8)', fill: false }]
    }
  });
}

// === Инициализация и события ===
document.addEventListener('DOMContentLoaded', ()=>{
  backupDaily();

  // навигация между видами
const navCal = document.getElementById('nav-calendar'),
        navSt = document.getElementById('nav-stats'),
        vc = document.getElementById('view-calendar'),
        vs = document.getElementById('view-stats');
  navCal.onclick = e => {
    e.preventDefault();
    vc.classList.remove('d-none'); vs.classList.add('d-none');
    navCal.classList.add('active'); navSt.classList.remove('active');
    renderCalendar();
  };
  navSt.onclick = e => {
    e.preventDefault();
    vc.classList.add('d-none'); vs.classList.remove('d-none');
    navSt.classList.add('active'); navCal.classList.remove('active');
    renderStats();
  };

  // формы добавления групп/упр-й
  document.getElementById('groupForm').onsubmit = e => {
    e.preventDefault();
    const v = e.target.groupName.value.trim();
    if (v) addGroup(v);
    e.target.groupName.value = '';
    renderCalendar();
  };
  document.getElementById('exerciseForm').onsubmit = e => {
    e.preventDefault();
    const g = e.target.groupId.value;
    const v = e.target.exerciseName.value.trim();
    if (v) addExercise(g,v);
    e.target.exerciseName.value = '';
    renderCalendar();
  };

  // изменение группы в модалке
  document.getElementById('modalGroup').onchange = filterExercises;

  // форма добавления тренировки
  document.getElementById('workoutForm').onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    addWorkout({
      date: fd.get('date'),
      groupId: fd.get('groupId'),
      exerciseId: fd.get('exerciseId'),
      weight: +fd.get('weight'),
      sets: +fd.get('sets')
    });
    bootstrap.Modal.getInstance(document.getElementById('addModal')).hide();
    renderCalendar();
  };

  // кнопки переключения месяца
  document.getElementById('prevMonth').onclick = ()=>{
    state.month--;
    if (state.month<0) { state.month=11; state.year--; }
    renderCalendar();
  };
  document.getElementById('nextMonth').onclick = ()=>{
    state.month++;
    if (state.month>11){ state.month=0; state.year++; }
    renderCalendar();
  };

  // первый рендер
  renderCalendar();
});
```
