const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwahWIWlY04K9T9yt8REKadzytvZ3hH0V9UytzToO2GTYksmn5MtSUEFuE7YVsaNvgP/exec';
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

// ==== KHỞI TẠO ====
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// ==== QUẢN LÝ DỮ LIỆU ====
async function initializeDashboard() {
    showLoadingState();
    try {
        const surveys = await fetchSurveyData();
        const stats = calculateStats(surveys);
        
        // Cập nhật UI theo thứ tự ưu tiên
        updateStatsCards(stats);
        createAgeChart(surveys);
        createOccupationChart(surveys);
        createKnowledgeChart(surveys);
        createBehaviorChart(surveys); // QUAN TRỌNG: Đảm bảo hàm này được gọi
        updateInsights(stats);
        
        hideLoadingState();
        showNotification('✅ Tải dữ liệu thành công!', 'success');
        
    } catch (error) {
        console.error('❌ Lỗi khởi tạo:', error);
        handleError(error);
    }
}

async function fetchSurveyData() {
    const cached = getCachedData();
    if (cached.data && Date.now() - cached.timestamp < CACHE_DURATION) {
        showNotification('📊 Sử dụng dữ liệu cached', 'info');
        return cached.data;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
        const response = await fetch(`${SHEET_URL}?action=getAllData`, { 
            signal: controller.signal,
            cache: 'no-store'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        
        if (result.status !== 'success' || !Array.isArray(result.data)) {
            throw new Error(result.message || 'Dữ liệu không hợp lệ');
        }
        
        const validatedData = validateSurveyData(result.data);
        saveToCache(validatedData);
        return validatedData;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('⏱️ Timeout - Vui lòng thử lại!');
        }
        throw error;
    }
}

function validateSurveyData(data) {
    return data.filter(survey => survey && typeof survey === 'object' && (survey.id || survey.timestamp));
}

function getCachedData() {
    try {
        return {
            data: JSON.parse(localStorage.getItem('dashboardData') || 'null'),
            timestamp: parseInt(localStorage.getItem('dashboardCacheTime') || '0')
        };
    } catch {
        return { data: null, timestamp: 0 };
    }
}

function saveToCache(data) {
    localStorage.setItem('dashboardData', JSON.stringify(data));
    localStorage.setItem('dashboardCacheTime', Date.now().toString());
}

async function refreshData() {
    localStorage.removeItem('dashboardData');
    localStorage.removeItem('dashboardCacheTime');
    await initializeDashboard();
}

// ==== TÍNH TOÁN THỐNG KÊ ====
function calculateStats(surveys) {
    if (!surveys?.length) return getEmptyStats();
    
    const stats = {
        total: surveys.length,
        knowledgeSum: 0,
        behaviorSum: 0
    };
    
    surveys.forEach(survey => {
        stats.knowledgeSum += calculateKnowledgePoints(survey);
        stats.behaviorSum += calculateBehaviorPoints(survey);
    });
    
    return {
        total: stats.total,
        avgKnowledge: Math.round((stats.knowledgeSum / (stats.total * 7)) * 100),
        avgBehavior: Math.round((stats.behaviorSum / (stats.total * 18)) * 100),
        participationRate: Math.min(100, Math.round(stats.total * 2.5))
    };
}

function calculateKnowledgePoints(survey) {
    let points = 0;
    if (survey.q1 === 'a') points++;
    if (survey.q2 === 'c') points++;
    if (survey.q3?.includes('d')) points++;
    if (survey.q4 === 'yes') points++;
    if (survey.q5 === 'b') points++;
    if (survey.q6 === 'yes') points++;
    if (survey.q18 === 'yes') points++;
    return points;
}

function calculateBehaviorPoints(survey) {
    let points = 0;
    
    // Q7: Tần suất sử dụng (0-2 điểm)
    if (survey.q7 === 'rarely' || survey.q7 === 'never') points += 2;
    else if (survey.q7 === 'monthly') points += 1;
    
    // Q8: Phân loại rác (0-2 điểm)
    if (survey.q8 === 'always') points += 2;
    else if (survey.q8 === 'sometimes') points += 1;
    
    // Q9: Tái chế (0-2 điểm)
    if (survey.q9 === 'always') points += 2;
    else if (survey.q9 === 'sometimes') points += 1;
    
    // Q10: Sử dụng túi nhựa (0-2 điểm)
    if (survey.q10 === 'rarely' || survey.q10 === 'never') points += 2;
    else if (survey.q10 === 'monthly') points += 1;
    
    // Q11: Hủy đăng ký spam (0-2 điểm)
    if (survey.q11 === 'always') points += 2;
    else if (survey.q11 === 'sometimes') points += 1;
    
    // Q12: Mua sắm online (0-2 điểm)
    if (survey.q12 === 'rarely' || survey.q12 === 'never') points += 2;
    else if (survey.q12 === 'monthly') points += 1;
    
    // Q13: Tránh đồ nhựa (0-2 điểm)
    if (survey.q13 === 'avoid') points += 2;
    else if (survey.q13 === 'sometimes') points += 1;
    
    // Q14: Vứt rác bừa bãi (0-2 điểm)
    if (survey.q14 === 'never') points += 2;
    else if (survey.q14 === 'rarely') points += 1;
    
    // Q15: Tham gia hoạt động môi trường (0-2 điểm)
    if (survey.q15 === 'always') points += 2;
    else if (survey.q15 === 'sometimes') points += 1;
    
    return points;
}

function getEmptyStats() {
    return { total: 0, avgKnowledge: 0, avgBehavior: 0, participationRate: 0 };
}

// ==== UI UPDATES ====
function updateStatsCards(stats) {
    const elements = {
        'total-surveys': stats.total.toLocaleString('vi-VN'),
        'knowledge-score': stats.avgKnowledge + '%',
        'behavior-score': stats.avgBehavior + '%',
        'participation-rate': stats.participationRate + '%'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
}

function createAgeChart(surveys) {
    const chartDom = document.getElementById('age-chart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    const ageDist = {};
    surveys.forEach(s => { ageDist[s.age] = (ageDist[s.age] || 0) + 1; });
    
    myChart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} người ({d}%)' },
        series: [{
            type: 'pie',
            radius: '70%',
            center: ['50%', '50%'],
            data: Object.entries(ageDist).map(([k, v]) => ({ name: getAgeLabel(k), value: v })),
            color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
        }]
    });
    
    window.addEventListener('resize', () => myChart.resize());
}

