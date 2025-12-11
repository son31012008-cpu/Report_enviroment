// Report functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeReport();
});

// Initialize report
function initializeReport() {
    loadReportData();
    initializeAnimations();
}

// Load report data
function loadReportData() {
    const stats = getSurveyStats();
    const surveys = getAllSurveyData();
    
    // Update summary statistics
    updateSummaryStats(stats);
    
    // Create charts
    createDemographicsChart();
    createCorrelationChart();
    createKnowledgeCharts();
    createBehaviorCharts();
    
    // Update comments and recommendations
    updateComments(surveys, stats);
    updateRecommendations(surveys, stats);
    
    // Populate data table
    populateDataTable(surveys);
}

// Update summary statistics
function updateSummaryStats(stats) {
    document.getElementById('summary-total').textContent = stats.total;
    document.getElementById('summary-knowledge').textContent = stats.knowledgeScore + '%';
    document.getElementById('summary-behavior').textContent = stats.behaviorScore + '%';
    document.getElementById('summary-participation').textContent = Math.min(100, Math.round(stats.total * 2.5)) + '%';
    
    // Update executive summary
    updateExecutiveSummary(stats);
}

// Update executive summary
function updateExecutiveSummary(stats) {
    const summaryElement = document.getElementById('executive-summary');
    
    if (stats.total === 0) {
        summaryElement.textContent = 'Chưa có dữ liệu khảo sát nào được thu thập.';
        return;
    }
    
    let summary = `Dựa trên ${stats.total} khảo sát đã thu thập, kết quả cho thấy: `;
    
    // Knowledge assessment
    if (stats.knowledgeScore >= 70) {
        summary += `Ngườ tham gia có mức độ hiểu biết tốt về rác thải nhựa (${stats.knowledgeScore}%). `;
    } else if (stats.knowledgeScore >= 50) {
        summary += `Mức độ hiểu biết về rác thải nhựa ở mức trung bình (${stats.knowledgeScore}%), cần cải thiện. `;
    } else {
        summary += `Mức độ hiểu biết về rác thải nhựa còn hạn chế (${stats.knowledgeScore}%), cần tăng cường giáo dục. `;
    }
    
    // Behavior assessment
    if (stats.behaviorScore >= 70) {
        summary += `Hành vi thân thiện với môi trường được thực hiện tốt (${stats.behaviorScore}%). `;
    } else if (stats.behaviorScore >= 50) {
        summary += `Hành vi có xu hướng tích cực nhưng vẫn cần cải thiện (${stats.behaviorScore}%). `;
    } else {
        summary += `Hành vi còn nhiều hạn chế và cần thay đổi (${stats.behaviorScore}%). `;
    }
    
    summary += 'Kết quả này cung cấp cơ sở để xây dựng các chương trình giáo dục và can thiệp phù hợp.';
    
    summaryElement.textContent = summary;
}

// Create demographics chart
function createDemographicsChart() {
    const chartDom = document.getElementById('demographics-chart');
    const myChart = echarts.init(chartDom);
    
    const stats = getSurveyStats();
    
    const ageData = Object.entries(stats.ageDistribution).map(([key, value]) => ({
        name: getAgeLabel(key),
        value: value
    }));
    
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'left'
        },
        series: [
            {
                name: 'Phân bố độ tuổi',
                type: 'pie',
                radius: '70%',
                data: ageData,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                color: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
            }
        ]
    };
    
    myChart.setOption(option);
    
    // Make chart responsive
    window.addEventListener('resize', function() {
        myChart.resize();
    });
}

