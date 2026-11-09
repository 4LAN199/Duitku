document.addEventListener("DOMContentLoaded",()=>{
  DuitkuTheme.init(); DuitkuAnimation.start();
  
  
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(n || 0);
const today = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset)
    .toISOString()
    .slice(0, 10);
};
window.addEventListener("duitku:authenticated", () => {
  initializeRooms();
});
// Sidebar toggle
const app = $('app');
const sidebarToggle = $('sidebarToggle');

sidebarToggle.addEventListener('click', () => {
  const mobile = window.matchMedia('(max-width: 740px)').matches;
  const className = mobile ? 'sidebar-open' : 'sidebar-collapsed';

  app.classList.toggle(className);

  sidebarToggle.setAttribute(
    'aria-expanded',
    String(app.classList.contains(className))
  );
});

document.addEventListener('click', e => {
  if (
    window.matchMedia('(max-width: 740px)').matches &&
    app.classList.contains('sidebar-open') &&
    !e.target.closest('.sidebar') &&
    !e.target.closest('#sidebarToggle')
  ) {
    app.classList.remove('sidebar-open');
    sidebarToggle.setAttribute('aria-expanded', 'false');
  }
});

const labels = {};
let availableRooms = [];
let activeRoom = null;
let activeSpace = null;
let editingId = null;
let transactions = [];
let pendingRequests = [];
let requestHistory = [];
let roomSummary = null;
let roomLoading = false;

let savingsPlans = [];
let savingsHistory = [];

const storageKey = () => `duitku-v2-transactions-${activeSpace}`;
const savingsPlansKey = () => `duitku-v2-savings-plans-${activeSpace}`;
const savingsHistoryKey = () => `duitku-v2-savings-history-${activeSpace}`;

let completedSavings = [];

const completedSavingsKey = () =>
  `duitku-v2-savings-completed-${activeSpace}`;


async function loadSavings(roomId) {
  try {
    const result = await DuitkuAPI.listSavingsPlans(roomId);

    if (activeSpace !== roomId) return;

    savingsPlans = (result.plans || []).map(plan => ({
      id: plan.planId,
      name: plan.nama,
      note: plan.keterangan || "",
      target: Number(plan.target || 0),
      balance: Number(plan.saldo || 0),
      started: plan.status === "berjalan",
      createdAt: plan.createdAt || "",
      createdByName: plan.dibuatOlehNama || ""
    }));

    savingsHistory = (result.history || []).map(item => ({
      id: item.historyId,
      planName: item.namaTabungan || "",
      activity: item.aktivitas || "",
      amount: Number(item.nominal || 0),
      date: item.tanggal || "",
      createdAt: item.createdAt || "",
      createdByName: item.olehNama || ""
    }));

    completedSavings = [];

    renderSavings();

  } catch (error) {
    console.error("Gagal memuat tabungan:", error);

    if (activeSpace !== roomId) return;

    savingsPlans = [];
    savingsHistory = [];
    completedSavings = [];

    renderSavings();
    toast("Gagal memuat tabungan: " + error.message);
  }
}


function totalSavings() {
  return savingsPlans.reduce(
    (total, plan) => total + Number(plan.balance || 0),
    0
  );
}
  function load(){try{transactions=JSON.parse(localStorage.getItem(storageKey())||'[]')}catch{transactions=[]}}
  function save(){try{localStorage.setItem(storageKey(),JSON.stringify(transactions))}catch{toast('Penyimpanan browser penuh atau tidak tersedia.')}}
  
  // RESET SELURUH DATA PADA RUANG AKTIF

function closeResetSpaceModal() {
  $('resetSpaceModal').hidden = true;
}

function openResetSpaceModal() {
  toast(
    "Reset ruang belum tersedia selama integrasi Google Sheets."
  );
}

function resetActiveSpace() {
  // Hapus data hanya untuk ruang yang sedang aktif.
  localStorage.removeItem(storageKey());
  localStorage.removeItem(savingsPlansKey());
  localStorage.removeItem(savingsHistoryKey());
  localStorage.removeItem(completedSavingsKey());

  // Kosongkan data di memori.
  transactions = [];
  savingsPlans = [];
  savingsHistory = [];
  completedSavings = [];

  // Perbarui seluruh tampilan.
  renderAll();

  closeResetSpaceModal();
  toast(`${labels[activeSpace]} berhasil direset.`);
}

$('resetSpaceData').addEventListener('click', openResetSpaceModal);

$('closeResetSpace').addEventListener('click', closeResetSpaceModal);
$('cancelResetSpace').addEventListener('click', closeResetSpaceModal);

$('confirmResetSpace').addEventListener('click', resetActiveSpace);

$('resetSpaceModal').addEventListener('click', e => {
  if (e.target === $('resetSpaceModal')) {
    closeResetSpaceModal();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('resetSpaceModal').hidden) {
    closeResetSpaceModal();
  }
});
// FEEDBACK PENGGUNA
function closeFeedbackModal() {
  $('feedbackModal').hidden = true;
}

function openFeedbackModal() {
  $('feedbackModal').hidden = false;
  $('feedbackType').focus();
}

$('openFeedback').addEventListener('click', e => {
  e.preventDefault();
  openFeedbackModal();
});

$('closeFeedback').addEventListener('click', closeFeedbackModal);
$('cancelFeedback').addEventListener('click', closeFeedbackModal);

$('feedbackModal').addEventListener('click', e => {
  if (e.target === $('feedbackModal')) {
    closeFeedbackModal();
  }
});

