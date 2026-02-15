(function () {
  let currentStep = 1;
  let selectedFee = null;
  let paymentData = {};
  const TOTAL_STEPS = 3;
  const ADMIN_UPI = '7782891946@paytm';

  const steps = document.querySelectorAll('.payment-step');
  const progressFill = document.getElementById('progress-fill');
  const feeOptionsContainer = document.getElementById('feeOptionsContainer');
  const studentBanner = document.getElementById('studentBanner');
  const studentNotLoggedIn = document.getElementById('studentNotLoggedIn');
  const manualStudentFields = document.getElementById('manualStudentFields');
  const nextStep1 = document.getElementById('next-step1');
  const backStep2 = document.getElementById('back-step2');
  const confirmPay = document.getElementById('confirmPay');
  const finalReceipt = document.getElementById('finalReceipt');
  const transactionIdEl = document.getElementById('transactionId');
  const copyUpi = document.getElementById('copyUpi');
  const paymentScreenshot = document.getElementById('paymentScreenshot');

  function showStep(stepNum) {
    currentStep = stepNum;
    steps.forEach((s, i) => s.classList.toggle('active', i + 1 === stepNum));
    document.querySelectorAll('.step-dot').forEach((d, i) => {
      d.classList.remove('current', 'done');
      if (i + 1 < stepNum) d.classList.add('done');
      else if (i + 1 === stepNum) d.classList.add('current');
    });
    if (progressFill) progressFill.style.width = (stepNum / TOTAL_STEPS) * 100 + '%';

    if (stepNum === 2 && selectedFee) {
      updateStep2Summary();
      document.getElementById('displayUpiId').textContent = ADMIN_UPI;
      document.getElementById('displayAmount').textContent = selectedFee.amount.toLocaleString();
      document.getElementById('displayNote').textContent = 'Hostel ' + selectedFee.type;
    }
  }

  async function renderFeeOptions() {
    const fees = await API.getFees(); // Fetches from backend
    const user = API.getCurrentUser(); // Uses API layer

    let hostelAmount = 18000; // Default single
    // Parse fees if they are strings like "₹ 18,000 / year"
    const parseFee = (str) => parseInt(String(str).replace(/[₹,\s]/g, '').split('/')[0]) || 0;
    const singleFee = typeof fees.single === 'number' ? fees.single : parseFee(fees.single);
    const tripleFee = typeof fees.triple === 'number' ? fees.triple : parseFee(fees.triple);
    const messFee = typeof fees.mess === 'number' ? fees.mess : parseFee(fees.mess);
    const securityFee = 5000;

    let hostelLabel = 'Hostel Charge';
    hostelAmount = singleFee;

    if (user && user.roomPreference) {
      const pref = user.roomPreference.toLowerCase();
      if (pref === 'triple') hostelAmount = tripleFee;
      else hostelAmount = singleFee;
      hostelLabel = 'Hostel Charge (' + pref.charAt(0).toUpperCase() + pref.slice(1) + ' Room)';
    }

    const options = [
      { id: 'mess', title: 'Mess Fee', amount: messFee, period: 'Per month', dataFee: 'mess_fee' },
      { id: 'hostel', title: hostelLabel, amount: hostelAmount, period: 'Per year', dataFee: 'hostel_charge' },
      { id: 'security', title: 'Security Deposit', amount: securityFee, period: 'One-time (refundable)', dataFee: 'security_deposit' }
    ];

    feeOptionsContainer.innerHTML = options.map(o => `
      <div class="fee-option" data-fee="${o.dataFee}" data-amount="${o.amount}">
        <div>
          <h3>${o.title}</h3>
          <span class="period">${o.period}</span>
        </div>
        <span class="amount">₹${o.amount.toLocaleString()}</span>
      </div>
    `).join('');

    document.querySelectorAll('.fee-option').forEach(opt => {
      opt.addEventListener('click', () => selectFee(opt));
    });
  }

  function selectFee(option) {
    document.querySelectorAll('.fee-option').forEach(o => o.classList.remove('selected'));
    option.classList.add('selected');
    selectedFee = {
      type: option.dataset.fee,
      amount: parseInt(option.dataset.amount, 10)
    };
    nextStep1.disabled = false;
  }

  function updateStep2Summary() {
    let name = document.getElementById('studentName').value || paymentData.studentName;
    let id = document.getElementById('studentId').value || paymentData.studentId;
    if (manualStudentFields && !manualStudentFields.classList.contains('hidden')) {
      name = document.getElementById('manualName').value.trim() || name;
      id = document.getElementById('manualStudentId').value.trim() || id;
    }
    document.getElementById('summaryName').textContent = name || '—';
    document.getElementById('summaryId').textContent = id || '—';
    document.getElementById('summaryFee').textContent = (selectedFee && selectedFee.type) ? selectedFee.type : '—';
    document.getElementById('summaryTotal').textContent = selectedFee ? '₹' + selectedFee.amount.toLocaleString() : '₹0';
  }

  function fillFromLoggedInUser() {
    const user = API.getCurrentUser();
    if (user) {
      // Handle both fullName (from DB) and firstName/lastName (old localStorage format)
      const name = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.studentName || '';

      paymentData = {
        studentName: name,
        studentId: user.studentId || user.id || '', // Fallback to DB ID if studentId missing
        email: user.email || '',
        phone: user.phone || ''
      };

      document.getElementById('studentName').value = paymentData.studentName;
      document.getElementById('studentId').value = paymentData.studentId;
      document.getElementById('email').value = paymentData.email;
      document.getElementById('phone').value = paymentData.phone;

      studentBanner.classList.remove('hidden');
      studentNotLoggedIn.classList.add('hidden');
      manualStudentFields.classList.add('hidden');

      document.getElementById('bannerName').textContent = paymentData.studentName || 'Student';
      document.getElementById('bannerId').textContent = paymentData.studentId ? 'ID: ' + paymentData.studentId : '';
      return true;
    }
    studentBanner.classList.add('hidden');
    studentNotLoggedIn.classList.remove('hidden');
    manualStudentFields.classList.remove('hidden');
    return false;
  }

  function collectPaymentData() {
    if (API.getCurrentUser()) {
      paymentData.studentName = document.getElementById('studentName').value;
      paymentData.studentId = document.getElementById('studentId').value;
      paymentData.email = document.getElementById('email').value;
      paymentData.phone = document.getElementById('phone').value;
    } else {
      paymentData.studentName = document.getElementById('manualName').value.trim();
      paymentData.studentId = document.getElementById('manualStudentId').value.trim();
      paymentData.email = document.getElementById('manualEmail').value.trim();
      paymentData.phone = document.getElementById('manualPhone').value.trim();
    }
    return paymentData;
  }

  function generateTxnId() {
    return 'TXN' + Date.now() + Math.floor(Math.random() * 1000);
  }

  function generateReceiptHTML(txnId) {
    return `
      <div class="receipt-header">
        <h2>GEC Hostel Payment</h2>
        <p>Government Engineering College, Samastipur</p>
      </div>
      <div class="receipt-details">
        <p><strong>Transaction ID:</strong> ${txnId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        <hr style="margin:12px 0; border-color:var(--border);">
        <p><strong>Student:</strong> ${paymentData.studentName}</p>
        <p><strong>Student ID:</strong> ${paymentData.studentId}</p>
        <p><strong>Fee:</strong> ${selectedFee.type} — ₹${selectedFee.amount.toLocaleString()}</p>
        <p><strong>Status:</strong> <span style="color:#ffa500;">PENDING</span> (Verifying)</p>
      </div>
      <div class="receipt-footer">
        Please allow 24-48 hours for admin verification.
      </div>
    `;
  }

  function generatePDFReceipt(txnId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(18);
    doc.text('GEC Hostel Payment', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Government Engineering College, Samastipur', 105, 28, { align: 'center' });
    doc.line(20, 34, 190, 34);
    doc.setFontSize(11);
    doc.text('Transaction ID: ' + txnId, 20, 44);
    doc.text('Date: ' + new Date().toLocaleString(), 20, 50);
    doc.text('Student: ' + paymentData.studentName, 20, 60);
    doc.text('Student ID: ' + paymentData.studentId, 20, 66);
    doc.text('Fee: ' + selectedFee.type + ' — ₹' + selectedFee.amount.toLocaleString(), 20, 76);
    doc.text('Status: PENDING', 20, 92);
    return doc;
  }

  async function init() {
    fillFromLoggedInUser();
    await renderFeeOptions();
    showStep(1);
    if (document.getElementById('year')) document.getElementById('year').textContent = new Date().getFullYear();

    nextStep1.addEventListener('click', () => {
      if (selectedFee) showStep(2);
    });
    backStep2.addEventListener('click', () => showStep(1));

    if (copyUpi) {
      copyUpi.addEventListener('click', () => {
        navigator.clipboard.writeText(ADMIN_UPI).then(() => {
          copyUpi.textContent = 'Copied!';
          setTimeout(() => { copyUpi.textContent = 'Copy UPI ID'; }, 1500);
        }).catch(() => alert('UPI ID: ' + ADMIN_UPI));
      });
    }

    if (manualStudentFields) {
      ['manualName', 'manualStudentId', 'manualEmail', 'manualPhone'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateStep2Summary);
      });
    }

    let screenshotData = null;
    if (paymentScreenshot) {
      paymentScreenshot.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024) {
          const r = new FileReader();
          r.onload = (ev) => { screenshotData = ev.target.result; };
          r.readAsDataURL(file);
        } else if (file) {
          paymentScreenshot.value = '';
          alert('File must be an image under 5MB');
        }
      });
    }

    confirmPay.addEventListener('click', async function () {
      collectPaymentData();
      if (!paymentData.studentName || !paymentData.studentId) {
        alert('Please enter your details.');
        return;
      }
      if (!selectedFee) return;

      const txnId = generateTxnId();
      const record = {
        transactionId: txnId,
        studentName: paymentData.studentName,
        studentId: paymentData.studentId,
        email: paymentData.email,
        phone: paymentData.phone,
        feeType: selectedFee.type,
        amount: selectedFee.amount,
        paymentMethod: 'UPI',
        adminUpiId: ADMIN_UPI,
        screenshotData: screenshotData // Sent to backend if small enough, otherwise handled there
      };

      // ── USE API TO SUBMIT ──
      try {
        confirmPay.disabled = true;
        confirmPay.textContent = 'Processing...';
        await API.submitPayment(record);

        finalReceipt.innerHTML = generateReceiptHTML(txnId);
        transactionIdEl.textContent = txnId;
        showStep(3);
      } catch (err) {
        alert('Payment submission failed. Please try again.');
        console.error(err);
      } finally {
        confirmPay.disabled = false;
        confirmPay.textContent = 'Confirm Payment Submitted';
      }
    });

    document.getElementById('downloadReceipt').addEventListener('click', () => {
      const txnId = transactionIdEl.textContent;
      const doc = generatePDFReceipt(txnId);
      doc.save('receipt_' + txnId + '.pdf');
    });

    document.getElementById('newPayment').addEventListener('click', () => {
      document.querySelectorAll('.fee-option').forEach(o => o.classList.remove('selected'));
      selectedFee = null;
      nextStep1.disabled = true;
      if (paymentScreenshot) paymentScreenshot.value = '';
      showStep(1);
    });
  }

  init();
})();
