# Architecture MVP

## Vue d'ensemble

MesMoyens est separe en deux applications :

- `frontend` : React/Vite, responsable de l'experience utilisateur, du tableau editable, des calculs instantanes et des exports locaux.
- `backend` : Express, responsable de recevoir les fichiers, les stocker optionnellement dans Supabase Storage, extraire les donnees OCR via Gemini, exposer une API propre.

## Flux utilisateur

1. L'enseignant ouvre la page d'import.
2. Il choisit un document depuis la galerie, le gestionnaire de fichiers ou la camera mobile.
3. Le fichier est envoye au backend.
4. Le backend stocke le fichier dans Supabase Storage si configure.
5. Le backend extrait les eleves depuis CSV/TXT ou lance Gemini pour les images/PDF si configure.
5. L'utilisateur corrige les donnees dans le tableau.
6. Moyennes et rangs sont recalcules automatiquement.
7. L'utilisateur exporte en CSV, `.xls` compatible Excel ou PDF.

## Modele de donnees

```ts
type Student = {
  id: string;
  name: string;
  notes: number[];
  quotientMode: "auto" | "manual";
  manualQuotient?: number;
};
```

Valeurs derivees :

- `quotient` : nombre de notes si automatique, sinon quotient manuel.
- `average` : somme des notes / quotient.
- `rank` : rang calcule sur moyenne decroissante avec egalites.

## API

Voir `docs/API.md`.

## OCR Gemini

Le backend contient un service `ocrService.js`.

Formats OCR Gemini supportes dans le MVP : JPEG, PNG, WEBP, HEIC, HEIF, PDF.

Variables :

- `GEMINI_API_KEY` : cle API creee dans Google AI Studio.
- `GEMINI_MODEL` : modele utilise, par defaut `gemini-2.5-flash`.
- `OCR_INCLUDE_RAW_TEXT=true` : renvoie le texte brut OCR dans la reponse, utile pour debug.

## Securite

- Fichiers recus en memoire, non stockes sur disque dans le MVP.
- Limite de taille configuree a 10 MB.
- CORS limite a `FRONTEND_ORIGIN`.
- Validation minimale des notes et quotients.
- Aucune authentification dans le MVP, a ajouter avant un usage multi-etablissement.
- Supabase Storage doit rester prive par defaut. Utiliser `SUPABASE_SERVICE_ROLE_KEY` uniquement cote backend.
