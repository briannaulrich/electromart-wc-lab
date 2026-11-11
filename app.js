// app.js: loads the CSV files and puts the results on the page.
// All the finance math lives in ccc.js. This file only reads data and displays it.

(function () {
  'use strict';

  const C = window.CCC;

  // ---------- Formatting (the only place numbers are rounded) ----------

  const dollarFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const daysFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function minus(s) { return s.replace('-', '−'); }
  function dollars(n) { return minus((n < 0 ? '-$' : '$') + dollarFmt.format(Math.abs(n))); }
  function plain(n) { return minus(dollarFmt.format(n)); }
  function days(n) { return minus(daysFmt.format(n)); }
  function signedDays(n) { return (n > 0 ? '+' : '') + days(n); }

  const LABELS = {
    revenue: 'Revenue',
    cogs: 'Cost of goods sold',
    operating_expenses: 'Operating expenses',
    cash: 'Cash',
    accounts_receivable: 'Accounts receivable',
    inventory: 'Inventory',
    net_fixed_and_other_assets: 'Net fixed and other assets',
    accounts_payable: 'Accounts payable',
    notes_payable: 'Notes payable (bank line)',
    long_term_debt: 'Long-term debt',
    common_equity: 'Common equity'
  };
  const SECTION_LABELS = {
    income_statement: 'Income statement',
    asset: 'Assets',
    liability_or_equity: 'Liabilities and equity'
  };
  function label(item) { return LABELS[item] || item.replace(/_/g, ' '); }

  // ---------- Building table rows ----------

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => { node.setAttribute(k, v); });
    (children || []).forEach(c => node.append(c));
    return node;
  }

  function rowHead(title, how) {
    const th = el('th', { scope: 'row' }, [title]);
    if (how) th.append(el('span', { class: 'how' }, [how]));
    return th;
  }

  function renderDays(result) {
    const y = result.days;
    const rows = [
      ['DIO', 'Days inventory outstanding', 'Inventory / COGS × ' + y, 'dio'],
      ['DSO', 'Days sales outstanding', 'Receivables / Revenue × ' + y, 'dso'],
      ['DPO', 'Days payables outstanding', 'Payables / COGS × ' + y, 'dpo'],
      ['CCC', 'Cash conversion cycle', 'DIO + DSO − DPO', 'ccc']
    ];
    const body = document.getElementById('days-body');
    body.replaceChildren(...rows.map(([short, long, how, key]) => {
      const tr = el('tr', key === 'ccc' ? { class: 'total' } : {}, [
        rowHead(short, long + ': ' + how),
        el('td', {}, [days(result.before[key])]),
        el('td', {}, [days(result.after[key])]),
        el('td', {}, [signedDays(result.after[key] - result.before[key])])
      ]);
      return tr;
    }));
    document.getElementById('days-year').textContent = String(y);
  }

  function renderCash(result) {
    const y = result.days;
    const c = result.cash;
    const rows = [
      ['Inventory', c.inventory, 'DIO', 'COGS'],
      ['Receivables', c.receivables, 'DSO', 'revenue'],
      ['Payables', c.payables, 'DPO', 'COGS']
    ];
    const body = document.getElementById('cash-body');
    body.replaceChildren(...rows.map(([name, lever, dayName, baseName]) => {
      const how = 'Balance ' + plain(lever.before) + ' → ' + plain(lever.after) +
        '. Check: ' + days(lever.daysChange) + ' ' + dayName + ' days × ' +
        plain(lever.base) + ' ' + baseName + ' / ' + y + '.';
      return el('tr', {}, [
        rowHead(name, how),
        el('td', {}, [dollars(lever.freed)]),
        el('td', {}, [dollars(lever.fromDays)])
      ]);
    }));
    const totalFromDays = c.inventory.fromDays + c.receivables.fromDays + c.payables.fromDays;
    document.getElementById('cash-foot').replaceChildren(el('tr', {}, [
      el('th', { scope: 'row' }, ['Total']),
      el('td', {}, [dollars(c.total)]),
      el('td', {}, [dollars(totalFromDays)])
    ]));
  }

  function renderData(statements, assumptions) {
    const body = document.getElementById('data-body');
    const out = [];
    let lastSection = null;
    statements.lines.forEach(line => {
      if (line.section !== lastSection) {
        lastSection = line.section;
        out.push(el('tr', { class: 'section-row' }, [
          el('th', { colspan: '3' }, [SECTION_LABELS[line.section] || line.section])
        ]));
      }
      out.push(el('tr', {}, [
        rowHead(label(line.item)),
        el('td', {}, [plain(line.before)]),
        el('td', {}, [plain(line.after)])
      ]));
    });
    out.push(el('tr', { class: 'section-row' }, [el('th', { colspan: '3' }, ['Assumptions'])]));
    const a = assumptions;
    [
      ['Days in the year', String(a.days_in_year)],
      ['Bank line rate', (a.bank_rate * 100).toFixed(2) + '%'],
      ['Supplier terms', (a.supplier_discount * 100) + '/' + a.discount_days + ', net ' + a.net_days]
    ].forEach(([k, v]) => {
      out.push(el('tr', {}, [rowHead(k), el('td', { colspan: '2' }, [v])]));
    });
    body.replaceChildren(...out);
  }

  // ---------- Loading the data ----------

  async function fetchCSV(path) {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Could not load ' + path + ' (' + res.status + ').');
    return C.parseCSV(await res.text());
  }

  async function start() {
    const status = document.getElementById('status');
    try {
      const [statementRows, assumptionRows] = await Promise.all([
        fetchCSV('data/electromart.csv'),
        fetchCSV('data/assumptions.csv')
      ]);
      const statements = C.readStatements(statementRows);
      const assumptions = C.readAssumptions(assumptionRows);
      const result = C.analyze(statements, assumptions);

      renderDays(result);
      renderCash(result);
      renderData(statements, assumptions);

      status.hidden = true;
      ['days-section', 'cash-section', 'data-section'].forEach(id => {
        document.getElementById(id).hidden = false;
      });
    } catch (err) {
      status.textContent = 'Something went wrong: ' + err.message;
      status.classList.add('error');
    }
  }

  start();
})();
