const $ = (selector) => document.querySelector(selector);
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const shortCurrency = (amount) => amount >= 100000 ? `₹${(amount / 100000).toFixed(1)}L` : amount >= 1000 ? `₹${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k` : currency.format(amount);
const palette = ['#6878ef', '#35b8a6', '#f2a54a', '#d277aa', '#a5b1cf', '#83a9c8', '#c29a74'];
let data = { transactions: [], budgets: [] };
let selectedMonth = '';
let showAll = false;
let toastTimer;

function monthKey(date) { return date.slice(0, 7); }
function visibleTransactions() { return data.transactions.filter((item) => monthKey(item.date) === selectedMonth); }
function selectedDate() { return new Date(`${selectedMonth}-01T12:00:00`); }
function dateLabel(date, options = { day: 'numeric', month: 'short' }) { return new Intl.DateTimeFormat('en-IN', options).format(new Date(`${date}T12:00:00`)); }
function money(amount) { return currency.format(Math.round(amount)); }
function iconFor(category, type) { if (type === 'income') return '↙'; return ({ 'Food & dining': '⌁', Housing: '⌂', Transport: '↗', Shopping: '◇', Health: '✚', Entertainment: '♫', Utilities: 'ϟ', Education: '⌑', Salary: '↙', Freelance: '✳' })[category] || '◦'; }

function buildMonthOptions() {
  const select = $('#month-filter');
  const now = new Date();
  const items = [];
  for (let offset = 0; offset < 8; offset += 1) {
    const value = new Date(now.getFullYear(), now.getMonth() - offset, 1, 12);
    items.push({ value: value.toISOString().slice(0, 7), label: new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(value) });
  }
  selectedMonth = items[0].value;
  select.innerHTML = items.map((item) => `<option value="${item.value}">${item.label}</option>`).join('');
  select.addEventListener('change', () => { selectedMonth = select.value; showAll = false; render(); });
}

function getTotals(transactions) {
  const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const spending = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  return { income, spending, net: income - spending };
}

function renderMetrics(transactions) {
  const totals = getTotals(transactions);
  $('#income-value').textContent = money(totals.income);
  $('#spending-value').textContent = money(totals.spending);
  $('#balance-value').textContent = money(Math.max(0, 312000 + totals.net));
  const savingsRate = totals.income ? Math.round((totals.net / totals.income) * 100) : 0;
  $('#savings-value').textContent = `${Math.max(0, savingsRate)}%`;
  $('#savings-bar').style.width = `${Math.max(0, Math.min(100, savingsRate))}%`;
  $('#savings-note').textContent = totals.net < 0 ? 'spending exceeds income' : 'of income saved';
  $('#net-flow').textContent = `${totals.net < 0 ? '−' : ''}${money(Math.abs(totals.net))}`;
  $('#net-flow').style.color = totals.net < 0 ? '#df7272' : '#34394b';
  const date = selectedDate();
  const title = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);
  $('#chart-month').textContent = title;
  $('#month-last-day').textContent = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  $('#transaction-count').textContent = transactions.length;
  $('#today-label').textContent = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
  $('#day-number').textContent = new Intl.DateTimeFormat('en-IN', { day: 'numeric' }).format(new Date());
  $('.welcome-row .eyebrow').textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase();
}

