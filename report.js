// 📊 URL Google Sheets API - ĐÃ BỎ DẤU CÁCH THỪA
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwahWIWlY04K9T9yt8REKadzytvZ3hH0V9UytzToO2GTYksmn5MtSUEFuE7YVsaNvgP/exec';

document.addEventListener('DOMContentLoaded', initializeReport);

// 1️⃣ THÊM: Hàm refreshData để nút làm mới hoạt động
async function refreshData() {
  // Xóa cache để buộc tải mới
  localStorage.removeItem('surveyReportData');
  localStorage.removeItem('lastFetchTime');
  await initializeReport();
}

// Khởi tạo report
async function initializeReport() {
  showLoadingState();
  try {
    // Kiểm tra cache trước
    const cachedData = getCachedData();
    const age = Date.now() - (cachedData.timestamp || 0);
    const maxAge = 5 * 60 * 1000; // 5 phút cache
    
    let surveys;
    if (cachedData.data && age < maxAge) {
      surveys = cachedData.data;
      showNotification('Sử dụng dữ liệu đã cache', 'info');
    } else {
      // ✅ Thêm timeout và kiểm tra response
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(`${SHEET_URL}?action=getAllData`, { 
        signal: controller.signal,
        cache: 'no-store' // Không dùng browser cache
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.status === 'success' && Array.isArray(result.data)) {
        surveys = validateSurveyData(result.data);
        // Lưu cache
        localStorage.setItem('surveyReportData', JSON.stringify(surveys));
        localStorage.setItem('lastFetchTime', Date.now().toString());
      } else {
        throw new Error(result.message || 'Dữ liệu không đúng định dạng');
      }
    }
    
    // Kiểm tra dữ liệu rỗng
    if (surveys.length === 0) {
      throw new Error('Không có dữ liệu khảo sát nào');
    }
    
    const stats = calculateStats(surveys);
    
    updateSummaryStats(stats);
    createDemographicsChart(stats.ageDistribution);
    createCorrelationChart(surveys);
    createKnowledgeCharts(surveys);
    createBehaviorCharts(surveys);
    updateComments(surveys, stats);
    updateRecommendations(stats);
    populateDataTable(surveys);
    
    hideLoadingState();
    showNotification('✅ Tải dữ liệu thành công!', 'success');
    
  } catch (error) {
    console.error('❌ Lỗi kết nối Google Sheets:', error);
    
    // Fallback dữ liệu mẫu nếu không có gì
    const cachedData = getCachedData().data;
    if (cachedData && cachedData.length > 0) {
      showNotification('⚠️ Đang dùng dữ liệu cache cũ', 'warning');
      const stats = calculateStats(cachedData);
      updateSummaryStats(stats);
      createDemographicsChart(stats.ageDistribution);
      createCorrelationChart(cachedData);
      createKnowledgeCharts(cachedData);
      createBehaviorCharts(cachedData);
      updateComments(cachedData, stats);
      updateRecommendations(stats);
      populateDataTable(cachedData);
    } else {
      showNotification('❌ Không thể tải dữ liệu. Hiển thị dữ liệu mẫu.', 'error');
      const sampleSurveys = getSampleData();
      const stats = calculateStats(sampleSurveys);
      updateSummaryStats(stats);
      createDemographicsChart(stats.ageDistribution);
      createCorrelationChart(sampleSurveys);
      createKnowledgeCharts(sampleSurveys);
      createBehaviorCharts(sampleSurveys);
      updateComments(sampleSurveys, stats);
      updateRecommendations(stats);
      populateDataTable(sampleSurveys);
    }
    
    hideLoadingState();
  }
  
  initializeAnimations();
}

// Lấy dữ liệu từ cache
function getCachedData() {
  try {
    const data = localStorage.getItem('surveyReportData');
    const timestamp = parseInt(localStorage.getItem('lastFetchTime') || '0');
    return {
      data: data ? JSON.parse(data) : null,
      timestamp: timestamp
    };
  } catch {
    return { data: null, timestamp: 0 };
  }
}

// Validate dữ liệu
function validateSurveyData(data) {
  if (!Array.isArray(data)) return [];
  
  // Lọc bỏ bản ghi trống và validate
  return data.filter(survey => {
    return survey && 
           typeof survey === 'object' && 
           (survey.id || survey.timestamp || survey.age);
  });
}

// Tính toán thống kê (ĐÃ SỬA: Đúng công thức)
function calculateStats(surveys) {
  if (!surveys || surveys.length === 0) {
    return { 
      total: 0, 
      ageDistribution: {}, 
      occupationDistribution: {}, 
      knowledgeScore: 0, 
      behaviorScore: 0 
    };
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
    
    // Behavior score (9 câu, mỗi câu tối đa 2 điểm)
    let behaviorPoints = 0;
    if (survey.q7 === 'rarely' || survey.q7 === 'never') behaviorPoints += 2; 
    else if (survey.q7 === 'monthly') behaviorPoints++;
    
    if (survey.q8 === 'always') behaviorPoints += 2; 
    else if (survey.q8 === 'sometimes') behaviorPoints++;
    
    if (survey.q9 === 'always') behaviorPoints += 2; 
    else if (survey.q9 === 'sometimes') behaviorPoints++;
    
    if (survey.q10 === 'rarely' || survey.q10 === 'never') behaviorPoints += 2; 
    else if (survey.q10 === 'monthly') behaviorPoints++;
    
    if (survey.q11 === 'always') behaviorPoints += 2; 
    else if (survey.q11 === 'sometimes') behaviorPoints++;
    
    if (survey.q12 === 'rarely' || survey.q12 === 'never') behaviorPoints += 2; 
    else if (survey.q12 === 'monthly') behaviorPoints++;
    
    if (survey.q13 === 'avoid') behaviorPoints += 2; 
    else if (survey.q13 === 'sometimes') behaviorPoints++;
    
    if (survey.q14 === 'never') behaviorPoints += 2; 
    else if (survey.q14 === 'rarely') behaviorPoints++;
    
    if (survey.q15 === 'always') behaviorPoints += 2; 
    else if (survey.q15 === 'sometimes') behaviorPoints++;
    
    stats.knowledgeScore += knowledgePoints;
    stats.behaviorScore += behaviorPoints;
  });
  
  // Tính phần trăm chính xác
  const maxKnowledge = stats.total * 7;
  const maxBehavior = stats.total * 9 * 2; // 9 câu * 2 điểm
  
  stats.knowledgeScore = maxKnowledge > 0 ? Math.round((stats.knowledgeScore / maxKnowledge) * 100) : 0;
  stats.behaviorScore = maxBehavior > 0 ? Math.round((stats.behaviorScore / maxBehavior) * 100) : 0;
  
  return stats;
}