// Create correlation chart
function createCorrelationChart() {
    const chartDom = document.getElementById('correlation-chart');
    const myChart = echarts.init(chartDom);
    
    const surveys = getAllSurveyData();
    
    // Calculate individual scores
    const data = surveys.map(survey => {
        let knowledgePoints = 0;
        if (survey.q1 === 'a') knowledgePoints += 1;
        if (survey.q2 === 'c') knowledgePoints += 1;
        if (survey.q3 && (Array.isArray(survey.q3) && survey.q3.includes('d'))) knowledgePoints += 1;
        const knowledgeScore = (knowledgePoints / 3) * 100;
        
        let behaviorPoints = 0;
        if (survey.q4 === 'rarely') behaviorPoints += 2;
        else if (survey.q4 === 'monthly') behaviorPoints += 1;
        
        if (survey.q5 === 'always') behaviorPoints += 2;
        else if (survey.q5 === 'sometimes') behaviorPoints += 1;
        
        const behaviorScore = (behaviorPoints / 4) * 100;
        
        return [knowledgeScore, behaviorScore];
    });
    
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                return `Kiến thức: ${params.data[0].toFixed(1)}%<br/>Hành vi: ${params.data[1].toFixed(1)}%`;
            }
        },
        grid: {
            left: '10%',
            right: '10%',
            bottom: '10%',
            top: '10%'
        },
        xAxis: {
            type: 'value',
            name: 'Điểm kiến thức (%)',
            min: 0,
            max: 100
        },
        yAxis: {
            type: 'value',
            name: 'Điểm hành vi (%)',
            min: 0,
            max: 100
        },
        series: [
            {
                name: 'Tương quan',
                type: 'scatter',
                data: data,
                symbolSize: 8,
                itemStyle: {
                    color: '#3b82f6',
                    opacity: 0.7
                }
            }
        ]
    };
    
    myChart.setOption(option);
    
    // Make chart responsive
    window.addEventListener('resize', function() {
        myChart.resize();
    });
}

// Create knowledge charts
function createKnowledgeCharts() {
    const surveys = getAllSurveyData();
    
    // Calculate scores for each question
    let q1Correct = 0, q2Correct = 0, q3Correct = 0;
    
    surveys.forEach(survey => {
        if (survey.q1 === 'a') q1Correct++;
        if (survey.q2 === 'c') q2Correct++;
        if (survey.q3 && (Array.isArray(survey.q3) && survey.q3.includes('d'))) q3Correct++;
    });
    
    const q1Score = Math.round((q1Correct / Math.max(surveys.length, 1)) * 100);
    const q2Score = Math.round((q2Correct / Math.max(surveys.length, 1)) * 100);
    const q3Score = Math.round((q3Correct / Math.max(surveys.length, 1)) * 100);
    
    // Update UI
    document.getElementById('q1-score').textContent = q1Score + '%';
    document.getElementById('q2-score').textContent = q2Score + '%';
    document.getElementById('q3-score').textContent = q3Score + '%';
}

// Create behavior charts
function createBehaviorCharts() {
    const surveys = getAllSurveyData();
    
    // Analyze behavior patterns
    const usageFreq = { daily: 0, weekly: 0, monthly: 0, rarely: 0 };
    const sortingBehavior = { always: 0, sometimes: 0, rarely: 0, never: 0 };
    
    surveys.forEach(survey => {
        if (survey.q4) usageFreq[survey.q4]++;
        if (survey.q5) sortingBehavior[survey.q5]++;
    });
    
    // Create usage frequency chart
    const usageChartDom = document.getElementById('usage-frequency-chart');
    const usageChart = echarts.init(usageChartDom);
    
    const usageOption = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
        },
        series: [
            {
                type: 'pie',
                radius: '70%',
                data: [
                    { value: usageFreq.daily, name: 'Hàng ngày' },
                    { value: usageFreq.weekly, name: 'Hàng tuần' },
                    { value: usageFreq.monthly, name: 'Hàng tháng' },
                    { value: usageFreq.rarely, name: 'Hiếm khi' }
                ],
                color: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6']
            }
        ]
    };
    
    usageChart.setOption(usageOption);
    
    // Create sorting behavior chart
    const sortingChartDom = document.getElementById('sorting-behavior-chart');
    const sortingChart = echarts.init(sortingChartDom);
    
    const sortingOption = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
        },
        series: [
            {
                type: 'pie',
                radius: '70%',
                data: [
                    { value: sortingBehavior.always, name: 'Luôn luôn' },
                    { value: sortingBehavior.sometimes, name: 'Thỉnh thoảng' },
                    { value: sortingBehavior.rarely, name: 'Hiếm khi' },
                    { value: sortingBehavior.never, name: 'Không bao giờ' }
                ],
                color: ['#10b981', '#f59e0b', '#ef4444', '#6b7280']
            }
        ]
    };
    
    sortingChart.setOption(sortingOption);
    
    // Make charts responsive
    window.addEventListener('resize', function() {
        usageChart.resize();
        sortingChart.resize();
    });
}

