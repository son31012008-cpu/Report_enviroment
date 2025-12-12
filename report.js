// 📊 URL Google Sheets API
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwahWIWlY04K9T9yt8REKadzytvZ3hH0V9UytzToO2GTYksmn5MtSUEFuE7YVsaNvgP/exec';

document.addEventListener('DOMContentLoaded', initializeReport);

// Khởi tạo report
async function initializeReport() {
  showLoadingState();
  try {
    // ✅ ĐÃ SỬA: Xóa mode: 'no-cors'
    const response = await fetch(`${SHEET_URL}?action=getAllData`);
    
    // ✅ Kiểm tra response trước khi parse
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success' && result.data) {
      const surveys = result.data;
      const stats = calculateStats(surveys);
      
      updateSummaryStats(stats);
      createDemographicsChart(stats.ageDistribution);
      createCorrelationChart(surveys);
      createKnowledgeCharts(surveys);
      createBehaviorCharts(surveys);
      updateComments(surveys, stats);
      updateRecommendations(surveys, stats);
      populateDataTable(surveys);
      
      hideLoadingState();
    } else {
      throw new Error(result.message || 'Dữ liệu rỗng');
    }
  } catch (error) {
    console.error('❌ Lỗi kết nối Google Sheets:', error);
    showNotification('Không thể kết nối Google Sheets. Vui lòng kiểm tra cấu hình API!', 'error');
    hideLoadingState();
  }
  initializeAnimations();
}

// Tính toán thống kê (giữ nguyên)
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
    
    // Knowledge score (7 câu: 1,2,3,4,5,6,18)
    let knowledgePoints = 0;
    if (survey.q1 === 'a') knowledgePoints++;
    if (survey.q2 === 'c') knowledgePoints++;
    if (survey.q3 && Array.isArray(survey.q3) && survey.q3.includes('d')) knowledgePoints++;
    if (survey.q4 === 'yes') knowledgePoints++;
    if (survey.q5 === 'b') knowledgePoints++;
    if (survey.q6 === 'yes') knowledgePoints++;
    if (survey.q18 === 'yes') knowledgePoints++;
    
    // Behavior score (9 câu: 7,8,9,10,11,12,13,14,15)
    let behaviorPoints = 0;
    if (survey.q7 === 'rarely') behaviorPoints += 2; else if (survey.q7 === 'monthly') behaviorPoints++;
    if (survey.q8 === 'always') behaviorPoints += 2; else if (survey.q8 === 'sometimes') behaviorPoints++;
    if (survey.q9 === 'always') behaviorPoints += 2; else if (survey.q9 === 'sometimes') behaviorPoints++;
    if (survey.q10 === 'rarely') behaviorPoints += 2; else if (survey.q10 === 'monthly') behaviorPoints++;
    if (survey.q11 === 'always') behaviorPoints += 2; else if (survey.q11 === 'sometimes') behaviorPoints++;
    if (survey.q12 === 'rarely') behaviorPoints += 2; else if (survey.q12 === 'monthly') behaviorPoints++;
    if (survey.q13 === 'avoid') behaviorPoints += 2; else if (survey.q13 === 'sometimes') behaviorPoints++;
    if (survey.q14 === 'never') behaviorPoints += 2; else if (survey.q14 === 'rarely') behaviorPoints++;
    if (survey.q15 === 'always') behaviorPoints += 2; else if (survey.q15 === 'sometimes') behaviorPoints++;
    
    stats.knowledgeScore += knowledgePoints;
    stats.behaviorScore += behaviorPoints;
  });
  
  stats.knowledgeScore = Math.round((stats.knowledgeScore / (surveys.length * 7)) * 100);
  stats.behaviorScore = Math.round((stats.behaviorScore / (surveys.length * 9)) * 100);
  
  return stats;
}

// Tạo biểu đồ nhân khẩu học
function createDemographicsChart(ageDistribution) {
  const chartDom = document.getElementById('demographics-chart');
  const myChart = echarts.init(chartDom);
  
  const data = Object.entries(ageDistribution || {}).map(([key, value]) => ({
    name: getAgeLabel(key),
    value: value
  }));
  
  myChart.setOption({
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
      name: 'Phân bố độ tuổi',
      type: 'pie',
      radius: '70%',
      data: data,
      color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
    }]
  });
  
  window.addEventListener('resize', () => myChart.resize());
}

