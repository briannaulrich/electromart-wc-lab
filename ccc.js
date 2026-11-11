// ccc.js: the finance math for the ElectroMart CCC app.
// These functions never touch the page, so they can be checked with Node:
//   node -e "const C = require('./ccc.js'); console.log(C.dio(1200000, 6000000, 365))"
// Nothing here is rounded. Rounding happens only when app.js displays a number.

(function (root) {
  'use strict';

  // ---------- Reading CSV text ----------

  // Split CSV text into rows of fields. Handles quoted fields ("a, b") and
  // doubled quotes inside them, so a note with a comma doesn't break a row.
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    const s = String(text).replace(/^﻿/, ''); // drop a byte-order mark if present

    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (inQuotes) {
        if (ch === '"' && s[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { field += ch; }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field); field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && s[i + 1] === '\n') i++;
        row.push(field); field = '';
        rows.push(row); row = [];
      } else {
        field += ch;
      }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }

    // Drop blank lines, then turn each row into an object keyed by the header.
    const nonBlank = rows.filter(r => r.some(f => f.trim() !== ''));
    if (nonBlank.length === 0) return [];
    const header = nonBlank[0].map(h => h.trim());
    return nonBlank.slice(1).map(r => {
      const obj = {};
      header.forEach((h, j) => { obj[h] = (r[j] || '').trim(); });
      return obj;
    });
  }

  function toNumber(value, label) {
    const n = Number(String(value).replace(/[$,\s]/g, ''));
    if (value === '' || !Number.isFinite(n)) {
      throw new Error('"' + label + '" is not a number: "' + value + '"');
    }
    return n;
  }

  // Where each line we use must sit, according to the `section` column.
  const REQUIRED_ITEMS = {
    revenue: 'income_statement',
    cogs: 'income_statement',
    accounts_receivable: 'asset',
    inventory: 'asset',
    accounts_payable: 'liability_or_equity',
    notes_payable: 'liability_or_equity'
  };

  // Turn rows from electromart.csv into { before: {...}, after: {...}, lines: [...] }.
  function readStatements(rows) {
    const before = {};
    const after = {};
    const lines = [];
    rows.forEach(r => {
      if (!r.item) return;
      const b = toNumber(r.before, r.item + ' (before)');
      const a = toNumber(r.after, r.item + ' (after)');
      before[r.item] = b;
      after[r.item] = a;
      lines.push({ section: r.section, item: r.item, before: b, after: a });
    });
    Object.keys(REQUIRED_ITEMS).forEach(item => {
      const line = lines.find(l => l.item === item);
      if (!line) throw new Error('The statements CSV has no "' + item + '" line.');
      if (line.section !== REQUIRED_ITEMS[item]) {
        throw new Error('"' + item + '" should be in section "' + REQUIRED_ITEMS[item] +
          '" but the CSV says "' + line.section + '".');
      }
    });
    ['revenue', 'cogs'].forEach(item => {
      if (before[item] <= 0 || after[item] <= 0) {
        throw new Error('"' + item + '" must be greater than zero.');
      }
    });
    return { before, after, lines };
  }

  // Turn rows from assumptions.csv into { days_in_year: 365, bank_rate: 0.08, ... }.
  function readAssumptions(rows) {
    const a = {};
    rows.forEach(r => { if (r.assumption) a[r.assumption] = toNumber(r.value, r.assumption); });
    ['days_in_year', 'bank_rate', 'supplier_discount', 'discount_days', 'net_days'].forEach(k => {
      if (!(k in a)) throw new Error('assumptions.csv has no "' + k + '" row.');
    });
    return a;
  }

  // ---------- Day counts ----------

  // Days of inventory outstanding: how long goods sit before they are sold.
  function dio(inventory, cogs, days) { return inventory / cogs * days; }

  // Days sales outstanding: how long customers take to pay (all sales are on credit).
  function dso(receivables, revenue, days) { return receivables / revenue * days; }

  // Days payables outstanding: how long ElectroMart takes to pay suppliers (purchases = COGS).
  function dpo(payables, cogs, days) { return payables / cogs * days; }

  // Cash conversion cycle: days a dollar is tied up in operations.
  function ccc(dioDays, dsoDays, dpoDays) { return dioDays + dsoDays - dpoDays; }

  // All four day counts for one period (one column of the statements).
  function periodDays(p, days) {
    const d = {
      dio: dio(p.inventory, p.cogs, days),
      dso: dso(p.accounts_receivable, p.revenue, days),
      dpo: dpo(p.accounts_payable, p.cogs, days)
    };
    d.ccc = ccc(d.dio, d.dso, d.dpo);
    return d;
  }

  // ---------- Cash freed by each lever ----------

  // From the balance sheet: a drop in an asset frees cash, and a rise in
  // accounts payable frees cash. The check recomputes each one from the days:
  // days changed × annual COGS (or revenue) / days in the year.
  function cashFreed(statements, days) {
    const b = statements.before;
    const a = statements.after;
    const db = periodDays(b, days);
    const da = periodDays(a, days);

    const levers = {
      inventory: {
        before: b.inventory,
        after: a.inventory,
        freed: b.inventory - a.inventory,
        daysChange: db.dio - da.dio,
        base: b.cogs,
        fromDays: (db.dio - da.dio) * b.cogs / days
      },
      receivables: {
        before: b.accounts_receivable,
        after: a.accounts_receivable,
        freed: b.accounts_receivable - a.accounts_receivable,
        daysChange: db.dso - da.dso,
        base: b.revenue,
        fromDays: (db.dso - da.dso) * b.revenue / days
      },
      payables: {
        before: b.accounts_payable,
        after: a.accounts_payable,
        freed: a.accounts_payable - b.accounts_payable,
        daysChange: da.dpo - db.dpo,
        base: b.cogs,
        fromDays: (da.dpo - db.dpo) * b.cogs / days
      }
    };
    levers.total = levers.inventory.freed + levers.receivables.freed + levers.payables.freed;
    return levers;
  }

  // Everything the page needs, from the two parsed CSV files.
  function analyze(statements, assumptions) {
    const days = assumptions.days_in_year;
    return {
      days,
      before: periodDays(statements.before, days),
      after: periodDays(statements.after, days),
      cash: cashFreed(statements, days)
    };
  }

  // ---------- Levers ----------

  // The balance a number of days implies: days × annual COGS (or revenue) / days in the year.
  function balanceFromDays(dayCount, annualAmount, days) { return dayCount * annualAmount / days; }

  // Interest saved a year if the cash freed pays down the bank line.
  // Only the line's Before balance can be paid down, so savings stop there.
  // If cash freed is negative, ElectroMart borrows more, so the "saving" is negative.
  function interestSaved(cashFreedTotal, bankLineBefore, rate) {
    return Math.min(cashFreedTotal, bankLineBefore) * rate;
  }

  // Days paid past the net due date, never less than zero.
  function daysPastDue(dpoDays, netDays) { return Math.max(0, dpoDays - netDays); }

  // Nominal annual cost of skipping the supplier discount:
  // d / (1 − d) × days in year / (days paid − discount days).
  // Returns null when DPO is within the discount period (ElectroMart takes the discount).
  function discountCost(d, dpoDays, discountDays, days) {
    if (dpoDays <= discountDays) return null;
    return d / (1 - d) * days / (dpoDays - discountDays);
  }

  // Everything the lever panel shows, for chosen DIO, DSO and DPO.
  // Revenue and COGS stay at their Before values.
  function leverResults(statements, assumptions, chosen) {
    const b = statements.before;
    const y = assumptions.days_in_year;
    const inventory = balanceFromDays(chosen.dio, b.cogs, y);
    const receivables = balanceFromDays(chosen.dso, b.revenue, y);
    const payables = balanceFromDays(chosen.dpo, b.cogs, y);
    const freed = {
      inventory: b.inventory - inventory,
      receivables: b.accounts_receivable - receivables,
      payables: payables - b.accounts_payable
    };
    freed.total = freed.inventory + freed.receivables + freed.payables;
    return {
      ccc: ccc(chosen.dio, chosen.dso, chosen.dpo),
      balances: { inventory, receivables, payables },
      freed,
      bankLineBefore: b.notes_payable,
      interestSaved: interestSaved(freed.total, b.notes_payable, assumptions.bank_rate),
      daysPastDue: daysPastDue(chosen.dpo, assumptions.net_days),
      discountCost: discountCost(assumptions.supplier_discount, chosen.dpo,
        assumptions.discount_days, y)
    };
  }

  const api = {
    parseCSV, readStatements, readAssumptions,
    dio, dso, dpo, ccc, periodDays, cashFreed, analyze,
    balanceFromDays, interestSaved, daysPastDue, discountCost, leverResults
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api; // Node
  else root.CCC = api;                                                        // browser
})(typeof window !== 'undefined' ? window : this);
