
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwahWIWlY04K9T9yt8REKadzytvZ3hH0V9UytzToO2GTYksmn5MtSUEFuE7YVsaNvgP/exec';

document.addEventListener('DOMContentLoaded', initializeDashboard);


async function refreshData() {
  await initializeDashboard();
}

async function initializeDashboard() {
  showLoadingState();
  try {
    const surveys = await fetchDataFromGoogleSheets();

    localStorage.setItem('surveys', JSON.stringify(surveys));
    
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

    if(surveys.length > 0) {
      showNotification('Sử dụng dữ liệu local (không có kết nối Google Sheets)', 'warning');
    }
  } finally {
    hideLoadingState();
  }
}


async function fetchDataFromGoogleSheets() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); 
  
  try {
    const response = await fetch(`${SHEET_URL}?action=getAllData`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }
    
    const result = await response.json();
    if (result.status === 'success' && Array.isArray(result.data)) {
      return result.data;
    }
    throw new Error('Invalid data format');
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Timeout: Google Sheets không phản hồi');
    }
    throw error;
  }
}

function getLocalData() {
  try {
    const data = localStorage.getItem('surveys');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}


function calculateStats(surveys) {
  if (!surveys || surveys.length === 0) {
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
    
    // Knowledge score (7 câu)
    let knowledgePoints = 0;
    if (survey.q1 === 'a') knowledgePoints += 1;
    if (survey.q2 === 'c') knowledgePoints += 1;
    if (survey.q3 && Array.isArray(survey.q3) && survey.q3.includes('d')) knowledgePoints += 1;
    if (survey.q9 === 'yes') knowledgePoints += 1;
    if (survey.q10 === 'b') knowledgePoints += 1;
    if (survey.q14 === 'yes') knowledgePoints += 1;
    if (survey.q18 === 'yes') knowledgePoints += 1;
    
    // Behavior score (9 câu, mỗi câu tối đa 2 điểm)
    let behaviorPoints = 0;
    if (survey.q4 === 'rarely' || survey.q4 === 'never') behaviorPoints += 2; 
    else if (survey.q4 === 'monthly') behaviorPoints += 1;
    
    if (survey.q5 === 'always') behaviorPoints += 2; 
    else if (survey.q5 === 'sometimes') behaviorPoints += 1;
    
    if (survey.q6 === 'always') behaviorPoints += 2; 
    else if (survey.q6 === 'sometimes') behaviorPoints += 1;
    
    if (survey.q7 === 'rarely' || survey.q7 === 'never') behaviorPoints += 2; 
    else if (survey.q7 === 'monthly') behaviorPoints += 1;
    
    if (survey.q8 === 'always') behaviorPoints += 2; 
    else if (survey.q8 === 'sometimes') behaviorPoints += 1;
    
    if (survey.q12 === 'rarely' || survey.q12 === 'never') behaviorPoints += 2; 
    else if (survey.q12 === 'monthly') behaviorPoints += 1;
    
    if (survey.q13 === 'avoid') behaviorPoints += 2; 
    else if (survey.q13 === 'sometimes') behaviorPoints += 1;
    
    if (survey.q16 === 'never') behaviorPoints += 2; 
    else if (survey.q16 === 'rarely') behaviorPoints += 1;
    
    if (survey.q17 === 'always') behaviorPoints += 2; 
    else if (survey.q17 === 'sometimes') behaviorPoints += 1;
    
    stats.knowledgeScore += knowledgePoints;
    stats.behaviorScore += behaviorPoints;
  });
  

  const maxKnowledgePoints = stats.total * 7;
  const maxBehaviorPoints = stats.total * 9 * 2; 
  
  stats.knowledgeScore = maxKnowledgePoints > 0 ? Math.round((stats.knowledgeScore / maxKnowledgePoints) * 100) : 0;
  stats.behaviorScore = maxBehaviorPoints > 0 ? Math.round((stats.behaviorScore / maxBehaviorPoints) * 100) : 0;
  
  return stats;
}


function updateStatisticsCards(stats) {
  const totalEl = document.getElementById('total-surveys');
  const knowledgeEl = document.getElementById('knowledge-score');
  const behaviorEl = document.getElementById('behavior-score');
  const participationEl = document.getElementById('participation-rate');
  
  if(totalEl) totalEl.textContent = stats.total;
  if(knowledgeEl) knowledgeEl.textContent = stats.knowledgeScore + '%';
  if(behaviorEl) behaviorEl.textContent = stats.behaviorScore + '%';
  if(participationEl) participationEl.textContent = Math.min(100, Math.round(stats.total * 2.5)) + '%';
}

function createCharts(surveys, stats) {
  if(!surveys || surveys.length === 0) return;
  
  createAgeChart(stats.ageDistribution);
  createOccupationChart(stats.occupationDistribution);
  createKnowledgeChart(surveys);
  createBehaviorChart(surveys);
}


