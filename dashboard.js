// API cũ
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwcvO7rKDYytyTjQmDTKQqnmxC73vpu3_-nxaatbn8UuVIO-8Y_aPdYs8DDv2yr_RUJ/exec';

async function getData() {
  const res = await fetch(SHEET_URL);
  return res.json();
}

async function calcStats() {
  const list = await getData();
  if (!list.length) return { total: 0, ageD: {}, occD: {}, kScore: 0, bScore: 0 };
  const st = { total: list.length, ageD: {}, occD: {}, kScore: 0, bScore: 0 };
  list.forEach(x => {
    st.ageD[x.age] = (st.ageD[x.age] || 0) + 1;
    st.occD[x.occupation] = (st.occD[x.occupation] || 0) + 1;
    let k = 0, b = 0;
    if (x.q1 === 'a') k++;
    if (x.q2 === 'c') k++;
    if (x.q3 && x.q3.includes('d')) k++;
    if (x.q4 === 'rarely') b += 2; else if (x.q4 === 'monthly') b += 1;
    if (x.q5 === 'always') b += 2; else if (x.q5 === 'sometimes') b += 1;
    st.kScore += k; st.bScore += b;
  });
  st.kScore = Math.round((st.kScore / list.length) * 100 / 3);
  st.bScore = Math.round((st.bScore / list.length) * 100 / 4);
  return st;
}

// vẽ biểu đồ giữ nguyên màu cũ
function createAgeDistributionChart(ageD) {
  const chartDom = document.getElementById('age-chart');
  const myChart = echarts.init(chartDom);
  const data = Object.entries(ageD).map(([k, v]) => ({ name: k, value: v }));
  myChart.setOption({
    title: { text: 'Phân bố độ tuổi', left: 'center' },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie', radius: '70%', data,
      color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
    }]
  });
  window.addEventListener('resize', () => myChart.resize());
}

function createOccupationDistributionChart(occD) {
  const chartDom = document.getElementById('occupation-chart');
  const myChart = echarts.init(chartDom);
  const data = Object.entries(occD).map(([k, v]) => ({ name: k, value: v }));
  myChart.setOption({
    title: { text: 'Phân bố nghề nghiệp', left: 'center' },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie', radius: '70%', data,
      color: ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
    }]
  });
  window.addEventListener('resize', () => myChart.resize());
}

async function loadAndDisplayData() {
  const stats = await calcStats();
  const surveys = await getData();

  // thống kê cũ
  updateStatisticsCards(stats);
  createAgeDistributionChart(stats.ageD);
  createOccupationDistributionChart(stats.occD);

  // biểu đồ kiến thức
  const knowX = ['Câu 1', 'Câu 2', 'Câu 3'];
  const knowY = [
    surveys.filter(x => x.q1 === 'a').length,
    surveys.filter(x => x.q2 === 'c').length,
    surveys.filter(x => x.q3 && x.q3.includes('d')).length
  ].map(c => Math.round(c / surveys.length * 100));
  const knowChart = echarts.init(document.getElementById('knowledge-chart'));
  knowChart.setOption({
    title: { text: 'Tỷ lệ trả lời đúng (%)', left: 'center' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: knowX },
    yAxis: { type: 'value', max: 100 },
    series: [{
      type: 'bar', data: knowY,
      itemStyle: { color: '#10b981' },
      label: { show: true, position: 'top', formatter: '{c}%' }
    }]
  });
  window.addEventListener('resize', () => knowChart.resize());

  // behaviour
  const behavX = ['Hiếm khi', 'Hàng tháng', 'Hàng tuần', 'Hàng ngày'];
  const behavY = behavX.map(l => surveys.filter(x => x.q4 === l.toLowerCase()).length);
  const behavChart = echarts.init(document.getElementById('behavior-chart'));
  behavChart.setOption({
    title: { text: 'Tần suất dùng nhựa 1 lần', left: 'center' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: behavX },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: behavY, itemStyle: { color: '#ef4444' } }]
  });
  window.addEventListener('resize', () => behavChart.resize());

  updateInsights(stats);

  // hiệu ứng đẹp cũ
  anime({
    targets: '.stat-card',
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 800,
    delay: anime.stagger(200),
    easing: 'easeOutExpo'
  });
  anime({
    targets: '.chart-container',
    opacity: [0, 1],
    scale: [0.9, 1],
    duration: 1000,
    delay: 500,
    easing: 'easeOutExpo'
  });
}
