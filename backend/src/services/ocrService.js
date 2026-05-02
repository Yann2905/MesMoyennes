import crypto from "node:crypto";

const SAMPLE_STUDENTS = [
  { name: "Aminata Diallo", notes: [12, 14, 10], quotientMode: "auto" },
  { name: "Paul Martin", notes: [11, 13, 16, 12], quotientMode: "auto" },
  { name: "Nadia Kouame", notes: [15, 15, 14], quotientMode: "auto" }
];

const EMPTY_OCR_RESULT = [];

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
const SUPPORTED_GEMINI_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf"
]);

export async function importDocument(file) {
  const mime = file.mimetype || "";
  const filename = file.originalname || "";
  const extension = filename.split(".").pop()?.toLowerCase();

  if (mime.includes("csv") || extension === "csv" || extension === "txt") {
    const text = file.buffer.toString("utf8");
    return {
      source: extension === "txt" ? "txt" : "csv",
      students: parseRows(text)
    };
  }

  if (SUPPORTED_GEMINI_MIMES.has(mime)) {
    if (!isGeminiConfigured()) {
      return {
        source: "gemini-not-configured",
        warning: "Gemini OCR n'est pas encore configure. Ajoute GEMINI_API_KEY dans backend/.env puis redemarre le serveur.",
        students: withIds(SAMPLE_STUDENTS)
      };
    }

    const result = await extractStudentsWithGemini(file);

    return {
      source: "gemini",
      rawText: process.env.OCR_INCLUDE_RAW_TEXT === "true" ? result.rawText : undefined,
      warning: result.students.length > 0 ? result.warning : "Gemini a lu le document, mais aucune ligne exploitable n'a ete detectee.",
      students: result.students
    };
  }

  return {
    source: "unsupported-file",
    warning: "Format non reconnu. Utilise une image, un PDF, un CSV ou un TXT.",
    students: withIds(SAMPLE_STUDENTS)
  };
}

async function extractStudentsWithGemini(file) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const response = await fetch(`${GEMINI_API_URL}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: file.mimetype,
                data: file.buffer.toString("base64")
              }
            },
            {
              text: buildGeminiPrompt()
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Erreur Gemini OCR (${response.status}): ${detail}`);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  const rawText = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
  const students = normalizeGeminiStudents(parseJsonFromText(rawText));

  return {
    rawText,
    students,
    warning: students.length === 0 ? "Reponse Gemini vide ou non exploitable." : undefined
  };
}

function buildGeminiPrompt() {
  return `
Tu es un moteur d'extraction OCR strict pour listes de notes scolaires.
Tu dois extraire les donnees visibles du document fourni, sans inventer.

Regles absolues:
- Ne devine jamais un nom, un prenom ou une note.
- Si une valeur est floue, cachee, tronquee ou incertaine, ne l'inclus pas.
- Ignore les matricules, numeros d'ordre, colonnes classe, sexe, observations, signatures, entetes et pieds de page.
- Extrais uniquement les eleves visibles et leurs notes visibles sur 20.
- Les notes doivent etre entre 0 et 20, entieres ou decimales.
- Si un eleve est absent ou si une case de note est vide, retourne null pour cette note.
- Ne remplace jamais une absence, une case vide ou une note illisible par 0.
- Ne complete jamais les notes manquantes pour avoir le meme nombre de notes que les autres eleves.
- Une ligne doit etre ignoree si le nom ou toutes les notes sont incertains.
- Ne transforme pas un matricule en note.
- Conserve l'ordre des eleves tel qu'il apparait sur le document.
- Si le document contient un tableau, lis ligne par ligne.

Controle qualite:
- Si tu n'es pas certain a au moins 80% d'une ligne, ignore la ligne.
- Si l'image est trop floue/sombre pour etre fiable, reponds [].
- Il vaut mieux retourner moins de donnees que retourner des donnees fausses.

Reponds uniquement avec un JSON valide, sans markdown, au format exact suivant:
[
  {
    "name": "Nom Prenom",
    "notes": [12, null, 10],
    "quotientMode": "auto",
    "confidence": 0.95
  }
]

Si aucune ligne n'est fiable, reponds [].
`;
}

function parseRows(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const contentLines = looksLikeHeader(lines[0]) ? lines.slice(1) : lines;
  const parsed = contentLines
    .map(parseLine)
    .filter((student) => student.name && student.notes.length > 0);

  return withIds(parsed.length > 0 ? parsed : EMPTY_OCR_RESULT);
}

function parseLine(line) {
  const cells = splitLine(line);
  const withoutMatricule = shouldIgnoreFirstCell(cells) ? cells.slice(1) : cells;
  const nameParts = [];
  const notes = [];

  for (const cell of withoutMatricule) {
    if (isGrade(cell)) {
      notes.push(Number(cell.replace(",", ".")));
    } else if (cell.trim()) {
      nameParts.push(cell.trim());
    }
  }

  return {
    name: nameParts.join(" ").replace(/\s+/g, " "),
    notes,
    quotientMode: "auto"
  };
}

function splitLine(line) {
  if (line.includes(";")) return line.split(";").map(cleanCell);
  if (line.includes(",")) return line.split(",").map(cleanCell);

  return line.match(/[A-Za-zÀ-ÿ'-]+|\d+(?:[.,]\d+)?/g)?.map(cleanCell) || [];
}

function parseJsonFromText(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    try {
      return JSON.parse(match[0]);
    } catch {
      return [];
    }
  }
}

function normalizeGeminiStudents(students) {
  if (!Array.isArray(students)) return [];

  return withIds(
    students
      .map((student) => ({
        name: String(student.name || student.nom || "").trim(),
        notes: Array.isArray(student.notes) ? student.notes.map(toNullableGrade) : [],
        quotientMode: "auto",
        confidence: normalizeConfidence(student.confidence)
      }))
      .filter((student) => student.name && student.notes.some((note) => note !== "") && student.confidence >= 0.8)
  );
}

function cleanCell(value) {
  return value.replace(/^"|"$/g, "").trim();
}

function looksLikeHeader(line = "") {
  return /nom|prenom|prénom|note|n1|matricule/i.test(line);
}

function withIds(students) {
  return students.map((student) => ({
    id: crypto.randomUUID(),
    quotientMode: "auto",
    ...student
  }));
}

function shouldIgnoreFirstCell(cells) {
  if (cells.length <= 2) return false;
  const [first, second] = cells;
  const firstIsMatricule = /^[a-z0-9-_/]+$/i.test(first);
  const secondLooksLikeName = /[A-Za-zÀ-ÿ]/.test(second);

  return firstIsMatricule && secondLooksLikeName;
}

function isGrade(value) {
  return toGrade(value) !== null;
}

function toGrade(value) {
  const numeric = Number(String(value).replace(",", "."));
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 20 ? numeric : null;
}

function toNullableGrade(value) {
  if (value === null || value === undefined || value === "") return "";
  return toGrade(value) ?? "";
}

function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function normalizeConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.8;
  if (numeric > 1) return numeric / 100;
  return numeric;
}