function createAgeChart(ageDistribution) {
  const chartDom = document.getElementById('age-chart');
  if(!chartDom) return;
  
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
  if(!chartDom) return;
  
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
  if(!chartDom) return;
  
  const myChart = echarts.init(chartDom);
  const total = surveys.length || 1; 
  
  const correct = {
    'Kiến thức tổng quát': surveys.filter(s => s.q1 === 'a').length,
    'Kiến thức về thời gian phân hủy': surveys.filter(s => s.q2 === 'c').length,
    'Kiến thức về Tác hại': surveys.filter(s => s.q3 && Array.isArray(s.q3) && s.q3.includes('d')).length,
    'Kiến thức về biểu tượng tái chế': surveys.filter(s => s.q9 === 'yes').length,
    'Kiến thức về nhựa PET tái chế': surveys.filter(s => s.q10 === 'b').length,
    'Kiến thức về nhựa sinh học': surveys.filter(s => s.q14 === 'yes').length,
    'Kiến thức về ký hiệu số trên chai nhựa': surveys.filter(s => s.q18 === 'yes').length
  };
  
  const data = Object.entries(correct).map(([key, value]) => ({
    name: key,
    value: Math.round((value / total) * 100)
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
  if(!chartDom) return;
  
  const myChart = echarts.init(chartDom);
  

  const behavior = {
    'Sử dụng 1 lần': { always: 0, sometimes: 0, rarely: 0, never: 0 }, 
    'Phân loại rác': { always: 0, sometimes: 0, rarely: 0, never: 0 },
    'Mang túi vải': { always: 0, sometimes: 0, rarely: 0, never: 0 }
  };
  

  const valueMap = {
    'daily': 'always',
    'weekly': 'sometimes',
    'monthly': 'rarely',
    'rarely': 'rarely',
    'never': 'never',
    'always': 'always',
    'sometimes': 'sometimes',
    'avoid': 'always', // 
    'often': 'sometimes', // 
    'reduce': 'rarely' // 
  };
  
  surveys.forEach(s => {
    if (s.q4 && valueMap[s.q4]) behavior['Sử dụng 1 lần'][valueMap[s.q4]]++;
    if (s.q5 && valueMap[s.q5]) behavior['Phân loại rác'][valueMap[s.q5]]++;
    if (s.q6 && valueMap[s.q6]) behavior['Mang túi vải'][valueMap[s.q6]]++;
  });
  
  myChart.setOption({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['Sử dụng 1 lần', 'Phân loại rác', 'Mang túi vải'], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
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
  
  if(kInsight) {
    kInsight.textContent = stats.knowledgeScore >= 70 ? 'Kiến thức tốt về rác thải nhựa' :
                            stats.knowledgeScore >= 50 ? 'Kiến thức cơ bản cần cải thiện' :
                            'Cần tìm hiểu thêm về kiến thức cơ bản về rác thải nhựa';
  }
  
  if(bInsight) {
    bInsight.textContent = stats.behaviorScore >= 70 ? 'Hành vi thân thiện môi trường tốt' :
                            stats.behaviorScore >= 50 ? 'Có một số hành vi tích cực' :
                            'Cần thay đổi thói quen sử dụng nhựa';
  }
  
  if(tInsight) {
    tInsight.textContent = stats.total > 20 ? 'Có xu hướng tăng nhận thức' :
                            'Cần thêm dữ liệu để đánh giá xu hướng';
  }
}


function showLoadingState() {
  const btn = document.getElementById('refresh-btn');
  if(btn) {
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang tải...';
    btn.disabled = true;
  }
}

function hideLoadingState() {
  const btn = document.getElementById('refresh-btn');
  if(btn) {
    btn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Làm Mới Dữ Liệu';
    btn.disabled = false;
  }
}


function showNotification(message, type = 'info') {
  const oldNotification = document.querySelector('.notification-toast');
  if(oldNotification) oldNotification.remove();
  
  const notification = document.createElement('div');
  notification.className = `notification-toast fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 text-white max-w-sm`;
  
  const colors = {
    'info': 'bg-blue-500',
    'success': 'bg-green-500',
    'warning': 'bg-yellow-500',
    'error': 'bg-red-500'
  };
  notification.classList.add(colors[type] || colors.info);
  
  notification.innerHTML = `
    <div class="flex items-center">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : type === 'error' ? 'times-circle' : 'info-circle'} mr-3"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  

  if(typeof anime !== 'undefined') {
    anime({ targets: notification, opacity: [0, 1], translateX: [100, 0], duration: 500 });
    setTimeout(() => {
      anime({ targets: notification, opacity: [1, 0], translateX: [0, 100], duration: 500, complete: () => notification.remove() });
    }, 4000);
  } else {

    notification.style.opacity = '1';
    setTimeout(() => notification.remove(), 4000);
  }
}

function getAgeLabel(key) {
  const labels = { '18-24': '18-24 tuổi', '25-34': '25-34 tuổi', '35-44': '35-44 tuổi', '45-54': '45-54 tuổi', '55+': '55 tuổi trở lên', 'under18': 'Dưới 18 tuổi' };
  return labels[key] || key || 'Không xác định';
}

function getOccupationLabel(key) {
  const labels = { 'student': 'Học sinh/SV', 'employee': 'Nhân viên', 'business': 'Kinh doanh', 'freelance': 'Tự do', 'other': 'Khác', 'unemployed': 'Thất nghiệp', 'retired': 'Đã nghỉ hưu' };
  return labels[key] || key || 'Không xác định';
}