// Tạo biểu đồ tương quan
function createCorrelationChart(surveys) {
  const chartDom = document.getElementById('correlation-chart');
  const myChart = echarts.init(chartDom);
  
  const data = surveys.map(survey => {
    let knowledgePoints = 0;
    if (survey.q1 === 'a') knowledgePoints++;
    if (survey.q2 === 'c') knowledgePoints++;
    if (survey.q3 && Array.isArray(survey.q3) && survey.q3.includes('d')) knowledgePoints++;
    
    let behaviorPoints = 0;
    if (survey.q7 === 'rarely') behaviorPoints += 2; else if (survey.q7 === 'monthly') behaviorPoints++;
    if (survey.q8 === 'always') behaviorPoints += 2; else if (survey.q8 === 'sometimes') behaviorPoints++;
    
    return [
      (knowledgePoints / 3) * 100,
      (behaviorPoints / 4) * 100
    ];
  });
  
  myChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: params => `Kiến thức: ${params.data[0].toFixed(1)}%<br/>Hành vi: ${params.data[1].toFixed(1)}%`
    },
    grid: { left: '10%', right: '10%', bottom: '10%', top: '10%' },
    xAxis: { type: 'value', name: 'Điểm kiến thức (%)', min: 0, max: 100 },
    yAxis: { type: 'value', name: 'Điểm hành vi (%)', min: 0, max: 100 },
    series: [{
      name: 'Tương quan',
      type: 'scatter',
      data: data,
      symbolSize: 8,
      itemStyle: { color: '#3b82f6', opacity: 0.7 }
    }]
  });
  
  window.addEventListener('resize', () => myChart.resize());
}

// Tạo biểu đồ hành vi (2 biểu đồ)
function createBehaviorCharts(surveys) {
  const usageFreq = { daily: 0, weekly: 0, monthly: 0, rarely: 0 };
  const sortingBehavior = { always: 0, sometimes: 0, rarely: 0, never: 0 };
  
  surveys.forEach(s => {
    if (s.q7) usageFreq[s.q7]++;
    if (s.q8) sortingBehavior[s.q8]++;
  });
  
  const usageChart = echarts.init(document.getElementById('usage-frequency-chart'));
  usageChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: '70%',
      data: [
        { value: usageFreq.daily, name: 'Hàng ngày' },
        { value: usageFreq.weekly, name: 'Hàng tuần' },
        { value: usageFreq.monthly, name: 'Hàng tháng' },
        { value: usageFreq.rarely, name: 'Hiếm khi' }
      ],
      color: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6']
    }]
  });
  
  const sortingChart = echarts.init(document.getElementById('sorting-behavior-chart'));
  sortingChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: '70%',
      data: [
        { value: sortingBehavior.always, name: 'Luôn luôn' },
        { value: sortingBehavior.sometimes, name: 'Thỉnh thoảng' },
        { value: sortingBehavior.rarely, name: 'Hiếm khi' },
        { value: sortingBehavior.never, name: 'Không bao giờ' }
      ],
      color: ['#10b981', '#f59e0b', '#ef4444', '#6b7280']
    }]
  });
  
  window.addEventListener('resize', () => {
    usageChart.resize();
    sortingChart.resize();
  });
}

// Cập nhật nhận xét
function updateComments(surveys, stats) {
  document.getElementById('knowledge-comment').textContent = stats.knowledgeScore >= 70 ? 'Kiến thức tốt' :
                                  stats.knowledgeScore >= 50 ? 'Kiến thức cần cải thiện' :
                                  'Kiến thức còn hạn chế';
  
  document.getElementById('behavior-comment').textContent = stats.behaviorScore >= 70 ? 'Hành vi tốt' :
                                  stats.behaviorScore >= 50 ? 'Hành vi cần cải thiện' :
                                  'Hành vi cần thay đổi';
}

// Điền bảng dữ liệu
function populateDataTable(surveys) {
  const tableBody = document.getElementById('survey-data-table');
  
  if (!surveys || surveys.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>';
    return;
  }
  
  // ... (code generate rows giống cũ) ...
  // Để ngắn gọn, bạn có thể copy từ file cũ vào đây
  // hoặc dùng code đầy đủ tôi đã gửi trước đó
}

// Utils
function getAgeLabel(key) { /* ... */ }
function getOccupationLabel(key) { /* ... */ }
function initializeAnimations() { /* ... */ }
function showLoadingState() { /* ... */ }
function hideLoadingState() { /* ... */ }
function showNotification() { /* ... */ }
