/**
 * Project Management Vanilla JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  // Auto-hide success alerts after 5 seconds
  const successAlerts = document.querySelectorAll('.alert-success');
  successAlerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-10px)';
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  });
});
