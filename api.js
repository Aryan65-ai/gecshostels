/**
 * api.js — Central API service for GEC Hostel Management System
 * 
 * This module provides a unified interface to the backend API.
 * If the backend is unavailable (e.g. hosted on GitHub Pages),
 * it automatically falls back to localStorage so the app still works.
 */
const API = (function () {
    const BASE = window.location.origin;
    let _token = localStorage.getItem('authToken') || null;
    let _backendAvailable = null; // null = not checked yet

    // ── Helpers ──
    function setToken(token) {
        _token = token;
        if (token) localStorage.setItem('authToken', token);
        else localStorage.removeItem('authToken');
    }

    function getToken() {
        return _token || localStorage.getItem('authToken');
    }

    function headers(extra = {}) {
        const h = { 'Content-Type': 'application/json', ...extra };
        const t = getToken();
        if (t) h['Authorization'] = 'Bearer ' + t;
        return h;
    }

    async function request(method, path, body = null) {
        const opts = { method, headers: headers() };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(BASE + path, opts);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw { status: res.status, ...data };
        return data;
    }

    // ── Check if backend is running ──
    async function checkBackend() {
        if (_backendAvailable !== null) return _backendAvailable;
        try {
            const res = await fetch(BASE + '/health', { method: 'GET', signal: AbortSignal.timeout(3000) });
            const data = await res.json();
            _backendAvailable = data && data.ok === true;
        } catch {
            _backendAvailable = false;
        }
        console.log('[API] Backend available:', _backendAvailable);
        return _backendAvailable;
    }

    // ── localStorage helpers (fallback) ──
    function getStore(key, fallback) {
        try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    }
    function setStore(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { }
    }

    // ══════════════════════════════════════
    //  AUTH
    // ══════════════════════════════════════
    async function signup(data) {
        const online = await checkBackend();
        if (online) {
            const res = await request('POST', '/api/auth/signup', {
                full_name: data.fullName || (data.firstName + ' ' + data.lastName),
                email: data.email,
                phone: data.phone || null,
                password: data.password,
                student_id: data.studentId,
                roll_number: data.rollNumber,
                batch: data.batch,
                branch: data.branch,
                hostel_type: data.hostelType,
                room_preference: data.roomPreference,
                photo_url: data.photo
            });
            setToken(res.token);
            const user = {
                id: res.id, fullName: res.full_name, email: res.email, phone: res.phone, role: 'student', token: res.token,
                studentId: data.studentId, rollNumber: data.rollNumber, batch: data.batch, branch: data.branch,
                hostelType: data.hostelType, roomPreference: data.roomPreference, photo: data.photo
            };
            localStorage.setItem('loggedInUser', JSON.stringify(user));
            return user;
        }
        // Fallback: localStorage
        const users = getStore('hostelUsers', []);
        const exists = users.find(u => u.email === data.email);
        if (exists) throw { error: 'Email already exists' };
        const newUser = {
            id: Date.now(),
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            studentId: data.studentId || '',
            email: data.email,
            phone: data.phone || '',
            password: data.password,
            rollNumber: data.rollNumber,
            batch: data.batch,
            branch: data.branch,
            hostelType: data.hostelType,
            roomNumber: data.roomNumber,
            roomPreference: data.roomPreference || 'single',
            photo: data.photo,
            role: 'student',
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        setStore('hostelUsers', users);
        localStorage.setItem('loggedInUser', JSON.stringify(newUser));
        return newUser;
    }

    async function login(email, password) {
        const online = await checkBackend();
        if (online) {
            const res = await request('POST', '/api/auth/login', { email, password });
            setToken(res.token);
            const user = {
                id: res.id, fullName: res.full_name, email: res.email, phone: res.phone, role: res.role, token: res.token,
                studentId: res.student_id, rollNumber: res.roll_number, batch: res.batch, branch: res.branch,
                hostelType: res.hostel_type, roomPreference: res.room_preference, assignedRoom: res.assigned_room, photo: res.photo_url
            };
            localStorage.setItem('loggedInUser', JSON.stringify(user));
            return user;
        }
        // Fallback: localStorage
        const users = getStore('hostelUsers', []);
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) throw { error: 'Invalid credentials' };
        localStorage.setItem('loggedInUser', JSON.stringify(user));
        return user;
    }

    function logout() {
        setToken(null);
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('authToken');
    }

    function getCurrentUser() {
        try {
            const raw = localStorage.getItem('loggedInUser');
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    // ══════════════════════════════════════
    //  ROOMS
    // ══════════════════════════════════════
    async function getRooms() {
        const online = await checkBackend();
        if (online) {
            const rooms = await request('GET', '/api/rooms');
            return rooms.map(r => ({
                id: r.id,
                floor: parseInt(String(r.room_number).charAt(0)) || 1,
                room: r.room_number,
                type: r.room_type,
                available: r.status === 'available',
                price: r.price_per_night,
                capacity: r.capacity
            }));
        }
        // Fallback
        return getStore('hostel_rooms', getDefaultRooms());
    }

    async function saveRoom(data) {
        const online = await checkBackend();
        if (online) {
            return await request('POST', '/api/rooms', data);
        }
        // Fallback
        const rooms = getStore('hostel_rooms', getDefaultRooms());
        // Check update
        const idx = rooms.findIndex(r => r.room === data.room);
        if (idx !== -1) {
            rooms[idx] = { ...rooms[idx], ...data };
        } else {
            rooms.push({ ...data, floor: data.floor });
        }
        setStore('hostel_rooms', rooms);
        return data;
    }

    async function deleteRoom(roomNumber) {
        const online = await checkBackend();
        if (online) {
            return await request('DELETE', '/api/rooms/' + roomNumber);
        }
        // Fallback
        const rooms = getStore('hostel_rooms', getDefaultRooms());
        const newRooms = rooms.filter(r => r.room !== roomNumber);
        setStore('hostel_rooms', newRooms);
        return { ok: true };
    }

    function getDefaultRooms() {
        const rooms = [];
        [1, 2, 3, 4].forEach(floor => {
            for (let i = 1; i <= 10; i++) {
                const capacity = i % 3 === 0 ? 3 : 1;
                rooms.push({ floor, room: `${floor}0${i}`, type: capacity === 1 ? 'single' : 'triple', available: true });
            }
        });
        return rooms;
    }

    // ══════════════════════════════════════
    //  NOTICES
    // ══════════════════════════════════════
    async function getNotices() {
        const online = await checkBackend();
        if (online) {
            try {
                return await request('GET', '/api/notices');
            } catch {
                return getStore('notices', defaultNotices());
            }
        }
        return getStore('notices', defaultNotices());
    }

    async function addNotice(text) {
        const online = await checkBackend();
        if (online) {
            return await request('POST', '/api/notices', { text });
        }
        const notices = getStore('notices', defaultNotices());
        const n = { id: Date.now(), text, created_at: new Date().toISOString() };
        notices.push(n);
        setStore('notices', notices);
        return n;
    }

    function defaultNotices() {
        return [
            { id: 1, text: 'Admission for Semester VII hostel opens on 15th Sept.' },
            { id: 2, text: 'Mess will be closed on public holiday (19th Sept).' },
            { id: 3, text: 'Submit anti-ragging affidavit before 30th Sept.' }
        ];
    }

    // ══════════════════════════════════════
    //  COMPLAINTS
    // ══════════════════════════════════════
    async function submitComplaint(complaint) {
        const online = await checkBackend();
        if (online) {
            try {
                return await request('POST', '/api/complaints', complaint);
            } catch {
                return saveComplaintLocal(complaint);
            }
        }
        return saveComplaintLocal(complaint);
    }

    function saveComplaintLocal(complaint) {
        const ticket = Math.floor(Math.random() * 90000 + 10000);
        const record = {
            ticket,
            ...complaint,
            status: 'pending',
            submittedAt: new Date().toISOString(),
            priority: complaint.category === 'security' ? 'high' : complaint.category === 'maintenance' ? 'medium' : 'low'
        };
        const list = getStore('complaints', []);
        list.push(record);
        setStore('complaints', list);
        return record;
    }

    async function getComplaints() {
        const online = await checkBackend();
        if (online) {
            try { return await request('GET', '/api/complaints'); } catch { }
        }
        return getStore('complaints', []);
    }

    // ══════════════════════════════════════
    //  PAYMENTS
    // ══════════════════════════════════════
    async function submitPayment(paymentRecord) {
        const online = await checkBackend();
        if (online) {
            try {
                return await request('POST', '/api/payments/submit', paymentRecord);
            } catch {
                return savePaymentLocal(paymentRecord);
            }
        }
        return savePaymentLocal(paymentRecord);
    }

    function savePaymentLocal(record) {
        const list = getStore('payments', []);
        list.push({ time: new Date().toISOString(), ...record });
        setStore('payments', list);
        return record;
    }

    async function getPayments() {
        const online = await checkBackend();
        if (online) {
            try { return await request('GET', '/api/payments'); } catch { }
        }
        return getStore('payments', []);
    }

    // ══════════════════════════════════════
    //  BOOKINGS
    // ══════════════════════════════════════
    async function createBooking(data) {
        const online = await checkBackend();
        if (online) {
            return await request('POST', '/api/bookings', data);
        }
        const bookings = getStore('bookings', []);
        const b = { id: Date.now(), ...data, status: 'confirmed', payment_status: 'unpaid', created_at: new Date().toISOString() };
        bookings.push(b);
        setStore('bookings', bookings);
        return b;
    }

    async function getBookings() {
        const online = await checkBackend();
        if (online) {
            return await request('GET', '/api/bookings');
        }
        return getStore('bookings', []);
    }

    // ══════════════════════════════════════
    //  PROFILE
    // ══════════════════════════════════════
    async function getProfile() {
        const online = await checkBackend();
        if (online) {
            try {
                const res = await request('GET', '/api/me');
                return {
                    id: res.id,
                    fullName: res.full_name,
                    email: res.email,
                    phone: res.phone,
                    role: res.role,
                    studentId: res.student_id,
                    rollNumber: res.roll_number,
                    batch: res.batch,
                    branch: res.branch,
                    hostelType: res.hostel_type,
                    roomPreference: res.room_preference,
                    assignedRoom: res.assigned_room,
                    photo: res.photo_url,
                    createdAt: res.created_at
                };
            } catch {
                return getCurrentUser();
            }
        }
        return getCurrentUser();
    }

    async function updateProfile(data) {
        const online = await checkBackend();
        if (online) {
            return await request('PUT', '/api/me', {
                phone: data.phone,
                room_preference: data.roomPreference,
                photo_url: data.photo
            });
        }
        // Fallback local update is tricky as store is simplistic
        const user = getCurrentUser();
        if (user) {
            const updated = { ...user, ...data };
            localStorage.setItem('loggedInUser', JSON.stringify(updated));
            return updated;
        }
    }

    async function getMyBookings() {
        const online = await checkBackend();
        if (online) {
            try {
                const res = await request('GET', '/api/me/bookings');
                return res.map(b => ({
                    id: b.id,
                    roomId: b.room_id,
                    roomNumber: b.room_number,
                    checkIn: b.check_in,
                    checkOut: b.check_out,
                    status: b.status,
                    totalAmount: b.total_amount,
                    paymentStatus: b.payment_status,
                    timestamp: b.created_at
                }));
            } catch { }
        }
        const user = getCurrentUser();
        if (!user) return [];
        const bookings = getStore('bookings', []);
        return bookings.filter(b => b.user_id === user.id || b.studentId === user.studentId);
    }

    // ══════════════════════════════════════
    //  ADMIN
    // ══════════════════════════════════════
    async function adminGetStudents() {
        const online = await checkBackend();
        if (online) {
            try { return await request('GET', '/api/admin/students'); } catch { }
        }
        return getStore('hostelUsers', []);
    }

    async function adminGetStudent(id) {
        const online = await checkBackend();
        if (online) {
            return await request('GET', '/api/admin/students/' + id);
        }
        const users = getStore('hostelUsers', []);
        return users.find(u => u.id == id) || null;
    }

    async function adminGetAllPayments() {
        const online = await checkBackend();
        if (online) {
            try { return await request('GET', '/api/admin/payments'); } catch { }
        }
        return getStore('payments', []);
    }

    async function adminConfirmPayment(data) {
        const online = await checkBackend();
        if (online) {
            const body = {};
            if (typeof data === 'object') {
                if (data.paymentId) body.paymentId = data.paymentId;
                if (data.transactionId) body.transactionId = data.transactionId;
            } else {
                // Legacy: plain txnId string
                body.transactionId = data;
            }
            return await request('POST', '/api/admin/payments/confirm', body);
        }
        // Fallback
        const payments = getStore('payments', []);
        const txnId = typeof data === 'object' ? data.transactionId : data;
        const idx = payments.findIndex(p => p.transactionId === txnId);
        if (idx >= 0) { payments[idx].status = 'confirmed'; setStore('payments', payments); }
        return { ok: true };
    }

    async function adminRejectPayment(data) {
        const online = await checkBackend();
        if (online) {
            const body = {};
            if (data.paymentId) body.paymentId = data.paymentId;
            if (data.transactionId) body.transactionId = data.transactionId;
            return await request('POST', '/api/admin/payments/reject', body);
        }
        const payments = getStore('payments', []);
        const txnId = data.transactionId;
        const idx = payments.findIndex(p => p.transactionId === txnId);
        if (idx >= 0) { payments[idx].status = 'rejected'; setStore('payments', payments); }
        return { ok: true };
    }

    // ══════════════════════════════════════
    //  FEES
    // ══════════════════════════════════════
    function getFees() {
        return getStore('fees', { mess: '₹ 3,500 / month', single: '₹ 18,000 / year', triple: '₹ 15,000 / year' });
    }

    function setFees(fees) {
        setStore('fees', fees);
    }

    // ══════════════════════════════════════
    //  STATS (for home page quick stats)
    // ══════════════════════════════════════
    async function getStats() {
        const rooms = await getRooms();
        const notices = await getNotices();
        const online = await checkBackend();
        let studentCount = 0;
        if (online) {
            try {
                const data = await request('GET', '/api/admin/stats');
                studentCount = data.students || 0;
            } catch {
                studentCount = getStore('hostelUsers', []).length;
            }
        } else {
            studentCount = getStore('hostelUsers', []).length;
        }
        return {
            availableRooms: rooms.filter(r => r.available).length,
            students: studentCount,
            notices: notices.length,
            floors: 4
        };
    }

    // ── Public API ──
    return {
        checkBackend,
        // Auth
        signup,
        login,
        logout,
        getCurrentUser,
        getToken,
        // Rooms
        getRooms,
        // Notices
        getNotices,
        addNotice,
        // Complaints
        submitComplaint,
        getComplaints,
        // Payments
        submitPayment,
        getPayments,
        // Bookings
        createBooking,
        getBookings,
        // Profile
        getProfile,
        updateProfile,
        getMyBookings,
        // Admin
        adminGetStudents,
        adminGetStudent,
        adminGetAllPayments,
        adminConfirmPayment,
        adminRejectPayment,
        saveRoom,
        deleteRoom,
        // Fees
        getFees,
        setFees,
        // Stats
        getStats,
        // Utility
        isOnline: () => _backendAvailable === true
    };
})();
