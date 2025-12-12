const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwahWIWlY04K9T9yt8REKadzytvZ3hH0V9UytzToO2GTYksmn5MtSUEFuE7YVsaNvgP/exec';
const PIN = 'sangtaothaiphien_vuminhson_12_5';
const CACHE_DURATION = 5 * 60 * 1000; // 5 phút

// ==== KHỞI TẠO ====
document.addEventListener('DOMContentLoaded', function() {
    initializeReport();
    setupEventListeners();
});

function setupEventListeners() {
    // Xử lý nút export với verification
    document.getElementById('btn-export-pdf')?.addEventListener('click', () => showPINModal('pdf'));
    document.getElementById('btn-export-excel')?.addEventListener('click', () => showPINModal('excel'));
    document.getElementById('btn-print')?.addEventListener('click', printReport);
    
    // Xử lý modal PIN
    document.getElementById('verify-pin')?.addEventListener('click', verifyPIN);
    document.getElementById('cancel-pin')?.addEventListener('click', closePINModal);
    document.getElementById('pin-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyPIN();
    });
    
    // Đóng modal khi click outside
    document.getElementById('pin-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'pin-modal') closePINModal();
    });
}

// ==== QUẢN LÝ DỮ LIỆU ====
async function initializeReport() {
    showLoadingState();
    try {
        const surveys = await fetchSurveyData();
        const stats = calculateStats(surveys);
        
        // Cập nhật UI
        updateSummaryStats(stats);
        createAllCharts(surveys, stats);
        updateComments(surveys, stats);
        updateRecommendations(stats);
        populateDataTable(surveys);
        
        hideLoadingState();
        showNotification('✅ Tải dữ liệu thành công!', 'success');
        
    } catch (error) {
        console.error('Lỗi khởi tạo:', error);
        handleError(error);
    }
}

async function fetchSurveyData() {
    const cached = getCachedData();
    if (cached.data && Date.now() - cached.timestamp < CACHE_DURATION) {
        showNotification('📊 Sử dụng dữ liệu đã lưu', 'info');
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
            throw new Error('⏱️ Quá thời gian chờ. Vui lòng thử lại!');
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
            data: JSON.parse(localStorage.getItem('surveyReportData') || 'null'),
            timestamp: parseInt(localStorage.getItem('lastFetchTime') || '0')
        };
    } catch {
        return { data: null, timestamp: 0 };
    }
}

function saveToCache(data) {
    localStorage.setItem('surveyReportData', JSON.stringify(data));
    localStorage.setItem('lastFetchTime', Date.now().toString());
}

// ==== TÍNH TOÁN THỐNG KÊ ====
function calculateStats(surveys) {
    if (!surveys?.length) return getEmptyStats();
    
    const stats = {
        total: surveys.length,
        ageDistribution: {},
        occupationDistribution: {},
        knowledgeScore: 0,
        behaviorScore: 0,
        overallScore: 0 // Thêm điểm tổng quan
    };
    
    surveys.forEach(survey => {
        // Phân phối nhân khẩu học
        stats.ageDistribution[survey.age] = (stats.ageDistribution[survey.age] || 0) + 1;
        stats.occupationDistribution[survey.occupation] = (stats.occupationDistribution[survey.occupation] || 0) + 1;
        
        // Điểm kiến thức (7 câu)
        const knowledgePoints = calculateKnowledgePoints(survey);
        stats.knowledgeScore += knowledgePoints;
        
        // Điểm hành vi (max 18 điểm)
        const behaviorPoints = calculateBehaviorPoints(survey);
        stats.behaviorScore += behaviorPoints;
        
        // Điểm tổng quan (trung bình kiến thức và hành vi)
        stats.overallScore += Math.round(((knowledgePoints / 7) + (behaviorPoints / 18)) / 2 * 100);
    });
    
    // Chuẩn hóa điểm
    stats.knowledgeScore = Math.round((stats.knowledgeScore / (stats.total * 7)) * 100);
    stats.behaviorScore = Math.round((stats.behaviorScore / (stats.total * 18)) * 100);
    stats.overallScore = Math.round(stats.overallScore / stats.total);
    
    return stats;
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
    return { 
        total: 0, 
        ageDistribution: {}, 
        occupationDistribution: {}, 
        knowledgeScore: 0, 
        behaviorScore: 0,
        overallScore: 0
    };
}

