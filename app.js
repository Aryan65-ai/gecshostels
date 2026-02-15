(function () {
  function getStore(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function setStore(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { } }
  function appendLog(key, entry) { const list = getStore(key, []); list.push({ time: new Date().toISOString(), ...entry }); setStore(key, list); }
  const yearEl = document.getElementById('year');
  if (yearEl) { yearEl.textContent = String(new Date().getFullYear()); }

  // ── Notices ──
  const defaultNotices = [
    { id: 1, text: 'Admission for Semester VII hostel opens on 15th Sept.' },
    { id: 2, text: 'Mess will be closed on public holiday (19th Sept).' },
    { id: 3, text: 'Submit anti-ragging affidavit before 30th Sept.' }
  ];
  const notices = getStore('notices', defaultNotices);
  const noticeList = document.getElementById('noticeList');
  if (noticeList) {
    if (notices.length === 0) {
      noticeList.innerHTML = '<p class="muted" style="padding:12px 0;">No notices at this time.</p>';
    } else {
      notices.forEach(n => {
        const div = document.createElement('div');
        div.className = 'notice-item';
        div.innerHTML = '<div class="notice-dot"></div><div class="notice-text">' + (n.text || '') + '</div>';
        noticeList.appendChild(div);
      });
    }
  }

  // ── Rooms (admin-managed via localStorage) ──
  const floors = [1, 2, 3, 4];

  function getDefaultRooms() {
    const rooms = [];
    floors.forEach(floor => {
      for (let i = 1; i <= 10; i++) {
        const capacity = i % 3 === 0 ? 3 : 1;
        rooms.push({ floor, room: `${floor}0${i}`, type: capacity === 1 ? 'single' : 'triple', available: true });
      }
    });
    return rooms;
  }

  const roomsDb = getStore('hostel_rooms', getDefaultRooms());
  if (!localStorage.getItem('hostel_rooms')) {
    setStore('hostel_rooms', roomsDb);
  }

  const floorSelect = document.getElementById('floorSelect');
  const roomTypeSelect = document.getElementById('roomTypeSelect');
  const roomResults = document.getElementById('roomResults');

  function populateFloors() {
    if (!floorSelect) return;
    floorSelect.innerHTML = '';
    const uniqueFloors = [...new Set(roomsDb.map(r => r.floor))].sort((a, b) => a - b);
    uniqueFloors.forEach(f => {
      const opt = document.createElement('option');
      opt.value = String(f);
      opt.textContent = 'Floor ' + f;
      floorSelect.appendChild(opt);
    });
  }

  function renderRooms() {
    if (!roomResults) return;
    roomResults.innerHTML = '';
    const floor = Number(floorSelect?.value || floors[0]);
    const type = roomTypeSelect?.value || 'any';
    const filtered = roomsDb.filter(r => r.floor === floor && r.available && (type === 'any' || r.type === type));
    if (filtered.length === 0) {
      roomResults.innerHTML = '<p class="muted" style="padding:16px 0;text-align:center;">No rooms available with current filters.</p>';
      return;
    }
    filtered.forEach(r => {
      const card = document.createElement('div');
      card.className = 'room-card';
      const typeLabel = r.type.charAt(0).toUpperCase() + r.type.slice(1);
      card.innerHTML = '<strong>Room ' + r.room + '</strong><br><span class="muted">Floor ' + r.floor + ' · ' + typeLabel + '</span>';
      roomResults.appendChild(card);
    });
  }

  if (floorSelect) {
    populateFloors();
    renderRooms();
    floorSelect.addEventListener('change', renderRooms);
  }
  if (roomTypeSelect) { roomTypeSelect.addEventListener('change', renderRooms); }

  // ── Quick Stats ──
  const qsRooms = document.getElementById('qsRooms');
  const qsStudents = document.getElementById('qsStudents');
  const qsNotices = document.getElementById('qsNotices');
  if (qsRooms) {
    const availCount = roomsDb.filter(r => r.available).length;
    qsRooms.textContent = String(availCount);
  }
  if (qsStudents) {
    const users = getStore('hostelUsers', []);
    qsStudents.textContent = String(users.length);
  }
  if (qsNotices) {
    qsNotices.textContent = String(notices.length);
  }

  // ── Fees (dynamic from admin) ──
  const messFeesAmount = document.getElementById('messFeesAmount');
  const hostelFeesList = document.getElementById('hostelFeesList');
  const fees = getStore('fees', { mess: '₹ 3,500 / month', single: '₹ 18,000 / year', triple: '₹ 15,000 / year' });
  if (messFeesAmount) { messFeesAmount.textContent = fees.mess; }
  if (hostelFeesList) {
    const items = [
      { label: 'Single Room', amount: fees.single },
      { label: 'Triple Room', amount: fees.triple }
    ];
    items.forEach(i => {
      const li = document.createElement('li');
      li.innerHTML = '<strong>' + i.label + '</strong> — <span class="muted">' + i.amount + '</span>';
      hostelFeesList.appendChild(li);
    });
  }

  // ── i-Complain ──
  const complainForm = document.getElementById('complainForm');
  const complainMsg = document.getElementById('complainMsg');
  if (complainForm) {
    complainForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const studentId = document.getElementById('complainStudentId').value.trim();
      const category = document.getElementById('complainCategory').value;
      const description = document.getElementById('complainText').value.trim();
      const ticket = Math.floor(Math.random() * 90000 + 10000);

      const complaint = {
        ticket: ticket,
        studentId: studentId,
        category: category,
        description: description,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        priority: category === 'security' ? 'high' : category === 'maintenance' ? 'medium' : 'low'
      };

      appendLog('complaints', complaint);
      complainMsg.innerHTML = '✅ Complaint submitted successfully! Ticket: <strong>#' + ticket + '</strong>';
      complainMsg.style.color = '#10b981';
      complainForm.reset();
    });
  }
})();
