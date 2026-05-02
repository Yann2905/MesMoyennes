import crypto from "node:crypto";

const DEFAULT_BUCKET = "documents";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  const bucket = process.env.SUPABASE_BUCKET || DEFAULT_BUCKET;

  if (!url || !key) {
    return null;
  }

  return {
    url: url.replace(/\/$/, ""),
    key,
    bucket,
    publicBucket: process.env.SUPABASE_STORAGE_PUBLIC === "true"
  };
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseConfig());
}

export async function uploadFileToStorage(file, folder = "imports") {
  const config = getSupabaseConfig();

  if (!config) {
    return null;
  }

  const objectPath = buildObjectPath(file.originalname, folder);
  const response = await fetch(`${config.url}/storage/v1/object/${config.bucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": file.mimetype || "application/octet-stream",
      "x-upsert": "true"
    },
    body: file.buffer
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Erreur Supabase Storage (${response.status}): ${detail}`);
    error.status = response.status;
    throw error;
  }

  return {
    bucket: config.bucket,
    path: objectPath,
    publicUrl: config.publicBucket ? `${config.url}/storage/v1/object/public/${config.bucket}/${objectPath}` : null
  };
}

function buildObjectPath(filename = "document", folder) {
  const safeFilename = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const random = crypto.randomUUID();

  return `${folder}/${timestamp}-${random}-${safeFilename || "document"}`;
}