// Cập nhật thống kê tổng quan (ĐÃ SỬA: Kiểm tra phần tử tồn tại)
function updateSummaryStats(stats) {
  const totalEl = document.getElementById('summary-total');
  const knowledgeEl = document.getElementById('summary-knowledge');
  const behaviorEl = document.getElementById('summary-behavior');
  const participationEl = document.getElementById('summary-participation');
  
  if(totalEl) totalEl.textContent = stats.total.toLocaleString('vi-VN');
  if(knowledgeEl) knowledgeEl.textContent = stats.knowledgeScore + '%';
  if(behaviorEl) behaviorEl.textContent = stats.behaviorScore + '%';
  if(participationEl) participationEl.textContent = Math.min(100, Math.round(stats.total * 2.5)) + '%';
  
  updateExecutiveSummary(stats);
}

function updateExecutiveSummary(stats) {
  const summaryElement = document.getElementById('executive-summary');
  if(!summaryElement) return;
  
  if (stats.total === 0) {
    summaryElement.textContent = 'Chưa có dữ liệu khảo sát nào được thu thập.';
    return;
  }
  
  summaryElement.textContent = `Dựa trên ${stats.total} khảo sát, kết quả cho thấy người tham gia có mức độ hiểu biết ${stats.knowledgeScore >= 70 ? 'tốt' : stats.knowledgeScore >= 50 ? 'trung bình' : 'hạn chế'} về rác thải nhựa và hành vi ${stats.behaviorScore >= 70 ? 'thân thiện môi trường tốt' : stats.behaviorScore >= 50 ? 'có một số tích cực' : 'cần cải thiện'}.`;
}