// ==== UI UPDATES ====
function updateSummaryStats(stats) {
    const elements = {
        'summary-total': stats.total.toLocaleString('vi-VN'),
        'summary-knowledge': stats.knowledgeScore + '%',
        'summary-behavior': stats.behaviorScore + '%',
        'summary-participation': Math.min(100, Math.round(stats.total * 2.5)) + '%'
    };
    
    Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
    
    updateExecutiveSummary(stats);
}

function updateExecutiveSummary(stats) {
    const el = document.getElementById('executive-summary');
    if (!el) return;
    
    if (stats.total === 0) {
        el.textContent = 'Chưa có dữ liệu khảo sát nào được thu thập.';
        return;
    }
    
    const knowledgeLevel = stats.knowledgeScore >= 70 ? 'tốt' : stats.knowledgeScore >= 50 ? 'trung bình' : 'hạn chế';
    const behaviorLevel = stats.behaviorScore >= 70 ? 'thân thiện môi trường tốt' : stats.behaviorScore >= 50 ? 'có một số tích cực' : 'cần cải thiện';
    
    el.textContent = `Dựa trên ${stats.total} khảo sát, kết quả cho thấy người tham gia có mức độ hiểu biết ${knowledgeLevel} về rác thải nhựa và hành vi ${behaviorLevel}.`;
}

function createAllCharts(surveys, stats) {
    createDemographicsChart(stats.ageDistribution);
    createCorrelationChart(surveys);
    createBehaviorCharts(surveys);
    updateDetailedScores(stats); // Cập nhật điểm chi tiết
}

function createDemographicsChart(ageDistribution) {
    const chartDom = document.getElementById('demographics-chart');
    if (!chartDom) return;
    
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
            color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1']
        }]
    });
    
    window.addEventListener('resize', () => myChart.resize());
}

function createCorrelationChart(surveys) {
    const chartDom = document.getElementById('correlation-chart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    
    if (!surveys || surveys.length < 2) {
        myChart.setOption({
            title: { text: 'Cần ít nhất 2 bản ghi để hiển thị tương quan', left: 'center', top: 'middle' }
        });
        return;
    }
    
    const data = surveys.map(survey => {
        const knowledgePoints = calculateKnowledgePoints(survey);
        const behaviorPoints = calculateBehaviorPoints(survey);
        
        return [
            (knowledgePoints / 7) * 100,
            (behaviorPoints / 18) * 100
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

function createBehaviorCharts(surveys) {
    if (!surveys || surveys.length === 0) return;
    
    createUsageFrequencyChart(surveys);
    createSortingBehaviorChart(surveys);
}

function createUsageFrequencyChart(surveys) {
    const chartDom = document.getElementById('usage-frequency-chart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    const usageData = processBehaviorData(surveys, 'q7');
    
    myChart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} người ({d}%)' },
        series: [{
            type: 'pie',
            radius: '70%',
            data: usageData,
            color: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6']
        }]
    });
    
    window.addEventListener('resize', () => myChart.resize());
}

function createSortingBehaviorChart(surveys) {
    const chartDom = document.getElementById('sorting-behavior-chart');
    if (!chartDom) return;
    
    const myChart = echarts.init(chartDom);
    const sortingData = processBehaviorData(surveys, 'q8');
    
    myChart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} người ({d}%)' },
        series: [{
            type: 'pie',
            radius: '70%',
            data: sortingData,
            color: ['#10b981', '#f59e0b', '#ef4444', '#6b7280']
        }]
    });
    
    window.addEventListener('resize', () => myChart.resize());
}

function processBehaviorData(surveys, questionKey) {
    const valueMap = {
        'daily': 'Luôn', 'weekly': 'Thỉnh thoảng', 'monthly': 'Hiếm khi',
        'rarely': 'Hiếm khi', 'never': 'Không', 'always': 'Luôn',
        'sometimes': 'Thỉnh thoảng', 'avoid': 'Luôn', 'often': 'Thỉnh thoảng',
        'reduce': 'Hiếm khi'
    };
    
    const data = { 'Luôn': 0, 'Thỉnh thoảng': 0, 'Hiếm khi': 0, 'Không': 0 };
    
    surveys.forEach(s => {
        const value = s[questionKey];
        if (value) {
            const mapped = valueMap[value] || 'Không';
            data[mapped]++;
        }
    });
    
    return Object.entries(data).map(([name, value]) => ({ name, value }));
}