$('feedbackForm').addEventListener('submit', e => {
  e.preventDefault();

  const type = $('feedbackType').value;
  const subject = $('feedbackSubject').value.trim();
  const message = $('feedbackMessage').value.trim();

  if (!subject || !message) {
    toast('Judul dan penjelasan wajib diisi.');
    return;
  }

  const email = $('profileEmail').textContent.trim().toLowerCase();

  const storageKey =
    `duitku-v2-feedback-${encodeURIComponent(email)}`;

  const feedback = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    subject,
    message,
    userName: $('profileName').textContent.trim(),
    userEmail: email,
    createdAt: new Date().toISOString(),
    status: 'Tersimpan lokal'
  };

  try {
    const saved = JSON.parse(
      localStorage.getItem(storageKey) || '[]'
    );

    const feedbackList = Array.isArray(saved) ? saved : [];
    feedbackList.unshift(feedback);

    localStorage.setItem(
      storageKey,
      JSON.stringify(feedbackList)
    );

    $('feedbackForm').reset();
    closeFeedbackModal();

    toast('Feedback tersimpan di browser ini. Belum terkirim ke pengelola.');
  } catch {
    toast('Feedback gagal disimpan. Penyimpanan browser bermasalah.');
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('feedbackModal').hidden) {
    closeFeedbackModal();
  }
});
  
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600)}
  async function loadRequestHistory(roomId) {
  const rows = $("requestHistoryRows");
  const empty = $("requestHistoryEmpty");

  rows.innerHTML = `
    <tr>
      <td colspan="9">Memuat riwayat pengajuan...</td>
    </tr>
  `;

  empty.hidden = true;

  try {
    const history = await DuitkuAPI.listRequestHistory(roomId);

    if (activeSpace !== roomId) return;

    requestHistory = history;
    renderRequestHistory();

  } catch (error) {
    console.error("Gagal memuat riwayat pengajuan:", error);

    if (activeSpace !== roomId) return;

    requestHistory = [];

    rows.innerHTML = `
      <tr>
        <td colspan="9">Gagal memuat riwayat pengajuan.</td>
      </tr>
    `;

    toast("Gagal memuat riwayat: " + error.message);
  }
}

function renderRequestHistory() {
  const rows = $("requestHistoryRows");
  const search = $("requestHistorySearch").value
    .trim()
    .toLowerCase();

  const status = $("requestHistoryStatus").value;

  const filtered = requestHistory.filter(item => {
    const matchesSearch = [
      item.pemohonNama,
      item.keterangan,
      item.nominal,
      item.diputuskanOlehNama
    ].join(" ").toLowerCase().includes(search);

    const matchesStatus =
      status === "all" || item.status === status;

    return matchesSearch && matchesStatus;
  });

  rows.innerHTML = filtered.map(item => {
    const type = item.jenis === "pemasukan"
      ? "income"
      : "expense";

    const statusLabel = item.status === "disetujui"
      ? "Disetujui"
      : "Ditolak";

    const statusClass = item.status === "disetujui"
      ? "income"
      : "expense";

    return `
      <tr>
        <td>
          ${esc(item.tanggalPengajuan)}
          <br>
          <small>${esc(item.waktuPengajuan)}</small>
        </td>

        <td>${esc(item.pemohonNama || "-")}</td>

        <td>${esc(item.keterangan || "-")}</td>

        <td>
          <span class="pill ${type}">
            ${item.jenis === "pemasukan"
              ? "Pemasukan"
              : "Pengeluaran"}
          </span>
        </td>

        <td class="amount ${type}">
          ${money(item.nominal)}
        </td>

        <td>
          <span class="pill ${statusClass}">
            ${statusLabel}
          </span>
        </td>

        <td>${esc(item.diputuskanOlehNama || "-")}</td>

        <td>${esc(item.tanggalKeputusan || "-")}</td>

        <td>${esc(item.alasanPenolakan || "-")}</td>
      </tr>
    `;
  }).join("");

  $("requestHistoryEmpty").hidden = filtered.length > 0;
}
  function renderPendingRequests() {
  const rows = $("requestRows");

  rows.innerHTML = pendingRequests.map(request => {
    const date = request.createdAt
      ? new Date(request.createdAt)
      : null;

    const formattedDate = date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Jakarta"
        }).format(date)
      : "-";

    const type = request.jenis === "pemasukan"
      ? "income"
      : "expense";

    return `
      <tr>
        <td>${esc(formattedDate)}</td>
        <td>${esc(request.pemohonNama || "Pengguna")}</td>
        <td>${esc(request.keterangan || "-")}</td>
        <td>${esc(request.kategori || "-")}</td>
        <td>
          <span class="pill ${type}">
            ${request.jenis === "pemasukan"
              ? "Pemasukan"
              : "Pengeluaran"}
          </span>
        </td>
        <td class="amount ${type}">
          ${money(request.nominal)}
        </td>
        <td>
          <button
            type="button"
            class="table-action"
            data-request-action="approve"
            data-request-id="${esc(request.requestId)}"
          >
            Setujui
          </button>
          <button
            type="button"
            class="table-action danger"
            data-request-action="reject"
            data-request-id="${esc(request.requestId)}"
          >
            Tolak
          </button>
        </td>
      </tr>
    `;
  }).join("");

  $("requestEmpty").hidden = pendingRequests.length > 0;
}
  const main = document.querySelector("main");
  main.classList.remove("room-changing");
  void main.offsetWidth;
  main.classList.add("room-changing");

