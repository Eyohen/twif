// Several screens offered an Export button that did nothing. A CSV is what the
// team actually wants — it opens in Excel and in Google Sheets — so one helper
// serves them all rather than each page inventing its own.

const cell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  // A comma, a quote or a line break inside a field would otherwise shift every
  // column after it.
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (headers, rows) => [
  headers.map(cell).join(','),
  ...rows.map((row) => row.map(cell).join(',')),
].join('\r\n');

export const downloadCsv = (filename, headers, rows) => {
  // The BOM is what tells Excel the file is UTF-8; without it a customer name
  // with an accent in it arrives mangled.
  const blob = new Blob(['﻿', toCsv(headers, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// Same date shape everywhere a file is named after the day it was taken.
export const csvStamp = (date = new Date()) => date.toISOString().slice(0, 10);
