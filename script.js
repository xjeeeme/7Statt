"use strict";

// --- HELPERS ---
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => [...ctx.querySelectorAll(sel)];

const saveJSON = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const loadJSON = (key, def=null) => {
  const raw = localStorage.getItem(key);
  if(!raw) return def;
  try {
    return JSON.parse(raw);
  } catch {
    return def;
  }
};

const formatDate = d => d.toLocaleDateString('ru-RU', {year:'numeric', month:'2-digit', day:'2-digit'});

const todayStr = () => {
  const d = new Date();
  return d.toISOString().slice(0,10);
};

// --- STATE ---
let weights = loadJSON('weights', []); 
// weights: [{date: "2025-06-05", weight: 70.5}]
let foods = loadJSON('foods', {}); 
// foods: { "2025-06-05": [{name:"Банан", calories: 80}, ...] }
let goalWeight = loadJSON('goalWeight', null);

let currentPeriod = 'day';

// --- DOM ---
const tabs = $$('.tab-btn');
const tabSections = $$('.tab');

const todayWeightInput = $('#today-weight');
const saveWeightBtn = $('#save-weight-btn');
const foodNameInput = $('#food-name');
const foodCaloriesInput = $('#food-calories');
const addFoodBtn = $('#add-food-btn');
const foodList = $('#food-list');
const foodSummary = $('#food-summary');

const statsTableBody = $('#stats-table tbody');

const goalWeightInput = $('#goal-weight');
const saveGoalBtn = $('#save-goal-btn');
const weightLeftDiv = $('#weight-left');

const themeToggleBtn = $('#theme-toggle');

const currentDateDiv = $('#current-date');

const timeDiv = $('#time');
const weatherDiv = $('#weather');

const foodInputContainer = $('#food-input-container');

// --- TABS ---
tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    tabSections.forEach(s => s.classList.remove('active'));

    btn.classList.add('active');
    $(`#${btn.dataset.tab}`).classList.add('active');

    if(btn.dataset.tab === 'home') {
      foodInputContainer.classList.remove('hidden');
    } else {
      foodInputContainer.classList.add('hidden');
    }
    if(btn.dataset.tab === 'weight') {
      updateChart();
    }
  });
});

// --- THEME ---
function setTheme(dark) {
  if(dark) {
    document.body.classList.add('dark');
    themeToggleBtn.textContent = '☀️';
    localStorage.setItem('darkTheme', '1');
  } else {
    document.body.classList.remove('dark');
    themeToggleBtn.textContent = '🌙';
    localStorage.removeItem('darkTheme');
  }
}
themeToggleBtn.addEventListener('click', () => {
  setTheme(!document.body.classList.contains('dark'));
});
if(localStorage.getItem('darkTheme') === '1') {
  setTheme(true);
}

// --- WEIGHT INPUT ---
function saveTodayWeight() {
  const val = parseFloat(todayWeightInput.value);
  if(isNaN(val) || val < 20 || val > 300) {
    alert('Введи реальный вес (20-300 кг)');
    return;
  }
  const date = todayStr();
  const idx = weights.findIndex(w => w.date === date);
  if(idx >= 0) {
    weights[idx].weight = val;
  } else {
    weights.push({date, weight: val});
  }
  weights.sort((a,b) => a.date.localeCompare(b.date));
  saveJSON('weights', weights);
  alert('Вес сохранён!');
  renderStatsTable();
  updateWeightLeft();
  updateChart();
}
saveWeightBtn.addEventListener('click', saveTodayWeight);

// --- FOOD INPUT ---
function addFood() {
  const name = foodNameInput.value.trim();
  const cal = parseInt(foodCaloriesInput.value);
  if(!name) {
    alert('Введите название продукта');
    return;
  }
  if(isNaN(cal) || cal < 0) {
    alert('Введите корректное число калорий');
    return;
  }
  const date = todayStr();
  if(!foods[date]) foods[date] = [];
  foods[date].push({name, calories: cal});
  saveJSON('foods', foods);
  foodNameInput.value = '';
  foodCaloriesInput.value = '';
  renderFoodList();
  renderStatsTable();
}
addFoodBtn.addEventListener('click', addFood);

// --- RENDER FOOD LIST ---
function renderFoodList() {
  const date = todayStr();
  const arr = foods[date] || [];
  foodList.innerHTML = '';
  if(arr.length === 0) {
    foodList.innerHTML = '<li style="opacity:0.6;">Список пуст</li>';
    foodSummary.textContent = 'Сумма калорий: 0';
    return;
  }
  let sum = 0;
  arr.forEach((item, i) => {
    sum += item.calories;
    const li = document.createElement('li');
    li.textContent = `${item.name} — ${item.calories} ккал`;
    const delBtn = document.createElement('button');
    delBtn.textContent = '×';
    delBtn.title = 'Удалить';
    delBtn.addEventListener('click', () => {
      arr.splice(i,1);
      if(arr.length === 0) delete foods[date];
      saveJSON('foods', foods);
      renderFoodList();
      renderStatsTable();
    });
    li.appendChild(delBtn);
    foodList.appendChild(li);
  });
  foodSummary.textContent = `Сумма калорий: ${sum}`;
}