async function loadPendingRequests(roomId) {
  const panel = $("requestPanel");

  const room = availableRooms.find(
    item => item.roomId === roomId
  );

  const canApprove = room &&
    ["admin", "developer"].includes(room.role);

  panel.hidden = !canApprove;

  if (!canApprove) {
    pendingRequests = [];
    return;
  }

  $("requestRows").innerHTML = `
    <tr>
      <td colspan="7">Memuat pengajuan...</td>
    </tr>
  `;
  $("requestEmpty").hidden = true;

  try {
    const requests =
      await DuitkuAPI.listTransactionRequests(roomId);

    if (activeSpace !== roomId) return;

    pendingRequests = requests;
    renderPendingRequests();

  } catch (error) {
    console.error("Gagal memuat pengajuan:", error);

    if (activeSpace !== roomId) return;

    pendingRequests = [];
    $("requestRows").innerHTML = `
      <tr>
        <td colspan="7">Gagal memuat pengajuan.</td>
      </tr>
    `;

    toast("Gagal memuat pengajuan: " + error.message);
  }
}                          
function setSpace(roomId) {
  const room = availableRooms.find(
    item => item.roomId === roomId
  );

  if (!room) {
    toast("Ruang tidak ditemukan atau tidak dapat diakses.");
    return;
  }

  activeRoom = room;
  const canTransact = room.role !== "viewer";

  $("newTransaction").hidden = !canTransact;

  document.querySelectorAll("[data-add]").forEach(button => {
    button.hidden = !canTransact;
  });

  activeSpace = room.roomId;

  $("activeSpaceName").textContent = room.name;
  $("crumbSpaceName").textContent = room.name;
  $("welcomeSpaceName").textContent = room.name;

  document.querySelectorAll("[data-space]").forEach(option => {
    option.classList.toggle(
      "selected",
      option.dataset.space === room.roomId
    );
  });

  try {
    localStorage.setItem(
      "duitku-active-space-preview",
      room.roomId
    );
  } catch {}

  transactions = [];
  roomSummary = null;
  roomLoading = true;

  savingsPlans = [];
savingsHistory = [];
completedSavings = [];

renderAll();

loadSavings(room.roomId);
loadRoomData(room.roomId);
  loadPendingRequests(room.roomId);
  loadRequestHistory(room.roomId);

  const main = document.querySelector("main");
  main.classList.remove("room-changing");
  void main.offsetWidth;
  main.classList.add("room-changing");

  setTimeout(() => {
    main.classList.remove("room-changing");
  }, 350);
}
  
async function loadRoomData(roomId) {
  try {
    const [summary, firstPage] = await Promise.all([
      DuitkuAPI.getSummary(roomId),
      DuitkuAPI.listTransactions(roomId, 100, 0)
    ]);

    let allTransactions = [
      ...(firstPage.transactions || [])
    ];

    let page = firstPage;
    let offset = Number(page.offset || 0) +
      Number(page.limit || 100);

    // Ambil halaman berikutnya jika masih ada.
    while (page.hasMore) {
      page = await DuitkuAPI.listTransactions(
        roomId,
        100,
        offset
      );

      allTransactions.push(
        ...(page.transactions || [])
      );

      offset += Number(page.limit || 100);

      if (!page.limit) break;
    }

    // Jangan timpa data jika pengguna sudah pindah ruang.
    if (activeSpace !== roomId) return;

    roomSummary = summary;

    transactions = allTransactions.map(item => ({
      id: item.transactionId,
      type: item.jenis === "pemasukan"
        ? "income"
        : "expense",
      amount: Number(item.nominal || 0),
      note: item.keterangan || "",
      category: item.kategori || "",
      date: item.tanggal || "",
      createdAt: item.createdAt || "",
      createdByName: item.dicatatOlehNama || "Tidak tercatat",
      createdByUid: item.dicatatOlehUid || "",
      source: item.sumber || "",
      requestId: item.requestId || ""
    }));

    roomLoading = false;

    $("firebaseNote").textContent =
      "● Data tersinkron dari Google Sheets";

    renderAll();

  } catch (error) {
    console.error("Gagal memuat data ruang:", error);

    if (activeSpace !== roomId) return;

    roomLoading = false;
    roomSummary = null;
    transactions = [];

    $("firebaseNote").textContent =
      "● Gagal memuat data ruang";

    renderAll();

    toast("Gagal memuat data: " + error.message);
  }
}


function renderRoomOptions() {
  const container = $("spaceOptions");

  container.innerHTML = availableRooms.map(room => `
    <button
      class="space-option"
      type="button"
      data-space="${esc(room.roomId)}"
    >
      <span class="space-dot"></span>
      <span>
        <b>${esc(room.name)}</b>
        <small>${esc(room.role)}</small>
      </span>
      <span class="space-check">✓</span>
    </button>
  `).join("");
}

async function initializeRooms() {
  const container = $("spaceOptions");

  try {
    container.innerHTML =
      '<p class="space-hint">Memuat daftar ruang...</p>';

    availableRooms = await window.DuitkuAPI.listRooms();

    if (!availableRooms.length) {
      container.innerHTML =
        '<p class="space-hint">Kamu belum tergabung dalam ruang mana pun.</p>';
      return;
    }

    Object.keys(labels).forEach(key => delete labels[key]);

    availableRooms.forEach(room => {
      labels[room.roomId] = room.name;
    });

    renderRoomOptions();

    const savedRoom = localStorage.getItem(
      "duitku-active-space-preview"
    );

    const selectedRoom = availableRooms.find(
      room => room.roomId === savedRoom
    );

    setSpace(
      selectedRoom
        ? selectedRoom.roomId
        : availableRooms[0].roomId
    );

  } catch (error) {
    console.error("Gagal memuat ruang:", error);

    container.innerHTML =
      '<p class="space-hint">Gagal memuat ruang. Silakan muat ulang halaman.</p>';

    toast(error.message);
  }
}

  const toggle=$('spaceToggle'),menu=$('spaceMenu');toggle.addEventListener('click',()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden))});
