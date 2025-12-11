// Survey functionality
let currentQuestion = 0;
const totalQuestions = 20;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializeAnimations();
    setupFormHandlers();
    updateProgress();
});

// Smooth scroll to survey section
function scrollToSurvey() {
    document.getElementById('survey').scrollIntoView({
        behavior: 'smooth'
    });
}

// Initialize animations
function initializeAnimations() {
    // Animate hero text
    anime({
        targets: '.hero-gradient h1',
        opacity: [0, 1],
        translateY: [50, 0],
        duration: 1000,
        easing: 'easeOutExpo'
    });

    // Animate hero image
    anime({
        targets: '.floating-animation',
        opacity: [0, 1],
        scale: [0.8, 1],
        duration: 1200,
        delay: 300,
        easing: 'easeOutExpo'
    });

    // Animate statistics cards
    anime({
        targets: '.card-hover',
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 800,
        delay: anime.stagger(200),
        easing: 'easeOutExpo'
    });
}

// Setup form handlers
function setupFormHandlers() {
    const form = document.getElementById('survey-form');
    
    // Add event listeners to all form inputs
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('change', updateProgress);
        input.addEventListener('input', updateProgress);
    });

    // Handle form submission
    form.addEventListener('submit', handleFormSubmit);
}

// Update progress bar
function updateProgress() {
    const form = document.getElementById('survey-form');
    const inputs = form.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked, select, textarea');
    
    let answered = 0;
    const requiredGroups = ['age', 'occupation', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7'];
    
    requiredGroups.forEach(group => {
        const groupInputs = form.querySelectorAll(`[name="${group}"]`);
        if (groupInputs.length > 0) {
            if (groupInputs[0].type === 'radio') {
                if (form.querySelector(`[name="${group}"]:checked`)) {
                    answered++;
                }
            } else if (groupInputs[0].type === 'checkbox') {
                if (form.querySelector(`[name="${group}"]:checked`)) {
                    answered++;
                }
            } else {
                if (groupInputs[0].value.trim() !== '') {
                    answered++;
                }
            }
        }
    });

    const progress = (answered / requiredGroups.length) * 100;
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    
    if (progressBar && progressText) {
        progressBar.style.width = progress + '%';
        progressText.textContent = `${answered}/${requiredGroups.length} câu hỏi`;
    }
}

// Handle form submission
function handleFormSubmit(e) {
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
    
    // Show success message
    showSuccessMessage();
    
    // Redirect to dashboard after delay
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 2000);
}

// Generate unique survey ID
function generateSurveyId() {
    return 'survey_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Save survey data to localStorage
function saveSurveyData(data) {
    let surveys = JSON.parse(localStorage.getItem('surveys') || '[]');
    surveys.push(data);
    localStorage.setItem('surveys', JSON.stringify(surveys));
    localStorage.setItem('latest_survey', JSON.stringify(data));
}

// Show success message
function showSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
    message.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            <span>Cảm ơn bạn đã hoàn thành khảo sát!</span>
        </div>
    `;
    
    document.body.appendChild(message);
    
    // Animate in
    anime({
        targets: message,
        opacity: [0, 1],
        translateX: [100, 0],
        duration: 500,
        easing: 'easeOutExpo'
    });
    
    // Remove after 3 seconds
    setTimeout(() => {
        anime({
            targets: message,
            opacity: [1, 0],
            translateX: [0, 100],
            duration: 500,
            easing: 'easeInExpo',
            complete: () => {
                document.body.removeChild(message);
            }
        });
    }, 3000);
}

// Utility function to get all survey data
function getAllSurveyData() {
    return JSON.parse(localStorage.getItem('surveys') || '[]');
}

// Utility function to get survey statistics
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
    saveSurveyData
};