// Update comments
function updateComments(surveys, stats) {
    const knowledgeComment = document.getElementById('knowledge-comment');
    const behaviorComment = document.getElementById('behavior-comment');
    
    // Knowledge comment
    if (stats.knowledgeScore >= 70) {
        knowledgeComment.textContent = 'Ngườ tham gia thể hiện kiến thức tốt về rác thải nhựa. Tuy nhiên, vẫn cần tăng cường giáo dục về tác hại cụ thể và cách xử lý.';
    } else if (stats.knowledgeScore >= 50) {
        knowledgeComment.textContent = 'Kiến thức cơ bản đã có, nhưng cần cải thiện về thờ gian phân hủy và tác động môi trường của rác thải nhựa.';
    } else {
        knowledgeComment.textContent = 'Kiến thức còn nhiều hạn chế. Cần chương trình giáo dục toàn diện về rác thải nhựa và bảo vệ môi trường.';
    }
    
    // Behavior comment
    const highUsage = surveys.filter(s => s.q4 === 'daily' || s.q4 === 'weekly').length;
    const goodSorting = surveys.filter(s => s.q5 === 'always' || s.q5 === 'sometimes').length;
    
    if (highUsage > surveys.length / 2) {
        behaviorComment.textContent = 'Có xu hướng sử dụng nhựa dùng một lần thường xuyên. Cần khuyến khích sử dụng các sản phẩm thay thế thân thiện môi trường.';
    } else if (goodSorting > surveys.length / 2) {
        behaviorComment.textContent = 'Hành vi phân loại rác tốt, nhưng cần giảm tần suất sử dụng nhựa dùng một lần.';
    } else {
        behaviorComment.textContent = 'Cần cải thiện cả việc sử dụng và phân loại rác thải nhựa. Cần chương trình tuyên truyền và hỗ trợ thực tế.';
    }
}

// Update recommendations
function updateRecommendations(surveys, stats) {
    const educationRecs = document.getElementById('education-recommendations');
    const policyRecs = document.getElementById('policy-recommendations');
    
    // Education recommendations
    const educationItems = [];
    
    if (stats.knowledgeScore < 70) {
        educationItems.push('Tổ chức các buổi hội thảo về rác thải nhựa trong cộng đồng');
        educationItems.push('Phát triển tài liệu giáo dục trực quan về tác hại của rác thải nhựa');
        educationItems.push('Tích hợp nội dung bảo vệ môi trường vào chương trình học');
    }
    
    if (stats.behaviorScore < 70) {
        educationItems.push('Tuyên truyền về các sản phẩm thay thế nhựa');
        educationItems.push('Hướng dẫn phân loại rác thải tại nhà');
    }
    
    educationItems.push('Sử dụng mạng xã hội để lan tỏa thông điệp bảo vệ môi trường');
    
    educationRecs.innerHTML = educationItems.map(item => `
        <li class="flex items-start">
            <i class="fas fa-check text-green-600 mr-2 mt-1"></i>
            <span>${item}</span>
        </li>
    `).join('');
    
    // Policy recommendations
    const policyItems = [];
    
    if (surveys.filter(s => s.q4 === 'daily').length > surveys.length * 0.3) {
        policyItems.push('Ban hành quy định hạn chế hoặc cấm sử dụng nhựa dùng một lần');
    }
    
    if (surveys.filter(s => s.q5 === 'never' || s.q5 === 'rarely').length > surveys.length * 0.4) {
        policyItems.push('Cải thiện hệ thống thu gom và xử lý rác thải nhựa');
        policyItems.push('Thiết lập điểm thu gom rác thải nhựa tại các khu dân cư');
    }
    
    policyItems.push('Khuyến khích doanh nghiệp sử dụng bao bì thân thiện môi trường');
    policyItems.push('Cung cấp ưu đãi cho ngườ tiêu dùng sử dụng sản phẩm tái sử dụng');
    policyItems.push('Tăng cường kiểm tra và xử phạt việc xả rác bừa bãi');
    
    policyRecs.innerHTML = policyItems.map(item => `
        <li class="flex items-start">
            <i class="fas fa-check text-green-600 mr-2 mt-1"></i>
            <span>${item}</span>
        </li>
    `).join('');
}