$("spaceOptions").addEventListener("click", e => {
  const option = e.target.closest("[data-space]");
  if (!option) return;

  const roomId = option.dataset.space;

  if (roomId === activeSpace) {
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    return;
  }

  setSpace(roomId);
  menu.hidden = true;
  toggle.setAttribute("aria-expanded", "false");

  toast(`Beralih ke ${labels[activeSpace]}`);
});
document.addEventListener('click',e=>{if(!e.target.closest('.space-wrap')){menu.hidden=true;toggle.setAttribute('aria-expanded','false')}});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
  function go(page) {
  const valid = [
  'dashboard',
  'transactions',
  'request-history',
  'savings',
  'statistics',
  'reports'
].includes(page) ? page : 'dashboard';

  const target = $(`page-${valid}`);

  document.querySelectorAll('.page-section').forEach(el => {
    el.hidden = el !== target;
  });

  document.querySelectorAll('[data-nav]').forEach(a => {
    a.classList.toggle('active', a.dataset.nav === valid);
  });

  // Jalankan ulang animasi seperti transisi Dashboard
  target.classList.remove('enter');
  void target.offsetWidth;
  target.classList.add('enter');

  const crumb = document.querySelector('header .crumb');

  crumb.innerHTML = `Ruang keuangan　/　
  <strong>${labels[activeSpace]}</strong>　/　
  ${{
    dashboard: 'Dashboard',
    transactions: 'Transaksi',
    savings: 'Tabungan',
    statistics: 'Statistik',
    reports: 'Laporan'
  }[valid]}`;

  history.replaceState(null, '', `#${valid}`);

  if (valid === 'statistics') renderStats();
  if (valid === 'savings') renderSavings();
  if (valid === 'reports') renderReport();
}
  document.querySelectorAll('[data-nav]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();go(a.dataset.nav)}));document.querySelectorAll('[data-go]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();go(a.dataset.go)}));
  function savingsActor() {
  return $('profileName').textContent.trim() || 'Pengguna Duitku';
}

function addSavingsHistory(plan, activity, amount) {
  savingsHistory.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    planName: plan.name,
    activity,
    amount: Number(amount),
    date: today(),
    createdAt: new Date().toISOString(),
    createdByName: savingsActor()
  });
}

