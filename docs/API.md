# API MVP

Base URL : `http://localhost:4000/api`

## `GET /health`

Verifie que l'API fonctionne.

Reponse :

```json
{
  "ok": true,
  "service": "mes-moyens-api"
}
```

## `POST /ocr/import`

Importe un fichier image, PDF, CSV ou TXT.

Images/PDF : OCR via Gemini si `GEMINI_API_KEY` est configure.
CSV/TXT : parsing direct.

Form-data :

- `document` : fichier obligatoire.

Reponse :

```json
{
  "source": "csv",
  "storedFile": {
    "bucket": "documents",
    "path": "imports/2026-05-02T00-00-00-000Z-id-fichier.csv",
    "publicUrl": null
  },
  "students": [
    {
      "id": "abc",
      "name": "Aminata Diallo",
      "notes": [12, 14, 10],
      "quotientMode": "auto"
    }
  ]
}
```

## `POST /storage/upload`

Stocke un fichier dans Supabase Storage sans lancer l'OCR.

Form-data :

- `document` : fichier obligatoire.
- `folder` : dossier optionnel, par defaut `documents`.

Reponse :

```json
{
  "storedFile": {
    "bucket": "documents",
    "path": "documents/2026-05-02T00-00-00-000Z-id-fichier.pdf",
    "publicUrl": null
  }
}
```

## `POST /export/csv`

Genere un CSV cote serveur.

Body :

```json
{
  "students": []
}
```
