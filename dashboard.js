// Dashboard functionality
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwcvO7rKDYytyTjQmDTKQqnmxC73vpu3_-nxaatbn8UuVIO-8Y_aPdYs8DDv2yr_RUJ/exec';

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Initialize dashboard
async function initializeDashboard() {
    showLoadingState();
    await loadAndDisplayData();
    initializeAnimations();
}

// Load and display data from Google Sheets
async function loadAndDisplayData() {
    try {
        const surveys = await fetchDataFromGoogleSheets();
        const stats = calculateStats(surveys);
        
        // Update statistics cards
        updateStatisticsCards(stats);
        
        // Create charts
        createAgeDistributionChart(stats.ageDistribution);
        createOccupationDistributionChart(stats.occupationDistribution);
        createKnowledgeChart(surveys);
        createBehaviorChart(surveys);
        
        // Update insights
        updateInsights(stats);
        
        hideLoadingState();
    } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to localStorage
        const stats = getSurveyStats();
        updateStatisticsCards(stats);
        createAgeDistributionChart(stats.ageDistribution);
        createOccupationDistributionChart(stats.occupationDistribution);
        createKnowledgeChartLocal();
        createBehaviorChartLocal();
        updateInsights(stats);
        hideLoadingState();
        showNotification('Không thể tải dữ liệu từ Google Sheets, sử dụng dữ liệu local', 'warning');
    }
}

// Fetch data from Google Sheets
async function fetchDataFromGoogleSheets() {
    const response = await fetch(`${SHEET_URL}?action=getAllData`);
    const result = await response.json();
    
    if (result.status === 'success') {
        return result.data;
    } else {
        throw new Error('Failed to fetch data');
    }
}

// Calculate statistics
function calculateStats(surveys) {
    if (surveys.length === 0) {
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
        // Age distribution
        if (survey.age) {
            stats.ageDistribution[survey.age] = (stats.ageDistribution[survey.age] || 0) + 1;
        }
        
        // Occupation distribution
        if (survey.occupation) {
            stats.occupationDistribution[survey.occupation] = (stats.occupationDistribution[survey.occupation] || 0) + 1;
        }
        
        // Knowledge score
        let knowledgePoints = 0;
        if (survey.q1 === 'a') knowledgePoints += 1;
        if (survey.q2 === 'c') knowledgePoints += 1;
        if (survey.q3 && (Array.isArray(survey.q3) && survey.q3.includes('d'))) knowledgePoints += 1;
        
        stats.knowledgeScore += knowledgePoints;
        
        // Behavior score
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

// Show loading state
function showLoadingState() {
    document.getElementById('total-surveys').textContent = '...';
    document.getElementById('knowledge-score').textContent = '...';
    document.getElementById('behavior-score').textContent = '...';
    document.getElementById('participation-rate').textContent = '...';
}

// Hide loading state
function hideLoadingState() {
    // Data will be updated by display functions
}

// Update statistics cards
function updateStatisticsCards(stats) {
    document.getElementById('total-surveys').textContent = stats.total;
    document.getElementById('knowledge-score').textContent = stats.knowledgeScore + '%';
    document.getElementById('behavior-score').textContent = stats.behaviorScore + '%';
    document.getElementById('participation-rate').textContent = Math.min(100, Math.round(stats.total * 2.5)) + '%';
}

// Refresh data
async function refreshData() {
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang tải...';
    button.disabled = true;
    
    await loadAndDisplayData();
    
    button.innerHTML = originalText;
    button.disabled = false;
    showNotification('Dữ liệu đã được làm mới!', 'success');
}

// ... (các hàm createAgeDistributionChart, createOccupationDistributionChart giữ nguyên)

// Create knowledge chart with Google Sheets data
function createKnowledgeChart(surveys) {
    const chartDom = document.getElementById('knowledge-chart');
    const myChart = echarts.init(chartDom);
    
    // Analyze knowledge questions
    let correctAnswers = {
        'Câu 1: Định nghĩa': 0,
        'Câu 2: Thờ gian': 0,
        'Câu 3: Tác hại': 0
    };
    
    surveys.forEach(survey => {
        if (survey.q1 === 'a') correctAnswers['Câu 1: Định nghĩa']++;
        if (survey.q2 === 'c') correctAnswers['Câu 2: Thờ gian']++;
        if (survey.q3 && (Array.isArray(survey.q3) && survey.q3.includes('d'))) correctAnswers['Câu 3: Tác hại']++;
    });
    
    const data = Object.entries(correctAnswers).map(([key, value]) => ({
        name: key,
        value: Math.round((value / Math.max(surveys.length, 1)) * 100)
    }));
    
    const option = {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
        yAxis: { type: 'category', data: data.map(item => item.name) },
        series: [{
            name: 'Tỷ lệ trả lởi đúng',
            type: 'bar',
            data: data.map(item => item.value),
            itemStyle: {
                color: function(params) {
                    const colors = ['#10b981', '#3b82f6', '#f59e0b'];
                    return colors[params.dataIndex];
                }
            },
            label: { show: true, position: 'right', formatter: '{c}%' }
        }]
    };
    
    myChart.setOption(option);
    window.addEventListener('resize', () => myChart.resize());
}

// Create behavior chart with Google Sheets data
function createBehaviorChart(surveys) {
    const chartDom = document.getElementById('behavior-chart');
    const myChart = echarts.init(chartDom);
    
    // Analyze behavior questions
    const behaviorData = {
        'Sử dụng nhựa': { daily: 0, weekly: 0, monthly: 0, rarely: 0 },
        'Phân loại rác': { always: 0, sometimes: 0, rarely: 0, never: 0 }
    };
    
    surveys.forEach(survey => {
        if (survey.q4) behaviorData['Sử dụng nhựa'][survey.q4]++;
        if (survey.q5) behaviorData['Phân loại rác'][survey.q5]++;
    });
    
    const option = {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: ['Sử dụng nhựa', 'Phân loại rác'] },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: { type: 'category', data: ['Hàng ngày', 'Hàng tuần', 'Hàng tháng', 'Hiếm khi'] },
        yAxis: { type: 'value' },
        series: [{
            name: 'Sử dụng nhựa',
            type: 'bar',
            data: Object.values(behaviorData['Sử dụng nhựa']),
            itemStyle: { color: '#ef4444' }
        }]
    };
    
    myChart.setOption(option);
    window.addEventListener('resize', () => myChart.resize());
}

// ... (các hàm updateInsights, initializeAnimations, showNotification, getAgeLabel, getOccupationLabel giữ nguyên)

// Get survey data from localStorage (fallback)
function getAllSurveyData() {
    return JSON.parse(localStorage.getItem('surveys') || '[]');
}

function getSurveyStats() {
    // Sử dụng dữ liệu localStorage nếu cần fallback
    const surveys = getAllSurveyData();
    return calculateStats(surveys);
}