function renderSavings() {
  const total = totalSavings();
  const startedCount = savingsPlans.filter(p => p.started).length;

  $('savingsTotal').textContent = money(total);
  $('savingsPlanCount').textContent = savingsPlans.length;
  $('savingsActiveCount').textContent = startedCount;

  $('savingsEmpty').hidden = savingsPlans.length > 0;

  $('savingsPlans').innerHTML = savingsPlans.map(plan => {
    const balance = Number(plan.balance || 0);
    const target = Number(plan.target || 0);
    const progress = target > 0
      ? Math.min(100, balance / target * 100)
      : 0;

    return `
      <article class="savings-card">
        <h3>${esc(plan.name)}</h3>
        <p>${esc(plan.note || 'Tidak ada keterangan')}</p>
        <p>Status: <b>${plan.started ? 'Berjalan' : 'Belum dimulai'}</b></p>

        <span class="savings-amount">${money(balance)}</span>
        <p>Target: ${money(target)}</p>

        <div class="savings-progress">
          <i style="width:${progress}%"></i>
        </div>
        <p>Progress ${progress.toFixed(1)}%</p>
<div class="savings-card-actions">
  ${activeRoom?.role !== 'viewer' ? `
    <button class="primary" data-savings-action="deposit" data-id="${plan.id}">Setor</button>
    <button class="secondary" data-savings-action="withdraw" data-id="${plan.id}">Tarik</button>
    <button class="secondary" data-savings-action="edit" data-id="${plan.id}">Edit</button>
    <button class="secondary" data-savings-action="delete" data-id="${plan.id}">Hapus</button>
  ` : ''}
</div>
      </article>
    `;
  }).join('');

  $('savingsHistoryRows').innerHTML = savingsHistory.map(item => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${formatTime(item.createdAt)}</td>
      <td>${esc(item.planName)}</td>
      <td>${esc(item.activity)}</td>
      <td>${money(item.amount)}</td>
      <td>${esc(item.createdByName || 'Tidak tercatat')}</td>
    </tr>
  `).join('');

  $('savingsHistoryEmpty').hidden = savingsHistory.length > 0;

  renderCompletedSavings();
}

function renderCompletedSavings() {
  const rows = $('completedSavingsRows');
  if (!rows) return;

  rows.innerHTML = completedSavings.map(item => `
    <tr>
      <td>${esc(item.name)}</td>
      <td>${money(item.target)}</td>
      <td>${money(item.amountUsed)}</td>
      <td>${money(item.remainderReturned)}</td>
      <td>${formatDate(item.completedAt)}</td>
      <td>${formatTime(item.createdAt)}</td>
      <td>${esc(item.completedByName)}</td>
    </tr>
  `).join('');

  $('completedSavingsEmpty').hidden = completedSavings.length > 0;
}
function closeSavingsDialog() {
  $('savingsActionModal').hidden = true;
  $('savingsDialogContent').innerHTML = '';
}

function openSavingsDialog({
  title,
  description = '',
  fields = '',
  confirmText = 'Simpan',
  danger = false,
  onSubmit
}) {
  const content = $('savingsDialogContent');

  content.innerHTML = `
    <form id="savingsDialogForm">
      <div class="modal-head">
        <div>
          <small class="eyebrow">TABUNGAN</small>
          <h2 id="savingsDialogTitle">${esc(title)}</h2>
        </div>
        <button type="button" class="icon-button" id="closeSavingsDialog" aria-label="Tutup">×</button>
      </div>

      ${
        description
          ? `<p class="muted savings-dialog-description">${esc(description)}</p>`
          : ''
      }

      <div class="savings-dialog-fields">
        ${fields}
      </div>

      <div class="modal-actions">
        <button type="button" class="secondary" id="cancelSavingsDialog">Batal</button>
        <button type="submit" class="${danger ? 'danger' : 'primary'}">
          ${esc(confirmText)}
        </button>
      </div>
    </form>
  `;

  $('savingsActionModal').hidden = false;

  const closeButtons = [
    $('closeSavingsDialog'),
    $('cancelSavingsDialog')
  ];

  closeButtons.forEach(button => {
    button.addEventListener('click', closeSavingsDialog);
  });

  $('savingsDialogForm').addEventListener('submit', async e => {
  e.preventDefault();

  const form = e.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');

  submitButton.disabled = true;
  submitButton.textContent = 'Memproses...';

  try {
    const result = await onSubmit(new FormData(form));

    if (result !== false) {
      closeSavingsDialog();
    }
  } catch (error) {
    console.error('Gagal memproses tabungan:', error);
    toast('Gagal: ' + error.message);
  } finally {
    if (form.isConnected) {
      submitButton.disabled = false;
      submitButton.textContent = 'Simpan';
    }
  }
});

  const firstInput = content.querySelector('input, textarea');
  if (firstInput) firstInput.focus();
}

function showSavingsConfirmation({
  title,
  description,
  confirmText = 'Ya, Lanjutkan',
  danger = false,
  onConfirm
}) {
  openSavingsDialog({
    title,
    description,
    confirmText,
    danger,
    onSubmit: async () => {
  await onConfirm();
}
  });
}

function savingsField(label, name, value = '', type = 'text', placeholder = '') {
  return `
    <label class="savings-form-field">
      <span>${esc(label)}</span>
      <input
        type="${type}"
        name="${name}"
        value="${esc(value)}"
        placeholder="${esc(placeholder)}"
        ${type === 'number' ? 'min="1" step="1"' : ''}
        required
      >
    </label>
  `;
}

function savingsActor() {
  return $('profileName').textContent.trim() || 'Pengguna Duitku';
}

function addSavingsHistory(plan, activity, amount) {
  savingsHistory.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    planName: plan.name,
    activity,
    amount: Number(amount),
    date: today(),
    createdAt: new Date().toISOString(),
    createdByName: savingsActor()
  });
}

async function refreshSavings() {
  if (!activeSpace) return;
  await loadSavings(activeSpace);
}

async function sendSavingsAction(payload) {
  const role = activeRoom?.role;

  if (role === 'viewer') {
    throw new Error('Akun Viewer hanya dapat melihat tabungan.');
  }

  if (role === 'editor') {
    await DuitkuAPI.submitActionRequest({
      roomId: activeSpace,
      ...payload
    });

    toast('Pengajuan berhasil dikirim dan menunggu persetujuan.');
    await refreshSavings();
    await loadPendingRequests(activeSpace);
    return;
  }

  const roomId = activeSpace;

  switch (payload.jenisAksi) {
    case 'buat_rencana':
      await DuitkuAPI.createSavingsPlan({
        roomId,
        nama: payload.namaTabungan,
        target: payload.target,
        keterangan: payload.keterangan || ''
      });
      break;

    case 'edit_rencana':
      await DuitkuAPI.updateSavingsPlan({
        roomId,
        planId: payload.planId,
        nama: payload.namaTabungan,
        target: payload.target,
        keterangan: payload.keterangan || ''
      });
      break;

    case 'hapus_rencana':
      await DuitkuAPI.deleteSavingsPlan(roomId, payload.planId);
      break;

    case 'setoran':
      await DuitkuAPI.depositSavings({
        roomId,
        planId: payload.planId,
        nominal: payload.nominal,
        keterangan: payload.keterangan || ''
      });
      break;

    case 'penarikan':
      await DuitkuAPI.withdrawSavings({
        roomId,
        planId: payload.planId,
        nominal: payload.nominal,
        keterangan: payload.keterangan || ''
      });
      break;

    default:
      throw new Error('Jenis aktivitas tabungan tidak dikenal.');
  }

  toast('Perubahan tabungan berhasil disimpan.');
  await refreshSavings();
}

function createSavingsPlan() {
  if (activeRoom?.role === 'viewer') return;

  openSavingsDialog({
    title: 'Buat Rencana Tabungan',
    description: 'Tentukan tujuan dan target dana yang ingin dikumpulkan.',
    fields: `
      ${savingsField('Nama rencana', 'name', '', 'text', 'Contoh: Beli laptop')}
      ${savingsField('Target tabungan (Rupiah)', 'target', '', 'number', 'Contoh: 5000000')}

      <label class="savings-form-field">
        <span>Keterangan (opsional)</span>
        <textarea name="note" rows="3"></textarea>
      </label>
    `,
    confirmText: activeRoom.role === 'editor'
      ? 'Ajukan Rencana'
      : 'Buat Tabungan',

    onSubmit: async data => {
      const name = String(data.get('name') || '').trim();
      const target = Number(data.get('target'));
      const note = String(data.get('note') || '').trim();

      if (!name || !Number.isSafeInteger(target) || target <= 0) {
        toast('Nama dan target tabungan wajib diisi dengan benar.');
        return false;
      }

      await sendSavingsAction({
        jenisAksi: 'buat_rencana',
        namaTabungan: name,
        target,
        keterangan: note
      });
    }
  });
}

function handleSavingsAction(action, id) {
  if (activeRoom?.role === 'viewer') return;

  const plan = savingsPlans.find(item => item.id === id);
  if (!plan) return;

  const isEditor = activeRoom.role === 'editor';

  if (action === 'edit') {
    openSavingsDialog({
      title: 'Edit Rencana Tabungan',
      description: 'Perbarui nama, target, atau keterangan rencana.',
      fields: `
        ${savingsField('Nama rencana', 'name', plan.name)}
        ${savingsField('Target tabungan (Rupiah)', 'target', plan.target, 'number')}

        <label class="savings-form-field">
          <span>Keterangan (opsional)</span>
          <textarea name="note" rows="3">${esc(plan.note || '')}</textarea>
        </label>
      `,
      confirmText: isEditor ? 'Ajukan Perubahan' : 'Simpan Perubahan',

      onSubmit: async data => {
        const name = String(data.get('name') || '').trim();
        const target = Number(data.get('target'));
        const note = String(data.get('note') || '').trim();

        if (
          !name ||
          !Number.isSafeInteger(target) ||
          target <= 0 ||
          target < Number(plan.balance || 0)
        ) {
          toast('Target harus lebih dari nol dan tidak boleh di bawah saldo tabungan.');
          return false;
        }

        await sendSavingsAction({
          jenisAksi: 'edit_rencana',
          planId: plan.id,
          namaTabungan: name,
          target,
          keterangan: note
        });
      }
    });
    return;
  }

  if (action === 'deposit' || action === 'withdraw') {
    const isDeposit = action === 'deposit';

    openSavingsDialog({
      title: isDeposit ? 'Setor Tabungan' : 'Tarik Tabungan',
      description: `${plan.name} · Saldo saat ini ${money(plan.balance)}.`,
      fields: `
        ${savingsField('Nominal Rupiah', 'amount', '', 'number', 'Masukkan nominal')}
        <label class="savings-form-field">
          <span>Keterangan (opsional)</span>
          <textarea name="note" rows="2"></textarea>
        </label>
      `,
      confirmText: isEditor
        ? 'Kirim Pengajuan'
        : (isDeposit ? 'Setor Sekarang' : 'Tarik Sekarang'),

      onSubmit: async data => {
        const amount = Number(data.get('amount'));
        const note = String(data.get('note') || '').trim();

        if (!Number.isSafeInteger(amount) || amount <= 0) {
          toast('Nominal harus berupa bilangan bulat lebih dari nol.');
          return false;
        }

        if (!isDeposit && amount > Number(plan.balance || 0)) {
          toast('Saldo tabungan tidak mencukupi.');
          return false;
        }

        await sendSavingsAction({
          jenisAksi: isDeposit ? 'setoran' : 'penarikan',
          planId: plan.id,
          namaTabungan: plan.name,
          nominal: amount,
          keterangan: note
        });
      }
    });
    return;
  }

  if (action === 'delete') {
    showSavingsConfirmation({
      title: 'Hapus Rencana?',
      description: `Rencana "${plan.name}" akan diajukan untuk dihapus. Saldo saat ini: ${money(plan.balance)}.`,
      confirmText: isEditor ? 'Ajukan Penghapusan' : 'Ya, Hapus',
      danger: true,

      onConfirm: async () => {
        await sendSavingsAction({
          jenisAksi: 'hapus_rencana',
          planId: plan.id,
          namaTabungan: plan.name,
          keterangan: 'Penghapusan rencana tabungan'
        });
      }
    });
  }
}

$('newSavingsPlan').addEventListener('click', createSavingsPlan);

$('showCompletedSavings').addEventListener('click', () => {
  $('completedSavingsPanel').hidden = false;
  renderCompletedSavings();
});

$('hideCompletedSavings').addEventListener('click', () => {
  $('completedSavingsPanel').hidden = true;
});

$('savingsPlans').addEventListener('click', e => {
  const button = e.target.closest('[data-savings-action]');
  if (!button) return;

  handleSavingsAction(button.dataset.savingsAction, button.dataset.id);
});

$('savingsActionModal').addEventListener('click', e => {
  if (e.target === $('savingsActionModal')) {
    closeSavingsDialog();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('savingsActionModal').hidden) {
    closeSavingsDialog();
  }
});

  function sums(list){return list.reduce((o,t)=>(o[t.type]+=Number(t.amount),o),{income:0,expense:0})}
  function renderAll() {
  renderDashboard();
  renderTransactions();
  renderStats();
  renderReport();
  renderSavings();
}
  
function renderDashboard() {
  const summary = roomSummary;

  $("dashBalance").textContent = roomLoading
    ? "Memuat..."
    : money(summary?.saldoSaatIni || 0);

  $("dashIncome").textContent = roomLoading
    ? "Memuat..."
    : money(summary?.totalPemasukan || 0);

  $("dashExpense").textContent = roomLoading
    ? "Memuat..."
    : money(summary?.totalPengeluaran || 0);

  $("dashIncomeCount").textContent = roomLoading
    ? "Memuat..."
    : `${summary?.jumlahPemasukan || 0} transaksi`;

  $("dashExpenseCount").textContent = roomLoading
    ? "Memuat..."
    : `${summary?.jumlahPengeluaran || 0} transaksi`;

  const list = [...transactions]
    .sort((a, b) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    )
    .slice(0, 5);

  $("recentTransactions").innerHTML =
    list.map(t => rowHTML(t, false)).join("");

  $("recentEmpty").hidden =
    roomLoading || transactions.length > 0;
}

  function rowHTML(t,actions=true){return `<div class="transaction-item"><span class="tx-icon ${t.type}">${t.type==='income'?'↙':'↗'}</span><span class="tx-info"><b>${esc(t.note)}</b><small>${esc(t.category)} · ${formatDate(t.date)}</small></span><strong class="amount ${t.type}">${t.type==='income'?'+':'−'} ${money(t.amount)}</strong>${actions?`<span class="tx-actions"><button data-edit="${t.id}" title="Edit">✎</button><button data-delete="${t.id}" title="Hapus">×</button></span>`:''}</div>`}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function formatDate(d) {
  return d
    ? new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta'
      }).format(new Date(d + 'T00:00:00'))
    : '-';
}

function formatTime(value) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  }).format(new Date(value));
}

function creatorName(t) {
  return t.createdByName || 'Tidak tercatat';
}
  
function renderTransactions() {
  const q = $("transactionSearch").value.toLowerCase();
  const type = $("transactionType").value;

  const list = [...transactions]
    .filter(t =>
      (type === "all" || t.type === type) &&
      (
        `${t.note} ${t.category} ${creatorName(t)}`
      ).toLowerCase().includes(q)
    )
    .sort((a, b) =>
      (b.createdAt || b.date).localeCompare(
        a.createdAt || a.date
      )
    );

  $("transactionRows").innerHTML = list.map(t => `
    <tr>
      <td>${formatDate(t.date)}</td>
      <td>${formatTime(t.createdAt)}</td>
      <td>${esc(t.note)}</td>
      <td>${esc(t.category)}</td>
      <td>
        <span class="pill ${t.type}">
          ${t.type === "income"
            ? "Pemasukan"
            : "Pengeluaran"}
        </span>
      </td>
      <td class="amount ${t.type}">
        ${t.type === "income" ? "+" : "−"}
        ${money(t.amount)}
      </td>
      <td>${esc(creatorName(t))}</td>
      <td>—</td>
    </tr>
  `).join("");

  $("transactionEmpty").hidden =
    roomLoading || transactions.length > 0;
}

  function renderStats() {
  const from = $('statsFrom').value;
  const to = $('statsTo').value;

  const list = transactions.filter(t =>
    (!from || t.date >= from) &&
    (!to || t.date <= to)
  );

  const s = sums(list);

  $('statsIncome').textContent = money(s.income);
  $('statsExpense').textContent = money(s.expense);
  $('statsNet').textContent = money(s.income - s.expense);

  const cats = {};

  list.filter(t => t.type === 'expense').forEach(t => {
    cats[t.category] = (cats[t.category] || 0) + Number(t.amount);
  });

  const entries = Object.entries(cats).sort((a,b) => b[1] - a[1]);
  const total = entries.reduce((n,x) => n + x[1], 0);

  if (!total) {
    $('categoryChart').innerHTML =
      '<div class="empty compact"><b>◔</b><strong>Belum ada data</strong><p>Grafik muncul setelah ada transaksi pengeluaran.</p></div>';

    $('categoryBreakdown').innerHTML =
      '<p class="muted">Belum ada kategori untuk diringkas.</p>';

    return;
  }

  let angle = 0;

  const stops = entries.map(([name,value],i) => {
    const start = angle;
    angle += value / total * 360;
    return `var(--chart-${i % 6}) ${start}deg ${angle}deg`;
  }).join(',');

  $('categoryChart').innerHTML = `
    <div class="donut" style="background:conic-gradient(${stops})">
      <div>
        <b>${money(total)}</b>
        <small>Total pengeluaran</small>
      </div>
    </div>
    <div class="chart-legend">
      ${entries.map(([name,value],i) => `
        <div>
          <i style="background:var(--chart-${i % 6})"></i>
          <span>${esc(name)}</span>
          <b>${(value / total * 100).toFixed(1)}%</b>
        </div>
      `).join('')}
    </div>
  `;

  $('categoryBreakdown').innerHTML = entries.map(([name,value],i) => `
    <div class="break-row">
      <div>
        <span><i style="background:var(--chart-${i % 6})"></i>${esc(name)}</span>
        <b>${money(value)}</b>
      </div>
      <div class="progress">
        <i style="width:${value / total * 100}%;background:var(--chart-${i % 6})"></i>
      </div>
    </div>
  `).join('');
}
  function reportList(){const from=$('reportFrom').value,to=$('reportTo').value,type=$('reportType').value;return transactions.filter(t=>(!from||t.date>=from)&&(!to||t.date<=to)&&(type==='all'||t.type===type)).sort((a,b)=>b.date.localeCompare(a.date))}
  function renderReport(){
  const list=reportList();
  const s=sums(list);

  $('reportIncome').textContent=money(s.income);
  $('reportExpense').textContent=money(s.expense);
  $('reportNet').textContent=money(s.income-s.expense);

  $('reportRows').innerHTML=list.map(t=>`
    <tr>
      <td>${formatDate(t.date)}</td>
      <td>${formatTime(t.createdAt)}</td>
      <td>${esc(t.note)}</td>
      <td>${esc(t.category)}</td>
      <td>${t.type==='income'?'Pemasukan':'Pengeluaran'}</td>
      <td class="amount ${t.type}">
        ${t.type==='income'?'+':'−'} ${money(t.amount)}
      </td>
      <td>${esc(creatorName(t))}</td>
    </tr>
  `).join('');

  $('reportEmpty').hidden = transactions.length > 0;
}

function openModal(type = "income") {
  if (!activeRoom) {
    toast("Pilih ruang terlebih dahulu.");
    return;
  }

  if (activeRoom.role === "viewer") {
    toast("Akun Viewer hanya dapat melihat transaksi.");
    return;
  }

  editingId = null;
  $("transactionForm").reset();

  $("formType").value = type;
  $("formDate").value = today();
  $("modalTitle").textContent =
    activeRoom.role === "editor"
      ? "Ajukan transaksi"
      : "Tambah transaksi";

  $("transactionModal").hidden = false;
}

  function closeModal(){$('transactionModal').hidden=true;editingId=null;$('transactionForm').reset()}
  $('newTransaction').addEventListener('click',()=>openModal());document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.add)));$('closeModal').addEventListener('click',closeModal);$('cancelModal').addEventListener('click',closeModal);$('transactionModal').addEventListener('click',e=>{if(e.target===$('transactionModal'))closeModal()});
  
$("transactionForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!activeRoom) {
    toast("Ruang aktif tidak ditemukan.");
    return;
  }

  const role = activeRoom.role;

  if (role === "viewer") {
    toast("Viewer tidak memiliki izin untuk mengirim transaksi.");
    return;
  }

  const nominal = Number($("formAmount").value);
  const kategori = $("formCategory").value.trim();
  const keterangan = $("formNote").value.trim();
  const jenis = $("formType").value === "income"
    ? "pemasukan"
    : "pengeluaran";

  if (!Number.isSafeInteger(nominal) || nominal <= 0) {
    toast("Nominal harus berupa bilangan bulat positif.");
    return;
  }

  if (!kategori || !keterangan) {
    toast("Kategori dan keterangan wajib diisi.");
    return;
  }

  const submitButton =
    $("transactionForm").querySelector('button[type="submit"]');

  const originalText = submitButton.textContent;

  submitButton.disabled = true;
  submitButton.textContent = "Mengirim...";

  try {
    const payload = {
      roomId: activeRoom.roomId,
      jenis,
      nominal,
      kategori,
      keterangan
    };

    if (role === "editor") {
      const request = await DuitkuAPI.submitTransactionRequest(
        payload
      );

      closeModal();

      toast(
        `Pengajuan berhasil dikirim. ID: ${request.requestId}`
      );

    } else if (
      role === "admin" ||
      role === "developer"
    ) {
      payload.requestId =
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      await DuitkuAPI.createTransaction(payload);

      closeModal();

      toast("Transaksi berhasil disimpan.");

    } else {
      throw new Error("Role akun tidak memiliki izin transaksi.");
    }

    await loadRoomData(activeRoom.roomId);

  } catch (error) {
    console.error("Gagal mengirim transaksi:", error);
    toast(error.message || "Transaksi gagal dikirim.");

  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
});

  
  document.addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(edit)openModal('income',edit.dataset.edit);if(del){const t=transactions.find(x=>x.id===del.dataset.delete);if(t&&confirm(`Hapus transaksi “${t.note}”?`)){transactions=transactions.filter(x=>x.id!==t.id);save();renderAll();toast('Transaksi dihapus.')}}});
  ['transactionSearch','transactionType'].forEach(id=>$(id).addEventListener('input',renderTransactions));['statsFrom','statsTo'].forEach(id => {
  $(id).addEventListener('change', renderStats);
});

$('statsReset').addEventListener('click', () => {
  $('statsFrom').value = '';
  $('statsTo').value = '';
  renderStats();
});['reportFrom','reportTo','reportType'].forEach(id=>$(id).addEventListener('change',renderReport));$('resetReport').addEventListener('click',()=>{$('reportFrom').value='';$('reportTo').value='';$('reportType').value='all';renderReport()});
  $('exportCsv').addEventListener('click',()=>{const list=reportList();if(!list.length){toast('Tidak ada transaksi untuk diekspor.');return}const rows=[['Tanggal','Keterangan','Kategori','Jenis','Jumlah'],...list.map(t=>[t.date,t.note,t.category,t.type==='income'?'Pemasukan':'Pengeluaran',t.amount])];const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`laporan-${activeSpace}-${today()}.csv`;a.click();URL.revokeObjectURL(url);toast('Laporan CSV berhasil dibuat.')});
  $('exportPdf').addEventListener('click', () => {
  const list = reportList();

  if (!list.length) {
    toast('Tidak ada transaksi untuk diekspor.');
    return;
  }

  if (!window.jspdf?.jsPDF) {
    toast('Library PDF belum berhasil dimuat. Periksa koneksi internet.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });

  const sumsReport = sums(list);

  doc.setFontSize(18);
  doc.text('LAPORAN KEUANGAN DUITKU', 14, 18);

  doc.setFontSize(10);
  doc.text(`Ruang: ${labels[activeSpace]}`, 14, 27);
  doc.text(`Tanggal ekspor: ${formatDate(today())}`, 14, 33);

  doc.text(`Pemasukan: ${money(sumsReport.income)}`, 14, 43);
  doc.text(`Pengeluaran: ${money(sumsReport.expense)}`, 95, 43);
  doc.text(`Selisih: ${money(sumsReport.income - sumsReport.expense)}`, 190, 43);

  doc.autoTable({
    startY: 52,
    head: [[
      'Tanggal',
      'Jam',
      'Keterangan',
      'Kategori',
      'Jenis',
      'Jumlah',
      'Dicatat oleh'
    ]],
    body: list.map(t => [
      formatDate(t.date),
      formatTime(t.createdAt),
      t.note,
      t.category,
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      money(t.amount),
      creatorName(t)
    ]),
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [8, 127, 91]
    },
    alternateRowStyles: {
      fillColor: [240, 248, 244]
    },
    margin: {
      left: 14,
      right: 14
    }
  });

  doc.save(`Duitku-Laporan-${activeSpace}-${today()}.pdf`);

  toast('PDF berhasil dibuat dan diunduh.');
});
  $("refreshRequests").addEventListener("click", () => {
  if (activeSpace) {
    loadPendingRequests(activeSpace);
  }
});

$("requestPanel").addEventListener("click", async e => {
  const button = e.target.closest("[data-request-action]");

  if (!button || !activeRoom) return;

  const action = button.dataset.requestAction;
  const requestId = button.dataset.requestId;
  const roomId = activeRoom.roomId;

  const request = pendingRequests.find(
    item => item.requestId === requestId
  );

  if (!request) {
    toast("Pengajuan tidak ditemukan atau sudah diproses.");
    return;
  }

  let alasanPenolakan = "";

  if (action === "approve") {
    const confirmed = confirm(
      `Setujui pengajuan ${request.jenis} sebesar ${money(request.nominal)} dari ${request.pemohonNama || "Editor"}?`
    );

    if (!confirmed) return;

  } else if (action === "reject") {
    const reason = prompt(
      "Masukkan alasan penolakan pengajuan:"
    );

    if (reason === null) return;

    alasanPenolakan = reason.trim();

    if (!alasanPenolakan) {
      toast("Alasan penolakan wajib diisi.");
      return;
    }

    if (alasanPenolakan.length > 500) {
      toast("Alasan penolakan maksimal 500 karakter.");
      return;
    }
  } else {
    return;
  }

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Memproses...";

  try {
    let result;

    if (action === "approve") {
      result = await DuitkuAPI.approveTransactionRequest(
        roomId,
        requestId
      );
    } else {
      result = await DuitkuAPI.rejectTransactionRequest(
        roomId,
        requestId,
        alasanPenolakan
      );
    }

    pendingRequests = pendingRequests.filter(
      item => item.requestId !== requestId
    );

    renderPendingRequests();

    toast(
      result.message ||
      (action === "approve"
        ? "Pengajuan berhasil disetujui."
        : "Pengajuan berhasil ditolak.")
    );

    // Perbarui saldo dan transaksi setelah keputusan.
    await loadRoomData(roomId);

    // Sinkronkan daftar pengajuan dari Firestore.
    await loadPendingRequests(roomId);

  } catch (error) {
    console.error("Gagal memproses pengajuan:", error);

    toast(
      error.message || "Keputusan pengajuan gagal diproses."
    );

    await loadPendingRequests(roomId);

  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
});
  $("refreshRequestHistory").addEventListener("click", () => {
  if (activeSpace) {
    loadRequestHistory(activeSpace);
  }
});

["requestHistorySearch", "requestHistoryStatus"].forEach(id => {
  $(id).addEventListener("input", renderRequestHistory);
});
}); // Penutup DOMContentLoaded
