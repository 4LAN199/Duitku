document.addEventListener("DOMContentLoaded",()=>{
  DuitkuTheme.init(); DuitkuAnimation.start();
  
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0
}).format(n || 0);
const today = () => new Date().toISOString().slice(0, 10);

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

  const labels={utama:'Duitku Utama',kedua:'Duitku Kedua'}; let activeSpace='utama', editingId=null, transactions=[];
  const storageKey=()=>`duitku-v2-transactions-${activeSpace}`;
  function load(){try{transactions=JSON.parse(localStorage.getItem(storageKey())||'[]')}catch{transactions=[]}}
  function save(){try{localStorage.setItem(storageKey(),JSON.stringify(transactions))}catch{toast('Penyimpanan browser penuh atau tidak tersedia.')}}
  function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2600)}
  function setSpace(id) {
  activeSpace = id in labels ? id : 'utama';

  $('activeSpaceName').textContent = labels[activeSpace];
  $('crumbSpaceName').textContent = labels[activeSpace];

  document.querySelectorAll('[data-space]').forEach(o => {
    o.classList.toggle('selected', o.dataset.space === activeSpace);
  });

  try {
    localStorage.setItem('duitku-active-space-preview', activeSpace);
  } catch {}

  load();
  renderAll();

  const main = document.querySelector('main');
  main.classList.remove('room-changing');

  void main.offsetWidth;

  main.classList.add('room-changing');

  setTimeout(() => {
    main.classList.remove('room-changing');
  }, 350);
}
  const toggle=$('spaceToggle'),menu=$('spaceMenu');toggle.addEventListener('click',()=>{menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden))});document.querySelectorAll('[data-space]').forEach(o=>o.addEventListener('click',()=>{setSpace(o.dataset.space);menu.hidden=true;toggle.setAttribute('aria-expanded','false');toast(`Beralih ke ${labels[activeSpace]}`)}));document.addEventListener('click',e=>{if(!e.target.closest('.space-wrap')){menu.hidden=true;toggle.setAttribute('aria-expanded','false')}});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
  function go(page) {
  const valid = ['dashboard', 'transactions', 'statistics', 'reports']
    .includes(page) ? page : 'dashboard';

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
    ${{dashboard:'Dashboard',transactions:'Transaksi',
       statistics:'Statistik',reports:'Laporan'}[valid]}`;

  history.replaceState(null, '', `#${valid}`);

  if (valid === 'statistics') renderStats();
  if (valid === 'reports') renderReport();
}
  document.querySelectorAll('[data-nav]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();go(a.dataset.nav)}));document.querySelectorAll('[data-go]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();go(a.dataset.go)}));
  function sums(list){return list.reduce((o,t)=>(o[t.type]+=Number(t.amount),o),{income:0,expense:0})}
  function renderAll() {
  renderDashboard();
  renderTransactions();
  renderStats();
  renderReport();
}
  function renderDashboard(){
  const s=sums(transactions);
  $('dashBalance').textContent=money(s.income-s.expense);
  $('dashIncome').textContent=money(s.income);
  $('dashExpense').textContent=money(s.expense);
  $('dashIncomeCount').textContent=`${transactions.filter(t=>t.type==='income').length} transaksi`;
  $('dashExpenseCount').textContent=`${transactions.filter(t=>t.type==='expense').length} transaksi`;

  const list=[...transactions]
    .sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))
    .slice(0,5);

  $('recentTransactions').innerHTML=list.map(t=>rowHTML(t,false)).join('');
  $('recentEmpty').hidden = transactions.length > 0;
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
  const q = $('transactionSearch').value.toLowerCase();
  const type = $('transactionType').value;

  const list = [...transactions]
    .filter(t =>
      (type === 'all' || t.type === type) &&
      (`${t.note} ${t.category} ${creatorName(t)}`).toLowerCase().includes(q)
    )
    .sort((a,b) =>
      (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
    );

  $('transactionRows').innerHTML = list.map(t => `
    <tr>
      <td>${formatDate(t.date)}</td>
      <td>${formatTime(t.createdAt)}</td>
      <td>${esc(t.note)}</td>
      <td>${esc(t.category)}</td>
      <td>
        <span class="pill ${t.type}">
          ${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
        </span>
      </td>
      <td class="amount ${t.type}">
        ${t.type === 'income' ? '+' : '−'} ${money(t.amount)}
      </td>
      <td>${esc(creatorName(t))}</td>
      <td>
        <button class="table-action" data-edit="${t.id}">Edit</button>
        <button class="table-action danger" data-delete="${t.id}">Hapus</button>
      </td>
    </tr>
  `).join('');

  // Pesan kosong hanya muncul jika ruang belum punya riwayat sama sekali.
  $('transactionEmpty').hidden = transactions.length > 0;
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
  function openModal(type='income',id=null){editingId=id;const t=id?transactions.find(x=>x.id===id):null;$('modalTitle').textContent=t?'Edit transaksi':'Tambah transaksi';$('formType').value=t?.type||type;$('formAmount').value=t?.amount||'';$('formNote').value=t?.note||'';$('formCategory').value=t?.category||'Makanan';$('formDate').value=t?.date||today();$('transactionModal').hidden=false;$('formAmount').focus()}
  function closeModal(){$('transactionModal').hidden=true;editingId=null;$('transactionForm').reset()}
  $('newTransaction').addEventListener('click',()=>openModal());document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.add)));$('closeModal').addEventListener('click',closeModal);$('cancelModal').addEventListener('click',closeModal);$('transactionModal').addEventListener('click',e=>{if(e.target===$('transactionModal'))closeModal()});
  $('transactionForm').addEventListener('submit', e => {
  e.preventDefault();

  const amount = Number($('formAmount').value);

  if (!Number.isFinite(amount) || amount <= 0) {
    toast('Nominal harus lebih dari nol.');
    return;
  }

  const previous = editingId
    ? transactions.find(t => t.id === editingId)
    : null;

  const data = {
    id: editingId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: $('formType').value,
    amount,
    note: $('formNote').value.trim(),
    category: $('formCategory').value,
    date: $('formDate').value,

    // Waktu dan pembuat asli tidak berubah saat transaksi diedit.
    createdAt: previous?.createdAt || new Date().toISOString(),

    createdByName: previous?.createdByName ||
      (editingId
        ? 'Tidak tercatat'
        : ($('profileName').textContent.trim() || 'Pengguna Duitku'))
  };

  if (!data.note || !data.date) {
    toast('Lengkapi semua data transaksi.');
    return;
  }

  if (editingId) {
    transactions = transactions.map(t =>
      t.id === editingId ? data : t
    );
  } else {
    transactions.push(data);
  }

  save();
  closeModal();
  renderAll();

  toast(
    editingId
      ? 'Transaksi berhasil diperbarui.'
      : 'Transaksi berhasil disimpan.'
  );
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
}); // Penutup DOMContentLoaded