// Populate data table
function populateDataTable(surveys) {
    const tableBody = document.getElementById('survey-data-table');
    
    if (surveys.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Không có dữ liệu</td></tr>';
        return;
    }
    
    const rows = surveys.slice(0, 50).map((survey, index) => {
        // Calculate scores
        let knowledgePoints = 0;
        if (survey.q1 === 'a') knowledgePoints += 1;
        if (survey.q2 === 'c') knowledgePoints += 1;
        if (survey.q3 && (Array.isArray(survey.q3) && survey.q3.includes('d'))) knowledgePoints += 1;
        const knowledgeScore = Math.round((knowledgePoints / 3) * 100);
        
        let behaviorPoints = 0;
        if (survey.q4 === 'rarely') behaviorPoints += 2;
        else if (survey.q4 === 'monthly') behaviorPoints += 1;
        
        if (survey.q5 === 'always') behaviorPoints += 2;
        else if (survey.q5 === 'sometimes') behaviorPoints += 1;
        
        const behaviorScore = Math.round((behaviorPoints / 4) * 100);
        
        const timestamp = new Date(survey.timestamp).toLocaleString('vi-VN');
        
        return `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3">${survey.id.substring(0, 8)}</td>
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

// Initialize animations
function initializeAnimations() {
    // Animate section cards
    anime({
        targets: '.section-card',
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 800,
        delay: anime.stagger(200),
        easing: 'easeOutExpo'
    });
}

// Generate PDF
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Báo Cáo Khảo Sát Rác Thải Nhựa', 20, 30);
    
    // Add date
    doc.setFontSize(12);
    doc.text(`Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`, 20, 45);
    
    // Add summary statistics
    const stats = getSurveyStats();
    doc.setFontSize(16);
    doc.text('Tóm Tắt Kết Quả', 20, 65);
    
    doc.setFontSize(12);
    doc.text(`Tổng số khảo sát: ${stats.total}`, 20, 80);
    doc.text(`Điểm kiến thức trung bình: ${stats.knowledgeScore}%`, 20, 95);
    doc.text(`Điểm hành vi trung bình: ${stats.behaviorScore}%`, 20, 110);
    
    // Add executive summary
    doc.setFontSize(16);
    doc.text('Đánh Giá Tổng Quan', 20, 130);
    
    doc.setFontSize(12);
    const summary = `Dựa trên ${stats.total} khảo sát, kết quả cho thấy ngườ tham gia có mức độ hiểu biết ${stats.knowledgeScore >= 70 ? 'tốt' : stats.knowledgeScore >= 50 ? 'trung bình' : 'hạn chế'} về rác thải nhựa.`;
    doc.text(summary, 20, 145, { maxWidth: 170 });
    
    // Save the PDF
    doc.save(`bao_cao_rac_thai_nhua_${new Date().toISOString().split('T')[0]}.pdf`);
    
    showNotification('Đã xuất báo cáo PDF thành công!', 'success');
}

// Print report
function printReport() {
    window.print();
}

// Export Excel
function exportExcel() {
    const surveys = getAllSurveyData();
    
    if (surveys.length === 0) {
        showNotification('Không có dữ liệu để xuất!', 'warning');
        return;
    }
    
    // Create CSV content
    const headers = ['ID', 'Độ Tuổi', 'Nghề Nghiệp', 'Điểm Kiến Thức', 'Điểm Hành Vi', 'Thờ Gian'];
    const csvContent = [
        headers.join(','),
        ...surveys.map(survey => {
            // Calculate scores
            let knowledgePoints = 0;
            if (survey.q1 === 'a') knowledgePoints += 1;
            if (survey.q2 === 'c') knowledgePoints += 1;
            if (survey.q3 && (Array.isArray(survey.q3) && survey.q3.includes('d'))) knowledgePoints += 1;
            const knowledgeScore = Math.round((knowledgePoints / 3) * 100);
            
            let behaviorPoints = 0;
            if (survey.q4 === 'rarely') behaviorPoints += 2;
            else if (survey.q4 === 'monthly') behaviorPoints += 1;
            
            if (survey.q5 === 'always') behaviorPoints += 2;
            else if (survey.q5 === 'sometimes') behaviorPoints += 1;
            
            const behaviorScore = Math.round((behaviorPoints / 4) * 100);
            
            return [
                survey.id.substring(0, 8),
                `"${getAgeLabel(survey.age)}"`,
                `"${getOccupationLabel(survey.occupation)}"`,
                `${knowledgeScore}%`,
                `${behaviorScore}%`,
                `"${new Date(survey.timestamp).toLocaleString('vi-VN')}"`
            ].join(',');
        })
    ].join('\\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `du_lieu_khao_sat_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showNotification('Đã xuất dữ liệu Excel thành công!', 'success');
}

// PIN functionality
const CORRECT_PIN = 'sangtaothaiphien_vuminhson12_5';
let currentExportType = '';

function showPINModal(exportType) {
    currentExportType = exportType;
    document.getElementById('pin-modal').classList.remove('hidden');
    document.getElementById('pin-input').value = '';
    document.getElementById('pin-input').focus();
    document.getElementById('pin-error').classList.add('hidden');
    
    // Animate modal
    anime({
        targets: '#pin-modal .bg-white',
        scale: [0.8, 1],
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutExpo'
    });
}

function closePINModal() {
    document.getElementById('pin-modal').classList.add('hidden');
    currentExportType = '';
}

function verifyPIN() {
    const pinInput = document.getElementById('pin-input').value.trim();
    
    if (pinInput === CORRECT_PIN) {
        closePINModal();
        
        // Execute the export function
        if (currentExportType === 'pdf') {
            generatePDF();
        } else if (currentExportType === 'excel') {
            exportExcel();
        }
        
        showNotification('Mã PIN chính xác!', 'success');
    } else {
        document.getElementById('pin-error').classList.remove('hidden');
        document.getElementById('pin-input').select();
        
        // Shake animation for error
        anime({
            targets: '#pin-modal .bg-white',
            translateX: [-10, 10, -10, 10, 0],
            duration: 400,
            easing: 'easeInOutQuad'
        });
    }
}

// Handle Enter key in PIN input
document.addEventListener('DOMContentLoaded', function() {
    const pinInput = document.getElementById('pin-input');
    if (pinInput) {
        pinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyPIN();
            }
        });
    }
});

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500' : 
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    } text-white`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    anime({
        targets: notification,
        opacity: [0, 1],
        translateX: [100, 0],
        duration: 500,
        easing: 'easeOutExpo'
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
        anime({
            targets: notification,
            opacity: [1, 0],
            translateX: [0, 100],
            duration: 500,
            easing: 'easeInExpo',
            complete: () => {
                document.body.removeChild(notification);
            }
        });
    }, 3000);
}

// Utility functions
function getAgeLabel(key) {
    const labels = {
        '18-24': '18-24 tuổi',
        '25-34': '25-34 tuổi',
        '35-44': '35-44 tuổi',
        '45-54': '45-54 tuổi',
        '55+': '55 tuổi trở lên'
    };
    return labels[key] || key;
}

function getOccupationLabel(key) {
    const labels = {
        'student': 'Học sinh/Sinh viên',
        'employee': 'Nhân viên văn phòng',
        'business': 'Kinh doanh',
        'freelance': 'Tự do',
        'other': 'Khác'
    };
    return labels[key] || key;
}

// Get survey data from localStorage
function getAllSurveyData() {
    return JSON.parse(localStorage.getItem('surveys') || '[]');
}

// Get survey statistics
function getSurveyStats() {
    const surveys = getAllSurveyData();
    
    if (surveys.length === 0) {
        return {
            total: 0,
            ageDistribution: {},
            occupationDistribution: {},
            knowledgeScore: 0,
            behaviorScore: 0
        };
    }
    
    // Calculate statistics
    const stats = {
        total: surveys.length,
        ageDistribution: {},
        occupationDistribution: {},
        knowledgeScore: 0,
        behaviorScore: 0
    };
    
    surveys.forEach(survey => {
        // Age distribution
        if (survey.age) {
            stats.ageDistribution[survey.age] = (stats.ageDistribution[survey.age] || 0) + 1;
        }
        
        // Occupation distribution
        if (survey.occupation) {
            stats.occupationDistribution[survey.occupation] = (stats.occupationDistribution[survey.occupation] || 0) + 1;
        }
        
        // Knowledge score (simplified calculation)
        let knowledgePoints = 0;
        if (survey.q1 === 'a') knowledgePoints += 1;
        if (survey.q2 === 'c') knowledgePoints += 1;
        if (survey.q3 && (Array.isArray(survey.q3) && survey.q3.includes('d'))) knowledgePoints += 1;
        
        stats.knowledgeScore += knowledgePoints;
        
        // Behavior score (simplified calculation)
        let behaviorPoints = 0;
        if (survey.q4 === 'rarely') behaviorPoints += 2;
        else if (survey.q4 === 'monthly') behaviorPoints += 1;
        
        if (survey.q5 === 'always') behaviorPoints += 2;
        else if (survey.q5 === 'sometimes') behaviorPoints += 1;
        
        stats.behaviorScore += behaviorPoints;
    });
    
    // Calculate averages
    stats.knowledgeScore = Math.round((stats.knowledgeScore / surveys.length) * 100 / 3);
    stats.behaviorScore = Math.round((stats.behaviorScore / surveys.length) * 100 / 4);
    
    return stats;
}