// Tạo biểu đồ nhân khẩu học (ĐÃ SỬA: Kiểm tra phần tử)
function createDemographicsChart(ageDistribution) {
  const chartDom = document.getElementById('demographics-chart');
  if(!chartDom) return;
  
  const myChart = echarts.init(chartDom);
  const data = Object.entries(ageDistribution || {}).map(([key, value]) => ({
    name: getAgeLabel(key),
    value: value
  }));
  
  myChart.setOption({
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b}: {c} người ({d}%)' },
    legend: { orient: 'vertical', left: 'left', textStyle: { fontSize: 12 } },
    series: [{
      name: 'Phân bố độ tuổi',
      type: 'pie',
      radius: '70%',
      center: ['60%', '50%'],
      data: data,
      color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
    }]
  });
  
  window.addEventListener('resize', () => myChart.resize());
}

// 2️⃣ ĐÃ SỬA: Mapping dữ liệu cho biểu đồ tương quan
function createCorrelationChart(surveys) {
  const chartDom = document.getElementById('correlation-chart');
  if(!chartDom) return;
  
  const myChart = echarts.init(chartDom);
  
  // Kiểm tra dữ liệu đủ để vẽ
  if(!surveys || surveys.length < 2) {
    myChart.setOption({
      title: { text: 'Cần ít nhất 2 bản ghi để hiển thị tương quan', left: 'center', top: 'middle' }
    });
    return;
  }
  
  const data = surveys.map(survey => {
    let knowledgePoints = 0;
    if (survey.q1 === 'a') knowledgePoints++;
    if (survey.q2 === 'c') knowledgePoints++;
    if (survey.q3 && Array.isArray(survey.q3) && survey.q3.includes('d')) knowledgePoints++;
    
    let behaviorPoints = 0;
    if (survey.q7 === 'rarely' || survey.q7 === 'never') behaviorPoints += 2; else if (survey.q7 === 'monthly') behaviorPoints++;
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
      itemStyle: { color: '#3b82f4', opacity: 0.7 }
    }]
  });
  
  window.addEventListener('resize', () => myChart.resize());
}

// Tạo biểu đồ hành vi (ĐÃ SỬA: Mapping giá trị đồng nhất)
function createBehaviorCharts(surveys) {
  if(!surveys || surveys.length === 0) return;
  
  // Mapping từ form sang hiển thị đồng nhất
  const valueMap = {
    'daily': 'Luôn',
    'weekly': 'Thỉnh thoảng', 
    'monthly': 'Hiếm khi',
    'rarely': 'Hiếm khi',
    'never': 'Không',
    'always': 'Luôn',
    'sometimes': 'Thỉnh thoảng',
    'avoid': 'Luôn', // Tốt = luôn
    'often': 'Thỉnh thoảng',
    'reduce': 'Hiếm khi'
  };
  
  // Tần suất sử dụng
  const usageData = { 'Luôn': 0, 'Thỉnh thoảng': 0, 'Hiếm khi': 0, 'Không': 0 };
  surveys.forEach(s => {
    if(s.q7) {
      const mapped = valueMap[s.q7] || 'Không';
      usageData[mapped]++;
    }
  });
  
  const usageChart = echarts.init(document.getElementById('usage-frequency-chart'));
  usageChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} người ({d}%)' },
    series: [{
      type: 'pie',
      radius: '70%',
      data: Object.entries(usageData).map(([name, value]) => ({ name, value })),
      color: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6']
    }]
  });
  
  // Hành vi phân loại
  const sortingData = { 'Luôn': 0, 'Thỉnh thoảng': 0, 'Hiếm khi': 0, 'Không': 0 };
  surveys.forEach(s => {
    if(s.q8) {
      const mapped = valueMap[s.q8] || 'Không';
      sortingData[mapped]++;
    }
  });
  
  const sortingChart = echarts.init(document.getElementById('sorting-behavior-chart'));
  sortingChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} người ({d}%)' },
    series: [{
      type: 'pie',
      radius: '70%',
      data: Object.entries(sortingData).map(([name, value]) => ({ name, value })),
      color: ['#10b981', '#f59e0b', '#ef4444', '#6b7280']
    }]
  });
  
  window.addEventListener('resize', () => {
    usageChart.resize();
    sortingChart.resize();
  });
}

