// 📊 URL Google Sheets API - THAY BẰNG URL CỦA BẠN
const SHEET_URL = 'ttps://script.google.com/macros/s/AKfycbwahWIWlY04K9T9yt8REKadzytvZ3hH0V9UytzToO2GTYksmn5MtSUEFuE7YVsaNvgP/exec';

document.addEventListener('DOMContentLoaded', initializeReport);

// Khởi tạo report
async function initializeReport() {
  showLoadingState();
  try {
    // ✅ ĐÃ FIX: Thêm ?action=getAllData và mode: 'no-cors'
    const response = await fetch(`${SHEET_URL}?action=getAllData`, {
      method: 'GET',
      mode: 'no-cors',  // <- QUAN TRỌNG: Tránh lỗi CORS
      headers: {
        'Accept': 'application/json'
      }
    });
    
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

// Tính toán thống kê
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

// Cập nhật thống kê tổng quan
function updateSummaryStats(stats) {
  document.getElementById('summary-total').textContent = stats.total;
  document.getElementById('summary-knowledge').textContent = stats.knowledgeScore + '%';
  document.getElementById('summary-behavior').textContent = stats.behaviorScore + '%';
  document.getElementById('summary-participation').textContent = Math.min(100, Math.round(stats.total * 2.5)) + '%';
  
  updateExecutiveSummary(stats);
}

// BỔ SUNG: Hàm cập nhật tóm tắt (bị thiếu trong code cũ)
function updateExecutiveSummary(stats) {
  const summaryElement = document.getElementById('executive-summary');
  
  if (stats.total === 0) {
    summaryElement.textContent = 'Chưa có dữ liệu khảo sát nào được thu thập.';
    return;
  }
  
  let summary = `Dựa trên ${stats.total} khảo sát, kết quả cho thấy: `;
  
  // Knowledge assessment
  if (stats.knowledgeScore >= 70) {
    summary += `Người tham gia có mức độ hiểu biết tốt về rác thải nhựa (${stats.knowledgeScore}%). `;
  } else if (stats.knowledgeScore >= 50) {
    summary += `Mức độ hiểu biết về rác thải nhựa ở mức trung bình (${stats.knowledgeScore}%), cần cải thiện. `;
  } else {
    summary += `Mức độ hiểu biết về rác thải nhựa còn hạn chế (${stats.knowledgeScore}%), cần tìm hiểu nhiều hơn. `;
  }
  
  // Behavior assessment
  if (stats.behaviorScore >= 70) {
    summary += `Hành vi thân thiện với môi trường được thực hiện tốt (${stats.behaviorScore}%). `;
  } else if (stats.behaviorScore >= 50) {
    summary += `Hành vi có xu hướng tích cực nhưng vẫn cần cải thiện (${stats.behaviorScore}%). `;
  } else {
    summary += `Hành vi còn nhiều hạn chế và cần thay đổi (${stats.behaviorScore}%).`;
  }
  
  summaryElement.textContent = summary;
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

// Tạo biểu đồ kiến thức
function createKnowledgeCharts(surveys) {
  const q1Score = Math.round((surveys.filter(s => s.q1 === 'a').length / surveys.length) * 100);
  const q2Score = Math.round((surveys.filter(s => s.q2 === 'c').length / surveys.length) * 100);
  const q3Score = Math.round((surveys.filter(s => s.q3 && Array.isArray(s.q3) && s.q3.includes('d')).length / surveys.length) * 100);
  
  document.getElementById('q1-score').textContent = q1Score + '%';
  document.getElementById('q2-score').textContent = q2Score + '%';
  document.getElementById('q3-score').textContent = q3Score + '%';
}

// Tạo biểu đồ hành vi
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
  const knowledgeComment = document.getElementById('knowledge-comment');
  const behaviorComment = document.getElementById('behavior-comment');
  
  knowledgeComment.textContent = stats.knowledgeScore >= 70 ? 'Kiến thức tốt về rác thải nhựa' :
                                  stats.knowledgeScore >= 50 ? 'Kiến thức cơ bản cần cải thiện' :
                                  'Kiến thức còn hạn chế, cần tìm hiểu thêm';
  
  behaviorComment.textContent = stats.behaviorScore >= 70 ? 'Hành vi thân thiện môi trường tốt' :
                                  stats.behaviorScore >= 50 ? 'Có một số hành vi tích cực' :
                                  'Cần thay đổi thói quen sử dụng nhựa';
}

// Cập nhật khuyến nghị
function updateRecommendations(surveys, stats) {
  const educationRecs = document.getElementById('education-recommendations');
  const policyRecs = document.getElementById('policy-recommendations');
  
  const eduItems = [];
  if (stats.knowledgeScore < 70) {
    eduItems.push('Tổ chức hội thảo về tác hại rác thải nhựa');
    eduItems.push('Phát triển tài liệu giáo dục trực quan');
  }
  if (stats.behaviorScore < 70) {
    eduItems.push('Tuyên truyền sản phẩm thay thế nhựa');
    eduItems.push('Hướng dẫn phân loại rác tại nhà');
  }
  
  educationRecs.innerHTML = eduItems.map(item => `
    <li class="flex items-start">
      <i class="fas fa-check text-green-600 mr-2 mt-1"></i>
      <span>${item}</span>
    </li>
  `).join('');
  
  const policyItems = [];
  policyRecs.innerHTML = policyItems.map(item => `
    <li class="flex items-start">
      <i class="fas fa-check text-green-600 mr-2 mt-1"></i>
      <span>${item}</span>
    </li>
  `).join('');
}

// Điền bảng dữ liệu
function populateDataTable(surveys) {
  const tableBody = document.getElementById('survey-data-table');
  
  if (!surveys || surveys.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>';
    return;
  }
  
  const rows = surveys.slice(0, 50).map((survey, index) => {
    let knowledgePoints = 0;
    if (survey.q1 === 'a') knowledgePoints++;
    if (survey.q2 === 'c') knowledgePoints++;
    if (survey.q3 && Array.isArray(survey.q3) && survey.q3.includes('d')) knowledgePoints++;
    
    let behaviorPoints = 0;
    if (survey.q7 === 'rarely') behaviorPoints += 2; else if (survey.q7 === 'monthly') behaviorPoints++;
    if (survey.q8 === 'always') behaviorPoints += 2; else if (survey.q8 === 'sometimes') behaviorPoints++;
    
    const knowledgeScore = Math.round((knowledgePoints / 3) * 100);
    const behaviorScore = Math.round((behaviorPoints / 4) * 100);
    
    const timestamp = new Date(survey.timestamp).toLocaleString('vi-VN');
    
    return `
      <tr class="border-b hover:bg-gray-50">
        <td class="p-3 font-mono text-sm">${survey.id.substring(0, 8)}</td>
        <td class="p-3">${getAgeLabel(survey.age)}</td>
        <td class="p-3">${getOccupationLabel(survey.occupation)}</td>
        <td class="p-3">
          <span class="px-2 py-1 rounded text-xs ${knowledgeScore >= 70 ? 'bg-green-100 text-green-800' : knowledgeScore >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
            ${knowledgeScore}%
          </span>
        </td>
        <td class="p-3">
          <span class="px-2 py-1 rounded text-xs ${behaviorScore >= 70 ? 'bg-green-100 text-green-800' : behaviorScore >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
            ${behaviorScore}%
          </span>
        </td>
        <td class="p-3 text-xs text-gray-500">${timestamp}</td>
      </tr>
    `;
  }).join('');
  
  tableBody.innerHTML = rows;
}

// Hiệu ứng animation
function initializeAnimations() {
  anime({
    targets: '.section-card',
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 800,
    delay: anime.stagger(200),
    easing: 'easeOutExpo'
  });
}

// Trạng thái loading
function showLoadingState() {
  document.getElementById('summary-total').textContent = '...';
  document.getElementById('summary-knowledge').textContent = '...';
  document.getElementById('summary-behavior').textContent = '...';
  document.getElementById('summary-participation').textContent = '...';
  document.getElementById('executive-summary').textContent = 'Đang tải dữ liệu...';
}

function hideLoadingState() {
  // Dữ liệu sẽ được cập nhật bởi các hàm khác
}

// Thông báo
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 'bg-yellow-500'
  } text-white`;
  notification.textContent = message;
  document.body.appendChild(notification);
  anime({ targets: notification, opacity: [0, 1], translateX: [100, 0], duration: 500 });
  setTimeout(() => {
    anime({ targets: notification, opacity: [1, 0], translateX: [0, 100], duration: 500, complete: () => document.body.removeChild(notification) });
  }, 3000);
}

// Utils
function getAgeLabel(key) {
  const labels = { '18-24': '18-24 tuổi', '25-34': '25-34 tuổi', '35-44': '35-44 tuổi', '45-54': '45-54 tuổi', '55+': '55 tuổi trở lên' };
  return labels[key] || key;
}

function getOccupationLabel(key) {
  const labels = { 'student': 'Học sinh/SV', 'employee': 'Nhân viên', 'business': 'Kinh doanh', 'freelance': 'Tự do', 'other': 'Khác' };
  return labels[key] || key;
}