// ==== CẬP NHẬT ĐIỂM CHI TIẾT ====
function updateDetailedScores(stats) {
    // Tổng Quan - trung bình kiến thức và hành vi
    const overallEl = document.getElementById('overall-score');
    if (overallEl) {
        const overall = Math.round((stats.knowledgeScore + stats.behaviorScore) / 2);
        overallEl.textContent = overall + '%';
    }
    
    // Kiến Thức - điểm đã tính từ trước
    const knowledgeEl = document.getElementById('detailed-knowledge-score');
    if (knowledgeEl) {
        knowledgeEl.textContent = stats.knowledgeScore + '%';
    }
}

function updateComments(surveys, stats) {
    const kComment = document.getElementById('knowledge-comment');
    const bComment = document.getElementById('behavior-comment');
    
    if (kComment) {
        kComment.textContent = stats.knowledgeScore >= 70 ? 'Kiến thức tốt về rác thải nhựa' :
                                stats.knowledgeScore >= 50 ? 'Kiến thức cần được củng cố thêm' :
                                'Cần tăng cường giáo dục về rác thải nhựa';
    }
    
    if (bComment) {
        bComment.textContent = stats.behaviorScore >= 70 ? 'Hành vi thân thiện môi trường tốt' :
                                stats.behaviorScore >= 50 ? 'Hành vi có những tích cực nhất định' :
                                'Cần thay đổi thói quen sử dụng nhựa';
    }
}

function updateRecommendations(stats) {
    const eduContainer = document.getElementById('education-recommendations');
    const policyContainer = document.getElementById('policy-recommendations');
    
    if (!eduContainer || !policyContainer) return;
    
    const recommendations = generateRecommendations(stats);
    
    eduContainer.innerHTML = renderRecommendationList(recommendations.education);
    policyContainer.innerHTML = renderRecommendationList(recommendations.policy);
}

function generateRecommendations(stats) {
    const recs = { education: [], policy: [] };
    
    // Giáo dục
    if (stats.knowledgeScore < 50) {
        recs.education.push({ priority: 'Cao', content: 'Tổ chức buổi tập huấn về tác hại của rác thải nhựa' });
        recs.education.push({ priority: 'Cao', content: 'Phát tờ rơi thông tin tại trường học, cơ quan' });
    }
    if (stats.knowledgeScore < 70) {
        recs.education.push({ priority: 'Trung bình', content: 'Tăng cường truyền thông trên mạng xã hội' });
    }
    recs.education.push({ priority: 'Thấp', content: 'Tiếp tục duy trì các hoạt động giáo dục hiện có' });
    
    // Chính sách
    if (stats.behaviorScore < 50) {
        recs.policy.push({ priority: 'Cao', content: 'Phát động chiến dịch "Giảm nhựa trong 30 ngày"' });
        recs.policy.push({ priority: 'Cao', content: 'Đặt thùng tái chế tại các điểm công cộng' });
    }
    if (stats.behaviorScore < 70) {
        recs.policy.push({ priority: 'Trung bình', content: 'Khuyến khích sử dụng túi vải, chai thủy tinh' });
    }
    recs.policy.push({ priority: 'Thấp', content: 'Tặng quà cho người có hành vi tích cực' });
    
    return recs;
}

function renderRecommendationList(recommendations) {
    return recommendations.map(rec => `
        <li class="flex items-start mb-3">
            <i class="fas fa-check text-green-600 mr-2 mt-1"></i>
            <span>
                <span class="text-sm font-semibold ${rec.priority === 'Cao' ? 'text-red-600' : rec.priority === 'Trung bình' ? 'text-yellow-600' : 'text-gray-600'}">
                    [Ưu tiên ${rec.priority}]
                </span> ${rec.content}
            </span>
        </li>
    `).join('');
}

