# MesMoyens

MVP web responsive pour enseignants : importer une liste d'eleves, corriger les donnees, calculer automatiquement les moyennes et rangs, puis exporter les resultats.

## Architecture

```text
MesMoyens/
  frontend/        React + Vite, interface mobile/tablette/desktop
  backend/         Node.js + Express, API d'import/export et stockage temporaire
  docs/            Architecture, API, securite, evolutions OCR
```

## Fonctionnalites MVP

- Upload depuis galerie ou gestionnaire de fichiers.
- Ouverture de l'appareil photo sur mobile via `capture="environment"`.
- Tableau editable type Excel.
- Notes variables par eleve.
- Quotient automatique ou manuel.
- Moyennes et rangs recalcules en direct.
- Ajout/suppression d'eleves et de notes.
- Export CSV, Excel-compatible `.xls` et PDF via impression navigateur.
- OCR image/PDF via Gemini API si `GEMINI_API_KEY` est configure.
- Stockage optionnel des images, PDF, CSV et exports dans Supabase Storage.

## Installation

```bash
npm install
npm run dev
```

Frontend : http://localhost:5173  
Backend : http://localhost:4000

## Import et OCR

CSV/TXT fonctionne sans configuration externe.

Exemple CSV :

```csv
Matricule,Nom,N1,N2,N3,N4
001,Aminata Diallo,12,14,10,15
002,Paul Martin,11,13,16
```

Le matricule est ignore automatiquement.

Pour activer l'OCR image/PDF avec Gemini :

1. Va sur Google AI Studio : https://aistudio.google.com/app/apikey
2. Cree une cle API.
3. Copie `backend/.env.example` vers `backend/.env`.
4. Mets la cle dans `GEMINI_API_KEY`.
5. Redemarre le serveur avec `npm run dev`.

Exemple :

```env
GEMINI_API_KEY=ta-cle-api-gemini
GEMINI_MODEL=gemini-2.5-flash
```

Gemini accepte les images et les PDF dans ce MVP, tant que le fichier reste sous la limite backend actuelle de 10 MB.

## Variables backend

Copier `backend/.env.example` vers `backend/.env` si besoin.

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
SUPABASE_URL=https://ton-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=ta-cle-service-role
SUPABASE_BUCKET=documents
SUPABASE_STORAGE_PUBLIC=false
GEMINI_API_KEY=ta-cle-api-gemini
GEMINI_MODEL=gemini-2.5-flash
OCR_INCLUDE_RAW_TEXT=false
```

## Supabase Storage

Supabase est utilise uniquement pour stocker les fichiers, pas pour garder les eleves, classes ou notes.

Dans Supabase :

1. Ouvre **Storage**.
2. Cree un bucket nomme `documents`.
3. Garde le bucket prive pour proteger les fichiers.
4. Copie `Project URL` dans `SUPABASE_URL`.
5. Copie la cle `service_role` dans `SUPABASE_SERVICE_ROLE_KEY`.

Quand un enseignant importe une image, un PDF, un CSV ou un TXT, le backend sauvegarde le fichier dans :

```text
documents/imports/...
```

Les donnees calculees restent temporaires dans l'application et ne sont pas sauvegardees en base.

## Permissions mobile

L'application utilise des champs fichier HTML standards :

- `accept="image/*,application/pdf,.csv,.txt"` pour galerie/fichiers.
- `accept="image/*" capture="environment"` pour proposer la camera arriere sur mobile.

Les permissions camera/fichiers sont gerees par le navigateur et le systeme d'exploitation. Aucune permission permanente n'est stockee par l'application.