function renderCashflow(transactions) {
  const days = new Date(selectedDate().getFullYear(), selectedDate().getMonth() + 1, 0).getDate();
  const income = Array(days).fill(0);
  const expense = Array(days).fill(0);
  for (const item of transactions) (item.type === 'income' ? income : expense)[Number(item.date.slice(-2)) - 1] += item.amount;
  const max = Math.max(1000, ...income, ...expense);
  const width = 720;
  const height = 112;
  const x = (day) => 4 + (day * (width - 8)) / Math.max(1, days - 1);
  const y = (amount) => 7 + (1 - amount / max) * (height - 22);
  const line = (values) => values.map((value, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(' ');
  const area = (values) => `${line(values)} L${x(days - 1).toFixed(1)} ${height - 8} L${x(0).toFixed(1)} ${height - 8} Z`;
  const grid = [25, 54, 83].map((yPos) => `<line x1="0" x2="${width}" y1="${yPos}" y2="${yPos}" stroke="#f1f2f6" stroke-dasharray="3 5"/>`).join('');
  const markers = transactions.map((item) => {
    const index = Number(item.date.slice(-2)) - 1;
    const values = item.type === 'income' ? income : expense;
    const yy = y(values[index]);
    return `<circle cx="${x(index).toFixed(1)}" cy="${yy.toFixed(1)}" r="2.7" fill="${item.type === 'income' ? '#7281e9' : '#70cbb7'}" stroke="white" stroke-width="1.5"><title>${dateLabel(item.date)} · ${item.name}: ${money(item.amount)}</title></circle>`;
  }).join('');
  $('#cashflow-chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">${grid}<defs><linearGradient id="income-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7887ef" stop-opacity=".14"/><stop offset="1" stop-color="#7887ef" stop-opacity="0"/></linearGradient><linearGradient id="expense-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#74d0bc" stop-opacity=".16"/><stop offset="1" stop-color="#74d0bc" stop-opacity="0"/></linearGradient></defs><path d="${area(income)}" fill="url(#income-fill)"/><path d="${area(expense)}" fill="url(#expense-fill)"/><path d="${line(income)}" fill="none" stroke="#7785eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/><path d="${line(expense)}" fill="none" stroke="#5bc3ab" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${markers}</svg>`;
  $('#cashflow-chart').setAttribute('aria-label', `${new Intl.NumberFormat('en-IN', { month: 'long', year: 'numeric' }).format(selectedDate())} daily cash flow. Income ${money(getTotals(transactions).income)}, expenses ${money(getTotals(transactions).spending)}.`);
}

function renderCategories(transactions) {
  const expenses = transactions.filter((item) => item.type === 'expense');
  const totals = new Map();
  for (const item of expenses) totals.set(item.category, (totals.get(item.category) || 0) + item.amount);
  const sorted = [...totals].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5);
  const other = sorted.slice(5).reduce((sum, [, value]) => sum + value, 0);
  if (other) top.push(['Other', other]);
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  let accumulated = 0;
  const stops = top.map(([, value], index) => { const start = accumulated; accumulated += total ? (value / total) * 100 : 0; return `${palette[index % palette.length]} ${start.toFixed(2)}% ${accumulated.toFixed(2)}%`; });
  if (!stops.length) stops.push('#e8ebf2 0% 100%');
  $('#donut-chart').style.background = `conic-gradient(${stops.join(',')})`;
  $('#donut-total').textContent = shortCurrency(total);
  $('#category-list').innerHTML = top.length ? top.map(([name, value], index) => `<div class="category-row"><i class="category-dot" style="background:${palette[index % palette.length]}"></i><span class="category-name" title="${escapeHtml(name)}">${escapeHtml(name)}</span><strong class="category-amount">${shortCurrency(value)}</strong></div>`).join('') : '<div class="empty-state">No expenses yet this month.</div>';
}

function renderBudgets(transactions) {
  const expenses = transactions.filter((item) => item.type === 'expense');
  const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalBudget = data.budgets.reduce((sum, item) => sum + item.limit, 0);
  $('#budget-summary').innerHTML = `${shortCurrency(totalSpent)} <small>/ ${shortCurrency(totalBudget)}</small>`;
  $('#budget-count').textContent = data.budgets.length;
  $('#budget-list').innerHTML = data.budgets.map((budget) => {
    const spent = expenses.filter((item) => item.category === budget.category).reduce((sum, item) => sum + item.amount, 0);
    const percent = Math.min(100, Math.round((spent / budget.limit) * 100));
    const overflow = spent > budget.limit;
    return `<div class="budget-item"><div class="budget-head"><span class="budget-label"><i style="background:${budget.color}"></i>${escapeHtml(budget.category)}</span><span class="budget-amount"><strong>${shortCurrency(spent)}</strong> / ${shortCurrency(budget.limit)}</span></div><div class="budget-track" role="progressbar" aria-label="${escapeHtml(budget.category)} budget" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%;background:${overflow ? '#e17878' : budget.color}"></span></div></div>`;
  }).join('');
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function renderTransactions(transactions) {
  const query = $('#search-input').value.trim().toLowerCase();
  const type = $('#type-filter').value;
  const filtered = transactions.filter((item) => (type === 'all' || item.type === type) && (!query || `${item.name} ${item.category} ${item.account}`.toLowerCase().includes(query)));
  const rows = showAll || query || type !== 'all' ? filtered : filtered.slice(0, 6);
  $('#transaction-rows').innerHTML = rows.map((item) => `<tr class="transaction-row"><td><div class="transaction-name-cell"><span class="transaction-mark ${item.type}">${iconFor(item.category, item.type)}</span><span><span class="transaction-name">${escapeHtml(item.name)}</span><span class="transaction-account">${escapeHtml(item.account)}</span></span></div></td><td><span class="category-badge">${escapeHtml(item.category)}</span></td><td>${dateLabel(item.date)}</td><td class="amount-cell ${item.type}">${item.type === 'income' ? '+' : '−'} ${money(item.amount)}</td><td><button class="delete-transaction" data-delete="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(item.name)}" title="Delete transaction">×</button></td></tr>`).join('');
  $('#empty-state').hidden = rows.length > 0;
  $('#showing-label').textContent = `Showing ${rows.length} of ${filtered.length} transaction${filtered.length === 1 ? '' : 's'}`;
  $('#view-all').hidden = filtered.length <= 6;
  $('#view-all').innerHTML = showAll ? 'Show less <span>↑</span>' : 'View all <span>→</span>';
}

function render() {
  const transactions = visibleTransactions().sort((a, b) => b.date.localeCompare(a.date));
  renderMetrics(transactions);
  renderCashflow(transactions);
  renderCategories(transactions);
  renderBudgets(transactions);
  renderTransactions(transactions);
  $('#page-error')?.remove();
}

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('visible'), 2600);
}

const browserStorageKey = 'finch-money-dashboard-v1';
const isStaticDeployment = !['localhost', '127.0.0.1'].includes(location.hostname) || new URLSearchParams(location.search).has('static');

async function browserRequest(path, options = {}) {
  let saved = localStorage.getItem(browserStorageKey);
  let snapshot = saved ? JSON.parse(saved) : await fetch('./demo-data.json').then((response) => {
    if (!response.ok) throw new Error('Demo data could not be loaded.');
    return response.json();
  });
  const method = options.method || 'GET';
  if (path === '/api/data' && method === 'GET') {
    if (!saved) localStorage.setItem(browserStorageKey, JSON.stringify(snapshot));
    return snapshot;
  }
  if (path === '/api/transactions' && method === 'POST') {
    const transaction = { id: crypto.randomUUID(), ...JSON.parse(options.body || '{}') };
    snapshot.transactions.unshift(transaction);
    localStorage.setItem(browserStorageKey, JSON.stringify(snapshot));
    return transaction;
  }
  if (path.startsWith('/api/transactions/') && method === 'DELETE') {
    const id = decodeURIComponent(path.slice('/api/transactions/'.length));
    const before = snapshot.transactions.length;
    snapshot.transactions = snapshot.transactions.filter((item) => item.id !== id);
    if (snapshot.transactions.length === before) throw new Error('Transaction not found.');
    localStorage.setItem(browserStorageKey, JSON.stringify(snapshot));
    return { deleted: true, id };
  }
  if (path === '/api/budgets' && method === 'PUT') {
    snapshot.budgets = JSON.parse(options.body || '{}').budgets || [];
    localStorage.setItem(browserStorageKey, JSON.stringify(snapshot));
    return { budgets: snapshot.budgets };
  }
  throw new Error('This dashboard action is unavailable.');
}

async function request(path, options = {}) {
  if (isStaticDeployment) return browserRequest(path, options);
  const response = await fetch(path, { ...options, headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.');
  return result;
}

async function load() {
  try {
    document.body.classList.add('loading');
    data = await request('/api/data');
    document.body.classList.remove('offline');
    render();
  } catch (error) {
    document.body.classList.add('offline');
    const banner = document.createElement('div');
    banner.id = 'page-error'; banner.className = 'error-banner';
    banner.textContent = `Could not load saved data. ${error.message} Refresh to retry.`;
    $('.page-wrap').prepend(banner);
  } finally { document.body.classList.remove('loading'); }
}

const dialog = $('#transaction-dialog');
const budgetDialog = $('#budget-dialog');
function openDialog() {
  $('#dialog-error').textContent = '';
  $('#transaction-form').reset();
  $('#transaction-date').value = new Date().toISOString().slice(0, 10);
  $('#transaction-amount').value = '';
  dialog.showModal();
  $('#transaction-name').focus();
}

$('#add-transaction').addEventListener('click', openDialog);
$('.dialog-close').addEventListener('click', () => dialog.close());
$('.dialog-cancel').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
$('#transaction-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#save-transaction');
  button.disabled = true;
  $('#dialog-error').textContent = '';
  const form = new FormData(event.currentTarget);
  const transaction = Object.fromEntries(form.entries());
  transaction.amount = Number(transaction.amount);
  try {
    await request('/api/transactions', { method: 'POST', body: JSON.stringify(transaction) });
    dialog.close();
    toast('Transaction saved on this computer.');
    await load();
  } catch (error) { $('#dialog-error').textContent = error.message; }
  finally { button.disabled = false; }
});

$('#transaction-rows').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-delete]');
  if (!button) return;
  const item = data.transactions.find((transaction) => transaction.id === button.dataset.delete);
  if (!item || !window.confirm(`Delete “${item.name}”?`)) return;
  try { await request(`/api/transactions/${encodeURIComponent(item.id)}`, { method: 'DELETE' }); toast('Transaction removed.'); await load(); }
  catch (error) { toast(error.message); }
});

