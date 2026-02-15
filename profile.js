// profile.js - Handles student profile auth and dashboard
(function () {
    // Update year in footer
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // ── Auth Handling ──
    const authSection = document.getElementById('authSection');
    const profileDashboard = document.getElementById('profileDashboard');

    // Check login on load
    async function init() {
        let user = API.getCurrentUser();
        if (user) {
            // Try to fetch fresh profile from backend
            try {
                const freshUser = await API.getProfile();
                if (freshUser && freshUser.id) {
                    user = freshUser;
                    // Update localStorage with fresh data
                    localStorage.setItem('loggedInUser', JSON.stringify(user));
                }
            } catch (e) {
                // offline or invalid token — use cached user
            }
            showProfileDashboard(user);
        } else {
            showAuth();
        }
    }

    function showAuth() {
        if (authSection) authSection.classList.remove('hidden');
        if (profileDashboard) profileDashboard.classList.remove('active');
    }

    // Tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const target = tab.dataset.tab;
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(target + 'Form').classList.add('active');
        });
    });

    // Sign In
    const signinForm = document.getElementById('signinForm');
    if (signinForm) {
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailObj = document.getElementById('signinStudentId'); // Actually using this field for Email/ID
            // The HTML says "Student ID / Email", so let's check
            const identifier = emailObj.value.trim();
            const password = document.getElementById('signinPassword').value;
            const msg = document.getElementById('signinMessage');

            if (!identifier || !password) {
                msg.textContent = 'Please fill in all fields.';
                msg.style.color = '#ef4444';
                return;
            }

            msg.textContent = 'Signing in...';
            msg.style.color = 'var(--muted)';

            try {
                // Our API.login expects email. If user entered Student ID, it might fail against backend 
                // unless backend supports ID. The backend currently SELECT WHERE email=?.
                // For now, assume user enters email.
                const user = await API.login(identifier, password);
                msg.textContent = 'Login successful!';
                msg.style.color = '#10b981';
                setTimeout(() => showProfileDashboard(user), 500);
            } catch (err) {
                msg.textContent = err.error || 'Invalid credentials.';
                msg.style.color = '#ef4444';
            }
        });
    }

    // Sign Up
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const msg = document.getElementById('signupMessage');

            if (password !== confirmPassword) {
                msg.textContent = 'Passwords do not match.';
                msg.style.color = '#ef4444';
                return;
            }

            msg.textContent = 'Creating account...';
            msg.style.color = 'var(--muted)';

            try {
                const photoData = await getPhotoData();
                const userData = {
                    firstName: document.getElementById('firstName').value,
                    lastName: document.getElementById('lastName').value,
                    studentId: document.getElementById('studentId').value,
                    rollNumber: document.getElementById('rollNumber').value,
                    batch: document.getElementById('batch').value,
                    branch: document.getElementById('branch').value,
                    email: document.getElementById('email').value,
                    phone: document.getElementById('phone').value,
                    hostelType: document.getElementById('hostelType').value,
                    roomNumber: document.getElementById('roomNumber').value,
                    roomPreference: document.getElementById('roomPreference').value,
                    password: password,
                    photo: photoData
                };

                await API.signup(userData);

                msg.textContent = 'Account created successfully!';
                msg.style.color = '#10b981';

                // Auto-login or just show dashboard since API.signup also stores user
                setTimeout(() => {
                    const user = API.getCurrentUser();
                    showProfileDashboard(user);
                }, 1000);
            } catch (err) {
                console.error(err);
                msg.textContent = err.error || 'Signup failed. Please try again.';
                msg.style.color = '#ef4444';
            }
        });
    }

    // Photo Preview
    const photoInput = document.getElementById('studentPhoto');
    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = document.getElementById('previewImg');
                    if (img) img.src = ev.target.result;
                    const box = document.getElementById('photoPreview');
                    if (box) box.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function getPhotoData() {
        return new Promise((resolve) => {
            const fileInput = document.getElementById('studentPhoto');
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(fileInput.files[0]);
            } else {
                resolve(null);
            }
        });
    }

    // ── Dashboard Logic ──
    async function showProfileDashboard(user) {
        if (authSection) authSection.classList.add('hidden');
        if (profileDashboard) profileDashboard.classList.add('active');

        // Basic Info
        const fullName = user.fullName || (user.firstName + ' ' + user.lastName);
        setText('profileName', fullName);
        setText('profileStudentId', `Student ID: ${user.studentId || '—'}`);

        // Avatar
        const avatar = document.getElementById('profileAvatar');
        if (avatar) {
            if (user.photo || user.photo_url) {
                avatar.innerHTML = `<img src="${user.photo || user.photo_url}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            } else {
                avatar.textContent = (user.firstName?.[0] || 'S') + (user.lastName?.[0] || '');
            }
        }

        // Details Tab
        setText('infoFullName', fullName);
        setText('infoStudentId', user.studentId || '—');
        setText('infoRollNumber', user.rollNumber || '—');
        setText('infoEmail', user.email || '—');
        setText('infoPhone', user.phone || '—');
        setText('infoBatch', user.batch || '—');
        setText('infoBranch', user.branch || '—');
        setText('infoHostelType', user.hostelType === 'girls' ? 'Girls Hostel' : 'Boys Hostel');
        setText('infoRoomNumber', user.assignedRoom || user.roomNumber || 'Not Assigned');
        setText('infoRoomType', user.roomPreference || '—');

        // Floor logic
        const roomNum = user.assignedRoom || user.roomNumber;
        let floorText = '—';
        if (roomNum) {
            const f = parseInt(roomNum.charAt(0));
            if (!isNaN(f)) floorText = f + (f === 1 ? 'st' : f === 2 ? 'nd' : f === 3 ? 'rd' : 'th') + ' Floor';
        }
        setText('infoFloor', floorText);

        // Academic Year
        let acadYear = user.batch || '—';
        if (user.batch && parseInt(user.batch)) {
            const b = parseInt(user.batch);
            acadYear = `${b}-${String(b + 1).slice(-2)}`;
        }
        setText('infoAcademicYearAcad', acadYear);
        setText('infoAcademicYear', acadYear);

        // Payments & Fees
        updateFinancials(user);
        renderMyPayments(await API.getMyBookings(), await API.getPayments());
        // Note: getMyBookings returns bookings, getPayments returns payments. 
        // The profile page combines them or shows payments. 
        // actually renderMyPayments expects a list of payment records. 
        // API.getPayments() returns user payments if logged in student.
    }

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function updateFinancials(user) {
        const fees = API.getFees();
        const parseFee = (str) => parseInt(String(str).replace(/[₹,\s]/g, '').split('/')[0]) || 0;

        let hostelFee = typeof fees.single === 'number' ? fees.single : parseFee(fees.single);
        if ((user.roomPreference || '').toLowerCase() === 'triple') {
            hostelFee = typeof fees.triple === 'number' ? fees.triple : parseFee(fees.triple);
        }
        const messFee = typeof fees.mess === 'number' ? fees.mess : parseFee(fees.mess);

        setText('infoHostelFees', '₹' + hostelFee.toLocaleString());
        setText('infoMessFees', '₹' + messFee.toLocaleString());
        setText('infoTotalDue', '₹' + (hostelFee + messFee).toLocaleString());
    }

    async function renderMyPayments(bookings, payments) {
        // We can merge bookings and payments if we want, but for now let's just show payments
        // because that's what the UI expects (list of transactions)
        const container = document.getElementById('myPaymentsList');
        if (!container) return;

        // Fetch fresh payments if passed array is undefined
        if (!payments) payments = await API.getPayments();

        if (!payments || payments.length === 0) {
            container.innerHTML = '<p class="muted" style="margin:0;">No payments yet. <a href="payment.html">Pay fees</a></p>';

            // Update status badges
            const statusEl = document.getElementById('infoPaymentStatus');
            const lastEl = document.getElementById('infoLastPayment');
            if (statusEl) {
                statusEl.textContent = 'No payments';
                statusEl.className = 'info-value status-inactive';
            }
            if (lastEl) lastEl.textContent = 'Not Paid';
            return;
        }

        // Sort by date desc
        payments.sort((a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0));

        // Update status badges based on latest payment
        const statusEl = document.getElementById('infoPaymentStatus');
        const lastEl = document.getElementById('infoLastPayment');

        // Check if any payment is 'success' (DB) or 'completed' (local)
        const hasSuccess = payments.some(p => p.status === 'success' || p.status === 'completed');
        const hasPending = payments.some(p => p.status === 'pending');

        if (statusEl) {
            if (hasSuccess) {
                statusEl.textContent = 'Paid';
                statusEl.className = 'info-value status-active';
            } else if (hasPending) {
                statusEl.textContent = 'Pending';
                statusEl.className = 'info-value status-pending';
            } else {
                statusEl.textContent = 'Unpaid';
                statusEl.className = 'info-value status-inactive';
            }
        }

        if (lastEl) {
            const last = payments[0];
            const amt = last.amount ? Number(last.amount).toLocaleString() : '0';
            const date = last.paid_at || last.timestamp || last.created_at;
            const dateStr = date ? new Date(date).toLocaleDateString() : '';
            lastEl.textContent = `₹${amt} on ${dateStr}`;
        }

        // Render list
        let html = '<ul class="list" style="margin:0; padding:0; list-style:none;">';
        payments.slice(0, 8).forEach(p => {
            const date = p.paid_at || p.timestamp || p.created_at;
            const dateStr = date ? new Date(date).toLocaleDateString() : '—';
            const amt = '₹' + (p.amount ? Number(p.amount).toLocaleString() : '0');
            const type = (p.fee_type || p.feeType || '—').replace(/_/g, ' ');
            const status = p.status || '—';

            let statusClass = 'status-inactive';
            if (status === 'success' || status === 'completed') statusClass = 'status-active';
            else if (status === 'pending') statusClass = 'status-pending';

            html += `
        <li style="padding:10px 0; border-bottom:1px dashed var(--border); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <span><strong>${amt}</strong> ${type}</span>
          <span><span class="status-badge ${statusClass}">${status}</span> ${dateStr}</span>
        </li>`;
        });
        html += '</ul>';

        if (payments.length > 8) html += '<p class="muted" style="margin-top:8px; margin-bottom:0;">Showing latest 8. <a href="payment.html">Pay fees</a></p>';
        else html += '<p class="muted" style="margin-top:8px; margin-bottom:0;"><a href="payment.html">Pay fees</a></p>';

        container.innerHTML = html;
    }

    // Bind logout
    window.logout = function () {
        API.logout();
        location.reload();
    };

    // Missing button handlers
    window.editProfile = function () {
        alert('Edit Profile feature is coming soon.');
    };
    window.viewRoomDetails = function () {
        alert('Room details are displayed in "Hostel Information" card.');
    };
    window.viewMessMenu = function () {
        alert('Mess menu is displayed on the Home/Hostel page.');
    };

    // Run init
    init();

})();
