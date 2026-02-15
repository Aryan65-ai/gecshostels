(function () {
  // ── Year in footer ──
  const yearEl = document.getElementById('year');
  if (yearEl) { yearEl.textContent = String(new Date().getFullYear()); }

  // ══════════════════════════════════════
  //  INIT: Load data from API (or localStorage fallback)
  // ══════════════════════════════════════
  async function init() {
    // ── Notices ──
    const noticeList = document.getElementById('noticeList');
    if (noticeList) {
      try {
        const notices = await API.getNotices();
        if (notices.length === 0) {
          noticeList.innerHTML = '<p class="muted" style="padding:12px 0;">No notices at this time.</p>';
        } else {
          noticeList.innerHTML = '';
          notices.forEach(n => {
            const div = document.createElement('div');
            div.className = 'notice-item';
            div.innerHTML = '<div class="notice-dot"></div><div class="notice-text">' + (n.text || '') + '</div>';
            noticeList.appendChild(div);
          });
        }
        // Update notice count in quick stats
        const qsNotices = document.getElementById('qsNotices');
        if (qsNotices) qsNotices.textContent = String(notices.length);
      } catch (err) {
        console.error('[app.js] Failed to load notices:', err);
      }
    }

    // ── Rooms ──
    const floorSelect = document.getElementById('floorSelect');
    const roomTypeSelect = document.getElementById('roomTypeSelect');
    const roomResults = document.getElementById('roomResults');
    let roomsDb = [];

    if (floorSelect || roomResults) {
      try {
        roomsDb = await API.getRooms();
      } catch (err) {
        console.error('[app.js] Failed to load rooms:', err);
        roomsDb = [];
      }

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
        const floor = Number(floorSelect?.value || 1);
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

      populateFloors();
      renderRooms();
      if (floorSelect) floorSelect.addEventListener('change', renderRooms);
      if (roomTypeSelect) roomTypeSelect.addEventListener('change', renderRooms);

      // Update room count in quick stats
      const qsRooms = document.getElementById('qsRooms');
      if (qsRooms) qsRooms.textContent = String(roomsDb.filter(r => r.available).length);
    }

    // ── Quick Stats ──
    const qsStudents = document.getElementById('qsStudents');
    if (qsStudents) {
      try {
        const stats = await API.getStats();
        qsStudents.textContent = String(stats.students);
      } catch {
        qsStudents.textContent = '0';
      }
    }

    // ── Fees (dynamic from admin — fetched from backend) ──
    const messFeesAmount = document.getElementById('messFeesAmount');
    const hostelFeesList = document.getElementById('hostelFeesList');
    const fees = await API.getFees();
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
      complainForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const studentId = document.getElementById('complainStudentId').value.trim();
        const category = document.getElementById('complainCategory').value;
        const description = document.getElementById('complainText').value.trim();

        try {
          const result = await API.submitComplaint({ studentId, category, description });
          const ticket = result.ticket;
          complainMsg.innerHTML = '✅ Complaint submitted successfully! Ticket: <strong>#' + ticket + '</strong>';
          complainMsg.style.color = '#10b981';
          complainForm.reset();
        } catch (err) {
          complainMsg.innerHTML = '❌ Failed to submit complaint. Please try again.';
          complainMsg.style.color = '#ef4444';
          console.error(err);
        }
      });
    }
  }

  // Run init
  init().catch(err => console.error('[app.js] Init error:', err));

  // Auto-refresh data when user comes back to this tab
  // This ensures admin updates (notices, rooms, fees) show up on other devices
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      API.resetBackendCache(); // Force re-check backend
      init().catch(err => console.error('[app.js] Refresh error:', err));
    }
  });
})();