function createOccupationChart(surveys) {
    const chartDom = document.getElementById('occupation-chart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    const occDist = {};
    surveys.forEach(s => { occDist[s.occupation] = (occDist[s.occupation] || 0) + 1; });
    
    myChart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} người ({d}%)' },
        series: [{
            type: 'pie',
            radius: '70%',
            center: ['50%', '50%'],
            data: Object.entries(occDist).map(([k, v]) => ({ name: getOccupationLabel(k), value: v })),
            color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1']
        }]
    });
    
    window.addEventListener('resize', () => myChart.resize());
}

function createKnowledgeChart(surveys) {
    const chartDom = document.getElementById('knowledge-chart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    const total = surveys.length || 1;
    
    const correct = {
        'Định nghĩa': surveys.filter(s => s.q1 === 'a').length,
        'Thời gian phân hủy': surveys.filter(s => s.q2 === 'c').length,
        'Tác hại': surveys.filter(s => s.q3?.includes('d')).length,
        'Nhận biết': surveys.filter(s => s.q4 === 'yes').length,
        'PET tái chế': surveys.filter(s => s.q5 === 'b').length,
        'Biểu tượng': surveys.filter(s => s.q6 === 'yes').length,
        'Ký hiệu': surveys.filter(s => s.q18 === 'yes').length
    };
    
    myChart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
        yAxis: { type: 'category', data: Object.keys(correct) },
        series: [{
            type: 'bar',
            data: Object.values(correct).map(v => Math.round((v / total) * 100)),
            itemStyle: { color: '#10b981' },
            label: { show: true, position: 'right', formatter: '{c}%' }
        }]
    });
    
    window.addEventListener('resize', () => myChart.resize());
}

// ==== HÀM TẠO BIỂU ĐỒ HÀNH VI - QUAN TRỌNG ====
function createBehaviorChart(surveys) {
    const chartDom = document.getElementById('behavior-chart');
    if (!chartDom) {
        console.error('❌ Không tìm thấy #behavior-chart');
        return;
    }
    
    const myChart = echarts.init(chartDom);
    const total = surveys.length || 1;
    
    // Xử lý dữ liệu hành vi tích cực
    const behaviorData = [
        { name: 'Sử dụng 1 lần', value: surveys.filter(s => s.q7 === 'daily').length },
        { name: 'Phân loại rác', value: surveys.filter(s => s.q8 === 'always').length },
        { name: 'Mang túi vải', value: surveys.filter(s => s.q13 === 'avoid').length },
        { name: 'Tham gia hoạt động', value: surveys.filter(s => s.q15 === 'always').length },
        { name: 'Tái chế', value: surveys.filter(s => s.q9 === 'always').length },
        { name: 'Không vứt rác bừa', value: surveys.filter(s => s.q14 === 'never').length }
    ];
    
    myChart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: behaviorData.map(d => d.name), axisLabel: { rotate: 30 } },
        yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
        series: [{
            name: 'Tỷ lệ',
            type: 'bar',
            data: behaviorData.map(d => Math.round((d.value / total) * 100)),
            itemStyle: { color: '#3b82f6' },
            label: { show: true, position: 'top', formatter: '{c}%' }
        }]
    });
    
    window.addEventListener('resize', () => myChart.resize());
}

