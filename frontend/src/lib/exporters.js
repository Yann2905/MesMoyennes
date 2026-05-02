export function buildCsv(students, maxNotes) {
  const headers = ["Nom et prenom", ...noteHeaders(maxNotes), "Moyenne", "Rang"];
  const rows = students.map((student) => [
    student.name,
    ...Array.from({ length: maxNotes }, (_, index) => student.notes[index] ?? ""),
    student.average.toFixed(2),
    student.rank
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n");
}

export function buildExcelHtml(students, maxNotes) {
  const headers = ["Nom et prenom", ...noteHeaders(maxNotes), "Moyenne", "Rang"];
  const headerCells = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const rows = students
    .map((student) => {
      const values = [
        student.name,
        ...Array.from({ length: maxNotes }, (_, index) => student.notes[index] ?? ""),
        student.average.toFixed(2),
        student.rank
      ];
      return `<tr>${values.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`;
    })
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"></head><body><table><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

export function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function noteHeaders(maxNotes) {
  return Array.from({ length: maxNotes }, (_, index) => `N${index + 1}`);
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
