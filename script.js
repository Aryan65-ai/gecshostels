// ===== DOM Ready =====
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initNotices();
  initRoomGrid();
  initComplainForm();
  initScrollAnimations();
  initCounters();
});

// ===== Sticky Navbar =====
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('open');
    });
  }

  // Close menu on link click (mobile)
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger?.classList.remove('active');
      navLinks?.classList.remove('open');
    });
  });
}

// ===== Notices Auto-Scroll =====
function initNotices() {
  const list = document.querySelector('.notice-list');
  if (!list) return;

  const notices = [
    { icon: '📢', title: 'Hostel Fee Deadline Extended to May 15, 2026', date: 'May 2, 2026' },
    { icon: '🔧', title: 'Water supply maintenance on Block-B, May 5', date: 'May 1, 2026' },
    { icon: '🏠', title: 'Room allotment for 2026-27 session begins June 1', date: 'Apr 30, 2026' },
    { icon: '📋', title: 'Mess menu updated — Check noticeboard', date: 'Apr 28, 2026' },
    { icon: '⚡', title: 'Power backup schedule revised for summer', date: 'Apr 27, 2026' },
    { icon: '🧹', title: 'Deep cleaning drive on May 10 — All blocks', date: 'Apr 25, 2026' },
    { icon: '🎉', title: 'Hostel Day celebrations on May 20', date: 'Apr 24, 2026' },
    { icon: '📝', title: 'Submit caution deposit receipts by May 8', date: 'Apr 23, 2026' },
  ];

  // Render notices (duplicate for seamless scroll)
  const html = notices.map(n => `
    <div class="notice-item">
      <div class="notice-icon">${n.icon}</div>
      <div>
        <h4>${n.title}</h4>
        <span>${n.date}</span>
      </div>
    </div>
  `).join('');

  list.innerHTML = html + html;
}

// ===== Room Grid =====
function initRoomGrid() {
  const grid = document.querySelector('.room-grid');
  if (!grid) return;

  const totalRooms = 48;
  const rooms = [];

  for (let i = 1; i <= totalRooms; i++) {
    const rand = Math.random();
    let status = 'available';
    if (rand > 0.35) status = 'occupied';
    else if (rand > 0.25) status = 'maintenance';
    rooms.push({ number: i, status });
  }

  grid.innerHTML = rooms.map(r => `
    <div class="room-cell ${r.status}" title="Room ${r.number} — ${r.status}">
      ${r.number}
    </div>
  `).join('');

  // Update stat counts
  const available = rooms.filter(r => r.status === 'available').length;
  const occupied = rooms.filter(r => r.status === 'occupied').length;
  const maintenance = rooms.filter(r => r.status === 'maintenance').length;

  const statNums = document.querySelectorAll('.stat-num');
  if (statNums.length >= 4) {
    statNums[0].setAttribute('data-target', totalRooms);
    statNums[1].setAttribute('data-target', available);
    statNums[2].setAttribute('data-target', occupied);
    statNums[3].setAttribute('data-target', maintenance);
  }
}

// ===== Counter Animation =====
function initCounters() {
  const counters = document.querySelectorAll('.stat-num');
  const speed = 40;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target')) || 0;
        let count = 0;
        const increment = Math.max(1, Math.ceil(target / speed));
        const timer = setInterval(() => {
          count += increment;
          if (count >= target) {
            el.textContent = target;
            clearInterval(timer);
          } else {
            el.textContent = count;
          }
        }, 30);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

// ===== Complain Form =====
function initComplainForm() {
  const form = document.getElementById('complainForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = form.querySelector('#c-name').value.trim();
    const room = form.querySelector('#c-room').value.trim();
    const type = form.querySelector('#c-type').value;
    const issue = form.querySelector('#c-issue').value.trim();

    if (!name || !room || !type || !issue) {
      showToast('Please fill all fields!', 'error');
      return;
    }

    // Simulate submission
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Submitting...';
    btn.disabled = true;

    setTimeout(() => {
      showToast('✅ Complaint submitted successfully! We\'ll respond within 48 hours.', 'success');
      form.reset();
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 1500);
  });
}

// ===== Toast Notification =====
function showToast(message, type = 'success') {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `toast ${type}`;
  
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ===== Scroll Animations =====
function initScrollAnimations() {
  const sections = document.querySelectorAll('.section');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  sections.forEach(s => {
    s.style.opacity = '0';
    s.style.transform = 'translateY(30px)';
    s.style.transition = 'all 0.6s ease';
    observer.observe(s);
  });
}
