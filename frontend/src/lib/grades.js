export function calculateClass(students) {
  const enriched = students.map((student) => {
    const notes = student.notes
      .map((note) => Number(note))
      .filter((note) => Number.isFinite(note) && note >= 0);
    const automaticQuotient = notes.length;
    const quotient =
      student.quotientMode === "manual" && Number(student.manualQuotient) > 0
        ? Number(student.manualQuotient)
        : automaticQuotient;
    const sum = notes.reduce((total, note) => total + note, 0);
    const average = quotient > 0 ? sum / quotient : 0;

    return {
      ...student,
      notes,
      quotient,
      average
    };
  });

  const sortedAverages = [...new Set(enriched.filter((student) => student.quotient > 0).map((student) => student.average))].sort((a, b) => b - a);

  return enriched.map((student) => ({
    ...student,
    rank: student.quotient > 0 ? sortedAverages.indexOf(student.average) + 1 : ""
  }));
}
