import {
  ArrowLeft,
  Camera,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Plus,
  Printer,
  Trash2
} from "lucide-react";
import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildCsv, buildExcelHtml, downloadBlob } from "./lib/exporters.js";
import { calculateClass } from "./lib/grades.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const starterStudents = [
  { id: crypto.randomUUID(), name: "Aminata Diallo", notes: [12, 14, 10], quotientMode: "auto" },
  { id: crypto.randomUUID(), name: "Paul Martin", notes: [11, 13, 16, 12], quotientMode: "auto" }
];

export default function App() {
  const [students, setStudents] = useState(starterStudents);
  const [activeStep, setActiveStep] = useState("import");
  const [status, setStatus] = useState("Pret a importer un document.");
  const [globalQuotient, setGlobalQuotient] = useState("");
  const [deleteNoteModalOpen, setDeleteNoteModalOpen] = useState(false);
  const [noteIndexToDelete, setNoteIndexToDelete] = useState(0);
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [globalNoteValue, setGlobalNoteValue] = useState("");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    if (!exportMenuOpen) return;
    function handleClick(event) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [exportMenuOpen]);

  const enrichedStudents = useMemo(() => calculateClass(students), [students]);
  const maxNotes = Math.max(1, ...students.map((student) => student.notes.length));

  async function handleFile(file) {
    if (!file) return;

    setStatus(`Import de ${file.name} en cours...`);
    const formData = new FormData();
    formData.append("document", file);

    try {
      const response = await fetch(`${API_URL}/ocr/import`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) throw new Error("Import impossible.");

      const data = await response.json();
      setStudents(normalizeStudents(data.students));
      setActiveStep("table");
      setStatus(data.warning || "Donnees importees. Tu peux maintenant corriger le tableau.");
    } catch (error) {
      setStatus("Import serveur indisponible. Lecture locale tentee...");
      if (file.type.includes("text") || file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
        const text = await file.text();
        setStudents(parseLocalText(text));
        setActiveStep("table");
        setStatus("Donnees importees localement depuis le fichier texte.");
      } else {
        setStatus("OCR non disponible pour ce fichier. Utilise CSV/TXT ou configure le backend OCR.");
      }
    }
  }

  function updateStudent(id, patch) {
    setStudents((current) => current.map((student) => (student.id === id ? { ...student, ...patch } : student)));
  }

  function updateNote(studentId, noteIndex, value) {
    setStudents((current) =>
      current.map((student) => {
        if (student.id !== studentId) return student;
        const notes = [...student.notes];
        const numeric = Number(value);
        notes[noteIndex] = value === "" || !Number.isFinite(numeric) ? "" : Math.max(0, Math.min(20, numeric));
        return { ...student, notes };
      })
    );
  }

function addStudent() {
  setStudents((current) => [
    ...current,
    { id: crypto.randomUUID(), name: "Nouvel eleve", notes: ["", "", ""], quotientMode: "auto" }
  ]);
  setActiveStep("table");
}

  function removeStudent(id) {
    setStudents((current) => current.filter((student) => student.id !== id));
  }

function addNoteColumn(value = "") {
  setStudents((current) => current.map((student) => ({ ...student, notes: [...student.notes, value] })));
}

function openAddNoteModal() {
  setGlobalNoteValue("");
  setAddNoteModalOpen(true);
}

function applyGlobalNote() {
  const numeric = Number(String(globalNoteValue).replace(",", "."));
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 20) return;
  addNoteColumn(numeric);
  setAddNoteModalOpen(false);
}

function addEmptyColumn() {
  addNoteColumn("");
  setAddNoteModalOpen(false);
}

