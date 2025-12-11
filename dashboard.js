// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Initialize dashboard
function initializeDashboard() {
    loadAndDisplayData();
    initializeAnimations();
}

// Load and display data
function loadAndDisplayData() {
    const stats = getSurveyStats();
    
    // Update statistics cards
    updateStatisticsCards(stats);
    
    // Create charts
    createAgeDistributionChart(stats.ageDistribution);
    createOccupationDistributionChart(stats.occupationDistribution);
    createKnowledgeChart();
    createBehaviorChart();
    
    // Update insights
    updateInsights(stats);
}

// Update statistics cards
function updateStatisticsCards(stats) {
    document.getElementById('total-surveys').textContent = stats.total;
    document.getElementById('knowledge-score').textContent = stats.knowledgeScore + '%';
    document.getElementById('behavior-score').textContent = stats.behaviorScore + '%';
    document.getElementById('participation-rate').textContent = Math.min(100, Math.round(stats.total * 2.5)) + '%';
}

// Create age distribution chart
function createAgeDistributionChart(ageDistribution) {
    const chartDom = document.getElementById('age-chart');
    const myChart = echarts.init(chartDom);
    
    const data = Object.entries(ageDistribution).map(([key, value]) => ({
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
                name: 'Độ tuổi',
                type: 'pie',
                radius: '70%',
                data: data,
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

// Create occupation distribution chart
function createOccupationDistributionChart(occupationDistribution) {
    const chartDom = document.getElementById('occupation-chart');
    const myChart = echarts.init(chartDom);
    
    const data = Object.entries(occupationDistribution).map(([key, value]) => ({
        name: getOccupationLabel(key),
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
                name: 'Nghề nghiệp',
                type: 'pie',
                radius: '70%',
                data: data,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                },
                color: ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
            }
        ]
    };
    
    myChart.setOption(option);
    
    // Make chart responsive
    window.addEventListener('resize', function() {
        myChart.resize();
    });
}

// Create knowledge analysis chart
function createKnowledgeChart() {
    const chartDom = document.getElementById('knowledge-chart');
    const myChart = echarts.init(chartDom);
    
    const surveys = getAllSurveyData();
    
    // Analyze knowledge questions
    let correctAnswers = {
        'Câu 1: Định nghĩa rác thải nhựa': 0,
        'Câu 2: Thờ gian phân hủy': 0,
        'Câu 3: Tác hại của nhựa': 0
    };
    
    surveys.forEach(survey => {
        if (survey.q1 === 'a') correctAnswers['Câu 1: Định nghĩa rác thải nhựa']++;
        if (survey.q2 === 'c') correctAnswers['Câu 2: Thờ gian phân hủy']++;
        if (survey.q3 && (Array.isArray(survey.q3) && survey.q3.includes('d'))) correctAnswers['Câu 3: Tác hại của nhựa']++;
    });
    
    const data = Object.entries(correctAnswers).map(([key, value]) => ({
        name: key,
        value: Math.round((value / Math.max(surveys.length, 1)) * 100)
    }));
    
    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            },
            formatter: '{b}: {c}%'
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            max: 100,
            axisLabel: {
                formatter: '{value}%'
            }
        },
        yAxis: {
            type: 'category',
            data: data.map(item => item.name)
        },
        series: [
            {
                name: 'Tỷ lệ trả lởi đúng',
                type: 'bar',
                data: data.map(item => item.value),
                itemStyle: {
                    color: function(params) {
                        const colors = ['#10b981', '#3b82f6', '#f59e0b'];
                        return colors[params.dataIndex];
                    }
                },
                label: {
                    show: true,
                    position: 'right',
                    formatter: '{c}%'
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

// Create behavior analysis chart
function createBehaviorChart() {
    const chartDom = document.getElementById('behavior-chart');
    const myChart = echarts.init(chartDom);
    
    const surveys = getAllSurveyData();
    
    // Analyze behavior questions
    const behaviorData = {
        'Sử dụng nhựa dùng một lần': { daily: 0, weekly: 0, monthly: 0, rarely: 0 },
        'Phân loại rác thải nhựa': { always: 0, sometimes: 0, rarely: 0, never: 0 }
    };
    
    surveys.forEach(survey => {
        if (survey.q4) behaviorData['Sử dụng nhựa dùng một lần'][survey.q4]++;
        if (survey.q5) behaviorData['Phân loại rác thải nhựa'][survey.q5]++;
    });
    
    // Convert to chart data
    const categories = ['Hàng ngày', 'Hàng tuần', 'Hàng tháng', 'Hiếm khi'];
    const phanLoaiCategories = ['Luôn luôn', 'Thỉnh thoảng', 'Hiếm khi', 'Không bao giờ'];
    
    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        legend: {
            data: ['Sử dụng nhựa', 'Phân loại rác']
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: categories
        },
        yAxis: {
            type: 'value'
        },
        series: [
            {
                name: 'Sử dụng nhựa',
                type: 'bar',
                data: [
                    behaviorData['Sử dụng nhựa dùng một lần'].daily,
                    behaviorData['Sử dụng nhựa dùng một lần'].weekly,
                    behaviorData['Sử dụng nhựa dùng một lần'].monthly,
                    behaviorData['Sử dụng nhựa dùng một lần'].rarely
                ],
                itemStyle: {
                    color: '#ef4444'
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

// Update insights
function updateInsights(stats) {
    const knowledgeInsight = document.getElementById('knowledge-insight');
    const behaviorInsight = document.getElementById('behavior-insight');
    const trendInsight = document.getElementById('trend-insight');
    
    // Knowledge insight
    if (stats.knowledgeScore >= 70) {
        knowledgeInsight.textContent = 'Ngườ tham gia có kiến thức tốt về rác thải nhựa và tác động của nó.';
    } else if (stats.knowledgeScore >= 50) {
        knowledgeInsight.textContent = 'Kiến thức về rác thải nhựa ở mức trung bình, cần tăng cường giáo dục.';
    } else {
        knowledgeInsight.textContent = 'Kiến thức về rác thải nhựa còn hạn chế, cần chương trình giáo dục mở rộng.';
    }
    
    // Behavior insight
    if (stats.behaviorScore >= 70) {
        behaviorInsight.textContent = 'Hành vi thân thiện với môi trường được thực hiện tốt trong cộng đồng.';
    } else if (stats.behaviorScore >= 50) {
        behaviorInsight.textContent = 'Một số hành vi tích cực đã được áp dụng, nhưng vẫn cần cải thiện.';
    } else {
        behaviorInsight.textContent = 'Hành vi sử dụng nhựa cần được thay đổi để bảo vệ môi trường tốt hơn.';
    }
    
    // Trend insight
    const surveys = getAllSurveyData();
    if (surveys.length > 10) {
        trendInsight.textContent = 'Có xu hướng tăng nhận thức về vấn đề rác thải nhựa trong cộng đồng.';
    } else {
        trendInsight.textContent = 'Cần thêm dữ liệu để đánh giá xu hướng nhận thức và hành vi.';
    }
}

// Initialize animations
function initializeAnimations() {
    // Animate statistics cards
    anime({
        targets: '.stat-card',
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 800,
        delay: anime.stagger(200),
        easing: 'easeOutExpo'
    });
    
    // Animate chart containers
    anime({
        targets: '.chart-container',
        opacity: [0, 1],
        scale: [0.9, 1],
        duration: 1000,
        delay: 500,
        easing: 'easeOutExpo'
    });
}

// Refresh data
function refreshData() {
    // Show loading animation
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang tải...';
    button.disabled = true;
    
    setTimeout(() => {
        loadAndDisplayData();
        button.innerHTML = originalText;
        button.disabled = false;
        
        // Show success message
        showNotification('Dữ liệu đã được làm mới!', 'success');
    }, 1000);
}

// Export data function removed as per requirement

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500' : 'bg-blue-500'
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