function populateDataTable(surveys) {
    const tableBody = document.getElementById('survey-data-table');
    if (!tableBody) return;
    
    if (!surveys || surveys.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>';
        return;
    }
    
    const rows = surveys.slice(0, 50).map(survey => {
        const knowledgeScore = calculateIndividualKnowledgeScore(survey);
        const behaviorScore = calculateIndividualBehaviorScore(survey);
        
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
    
    tableBody.innerHTML = rows;
}

function calculateIndividualKnowledgeScore(survey) {
    return Math.round((calculateKnowledgePoints(survey) / 7) * 100);
}

function calculateIndividualBehaviorScore(survey) {
    return Math.round((calculateBehaviorPoints(survey) / 18) * 100);
}

function renderScoreBadge(score) {
    const color = score >= 70 ? 'green' : score >= 50 ? 'yellow' : 'red';
    return `<span class="px-2 py-1 rounded text-xs bg-${color}-100 text-${color}-800">${score}%</span>`;
}

function formatTimestamp(timestamp) {
    return timestamp ? new Date(timestamp).toLocaleString('vi-VN') : 'N/A';
}

// ==== EXPORT PDF NÂNG CAO ====
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showNotification('❌ Thư viện PDF chưa sẵn sàng. Vui lòng thử lại!', 'error');
        return;
    }
    
    showNotification('⏳ Đang tạo PDF...', 'info');
    
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        const surveys = getCachedData().data || [];
        const stats = calculateStats(surveys);
        
        // Trang bìa
        addPDFCoverPage(doc);
        
        // Trang tóm tắt
        addPDFSummaryPage(doc, stats);
        
        // Trang phân tích
        addPDFAnalysisPages(doc, surveys, stats);
        
        // Trang dữ liệu
        addPDFDataPage(doc, surveys);
        
        // Lưu file
        doc.save(`EcoSurvey_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
        showNotification('✅ Xuất PDF thành công!', 'success');
        
    } catch (error) {
        console.error('Lỗi export PDF:', error);
        showNotification('❌ Lỗi khi tạo PDF: ' + error.message, 'error');
    }
}

function addPDFCoverPage(doc) {
    doc.setFontSize(24);
    doc.setTextColor(16, 185, 129); // Màu xanh lá
    doc.text('EcoSurvey', 105, 60, { align: 'center' });
    
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('Báo Cáo Chi Tiết', 105, 80, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 105, 100, { align: 'center' });
    doc.text('Khảo sát hiểu biết về rác thải nhựa', 105, 110, { align: 'center' });
    
    doc.addPage();
}

function addPDFSummaryPage(doc, stats) {
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('1. Tóm Tắt Kết Quả', 20, 20);
    
    doc.setFontSize(11);
    const summaryLines = [
        `Tổng số khảo sát: ${stats.total.toLocaleString('vi-VN')} người`,
        `Điểm kiến thức trung bình: ${stats.knowledgeScore}%`,
        `Điểm hành vi trung bình: ${stats.behaviorScore}%`,
        `Điểm tổng quan: ${stats.overallScore}%`,
        `Tỷ lệ tham gia: ${Math.min(100, Math.round(stats.total * 2.5))}%`,
        '',
        `Đánh giá: ${getEvaluationText(stats)}`
    ];
    
    summaryLines.forEach((line, index) => {
        doc.text(line, 20, 35 + (index * 6));
    });
    
    doc.addPage();
}

function addPDFAnalysisPages(doc, surveys, stats) {
    // Phân tích nhân khẩu học
    doc.setFontSize(16);
    doc.text('2. Phân Tích Nhân Khẩu Học', 20, 20);
    
    doc.setFontSize(11);
    let yPos = 35;
    Object.entries(stats.ageDistribution).forEach(([age, count]) => {
        const percentage = ((count / stats.total) * 100).toFixed(1);
        doc.text(`${getAgeLabel(age)}: ${count} người (${percentage}%)`, 20, yPos);
        yPos += 6;
    });
    
    doc.addPage();
    
    // Phân tích kiến thức chi tiết
    doc.text('3. Đánh Giá Kiến Thức Chi Tiết', 20, 20);
    
    const knowledgeDetails = getKnowledgeDetails(surveys, stats.total);
    yPos = 35;
    knowledgeDetails.forEach(item => {
        doc.text(`${item.question}: ${item.correct}/${stats.total} đúng (${item.percentage}%)`, 20, yPos);
        yPos += 6;
    });
}

function addPDFDataPage(doc, surveys) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('4. Dữ Liệu Chi Tiết', 20, 20);
    
    // Table header
    doc.setFontSize(9);
    const headers = ['ID', 'Tuổi', 'Nghề nghiệp', 'Điểm KT', 'Điểm HV'];
    const colX = [20, 50, 80, 110, 130];
    
    doc.setFillColor(16, 185, 129);
    doc.rect(20, 30, 150, 8, 'F');
    doc.setTextColor(255, 255, 255);
    headers.forEach((h, i) => doc.text(h, colX[i], 35));
    
    // Table data
    doc.setTextColor(0, 0, 0);
    let yPos = 40;
    surveys.slice(0, 30).forEach(survey => {
        if (yPos > 280) {
            doc.addPage();
            yPos = 30;
        }
        
        const row = [
            (survey.id || 'N/A').substring(0, 8),
            getAgeLabel(survey.age),
            getOccupationLabel(survey.occupation),
            calculateIndividualKnowledgeScore(survey) + '%',
            calculateIndividualBehaviorScore(survey) + '%'
        ];
        
        row.forEach((cell, i) => doc.text(cell, colX[i], yPos));
        yPos += 6;
    });
}

function getEvaluationText(stats) {
    const knowledge = stats.knowledgeScore >= 70 ? 'tốt' : stats.knowledgeScore >= 50 ? 'trung bình' : 'hạn chế';
    const behavior = stats.behaviorScore >= 70 ? 'tốt' : stats.behaviorScore >= 50 ? 'cần cải thiện' : 'kém';
    return `Người dùng có kiến thức ${knowledge} và hành vi ${behavior} về rác thải nhựa.`;
}

function getKnowledgeDetails(surveys, total) {
    return [
        { question: 'Câu 1: Định nghĩa', correct: surveys.filter(s => s.q1 === 'a').length, percentage: Math.round((surveys.filter(s => s.q1 === 'a').length / total) * 100) },
        { question: 'Câu 2: Thời gian phân hủy', correct: surveys.filter(s => s.q2 === 'c').length, percentage: Math.round((surveys.filter(s => s.q2 === 'c').length / total) * 100) },
        { question: 'Câu 3: Tác hại', correct: surveys.filter(s => s.q3?.includes('d')).length, percentage: Math.round((surveys.filter(s => s.q3?.includes('d')).length / total) * 100) },
        { question: 'Câu 4: Nhận biết', correct: surveys.filter(s => s.q4 === 'yes').length, percentage: Math.round((surveys.filter(s => s.q4 === 'yes').length / total) * 100) },
        { question: 'Câu 5: PET', correct: surveys.filter(s => s.q5 === 'b').length, percentage: Math.round((surveys.filter(s => s.q5 === 'b').length / total) * 100) },
        { question: 'Câu 6: Biểu tượng', correct: surveys.filter(s => s.q6 === 'yes').length, percentage: Math.round((surveys.filter(s => s.q6 === 'yes').length / total) * 100) },
        { question: 'Câu 7: Ký hiệu', correct: surveys.filter(s => s.q18 === 'yes').length, percentage: Math.round((surveys.filter(s => s.q18 === 'yes').length / total) * 100) }
    ];
}

// ==== EXPORT EXCEL NÂNG CAO ====
function exportToExcel() {
    const surveys = getCachedData().data || [];
    
    if (!surveys || surveys.length === 0) {
        showNotification('❌ Không có dữ liệu để xuất', 'error');
        return;
    }
    
    showNotification('⏳ Đang tạo Excel...', 'info');
    
    try {
        const csvContent = generateCSVContent(surveys);
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `EcoSurvey_Data_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        
        showNotification('✅ Xuất Excel thành công!', 'success');
        
    } catch (error) {
        console.error('Lỗi export Excel:', error);
        showNotification('❌ Lỗi khi tạo Excel: ' + error.message, 'error');
    }
}

