// Survey functionality
let currentQuestion = 0;
const totalQuestions = 20;
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwcvO7rKDYytyTjQmDTKQqnmxC73vpu3_-nxaatbn8UuVIO-8Y_aPdYs8DDv2yr_RUJ/exec';

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializeAnimations();
    setupFormHandlers();
    updateProgress();
});

// ... (các hàm scrollToSurvey, initializeAnimations, setupFormHandlers, updateProgress giữ nguyên)

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const surveyData = {};
    
    // Convert FormData to object
    for (let [key, value] of formData.entries()) {
        if (surveyData[key]) {
            if (Array.isArray(surveyData[key])) {
                surveyData[key].push(value);
            } else {
                surveyData[key] = [surveyData[key], value];
            }
        } else {
            surveyData[key] = value;
        }
    }
    
    // Handle checkboxes separately
    const checkboxes = e.target.querySelectorAll('input[type="checkbox"]');
    const checkboxGroups = {};
    
    checkboxes.forEach(checkbox => {
        if (!checkboxGroups[checkbox.name]) {
            checkboxGroups[checkbox.name] = [];
        }
        if (checkbox.checked) {
            checkboxGroups[checkbox.name].push(checkbox.value);
        }
    });
    
    // Add checkbox data to survey data
    Object.keys(checkboxGroups).forEach(key => {
        surveyData[key] = checkboxGroups[key];
    });
    
    // Add timestamp
    surveyData.timestamp = new Date().toISOString();
    surveyData.id = generateSurveyId();
    
    // Save to localStorage
    saveSurveyData(surveyData);
    
    // Save to Google Sheets
    await saveToGoogleSheets(surveyData);
    
    // Show success message
    showSuccessMessage();
    
    // Redirect to dashboard after delay
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 2000);
}

// Save data to Google Sheets
async function saveToGoogleSheets(data) {
    try {
        const response = await fetch(SHEET_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'save',
                data: data
            })
        });
        
        // Note: Due to no-cors mode, we can't check response status
        console.log('Data sent to Google Sheets');
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
    }
}

// ... (các hàm generateSurveyId, saveSurveyData, showSuccessMessage giữ nguyên)

// Utility functions
function getAllSurveyData() {
    return JSON.parse(localStorage.getItem('surveys') || '[]');
}

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

// Export functions for use in other pages
window.surveyUtils = {
    getAllSurveyData,
    getSurveyStats,
    saveSurveyData,
    SHEET_URL
};
