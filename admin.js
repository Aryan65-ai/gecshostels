// admin.js - Admin dashboard logic
(function () {
    const dash = document.getElementById('admin-dashboard');
    const loginCard = document.getElementById('admin-login-card');
    const loginMsg = document.getElementById('adminLoginMsg');
    const loginForm = document.getElementById('adminLoginForm');
    const postNoticeForm = document.getElementById('postNoticeForm');
    const updateFeesForm = document.getElementById('updateFeesForm');

    // ── Auth ──
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('adminUser').value.trim();
        const p = document.getElementById('adminPass').value.trim();

        loginMsg.textContent = 'Verifying...';
        loginMsg.style.color = 'var(--muted)';

        try {
            // Map 'admin' to email if needed
            const email = u === 'admin' ? 'admin@gec.ac.in' : u;
            // If using backend, we need the real password. If local, 'admin' works.
            // We'll try API login first.

            let user = null;
            try {
                user = await API.login(email, p);
            } catch (err) {
                // failed or offline. Fallback to hardcoded local check for demo
                if (u === 'admin' && p === 'admin') {
                    user = { role: 'admin', fullName: 'Administrator', email: 'admin@gec.ac.in' };
                    localStorage.setItem('loggedInUser', JSON.stringify(user));
                } else {
                    throw err;
                }
            }

            if (user && user.role === 'admin') {
                showDashboard();
            } else {
                loginMsg.textContent = 'Access denied. Admin role required.';
                loginMsg.style.color = '#ef4444';
                API.logout();
            }
        } catch (err) {
            loginMsg.textContent = 'Invalid credentials.';
            loginMsg.style.color = '#ef4444';
        }
    });

    document.getElementById('adminLogout').addEventListener('click', () => {
        API.logout();
        dash.classList.add('hidden');
        loginCard.classList.remove('hidden');
        loginForm.reset();
        loginMsg.textContent = '';
    });

    function showDashboard() {
        loginCard.classList.add('hidden');
        dash.classList.remove('hidden');
        loadData();
    }

    // Check if already logged in
    const currentUser = API.getCurrentUser();
    if (currentUser && currentUser.role === 'admin') {
        showDashboard();
    }

    // ── Data Loading ──
    async function loadData() {
        updateStats();
        loadStudents();
        loadPayments();
        loadRooms();
        loadComplaints();
    }

    // ── Stats ──
    async function updateStats() {
        try {
            const stats = await API.getStats(); // { students, availableRooms, notices, ... }
            setText('totalStudents', stats.students);
            setText('statTotalRooms', stats.availableRooms + (stats.occupiedRooms || 0)); // simple approximation
            setText('statAvailableRooms', stats.availableRooms);

            // We can also fetch pending payments count
            const payments = await API.adminGetAllPayments();
            setText('pendingPayments', payments.filter(p => p.status === 'pending').length);

            // Revenue calculation (local mainly, or simple sum)
            const revenue = payments.filter(p => p.status === 'success' || p.status === 'completed')
                .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            setText('totalRevenue', '₹' + revenue.toLocaleString());
            setText('totalTransactions', payments.length);

        } catch (e) {
            console.error(e);
        }
    }

    function setText(id, txt) {
        const el = document.getElementById(id);
        if (el) el.textContent = txt;
    }

    // ── Students ──
    async function loadStudents() {
        const table = document.getElementById('studentsTable');
        if (!table) return;
        table.innerHTML = '<p class="muted">Loading...</p>';

        try {
            const students = await API.adminGetStudents();
            if (!students || students.length === 0) {
                table.innerHTML = '<p class="muted">No students found.</p>';
                return;
            }

            let html = '<div class="admin-table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead><tbody>';
            students.forEach(s => {
                html += `<tr>
          <td>${s.fullName || s.full_name || '—'}</td>
          <td>${s.email || '—'}</td>
          <td>${s.phone || '—'}</td>
          <td>${s.role || '—'}</td>
        </tr>`;
            });
            html += '</tbody></table></div>';
            table.innerHTML = html;

            // Update counts
            setText('totalStudents', students.length);
        } catch (e) {
            table.innerHTML = '<p class="muted">Failed to load students.</p>';
        }
    }

    // ── Payments ──
    async function loadPayments() {
        const pendingContainer = document.getElementById('pendingPaymentsList');
        const allContainer = document.getElementById('tablePayments');

        try {
            const payments = await API.adminGetAllPayments(); // Returns mixed array

            // Pending
            const pending = payments.filter(p => p.status === 'pending');
            if (pendingContainer) {
                if (pending.length === 0) {
                    pendingContainer.innerHTML = '<p class="muted">No pending payments.</p>';
                } else {
                    pendingContainer.innerHTML = pending.map(p => `
            <div class="pending-payment-card">
              <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:16px;">
                <div style="flex:1;min-width:200px;">
                  <h4 style="margin:0 0 8px 0;">${p.studentName || p.student_name || '—'}</h4>
                  <p><strong>Amount:</strong> ₹${(p.amount || 0).toLocaleString()}</p>
                  <p><strong>Type:</strong> ${p.feeType || p.fee_type || '—'}</p>
                  <p><strong>Method:</strong> ${p.method || p.paymentMethod || '—'}</p>
                  <p><strong>Txn ID:</strong> ${p.transactionId || p.transaction_id || '—'}</p>
                  ${p.screenshotData ? `<p style="color:#10b981;">📷 Screenshot attached</p>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  <button class="btn primary" onclick="confirmPayment(${p.id}, '${p.transactionId || p.transaction_id || ''}')">✅ Confirm</button>
                  <button class="btn" style="background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.5);" onclick="rejectPayment(${p.id}, '${p.transactionId || p.transaction_id || ''}')">❌ Reject</button>
                </div>
              </div>
            </div>
          `).join('');
                }
            }

            // All Payments Table
            if (allContainer) {
                let html = '<div class="admin-table-wrap admin-table-scroll"><table><thead><tr><th>Date</th><th>Student</th><th>Amount</th><th>Status</th></tr></thead><tbody>';
                payments.forEach(p => {
                    const date = p.paid_at || p.timestamp || p.created_at;
                    const dStr = date ? new Date(date).toLocaleDateString() : '—';
                    html += `<tr>
                <td>${dStr}</td>
                <td>${p.studentName || p.student_name || '—'}</td>
                <td>₹${Number(p.amount || 0).toLocaleString()}</td>
                <td>${p.status}</td>
            </tr>`;
                });
                html += '</tbody></table></div>';
                allContainer.innerHTML = html;
            }

        } catch (e) {
            console.error(e);
            if (pendingContainer) pendingContainer.innerHTML = '<p class="muted">Error loading payments.</p>';
        }
    }

    window.confirmPayment = async function (paymentId, txnId) {
        if (!confirm('Confirm this payment?')) return;
        try {
            const data = {};
            if (txnId) data.transactionId = txnId;
            if (paymentId) data.paymentId = paymentId;
            await API.adminConfirmPayment(data);
            alert('Payment confirmed.');
            loadPayments();
            updateStats();
        } catch (e) {
            alert('Failed to confirm payment.');
        }
    };

    window.rejectPayment = async function (paymentId, txnId) {
        if (!confirm('Reject this payment?')) return;
        try {
            const data = {};
            if (txnId) data.transactionId = txnId;
            if (paymentId) data.paymentId = paymentId;
            await API.adminRejectPayment(data);
            alert('Payment rejected.');
            loadPayments();
            updateStats();
        } catch (e) {
            alert('Failed to reject payment.');
        }
    };

    // ── Rooms ──
    const addRoomForm = document.getElementById('addRoomForm');
    if (addRoomForm) {
        addRoomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const floor = Number(document.getElementById('roomFloor').value);
            const roomNum = document.getElementById('roomNumber').value.trim();
            const type = document.getElementById('roomType').value;
            const available = document.getElementById('roomAvailable').checked;

            if (!roomNum) return;
            try {
                await API.saveRoom({ floor, room: roomNum, type, available });
                alert('Room saved!');
                addRoomForm.reset();
                loadRooms(); // Refresh table
                updateStats();
            } catch (err) {
                alert('Failed to save room.');
            }
        });

        const floorFilter = document.getElementById('filterRoomFloor');
        const typeFilter = document.getElementById('filterRoomType');
        if (floorFilter) floorFilter.addEventListener('change', loadRooms);
        if (typeFilter) typeFilter.addEventListener('change', loadRooms);
    }

    // Global helpers
    window.toggleRoomAvail = async function (roomNum) {
        try {
            const rooms = await API.getRooms();
            const r = rooms.find(x => x.room == roomNum);
            if (r) {
                await API.saveRoom({ ...r, available: !r.available });
                loadRooms();
                updateStats();
            }
        } catch (e) { alert('Action failed'); }
    };

    window.deleteRoom = async function (roomNum) {
        if (!confirm('Delete room ' + roomNum + '?')) return;
        try {
            await API.deleteRoom(roomNum);
            loadRooms();
            updateStats();
        } catch (e) { alert('Delete failed'); }
    };

    async function loadRooms() {
        const container = document.getElementById('adminRoomsTable');
        if (!container) return;
        try {
            const rooms = await API.getRooms();
            // Filter logic if filters exist
            const floorFilter = document.getElementById('filterRoomFloor');
            const typeFilter = document.getElementById('filterRoomType');
            let filtered = rooms;
            if (floorFilter && floorFilter.value) filtered = filtered.filter(r => String(r.floor) === floorFilter.value);
            if (typeFilter && typeFilter.value) filtered = filtered.filter(r => r.type === typeFilter.value);

            if (filtered.length === 0) {
                container.innerHTML = '<p class="muted">No rooms found.</p>';
                return;
            }

            let html = '<div class="admin-table-wrap"><table><thead><tr><th>Room</th><th>Floor</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
            filtered.sort((a, b) => a.room.localeCompare(b.room));
            filtered.forEach(r => {
                const status = r.available ? '<span style="color:#10b981">Available</span>' : '<span style="color:#ef4444">Occupied</span>';
                const toggleLabel = r.available ? 'Set Occupied' : 'Set Available';
                html += `<tr>
                    <td>${r.room}</td>
                    <td>${r.floor}</td>
                    <td>${r.type}</td>
                    <td>${status}</td>
                    <td>
                        <button class="btn" style="padding:4px 8px;font-size:12px" onclick="toggleRoomAvail('${r.room}')">${toggleLabel}</button>
                        <button class="btn" style="padding:4px 8px;font-size:12px;color:#ef4444" onclick="deleteRoom('${r.room}')">Delete</button>
                    </td>
                </tr>`;
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;

        } catch (e) {
            container.innerHTML = '<p class="muted">Failed to load rooms.</p>';
        }
    }

    // ── Complaints ──
    async function loadComplaints() {
        const container = document.getElementById('complaintsTable');
        if (!container) return;
        try {
            const complaints = await API.getComplaints();
            if (!complaints || complaints.length === 0) {
                container.innerHTML = '<p class="muted">No complaints.</p>';
                return;
            }

            let html = '<div class="admin-table-wrap"><table><thead><tr><th>Ticket</th><th>Category</th><th>Description</th><th>Status</th></tr></thead><tbody>';
            complaints.forEach(c => {
                html += `<tr>
            <td>${c.ticket || '#'}</td>
            <td>${c.category}</td>
            <td>${c.description}</td>
            <td>${c.status}</td>
          </tr>`;
            });
            html += '</tbody></table></div>';
            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = '<p class="muted">Failed to load complaints.</p>';
        }
    }

    // ── Notices ──
    if (postNoticeForm) {
        postNoticeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const txt = document.getElementById('noticeText').value.trim();
            if (!txt) return;

            try {
                await API.addNotice(txt);
                alert('Notice published!');
                postNoticeForm.reset();
                updateStats(); // Refresh stats (notice count)
            } catch (err) {
                alert('Failed to publish notice.');
            }
        });
    }

    // ── Fees ──
    if (updateFeesForm) {
        // Load current fees
        const fees = API.getFees();
        if (fees) {
            if (document.getElementById('messFee')) document.getElementById('messFee').value = fees.mess;
            if (document.getElementById('singleFee')) document.getElementById('singleFee').value = fees.single;
            if (document.getElementById('tripleFee')) document.getElementById('tripleFee').value = fees.triple;
        }

        updateFeesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mess = document.getElementById('messFee').value.trim();
            const single = document.getElementById('singleFee').value.trim();
            const triple = document.getElementById('tripleFee').value.trim();

            API.setFees({ mess, single, triple });
            alert('Fees updated (stored locally).');
        });
    }

    // Refresh buttons
    const refreshBtns = document.querySelectorAll('#refreshPendingPayments, #refreshScreenshots, .btn-refresh');
    refreshBtns.forEach(btn => btn.addEventListener('click', loadData));

})();
