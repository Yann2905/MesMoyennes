export function toCsv(students) {
  const maxNotes = Math.max(0, ...students.map((student) => student.notes?.length || 0));
  const headers = [
    "Nom et prenom",
    ...Array.from({ length: maxNotes }, (_, index) => `N${index + 1}`),
    "Moyenne",
    "Rang"
  ];

  const rows = students.map((student) => [
    student.name,
    ...Array.from({ length: maxNotes }, (_, index) => student.notes?.[index] ?? ""),
    student.average,
    student.rank
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n");
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[;"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