function generateCSVContent(surveys) {
    // Headers với tất cả câu hỏi
    const headers = [
        'ID', 'Timestamp', 'Tuổi', 'Nghề nghiệp', 'Email',
        'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10',
        'Q11', 'Q12', 'Q13', 'Q14', 'Q15', 'Q16', 'Q17', 'Q18',
        'Điểm Kiến Thức', 'Điểm Hành Vi', 'Điểm Tổng Quan'
    ];
    
    // Data rows
    const rows = surveys.map(survey => {
        const knowledgeScore = calculateIndividualKnowledgeScore(survey);
        const behaviorScore = calculateIndividualBehaviorScore(survey);
        const overallScore = Math.round((knowledgeScore + behaviorScore) / 2);
        
        return [
            survey.id || 'N/A',
            formatTimestamp(survey.timestamp),
            getAgeLabel(survey.age),
            getOccupationLabel(survey.occupation),
            survey.email || '',
            survey.q1 || '', survey.q2 || '', safeJoin(survey.q3), survey.q4 || '', 
            survey.q5 || '', survey.q6 || '', survey.q7 || '', survey.q8 || '', 
            survey.q9 || '', survey.q10 || '', survey.q11 || '', survey.q12 || '', 
            survey.q13 || '', survey.q14 || '', survey.q15 || '', survey.q16 || '', 
            survey.q17 || '', survey.q18 || '',
            knowledgeScore + '%', behaviorScore + '%', overallScore + '%'
        ].map(field => `"${field}"`).join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
}

function safeJoin(arr) {
    return Array.isArray(arr) ? arr.join(';') : (arr || '');
}

// ==== QUẢN LÝ MODAL PIN ====
function showPINModal(type) {
    const modal = document.getElementById('pin-modal');
    const input = document.getElementById('pin-input');
    const error = document.getElementById('pin-error');
    
    if (!modal) return;
    
    modal.classList.remove('hidden');
    modal.dataset.exportType = type;
    
    if (input) {
        input.value = '';
        input.focus();
    }
    if (error) error.classList.add('hidden');
}

function closePINModal() {
    const modal = document.getElementById('pin-modal');
    const input = document.getElementById('pin-input');
    const error = document.getElementById('pin-error');
    
    if (modal) modal.classList.add('hidden');
    if (input) input.value = '';
    if (error) error.classList.add('hidden');
}

function verifyPIN() {
    const input = document.getElementById('pin-input');
    const error = document.getElementById('pin-error');
    const modal = document.getElementById('pin-modal');
    
    if (!input || !modal) return;
    
    const pin = input.value.trim();
    
    if (pin === PIN) {
        closePINModal();
        const exportType = modal.dataset.exportType;
        
        // Thực hiện export sau khi xác thực thành công
        setTimeout(() => {
            if (exportType === 'pdf') {
                exportToPDF();
            } else if (exportType === 'excel') {
                exportToExcel();
            }
        }, 300);
    } else {
        if (error) error.classList.remove('hidden');
        if (input) {
            input.value = '';
            input.focus();
        }
        showNotification('❌ Mã PIN không đúng!', 'error');
    }
}

// ==== CÁC CHỨC NĂNG KHÁC ====
function printReport() {
    window.print();
}

function showLoadingState() {
    document.querySelectorAll('#summary-total, #summary-knowledge, #summary-behavior, #summary-participation')
        .forEach(el => { if (el) el.textContent = '...'; });
}

function hideLoadingState() {
    // Dữ liệu sẽ được cập nhật tự động
}

function handleError(error) {
    const cachedData = getCachedData().data;
    if (cachedData?.length > 0) {
        showNotification('⚠️ Đang dùng dữ liệu cache', 'warning');
        const stats = calculateStats(cachedData);
        updateSummaryStats(stats);
        createAllCharts(cachedData, stats);
        updateComments(cachedData, stats);
        updateRecommendations(stats);
        populateDataTable(cachedData);
    } else {
        showNotification('❌ Không thể tải dữ liệu. Sử dụng dữ liệu mẫu.', 'error');
        const sampleData = getSampleData();
        const stats = calculateStats(sampleData);
        updateSummaryStats(stats);
        createAllCharts(sampleData, stats);
        updateComments(sampleData, stats);
        updateRecommendations(stats);
        populateDataTable(sampleData);
    }
    hideLoadingState();
}

function getSampleData() {
    return [
        {
            id: 'sample-001', timestamp: new Date().toISOString(), age: '18-24', occupation: 'student',
            q1: 'a', q2: 'c', q3: ['d'], q4: 'yes', q5: 'b', q6: 'yes', q18: 'yes',
            q7: 'rarely', q8: 'always', q9: 'always', q10: 'rarely', 
            q11: 'always', q12: 'rarely', q13: 'avoid', q14: 'never', q15: 'always'
        },
        {
            id: 'sample-002', timestamp: new Date().toISOString(), age: '25-34', occupation: 'employee',
            q1: 'a', q2: 'c', q3: ['a', 'd'], q4: 'yes', q5: 'b', q6: 'no', q18: 'yes',
            q7: 'monthly', q8: 'sometimes', q9: 'sometimes', q10: 'monthly', 
            q11: 'sometimes', q12: 'monthly', q13: 'sometimes', q14: 'rarely', q15: 'sometimes'
        },
        {
            id: 'sample-003', timestamp: new Date().toISOString(), age: '35-44', occupation: 'business',
            q1: 'b', q2: 'b', q3: ['a'], q4: 'no', q5: 'a', q6: 'no', q18: 'no',
            q7: 'weekly', q8: 'rarely', q9: 'rarely', q10: 'weekly', 
            q11: 'rarely', q12: 'weekly', q13: 'often', q14: 'sometimes', q15: 'rarely'
        }
    ];
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
    
    // Auto remove after 4s
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

// Phím tắt Escape đóng modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('pin-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closePINModal();
        }
    }
});