function updateInsights(stats) {
    const kInsight = document.getElementById('knowledge-insight');
    const bInsight = document.getElementById('behavior-insight');
    const tInsight = document.getElementById('trend-insight');
    
    if (kInsight) {
        kInsight.textContent = stats.avgKnowledge >= 70 ? 'Nhận thức tốt về rác thải nhựa' :
                               stats.avgKnowledge >= 50 ? 'Cần tăng cường giáo dục' :
                               'Nhận thức còn hạn chế';
    }
    
    if (bInsight) {
        bInsight.textContent = stats.avgBehavior >= 70 ? 'Hành vi thân thiện môi trường' :
                               stats.avgBehavior >= 50 ? 'Hành vi có tích cực' :
                               'Cần thay đổi thói quen';
    }
    
    if (tInsight) {
        tInsight.textContent = stats.avgKnowledge > stats.avgBehavior ? 
                               'Kiến thức > Hành vi: Cần chuyển tri thức thành hành động' :
                               'Hành vi tốt nhưng cần nâng cao kiến thức';
    }
}

function populateRecentSurveys(surveys) {
    const tbody = document.getElementById('recent-surveys');
    if (!tbody) return;
    
    if (!surveys || surveys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>';
        return;
    }
    
    const rows = surveys.slice(0, 10).map(survey => {
        const knowledgeScore = Math.round((calculateKnowledgePoints(survey) / 7) * 100);
        const behaviorScore = Math.round((calculateBehaviorPoints(survey) / 18) * 100);
        
        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3 font-mono text-sm">${(survey.id || 'N/A').substring(0, 8)}</td>
                <td class="p-3">${getAgeLabel(survey.age)}</td>
                <td class="p-3">${getOccupationLabel(survey.occupation)}</td>
                <td class="p-3">${renderScoreBadge(knowledgeScore)}</td>
                <td class="p-3">${renderScoreBadge(behaviorScore)}</td>
                <td class="p-3 text-xs text-gray-500">${formatTimestamp(survey.timestamp)}</td>
            </tr>
        `;
    }).join('');
    
    tbody.innerHTML = rows;
}

function renderScoreBadge(score) {
    const color = score >= 70 ? 'green' : score >= 50 ? 'yellow' : 'red';
    return `<span class="px-2 py-1 rounded text-xs bg-${color}-100 text-${color}-800">${score}%</span>`;
}

function formatTimestamp(timestamp) {
    return timestamp ? new Date(timestamp).toLocaleString('vi-VN') : 'N/A';
}

function showLoadingState() {
    document.querySelectorAll('#total-surveys, #knowledge-score, #behavior-score, #participation-rate')
        .forEach(el => { if (el) el.textContent = '...'; });
    
    document.querySelectorAll('#knowledge-insight, #behavior-insight, #trend-insight')
        .forEach(el => { if (el) el.textContent = 'Đang tải...'; });
}

function hideLoadingState() {
    // Tự động cập nhật qua các hàm khác
}

function handleError(error) {
    console.error('❌ Lỗi:', error);
    
    const cachedData = getCachedData().data;
    if (cachedData?.length > 0) {
        showNotification('⚠️ Đang dùng dữ liệu cache', 'warning');
        const stats = calculateStats(cachedData);
        updateStatsCards(stats);
        createAgeChart(cachedData);
        createOccupationChart(cachedData);
        createKnowledgeChart(cachedData);
        createBehaviorChart(cachedData);
        updateInsights(stats);
        populateRecentSurveys(cachedData);
    } else {
        showNotification('❌ Không thể tải dữ liệu', 'error');
    }
    hideLoadingState();
}

function showNotification(message, type = 'info') {
    const oldNotification = document.querySelector('.notification-toast');
    if (oldNotification) oldNotification.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification-toast fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 max-w-sm text-white transition-all duration-300`;
    
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
    
    // Auto remove
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// ==== UTILS ====
function getAgeLabel(key) {
    const labels = { 
        '18-24': '18-24 tuổi', '25-34': '25-34 tuổi', 
        '35-44': '35-44 tuổi', '45-54': '45-54 tuổi', 
        '55+': '55 tuổi trở lên', 'under18': 'Dưới 18 tuổi'
    };
    return labels[key] || key || 'Không xác định';
}

function getOccupationLabel(key) {
    const labels = { 
        'student': 'Học sinh/SV', 'employee': 'Nhân viên', 
        'business': 'Kinh doanh', 'freelance': 'Tự do', 
        'other': 'Khác', 'unemployed': 'Thất nghiệp', 'retired': 'Đã nghỉ hưu'
    };
    return labels[key] || key || 'Không xác định';
}