// --- STATS TABLE ---
function renderStatsTable() {
  // Соберём все даты с весом или едой
  const datesSet = new Set();
  weights.forEach(w => datesSet.add(w.date));
  Object.keys(foods).forEach(d => datesSet.add(d));
  const dates = [...datesSet].sort((a,b) => b.localeCompare(a)); // по убыванию

  statsTableBody.innerHTML = '';
  dates.forEach(d => {
    const tr = document.createElement('tr');
    const tdDate = document.createElement('td');
    tdDate.textContent = d.split('-').reverse().join('.');
    const tdWeight = document.createElement('td');
    const w = weights.find(w => w.date === d);
    tdWeight.textContent = w ? w.weight.toFixed(1) : '—';
    const tdCal = document.createElement('td');
    const calSum = (foods[d]||[]).reduce((a,c) => a+c.calories, 0);
    tdCal.textContent = calSum || '—';
    tr.append(tdDate, tdWeight, tdCal);
    statsTableBody.appendChild(tr);
  });
}

// --- GOAL ---
saveGoalBtn.addEventListener('click', () => {
  const val = parseFloat(goalWeightInput.value);
  if(isNaN(val) || val < 20 || val > 300) {
    alert('Введи реальный вес (20-300 кг)');
    return;
  }
  goalWeight = val;
  saveJSON('goalWeight', goalWeight);
  updateWeightLeft();
  alert('Цель сохранена!');
});

function updateWeightLeft() {
  if(!goalWeight) {
    weightLeftDiv.textContent = 'Цель не установлена';
    return;
  }
  const today = todayStr();
  const w = weights.find(w => w.date === today);
  if(!w) {
    weightLeftDiv.textContent = 'Нет данных за сегодня';
    return;
  }
  const diff = w.weight - goalWeight;
  if(diff > 0) {
    weightLeftDiv.textContent = `До цели осталось сбросить ${diff.toFixed(1)} кг`;
  } else if(diff < 0) {
    weightLeftDiv.textContent = `Вы уже достигли цели, перевес ${Math.abs(diff).toFixed(1)} кг`;
  } else {
    weightLeftDiv.textContent = `Вы достигли цели!`;
  }
}

// --- CHART ---
const ctx = document.getElementById('weight-chart').getContext('2d');
let chart = null;

function updateChart() {
  if(chart) {
    chart.destroy();
  }
  // Отфильтруем данные в зависимости от currentPeriod
  let filteredWeights = [...weights];
  if(currentPeriod === 'week') {
    // взять последние 7 дней
    const lastDate = new Date(todayStr());
    const cutoff = new Date(lastDate);
    cutoff.setDate(cutoff.getDate() - 6);
    filteredWeights = filteredWeights.filter(w => {
      const d = new Date(w.date);
      return d >= cutoff && d <= lastDate;
    });
  } else if(currentPeriod === 'month') {
    const lastDate = new Date(todayStr());
    const cutoff = new Date(lastDate);
    cutoff.setMonth(cutoff.getMonth() - 1);
    filteredWeights = filteredWeights.filter(w => {
      const d = new Date(w.date);
      return d >= cutoff && d <= lastDate;
    });
  }
  filteredWeights.sort((a,b) => a.date.localeCompare(b.date));

  const labels = filteredWeights.map(w => w.date.split('-').reverse().join('.'));
  const data = filteredWeights.map(w => w.weight);

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Вес (кг)',
        data,
        fill: false,
        borderColor: '#0071e3',
        backgroundColor: '#0071e3',
        tension: 0.2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: document.body.classList.contains('dark') ? '#eee' : '#111'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            color: document.body.classList.contains('dark') ? '#eee' : '#111'
          }
        },
        x: {
          ticks: {
            color: document.body.classList.contains('dark') ? '#eee' : '#111'
          }
        }
      }
    }
  });
}

const periodBtns = $$('.period-btn');
periodBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    periodBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    updateChart();
  });
});

// --- TIME AND WEATHER ---
function updateTimeAndWeather() {
  const now = new Date();
  timeDiv.textContent = now.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'});
  
  // Погода для Катовице, PL (сайт wttr.in)
  fetch('https://wttr.in/Katowice?format=%t,%c')
    .then(res => res.text())
    .then(txt => {
      // txt формат: +22°C,☀️
      weatherDiv.textContent = txt;
    })
    .catch(() => {
      weatherDiv.textContent = 'Погода недоступна';
    });
}
setInterval(updateTimeAndWeather, 60000);
updateTimeAndWeather();

// --- INIT ---
renderFoodList();
renderStatsTable();
updateWeightLeft();
updateChart();

currentDateDiv.textContent = formatDate(new Date());