function addNoteToStudent(id) {
  setStudents((current) =>
    current.map((student) => (student.id === id ? { ...student, notes: [...student.notes, ""] } : student))
  );
}

  function removeLastNoteColumn() {
    openDeleteNoteModal();
  }

  function openDeleteNoteModal() {
    setNoteIndexToDelete((current) => Math.min(current, maxNotes - 1));
    setDeleteNoteModalOpen(true);
  }

  function confirmDeleteNoteColumn() {
    setStudents((current) =>
      current.map((student) => ({
        ...student,
        notes: student.notes.length > 1 ? student.notes.filter((_, index) => index !== noteIndexToDelete) : student.notes
      }))
    );
    setDeleteNoteModalOpen(false);
  }

  function applyGlobalQuotient() {
    const value = Number(globalQuotient);
    if (!Number.isFinite(value) || value <= 0) return;
    setStudents((current) =>
      current.map((student) => ({ ...student, quotientMode: "manual", manualQuotient: value }))
    );
  }

  function exportCsv() {
    downloadBlob("moyennes.csv", buildCsv(enrichedStudents, maxNotes), "text/csv;charset=utf-8");
  }

  function exportExcel() {
    downloadBlob(
      "moyennes.xls",
      buildExcelHtml(enrichedStudents, maxNotes),
      "application/vnd.ms-excel;charset=utf-8"
    );
  }

  function exportPdf() {
    window.print();
  }

  return (
    <main className="appShell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Plateforme enseignants</p>
          <h1>MesMoyens</h1>
        </div>
      </header>

      {activeStep === "import" && (
        <section className="importView">
          <div className="importPanel">
            <div>
              <p className="eyebrow">Import document</p>
              <h2>Scanne ou importe une liste de notes</h2>
              <p className="muted">
                Le MVP accepte CSV/TXT pour extraction directe. Les images et PDF passent par le backend et sont prets
                pour une integration OCR Google Vision.
              </p>
            </div>

            <div className="importActions">
              <button onClick={() => cameraInputRef.current?.click()}>
                <Camera size={20} /> Appareil photo
              </button>
              <button onClick={() => fileInputRef.current?.click()}>
                <FolderOpen size={20} /> Galerie ou fichiers
              </button>
            </div>

            <input
              ref={cameraInputRef}
              className="hiddenInput"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => { var f=event.target.files?.[0]; if(f)handleFile(f); event.target.value=""; }}
            />
            <input
              ref={fileInputRef}
              className="hiddenInput"
              type="file"
              accept="image/*,application/pdf,.csv,.txt,text/csv,text/plain"
              onChange={(event) => { var f=event.target.files?.[0]; if(f)handleFile(f); event.target.value=""; }}
            />

            <div className="statusLine">{status}</div>

            {students.length > 0 && (
              <button
                type="button"
                className="secondaryButton"
                onClick={() => setActiveStep("table")}
              >
                <FileSpreadsheet size={18} /> Voir le tableau
              </button>
            )}
          </div>
        </section>
      )}

      {activeStep === "table" && (
        <section className="tableView">
          <div className="toolbar">
            <div className="toolbarGroup">
              <button onClick={() => setActiveStep("import")}><ArrowLeft size={18} /> Retour accueil</button>
              <button onClick={addStudent}><Plus size={18} /> Eleve</button>
              <button onClick={openAddNoteModal}><Plus size={18} /> Note globale</button>
              <button onClick={removeLastNoteColumn}><Trash2 size={18} /> Supprimer note</button>
            </div>
            <div className="toolbarGroup quotientControl">
              <input
                type="number"
                min="1"
                step="1"
                placeholder="Quotient global"
                value={globalQuotient}
                onChange={(event) => setGlobalQuotient(event.target.value)}
              />
              <button onClick={applyGlobalQuotient}>Appliquer</button>
            </div>
            <div className="exportWrap" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setExportMenuOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={exportMenuOpen}
              >
                <Download size={18} /> Exporter
              </button>
              {exportMenuOpen && (
                <div className="exportMenu" role="menu">
                  <button role="menuitem" onClick={() => { exportCsv(); setExportMenuOpen(false); }}>
                    <FileText size={18} /> CSV
                  </button>
                  <button role="menuitem" onClick={() => { exportExcel(); setExportMenuOpen(false); }}>
                    <Download size={18} /> Excel
                  </button>
                  <button role="menuitem" onClick={() => { exportPdf(); setExportMenuOpen(false); }}>
                    <Printer size={18} /> Telecharger PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="sheetWrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th>Nom & prenom</th>
                  {Array.from({ length: maxNotes }, (_, index) => (
                    <th key={index}>N{index + 1}</th>
                  ))}
                  <th className="pdfHidden">Quotient</th>
                  <th>Moyenne</th>
                  <th>Rang</th>
                  <th className="printHidden">Action</th>
                </tr>
              </thead>
              <tbody>
                {enrichedStudents.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <input
                        value={student.name}
                        onChange={(event) => updateStudent(student.id, { name: event.target.value })}
                      />
                    </td>
                    {Array.from({ length: maxNotes }, (_, noteIndex) => (
                      <td key={noteIndex}>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.25"
                          value={student.notes[noteIndex] ?? ""}
                          onChange={(event) => updateNote(student.id, noteIndex, event.target.value)}
                        />
                      </td>
                    ))}
                    <td className="pdfHidden">
                      <div className="quotientCell">
                        <select
                          value={student.quotientMode}
                          onChange={(event) =>
                            updateStudent(student.id, {
                              quotientMode: event.target.value,
                              manualQuotient: event.target.value === "manual" ? "" : undefined
                            })
                          }
                        >
                          <option value="auto">Auto</option>
                          <option value="manual">Manuel</option>
                        </select>
                        {student.quotientMode === "manual" ? (
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={student.manualQuotient ?? ""}
                            onChange={(event) => updateStudent(student.id, { manualQuotient: event.target.value })}
                          />
                        ) : (
                          <span>{student.quotient}</span>
                        )}
                      </div>
                    </td>
                    <td className="metric">{student.average.toFixed(2)}</td>
                    <td className="metric">{student.rank}</td>
                    <td className="printHidden">
                      <div className="rowActions">
                        <button title="Ajouter une note individuelle" aria-label="Ajouter une note individuelle" onClick={() => addNoteToStudent(student.id)}>
                          <Plus size={18} />
                        </button>
                        <button className="iconDanger" aria-label="Supprimer" onClick={() => removeStudent(student.id)}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {addNoteModalOpen && (
            <div className="modalBackdrop" role="presentation" onClick={() => setAddNoteModalOpen(false)}>
              <div
                className="modalPanel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-note-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div>
                  <p className="eyebrow">Nouvelle colonne</p>
                  <h2 id="add-note-title">Ajouter une note pour toute la classe</h2>
                  <p className="muted">La valeur sera appliquee a chaque eleve. Tu pourras la modifier ligne par ligne ensuite.</p>
                </div>

                <label className="fieldLabel" htmlFor="global-note-input">Note (0 a 20)</label>
                <input
                  id="global-note-input"
                  type="number"
                  min="0"
                  max="20"
                  step="0.25"
                  value={globalNoteValue}
                  onChange={(event) => setGlobalNoteValue(event.target.value)}
                  autoFocus
                />

                <div className="modalActions">
                  <button className="secondaryButton" onClick={addEmptyColumn}>Colonne vide</button>
                  <button onClick={applyGlobalNote}><Plus size={18} /> Appliquer la note</button>
                </div>
              </div>
            </div>
          )}

          {deleteNoteModalOpen && (
            <div className="modalBackdrop" role="presentation" onClick={() => setDeleteNoteModalOpen(false)}>
              <div
                className="modalPanel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-note-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div>
                  <p className="eyebrow">Suppression</p>
                  <h2 id="delete-note-title">Choisir la note a supprimer</h2>
                  <p className="muted">La note selectionnee sera supprimee pour toute la classe.</p>
                </div>

                <label className="fieldLabel" htmlFor="note-delete-select">Note</label>
                <select
                  id="note-delete-select"
                  value={noteIndexToDelete}
                  onChange={(event) => setNoteIndexToDelete(Number(event.target.value))}
                >
                  {Array.from({ length: maxNotes }, (_, index) => (
                    <option key={index} value={index}>N{index + 1}</option>
                  ))}
                </select>

                <div className="modalActions">
                  <button className="secondaryButton" onClick={() => setDeleteNoteModalOpen(false)}>Annuler</button>
                  <button className="dangerButton" onClick={confirmDeleteNoteColumn}><Trash2 size={18} /> Supprimer</button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function normalizeStudents(students = []) {
  return students.map((student) => ({
    id: student.id || crypto.randomUUID(),
    name: student.name || student.nom || "",
    notes: Array.isArray(student.notes) ? student.notes.map(normalizeNoteValue) : [],
    quotientMode: student.quotientMode || "auto",
    manualQuotient: student.manualQuotient
  }));
}

function parseLocalText(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const usefulLines = /nom|note|matricule/i.test(lines[0] || "") ? lines.slice(1) : lines;
  return usefulLines.map((line) => {
    const cells = line.includes(";") ? line.split(";") : line.split(",");
    const withoutMatricule = cells.length > 2 ? cells.slice(1) : cells;
    const name = withoutMatricule.find((cell) => Number.isNaN(Number(cell.replace(",", "."))))?.trim() || "Eleve";
    const notes = withoutMatricule
      .map(normalizeNoteValue)
      .filter((value) => value !== "");
    return { id: crypto.randomUUID(), name, notes, quotientMode: "auto" };
  });
}

function normalizeNoteValue(value) {
  if (value === "" || value === null || value === undefined) return "";
  const numeric = Number(String(value).replace(",", "."));
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 20 ? numeric : "";
}