// Cập nhật nhận xét (ĐÃ SỬA: Kiểm tra phần tử)
function updateComments(surveys, stats) {
  const kComment = document.getElementById('knowledge-comment');
  const bComment = document.getElementById('behavior-comment');
  
  if(kComment) {
    kComment.textContent = stats.knowledgeScore >= 70 ? 'Kiến thức tốt' :
                            stats.knowledgeScore >= 50 ? 'Kiến thức cần cải thiện' :
                            'Kiến thức còn hạn chế';
  }
  
  if(bComment) {
    bComment.textContent = stats.behaviorScore >= 70 ? 'Hành vi tốt' :
                            stats.behaviorScore >= 50 ? 'Hành vi cần cải thiện' :
                            'Hành vi cần thay đổi';
  }
}

// Cập nhật khuyến nghị (ĐÃ SỬA: Logic phù hợp với survey)
function updateRecommendations(stats) {
  const container = document.getElementById('recommendations-list');
  if(!container) return;
  
  const recommendations = [];
  
  if(stats.knowledgeScore < 50) {
    recommendations.push({
      priority: 'Cao',
      content: 'Tăng cường giáo dục nhận thức về tác hại của rác thải nhựa'
    });
  }
  
  if(stats.behaviorScore < 50) {
    recommendations.push({
      priority: 'Cao',
      content: 'Phát động chiến dịch thay đổi hành vi sử dụng đồ nhựa'
    });
  }
  
  if(stats.knowledgeScore >= 70 && stats.behaviorScore >= 70) {
    recommendations.push({
      priority: 'Trung bình',
      content: 'Duy trì và nhân rộng mô hình hành vi tích cực'
    });
  }
  
  // Mặc định nếu không có gì
  if(recommendations.length === 0) {
    recommendations.push({
      priority: 'Trung bình',
      content: 'Tiếp tục theo dõi và cải thiện nhận thức cộng đồng'
    });
  }
  
  container.innerHTML = recommendations.map(rec => `
    <div class="border-l-4 ${rec.priority === 'Cao' ? 'border-red-500' : 'border-yellow-500'} pl-4 py-2">
      <span class="text-sm font-semibold ${rec.priority === 'Cao' ? 'text-red-600' : 'text-yellow-600'}">Ưu tiên ${rec.priority}:</span>
      <p class="text-gray-700 mt-1">${rec.content}</p>
    </div>
  `).join('');
}

