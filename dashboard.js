const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwahWIWlY04K9T9yt8REKadzytvZ3hH0V9UytzToO2GTYksmn5MtSUEFuE7YVsaNvgP/exec';

document.addEventListener('DOMContentLoaded', initializeDashboard);

async function initializeDashboard() {
  showLoadingState();
  try {
    const surveys = await fetchDataFromGoogleSheets();
    const stats = calculateStats(surveys);
    updateStatisticsCards(stats);
    createCharts(surveys, stats);
    updateInsights(stats);
  } catch (error) {
    console.error('❌ Lỗi tải dữ liệu Google Sheets:', error);
    // Fallback to localStorage
    const surveys = getLocalData();
    const stats = calculateStats(surveys);
    updateStatisticsCards(stats);
    createCharts(surveys, stats);
    updateInsights(stats);
    showNotification('Sử dụng dữ liệu local (không có kết nối Google Sheets)', 'warning');
  } finally {
    hideLoadingState();
  }
}

async function fetchDataFromGoogleSheets() {
  const response = await fetch(`${SHEET_URL}?action=getAllData`);
  const result = await response.json();
  if (result.status === 'success') return result.data;
  throw new Error('Failed to fetch data');
}

function getLocalData() {
  return JSON.parse(localStorage.getItem('surveys') || '[]');
}

function calculateStats(surveys) {
  if (surveys.length === 0) {
    return { total: 0, ageDistribution: {}, occupationDistribution: {}, knowledgeScore: 0, behaviorScore: 0 };
  }
  
  const stats = {
    total: surveys.length,
    ageDistribution: {},
    occupationDistribution: {},
    knowledgeScore: 0,
    behaviorScore: 0
  };
  
  surveys.forEach(survey => {
    if (survey.age) stats.ageDistribution[survey.age] = (stats.ageDistribution[survey.age] || 0) + 1;
    if (survey.occupation) stats.occupationDistribution[survey.occupation] = (stats.occupationDistribution[survey.occupation] || 0) + 1;
    
    // Knowledge score (câu 1,2,3,9,10,14,18)
    let knowledgePoints = 0;
    if (survey.q1 === 'a') knowledgePoints += 1;
    if (survey.q2 === 'c') knowledgePoints += 1;
    if (survey.q3 && (Array.isArray(survey.q3) && survey.q3.includes('d'))) knowledgePoints += 1;
    if (survey.q9 === 'yes') knowledgePoints += 1;
    if (survey.q10 === 'b') knowledgePoints += 1;
    if (survey.q14 === 'yes') knowledgePoints += 1;
    if (survey.q18 === 'yes') knowledgePoints += 1;
    
    // Behavior score (câu 4,5,6,7,8,12,13,16,17)
    let behaviorPoints = 0;
    if (survey.q4 === 'rarely') behaviorPoints += 2; else if (survey.q4 === 'monthly') behaviorPoints += 1;
    if (survey.q5 === 'always') behaviorPoints += 2; else if (survey.q5 === 'sometimes') behaviorPoints += 1;
    if (survey.q6 === 'always') behaviorPoints += 2; else if (survey.q6 === 'sometimes') behaviorPoints += 1;
    if (survey.q7 === 'rarely') behaviorPoints += 2; else if (survey.q7 === 'monthly') behaviorPoints += 1;
    if (survey.q8 === 'always') behaviorPoints += 2; else if (survey.q8 === 'sometimes') behaviorPoints += 1;
    if (survey.q12 === 'rarely') behaviorPoints += 2; else if (survey.q12 === 'monthly') behaviorPoints += 1;
    if (survey.q13 === 'avoid') behaviorPoints += 2; else if (survey.q13 === 'sometimes') behaviorPoints += 1;
    if (survey.q16 === 'never') behaviorPoints += 2; else if (survey.q16 === 'rarely') behaviorPoints += 1;
    if (survey.q17 === 'always') behaviorPoints += 2; else if (survey.q17 === 'sometimes') behaviorPoints += 1;
    
    stats.knowledgeScore += knowledgePoints;
    stats.behaviorScore += behaviorPoints;
  });
  
  stats.knowledgeScore = Math.round((stats.knowledgeScore / (surveys.length * 7)) * 100);
  stats.behaviorScore = Math.round((stats.behaviorScore / (surveys.length * 9)) * 100);
  
  return stats;
}

function updateStatisticsCards(stats) {
  document.getElementById('total-surveys').textContent = stats.total;
  document.getElementById('knowledge-score').textContent = stats.knowledgeScore + '%';
  document.getElementById('behavior-score').textContent = stats.behaviorScore + '%';
  document.getElementById('participation-rate').textContent = Math.min(100, Math.round(stats.total * 2.5)) + '%';
}

function createCharts(surveys, stats) {
  createAgeChart(stats.ageDistribution);
  createOccupationChart(stats.occupationDistribution);
  createKnowledgeChart(surveys);
  createBehaviorChart(surveys);
}

function createAgeChart(ageDistribution) {
  const chartDom = document.getElementById('age-chart');
  const myChart = echarts.init(chartDom);
  const data = Object.entries(ageDistribution).map(([key, value]) => ({ name: getAgeLabel(key), value }));
  
  myChart.setOption({
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{ name: 'Độ tuổi', type: 'pie', radius: '70%', data, color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'] }]
  });
  window.addEventListener('resize', () => myChart.resize());
}

function createOccupationChart(occupationDistribution) {
  const chartDom = document.getElementById('occupation-chart');
  const myChart = echarts.init(chartDom);
  const data = Object.entries(occupationDistribution).map(([key, value]) => ({ name: getOccupationLabel(key), value }));
  
  myChart.setOption({
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{ name: 'Nghề nghiệp', type: 'pie', radius: '70%', data, color: ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }]
  });
  window.addEventListener('resize', () => myChart.resize());
}

