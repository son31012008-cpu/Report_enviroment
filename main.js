// API Google Sheets bạn cũ
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwcvO7rKDYytyTjQmDTKQqnmxC73vpu3_-nxaatbn8UuVIO-8Y_aPdYs8DDv2yr_RUJ/exec';

// hiệu ứng cuộn
function scrollToSurvey() {
  document.getElementById('survey').scrollIntoView({ behavior: 'smooth' });
}

// xử lý submit
async function handleFormSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));

  // checkbox q3 & q19
  data.q3  = [...form.q3] .filter(i => i.checked).map(i => i.value).join(',');
  data.q19 = [...form.q19].filter(i => i.checked).map(i => i.value).join(',');

  data.timestamp = new Date().toISOString();

  // gửi Sheets
  await fetch(SHEET_URL, {
    method: 'POST',
    body: new URLSearchParams({ data: JSON.stringify(data) }),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  // thông báo đẹp
  anime({
    targets: '.q-block',
    opacity: [1, 0],
    translateY: 20,
    duration: 600,
    easing: 'easeOutExpo',
    complete: () => {
      alert('Cảm ơn bạn! Dữ liệu đã được lưu.');
      location.href = 'dashboard.html';
    }
  });
}

// hiệu ứng hero giữ nguyên repo cũ
document.addEventListener('DOMContentLoaded', () => {
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
});