// Điền bảng dữ liệu (ĐÃ SỬA: Xử lý lỗi tốt hơn)
function populateDataTable(surveys) {
  const tableBody = document.getElementById('survey-data-table');
  if(!tableBody) return;
  
  if (!surveys || surveys.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>';
    return;
  }
  
  const rows = surveys.slice(0, 50).map((survey, index) => {
    // Tính điểm cho từng hàng
    let knowledgePoints = 0;
    if (survey.q1 === 'a') knowledgePoints++;
    if (survey.q2 === 'c') knowledgePoints++;
    if (survey.q3 && Array.isArray(survey.q3) && survey.q3.includes('d')) knowledgePoints++;
    
    let behaviorPoints = 0;
    if (survey.q7 === 'rarely' || survey.q7 === 'never') behaviorPoints += 2; else if (survey.q7 === 'monthly') behaviorPoints++;
    if (survey.q8 === 'always') behaviorPoints += 2; else if (survey.q8 === 'sometimes') behaviorPoints++;
    
    const knowledgeScore = Math.round((knowledgePoints / 3) * 100);
    const behaviorScore = Math.round((behaviorPoints / 4) * 100);
    
    const timestamp = survey.timestamp ? new Date(survey.timestamp).toLocaleString('vi-VN') : 'N/A';
    
    return `
      <tr class="border-b hover:bg-gray-50">
        <td class="p-3 font-mono text-sm">${survey.id ? survey.id.substring(0, 8) : 'N/A'}</td>
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

// Utils
function getAgeLabel(key) {
  const labels = { 
    '18-24': '18-24 tuổi', 
    '25-34': '25-34 tuổi', 
    '35-44': '35-44 tuổi', 
    '45-54': '45-54 tuổi', 
    '55+': '55 tuổi trở lên',
    'under18': 'Dưới 18 tuổi'
  };
  return labels[key] || key || 'Không xác định';
}

function getOccupationLabel(key) {
  const labels = { 
    'student': 'Học sinh/SV', 
    'employee': 'Nhân viên', 
    'business': 'Kinh doanh', 
    'freelance': 'Tự do', 
    'other': 'Khác',
    'unemployed': 'Thất nghiệp',
    'retired': 'Đã nghỉ hưu'
  };
  return labels[key] || key || 'Không xác định';
}

function initializeAnimations() {
  if(typeof anime !== 'undefined') {
    anime({
      targets: '.section-card',
      opacity: [0, 1],
      translateY: [30, 0],
      duration: 800,
      delay: anime.stagger(200),
      easing: 'easeOutExpo'
    });
  }
}

function showLoadingState() {
  const ids = ['summary-total', 'summary-knowledge', 'summary-behavior', 'summary-participation', 'executive-summary'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = '...';
  });
}

function hideLoadingState() {
  // Dữ liệu sẽ được cập nhật bởi các hàm khác
}

// 3️⃣ ĐÃ SỬA: Notification tốt hơn với nhiều kiểu
function showNotification(message, type = 'info') {
  // Xóa thông báo cũ
  const oldNotification = document.querySelector('.notification-toast');
  if(oldNotification) oldNotification.remove();
  
  const notification = document.createElement('div');
  notification.className = `notification-toast fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 max-w-sm text-white`;
  
  const colors = {
    'info': 'bg-blue-500',
    'success': 'bg-green-500',
    'warning': 'bg-yellow-500',
    'error': 'bg-red-500'
  };
  const icons = {
    'info': 'fa-info-circle',
    'success': 'fa-check-circle',
    'warning': 'fa-exclamation-triangle',
    'error': 'fa-times-circle'
  };
  
  notification.classList.add(colors[type] || colors.info);
  notification.innerHTML = `
    <div class="flex items-center">
      <i class="fas ${icons[type] || icons.info} mr-3"></i>
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

// 4️⃣ THÊM: Dữ liệu mẫu để test
function getSampleData() {
  return [
    {
      id: 'sample-001',
      timestamp: new Date().toISOString(),
      age: '18-24',
      occupation: 'student',
      q1: 'a', q2: 'c', q3: ['d'], q4: 'yes', q5: 'b', q6: 'yes', q18: 'yes',
      q7: 'rarely', q8: 'always', q9: 'always', q10: 'rarely', 
      q11: 'always', q12: 'rarely', q13: 'avoid', q14: 'never', q15: 'always'
    },
    {
      id: 'sample-002',
      timestamp: new Date().toISOString(),
      age: '25-34',
      occupation: 'employee',
      q1: 'a', q2: 'c', q3: ['a', 'd'], q4: 'yes', q5: 'b', q6: 'no', q18: 'yes',
      q7: 'monthly', q8: 'sometimes', q9: 'sometimes', q10: 'monthly', 
      q11: 'sometimes', q12: 'monthly', q13: 'sometimes', q14: 'rarely', q15: 'sometimes'
    },
    {
      id: 'sample-003',
      timestamp: new Date().toISOString(),
      age: '35-44',
      occupation: 'business',
      q1: 'b', q2: 'b', q3: ['a'], q4: 'no', q5: 'a', q6: 'no', q18: 'no',
      q7: 'weekly', q8: 'rarely', q9: 'rarely', q10: 'weekly', 
      q11: 'rarely', q12: 'weekly', q13: 'often', q14: 'sometimes', q15: 'rarely'
    }
  ];
}

// Tạo biểu đồ kiến thức (THÊM vào nếu cần)
function createKnowledgeCharts(surveys) {
  const chartDom = document.getElementById('knowledge-detailed-chart');
  if(!chartDom) return;
  
  const myChart = echarts.init(chartDom);
  const total = surveys.length || 1;
  
  const correct = {
    'Định nghĩa': surveys.filter(s => s.q1 === 'a').length,
    'Thời gian phân hủy': surveys.filter(s => s.q2 === 'c').length,
    'Tác hại': surveys.filter(s => s.q3 && Array.isArray(s.q3) && s.q3.includes('d')).length,
    'Nhận biết': surveys.filter(s => s.q4 === 'yes').length,
    'PET': surveys.filter(s => s.q5 === 'b').length,
    'Biểu tượng': surveys.filter(s => s.q6 === 'yes').length,
    'Ký hiệu': surveys.filter(s => s.q18 === 'yes').length
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
