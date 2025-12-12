const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwahWIWlY04K9T9yt8REKadzytvZ3hH0V9UytzToO2GTYksmn5MtSUEFuE7YVsaNvgP/exec ';


document.addEventListener('DOMContentLoaded', function() {
  initializeAnimations();
  setupFormHandlers();
  updateProgress();
});


function scrollToSurvey() {
  document.getElementById('survey').scrollIntoView({ behavior: 'smooth' });
}


function initializeAnimations() {
  anime({
    targets: '.hero-gradient h1',
    opacity: [0, 1],
    translateY: [50, 0],
    duration: 1000,
    easing: 'easeOutExpo'
  });
  
  anime({
    targets: '.floating-animation',
    opacity: [0, 1],
    scale: [0.8, 1],
    duration: 1200,
    delay: 300,
    easing: 'easeOutExpo'
  });
  
  anime({
    targets: '.card-hover',
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 800,
    delay: anime.stagger(200),
    easing: 'easeOutExpo'
  });
}


function setupFormHandlers() {
  const form = document.getElementById('survey-form');
  const inputs = form.querySelectorAll('input, select');
  
  inputs.forEach(input => {
    input.addEventListener('change', updateProgress);
    input.addEventListener('input', updateProgress);
  });
  
  form.addEventListener('submit', handleFormSubmit);
}


function updateProgress() {
  const form = document.getElementById('survey-form');
  const requiredGroups = [
    'age', 'occupation', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 
    'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15', 'q16', 'q17', 'q18', 'q20'
  ];
  
  let answered = 0;
  requiredGroups.forEach(group => {
    const groupInputs = form.querySelectorAll(`[name="${group}"]`);
    if (groupInputs.length > 0) {
      if (groupInputs[0].type === 'radio') {
        if (form.querySelector(`[name="${group}"]:checked`)) answered++;
      } else if (groupInputs[0].type === 'checkbox') {
        if (form.querySelector(`[name="${group}"]:checked`)) answered++;
      } else {
        if (groupInputs[0].value.trim() !== '') answered++;
      }
    }
  });

  const progress = (answered / requiredGroups.length) * 100;
  document.getElementById('progress-bar').style.width = progress + '%';
  document.getElementById('progress-text').textContent = `${answered}/${requiredGroups.length} câu`;
}


async function handleFormSubmit(e) {
  e.preventDefault();
  
  // Lấy nút submit và các phần tử con
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnIcon = submitBtn.querySelector('i');
  
  // Vô hiệu hóa nút và hiển thị loading
  submitBtn.disabled = true;
  btnText.textContent = 'Đang gửi...';
  btnIcon.className = 'fas fa-spinner fa-spin ml-2';
  
  try {
    const formData = new FormData(e.target);
    const surveyData = {};
    
    for (let [key, value] of formData.entries()) {
      if (surveyData[key]) {
        if (Array.isArray(surveyData[key])) surveyData[key].push(value);
        else surveyData[key] = [surveyData[key], value];
      } else {
        surveyData[key] = value;
      }
    }
    
    for (let i of [3, 19]) {
      const checkboxes = document.querySelectorAll(`input[name="q${i}"]:checked`);
      if (checkboxes.length > 0) {
        surveyData[`q${i}`] = Array.from(checkboxes).map(cb => cb.value);
      }
    }
    
    surveyData.timestamp = new Date().toISOString();
    surveyData.id = 'survey_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    await saveToGoogleSheets(surveyData);
    
    showSuccessMessage();
    
    // Chờ 1 giây để người dùng đọc thông báo
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
    
  } catch (error) {
    console.error('Lỗi khi gửi form:', error);
    showNotification('Gửi thất bại! Vui lòng thử lại.', 'error');
    
    // Khôi phục nút khi có lỗi
    submitBtn.disabled = false;
    btnText.textContent = 'Gửi lại';
    btnIcon.className = 'fas fa-redo ml-2';
  }
}

async function saveToGoogleSheets(data) {
  try {
    await fetch(SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', data: data })
    });
    console.log('Bạn đã hoàn thành khảo sát');
  } catch (error) {
    console.error('Lỗi khi lưu', error);
    showNotification('Lưu thất bại! Vui lòng thử lại.', 'error');
  }
}

function showSuccessMessage() {
  const message = document.createElement('div');
  message.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg z-50';
  message.innerHTML = '<i class="fas fa-check-circle mr-2"></i>Cảm ơn bạn! Dữ liệu đã được lưu vào hệ thống.';
  document.body.appendChild(message);
  
  anime({
    targets: message,
    opacity: [0, 1],
    translateX: [100, 0],
    duration: 500,
    easing: 'easeOutExpo'
  });
  
  setTimeout(() => {
    anime({
      targets: message,
      opacity: [1, 0],
      translateX: [0, 100],
      duration: 500,
      easing: 'easeInExpo',
      complete: () => document.body.removeChild(message)
    });
  }, 2000);
}

function showNotification(message, type = 'error') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
    type === 'error' ? 'bg-red-500' : 'bg-yellow-500'
  } text-white`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  anime({
    targets: notification,
    opacity: [0, 1],
    translateX: [100, 0],
    duration: 500,
    easing: 'easeOutExpo'
  });
  
  setTimeout(() => {
    anime({
      targets: notification,
      opacity: [1, 0],
      translateX: [0, 100],
      duration: 500,
      easing: 'easeInExpo',
      complete: () => document.body.removeChild(notification)
    });
  }, 2000);
}
