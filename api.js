/**
 * api.js — Central API service for GEC Hostel Management System
 * 
 * IMPORTANT: All WRITE operations (signup, payments, complaints, bookings,
 * notices, rooms, profile updates) MUST go to the server database.
 * If the server is down, they will FAIL with a clear error message —
 * data is NEVER silently stored in localStorage.
 * 
 * localStorage is used ONLY as a read-only cache so previously-fetched
 * data can still be displayed when offline.
 */
const API = (function () {
    const BASE = window.location.origin;
    let _token = localStorage.getItem('authToken') || null;
    let _backendAvailable = null;
    let _lastBackendCheck = 0;
    const BACKEND_CHECK_INTERVAL = 30000; // re-check every 30 seconds

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

    // ── Check if backend is running (re-checks every 30s) ──
    async function checkBackend() {
        const now = Date.now();
        if (_backendAvailable !== null && (now - _lastBackendCheck) < BACKEND_CHECK_INTERVAL) {
            return _backendAvailable;
        }
        try {
            const res = await fetch(BASE + '/health', { method: 'GET', signal: AbortSignal.timeout(3000) });
            const data = await res.json();
            _backendAvailable = data && data.ok === true;
        } catch {
            _backendAvailable = false;
        }
        _lastBackendCheck = now;
        console.log('[API] Backend available:', _backendAvailable);
        return _backendAvailable;
    }

    function resetBackendCache() {
        _backendAvailable = null;
        _lastBackendCheck = 0;
    }

    // ── localStorage helpers (READ-ONLY CACHE) ──
    function getStore(key, fallback) {
        try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    }
    function setStore(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { }
    }

    // ── Require backend helper — throws user-friendly error if offline ──
    async function requireBackend() {
        const online = await checkBackend();
        if (!online) {
            throw {
                error: 'Server is not reachable. Please check your internet connection or try again later.',
                offline: true
            };
        }
        return true;
    }

    // ══════════════════════════════════════
    //  AUTH — MUST go to server
    // ══════════════════════════════════════
    async function signup(data) {
        await requireBackend();
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
            assigned_room: data.roomNumber,
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

    async function login(email, password) {
        await requireBackend();
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
    //  ROOMS — reads can fallback to cache, writes MUST go to server
    // ══════════════════════════════════════
    async function getRooms() {
        const online = await checkBackend();
        if (online) {
            try {
                const rooms = await request('GET', '/api/rooms');
                const mapped = rooms.map(r => ({
                    id: r.id,
                    floor: parseInt(String(r.room_number).charAt(0)) || 1,
                    room: r.room_number,
                    type: r.room_type,
                    available: r.status === 'available',
                    price: r.price_per_night,
                    capacity: r.capacity
                }));
                // Cache for offline viewing
                setStore('hostel_rooms', mapped);
                return mapped;
            } catch (err) {
                console.warn('[API] Failed to fetch rooms from backend:', err);
            }
        }
        // Offline: show cached data (read-only)
        return getStore('hostel_rooms', getDefaultRooms());
    }

    async function saveRoom(data) {
        // WRITE — must go to server
        await requireBackend();
        return await request('POST', '/api/rooms', data);
    }

    async function deleteRoom(roomNumber) {
        // WRITE — must go to server
        await requireBackend();
        return await request('DELETE', '/api/rooms/' + roomNumber);
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
    //  NOTICES — reads can fallback to cache, writes MUST go to server
    // ══════════════════════════════════════
    async function getNotices() {
        const online = await checkBackend();
        if (online) {
            try {
                const notices = await request('GET', '/api/notices');
                setStore('notices', notices); // cache
                return notices;
            } catch {
                return getStore('notices', defaultNotices());
            }
        }
        return getStore('notices', defaultNotices());
    }

    async function addNotice(text) {
        // WRITE — must go to server
        await requireBackend();
        return await request('POST', '/api/notices', { text });
    }

    function defaultNotices() {
        return [
            { id: 1, text: 'Admission for Semester VII hostel opens on 15th Sept.' },
            { id: 2, text: 'Mess will be closed on public holiday (19th Sept).' },
            { id: 3, text: 'Submit anti-ragging affidavit before 30th Sept.' }
        ];
    }

    // ══════════════════════════════════════
    //  COMPLAINTS — MUST go to server
    // ══════════════════════════════════════
    async function submitComplaint(complaint) {
        // WRITE — must go to server so admin can see it
        await requireBackend();
        return await request('POST', '/api/complaints', complaint);
    }

    async function getComplaints() {
        const online = await checkBackend();
        if (online) {
            try {
                const complaints = await request('GET', '/api/complaints');
                setStore('complaints', complaints); // cache
                return complaints;
            } catch { }
        }
        return getStore('complaints', []);
    }

    // ══════════════════════════════════════
    //  PAYMENTS — MUST go to server
    // ══════════════════════════════════════
    async function submitPayment(paymentRecord) {
        // WRITE — must go to server so admin can see and confirm it
        await requireBackend();
        return await request('POST', '/api/payments/submit', paymentRecord);
    }

    async function getPayments() {
        const online = await checkBackend();
        if (online) {
            try {
                const payments = await request('GET', '/api/payments');
                setStore('payments', payments); // cache
                return payments;
            } catch { }
        }
        return getStore('payments', []);
    }

    // ══════════════════════════════════════
    //  BOOKINGS — MUST go to server
    // ══════════════════════════════════════
    async function createBooking(data) {
        // WRITE — must go to server
        await requireBackend();
        return await request('POST', '/api/bookings', data);
    }

    async function getBookings() {
        const online = await checkBackend();
        if (online) {
            try {
                const bookings = await request('GET', '/api/bookings');
                setStore('bookings', bookings); // cache
                return bookings;
            } catch (err) {
                console.warn('[API] Failed to get bookings from backend:', err);
            }
        }
        return getStore('bookings', []);
    }

    // ══════════════════════════════════════
    //  PROFILE — reads can fallback, writes MUST go to server
    // ══════════════════════════════════════
    async function getProfile() {
        const online = await checkBackend();
        if (online) {
            try {
                const res = await request('GET', '/api/me');
                const profile = {
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
                // Update local cache
                localStorage.setItem('loggedInUser', JSON.stringify(profile));
                return profile;
            } catch {
                return getCurrentUser();
            }
        }
        return getCurrentUser();
    }

    async function updateProfile(data) {
        // WRITE — must go to server
        await requireBackend();
        const result = await request('PUT', '/api/me', {
            phone: data.phone,
            room_preference: data.roomPreference,
            photo_url: data.photo
        });
        // Also update local cache after successful server update
        const user = getCurrentUser();
        if (user) {
            const updated = { ...user, ...data };
            localStorage.setItem('loggedInUser', JSON.stringify(updated));
        }
        return result;
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
        // Offline: show cached bookings for this user
        const user = getCurrentUser();
        if (!user) return [];
        const bookings = getStore('bookings', []);
        return bookings.filter(b => b.user_id === user.id || b.studentId === user.studentId);
    }

    // ══════════════════════════════════════
    //  ADMIN — reads can fallback to cache, writes MUST go to server
    // ══════════════════════════════════════
    async function adminGetStudents() {
        const online = await checkBackend();
        if (online) {
            try {
                const students = await request('GET', '/api/admin/students');
                setStore('hostelUsers', students); // cache for fallback
                return students;
            } catch { }
        }
        return getStore('hostelUsers', []);
    }

    async function adminGetStudent(id) {
        const online = await checkBackend();
        if (online) {
            try {
                return await request('GET', '/api/admin/students/' + id);
            } catch (err) {
                console.warn('[API] Failed to get student from backend:', err);
            }
        }
        const users = getStore('hostelUsers', []);
        return users.find(u => u.id == id) || null;
    }

    async function adminGetAllPayments() {
        const online = await checkBackend();
        if (online) {
            try {
                const payments = await request('GET', '/api/admin/payments');
                setStore('adminPayments', payments); // cache
                return payments;
            } catch { }
        }
        // Fallback: show cached payments
        return getStore('adminPayments', []);
    }

    async function adminConfirmPayment(data) {
        // WRITE — must go to server
        await requireBackend();
        const body = {};
        if (typeof data === 'object') {
            if (data.paymentId) body.paymentId = data.paymentId;
            if (data.transactionId) body.transactionId = data.transactionId;
        } else {
            body.transactionId = data;
        }
        return await request('POST', '/api/admin/payments/confirm', body);
    }

    async function adminRejectPayment(data) {
        // WRITE — must go to server
        await requireBackend();
        const body = {};
        if (data.paymentId) body.paymentId = data.paymentId;
        if (data.transactionId) body.transactionId = data.transactionId;
        return await request('POST', '/api/admin/payments/reject', body);
    }

    // ══════════════════════════════════════
    //  FEES — reads can fallback, writes MUST go to server
    // ══════════════════════════════════════
    async function getFees() {
        const online = await checkBackend();
        if (online) {
            try {
                const fees = await request('GET', '/api/fees');
                setStore('fees', fees);
                return fees;
            } catch {
                return getStore('fees', { mess: '₹ 3,500 / month', single: '₹ 18,000 / year', triple: '₹ 15,000 / year' });
            }
        }
        return getStore('fees', { mess: '₹ 3,500 / month', single: '₹ 18,000 / year', triple: '₹ 15,000 / year' });
    }

    async function setFees(fees) {
        // WRITE — must go to server so all devices see the updated fees
        await requireBackend();
        await request('PUT', '/api/fees', fees);
        // Also update local cache after successful save
        setStore('fees', fees);
    }

    // ══════════════════════════════════════
    //  STATS (for home page quick stats)
    // ══════════════════════════════════════
    async function getStats() {
        const online = await checkBackend();
        if (online) {
            try {
                const data = await request('GET', '/api/stats');
                return {
                    availableRooms: data.availableRooms || 0,
                    students: data.students || 0,
                    notices: data.notices || 0,
                    floors: 4
                };
            } catch { }
        }
        // Offline fallback (from cache)
        const rooms = await getRooms();
        const notices = await getNotices();
        return {
            availableRooms: rooms.filter(r => r.available).length,
            students: getStore('hostelUsers', []).length,
            notices: notices.length,
            floors: 4
        };
    }

    // ── Public API ──
    return {
        checkBackend,
        resetBackendCache,
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