function createKnowledgeChart(surveys) {
  const chartDom = document.getElementById('knowledge-chart');
  const myChart = echarts.init(chartDom);
  
  const correct = {
    'Định nghĩa': surveys.filter(s => s.q1 === 'a').length,
    'Thời gian phân hủy': surveys.filter(s => s.q2 === 'c').length,
    'Tác hại': surveys.filter(s => s.q3 && Array.isArray(s.q3) && s.q3.includes('d')).length,
    'Biểu tượng tái chế': surveys.filter(s => s.q9 === 'yes').length,
    'PET tái chế': surveys.filter(s => s.q10 === 'b').length,
    'Nhựa sinh học': surveys.filter(s => s.q14 === 'yes').length,
    'Ký hiệu số': surveys.filter(s => s.q18 === 'yes').length
  };
  
  const data = Object.entries(correct).map(([key, value]) => ({
    name: key,
    value: Math.round((value / surveys.length) * 100)
  }));
  
  myChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: data.map(item => item.name) },
    series: [{
      type: 'bar',
      data: data.map(item => item.value),
      itemStyle: { color: '#10b981' },
      label: { show: true, position: 'right', formatter: '{c}%' }
    }]
  });
  window.addEventListener('resize', () => myChart.resize());
}

function createBehaviorChart(surveys) {
  const chartDom = document.getElementById('behavior-chart');
  const myChart = echarts.init(chartDom);
  
  const behavior = {
    'Sử dụng 1 lần': { daily: 0, weekly: 0, monthly: 0, rarely: 0 },
    'Phân loại rác': { always: 0, sometimes: 0, rarely: 0, never: 0 },
    'Mang túi vải': { always: 0, sometimes: 0, rarely: 0, never: 0 }
  };
  
  surveys.forEach(s => { if (s.q4) behavior['Sử dụng 1 lần'][s.q4]++; });
  surveys.forEach(s => { if (s.q5) behavior['Phân loại rác'][s.q5]++; });
  surveys.forEach(s => { if (s.q6) behavior['Mang túi vải'][s.q6]++; });
  
  myChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Sử dụng 1 lần', 'Phân loại rác', 'Mang túi vải'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: ['Luôn', 'Thỉnh thoảng', 'Hiếm khi', 'Không'] },
    yAxis: { type: 'value' },
    series: [
      { name: 'Sử dụng 1 lần', type: 'bar', data: Object.values(behavior['Sử dụng 1 lần']), itemStyle: { color: '#ef4444' } },
      { name: 'Phân loại rác', type: 'bar', data: Object.values(behavior['Phân loại rác']), itemStyle: { color: '#10b981' } },
      { name: 'Mang túi vải', type: 'bar', data: Object.values(behavior['Mang túi vải']), itemStyle: { color: '#3b82f6' } }
    ]
  });
  window.addEventListener('resize', () => myChart.resize());
}

function updateInsights(stats) {
  const kInsight = document.getElementById('knowledge-insight');
  const bInsight = document.getElementById('behavior-insight');
  const tInsight = document.getElementById('trend-insight');
  
  kInsight.textContent = stats.knowledgeScore >= 70 ? 'Kiến thức tốt về rác thải nhựa' :
                          stats.knowledgeScore >= 50 ? 'Kiến thức cơ bản cần cải thiện' :
                          'Bạn cần tìm hiểu thêm về kiến thức cơ bản về rác thải nhựa';
  
  bInsight.textContent = stats.behaviorScore >= 70 ? 'Hành vi thân thiện môi trường tốt' :
                          stats.behaviorScore >= 50 ? 'Có một số hành vi tích cực' :
                          'Cần thay đổi thói quen sử dụng nhựa';
  
  tInsight.textContent = stats.total > 20 ? 'Có xu hướng tăng nhận thức' :
                          'Cần thêm dữ liệu để đánh giá xu hướng';
}

function showLoadingState() {
  document.getElementById('refresh-btn').innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang tải...';
  document.getElementById('refresh-btn').disabled = true;
}

function hideLoadingState() {
  document.getElementById('refresh-btn').innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Làm Mới Dữ Liệu';
  document.getElementById('refresh-btn').disabled = false;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${type === 'warning' ? 'bg-yellow-500' : 'bg-green-500'} text-white`;
  notification.textContent = message;
  document.body.appendChild(notification);
  anime({ targets: notification, opacity: [0, 1], translateX: [100, 0], duration: 500 });
  setTimeout(() => {
    anime({ targets: notification, opacity: [1, 0], translateX: [0, 100], duration: 500, complete: () => document.body.removeChild(notification) });
  }, 3000);
}

function getAgeLabel(key) {
  const labels = { '18-24': '18-24 tuổi', '25-34': '25-34 tuổi', '35-44': '35-44 tuổi', '45-54': '45-54 tuổi', '55+': '55 tuổi trở lên' };
  return labels[key] || key;
}

function getOccupationLabel(key) {
  const labels = { 'student': 'Học sinh/SV', 'employee': 'Nhân viên', 'business': 'Kinh doanh', 'freelance': 'Tự do', 'other': 'Khác' };
  return labels[key] || key;
}