$('#search-input').addEventListener('input', () => renderTransactions(visibleTransactions()));
$('#type-filter').addEventListener('change', () => renderTransactions(visibleTransactions()));
$('#view-all').addEventListener('click', () => { showAll = !showAll; renderTransactions(visibleTransactions()); });
$('#see-transactions').addEventListener('click', () => $('#transactions').scrollIntoView({ behavior: 'smooth' }));
$('#edit-budget').addEventListener('click', () => {
  $('#budget-dialog-error').textContent = '';
  $('#budget-edit-fields').innerHTML = data.budgets.map((budget) => `<label class="budget-edit-row"><span><i style="background:${budget.color}"></i>${escapeHtml(budget.category)}</span><span class="budget-edit-input"><b>₹</b><input name="${escapeHtml(budget.id)}" type="number" min="1" max="100000000" step="1" value="${budget.limit}" required aria-label="${escapeHtml(budget.category)} monthly limit" /></span></label>`).join('');
  budgetDialog.showModal();
});
$('.budget-dialog-close').addEventListener('click', () => budgetDialog.close());
$('.budget-dialog-cancel').addEventListener('click', () => budgetDialog.close());
$('#budget-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('#save-budgets');
  button.disabled = true;
  $('#budget-dialog-error').textContent = '';
  const fields = new FormData(event.currentTarget);
  const budgets = data.budgets.map((budget) => ({ ...budget, limit: Number(fields.get(budget.id)) }));
  try {
    await request('/api/budgets', { method: 'PUT', body: JSON.stringify({ budgets }) });
    budgetDialog.close();
    toast('Your budgets were saved on this computer.');
    await load();
  } catch (error) { $('#budget-dialog-error').textContent = error.message; }
  finally { button.disabled = false; }
});
$('#accounts-button').addEventListener('click', () => toast('This demo uses fictional local accounts only.'));
$('#settings-button').addEventListener('click', () => toast('Your sample data is saved in this project’s local JSON file.'));
$('#help-button').addEventListener('click', () => toast('Finch is a local demo. It has no bank connection and uses fictional sample data.'));
$('#dismiss-notice').addEventListener('click', () => $('.notice-strip').classList.add('dismissed'));
document.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search-input').focus(); } });
buildMonthOptions();
load();
