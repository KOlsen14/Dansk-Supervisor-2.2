import { z } from "zod";

import type {
  AnbefaletBrug,
  Fp9Relevans,
  SearchFilters,
  TekstopgivelseStatus,
  TextCard,
  TextStatus,
  TextSummary
} from "./types";

const supabaseEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_TEXTS_TABLE: z.string().min(1).optional()
});

export interface TextRow {
  text_id: string;
  titel: string;
  ophav: string;
  rolle_ophav: string;
  ar: string;
  medieform: string;
  genre: string;
  platform_eller_kilde: string;
  primaer_tekstkategori: string;
  sekundaer_tekstkategori: string;
  temaer: string[];
  periode: string;
  fp9_relevans: Fp9Relevans;
  mulige_fordybelsesomraader: string[];
  kan_indgaa_i_tekstopgivelser: TekstopgivelseStatus;
  anbefalet_brug: AnbefaletBrug;
  klassifikationssikkerhed: number;
  status: TextStatus;
  kilder: string[];
  faglige_noter: string;
  oprettet: string;
  sidst_opdateret: string;
}

const summaryColumns = [
  "text_id",
  "titel",
  "ophav",
  "ar",
  "medieform",
  "genre",
  "primaer_tekstkategori",
  "temaer",
  "fp9_relevans",
  "status",
  "sidst_opdateret"
];

const allColumns = [
  ...summaryColumns,
  "rolle_ophav",
  "platform_eller_kilde",
  "sekundaer_tekstkategori",
  "periode",
  "mulige_fordybelsesomraader",
  "kan_indgaa_i_tekstopgivelser",
  "anbefalet_brug",
  "klassifikationssikkerhed",
  "kilder",
  "faglige_noter",
  "oprettet"
];

function getSupabaseConfig() {
  const parsedEnv = supabaseEnvSchema.safeParse(process.env);

  if (!parsedEnv.success) {
    throw new Error(
      `Missing Supabase environment variables: ${parsedEnv.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`
    );
  }

  return {
    ...parsedEnv.data,
    SUPABASE_TEXTS_TABLE: parsedEnv.data.SUPABASE_TEXTS_TABLE ?? "texts"
  };
}

export function assertSupabaseConfig(): void {
  getSupabaseConfig();
}

function getRestUrl(path: string): string {
  const { SUPABASE_URL } = getSupabaseConfig();
  return `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`;
}

function getHeaders(extraHeaders?: Record<string, string>): Record<string, string> {
  const { SUPABASE_SERVICE_ROLE_KEY } = getSupabaseConfig();

  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...extraHeaders
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Supabase request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return [] as T;
  }

  return (await response.json()) as T;
}

function buildSelectParam(columns: string[]): string {
  return columns.join(",");
}

function buildQueryString(params: Record<string, string | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function mapFilterValue(value: string): string {
  return `eq.${value}`;
}

export function rowToCard(row: TextRow): TextCard {
  return {
    text_id: row.text_id,
    titel: row.titel,
    ophav: row.ophav,
    rolle_ophav: row.rolle_ophav,
    år: row.ar,
    medieform: row.medieform,
    genre: row.genre,
    platform_eller_kilde: row.platform_eller_kilde,
    primær_tekstkategori: row.primaer_tekstkategori,
    sekundær_tekstkategori: row.sekundaer_tekstkategori,
    temaer: row.temaer,
    periode: row.periode,
    fp9_relevans: row.fp9_relevans,
    mulige_fordybelsesområder: row.mulige_fordybelsesomraader,
    kan_indgå_i_tekstopgivelser: row.kan_indgaa_i_tekstopgivelser,
    anbefalet_brug: row.anbefalet_brug,
    klassifikationssikkerhed: row.klassifikationssikkerhed,
    status: row.status,
    kilder: row.kilder,
    faglige_noter: row.faglige_noter,
    oprettet: row.oprettet,
    sidst_opdateret: row.sidst_opdateret
  };
}

export function rowToSummary(row: TextRow): TextSummary {
  return {
    text_id: row.text_id,
    titel: row.titel,
    ophav: row.ophav,
    år: row.ar,
    medieform: row.medieform,
    genre: row.genre,
    primær_tekstkategori: row.primaer_tekstkategori,
    temaer: row.temaer,
    fp9_relevans: row.fp9_relevans,
    status: row.status,
    sidst_opdateret: row.sidst_opdateret
  };
}

export function cardToRow(card: TextCard): TextRow {
  return {
    text_id: card.text_id,
    titel: card.titel,
    ophav: card.ophav ?? "",
    rolle_ophav: card.rolle_ophav ?? "",
    ar: card.år ?? "",
    medieform: card.medieform ?? "",
    genre: card.genre ?? "",
    platform_eller_kilde: card.platform_eller_kilde ?? "",
    primaer_tekstkategori: card.primær_tekstkategori,
    sekundaer_tekstkategori: card.sekundær_tekstkategori ?? "",
    temaer: card.temaer ?? [],
    periode: card.periode ?? "",
    fp9_relevans: card.fp9_relevans ?? "uklar",
    mulige_fordybelsesomraader: card.mulige_fordybelsesområder ?? [],
    kan_indgaa_i_tekstopgivelser: card.kan_indgå_i_tekstopgivelser ?? "kræver vurdering",
    anbefalet_brug: card.anbefalet_brug ?? "supplerende materiale",
    klassifikationssikkerhed: card.klassifikationssikkerhed,
    status: card.status,
    kilder: card.kilder ?? [],
    faglige_noter: card.faglige_noter ?? "",
    oprettet: card.oprettet ?? new Date().toISOString(),
    sidst_opdateret: card.sidst_opdateret ?? new Date().toISOString()
  };
}

export async function listTextSummaries(filters?: SearchFilters): Promise<TextSummary[]> {
  const table = getSupabaseConfig().SUPABASE_TEXTS_TABLE;
  const query = buildQueryString({
    select: buildSelectParam(summaryColumns),
    order: "text_id.asc",
    primaer_tekstkategori: filters?.primær_tekstkategori
      ? mapFilterValue(filters.primær_tekstkategori)
      : undefined,
    fp9_relevans: filters?.fp9_relevans ? mapFilterValue(filters.fp9_relevans) : undefined,
    status: filters?.status ? mapFilterValue(filters.status) : undefined
  });
  const response = await fetch(getRestUrl(`${table}${query}`), {
    headers: getHeaders()
  });
  const rows = await parseResponse<TextRow[]>(response);

  return rows.map(rowToSummary);
}

export async function getTextCardById(textId: string): Promise<TextCard | null> {
  const table = getSupabaseConfig().SUPABASE_TEXTS_TABLE;
  const query = buildQueryString({
    select: buildSelectParam(allColumns),
    text_id: `eq.${textId}`,
    limit: "1"
  });
  const response = await fetch(getRestUrl(`${table}${query}`), {
    headers: getHeaders()
  });
  const rows = await parseResponse<TextRow[]>(response);

  if (rows.length === 0) {
    return null;
  }

  return rowToCard(rows[0]);
}

export async function upsertTextCard(card: TextCard): Promise<TextCard> {
  const table = getSupabaseConfig().SUPABASE_TEXTS_TABLE;
  const row = cardToRow(card);
  const query = buildQueryString({
    on_conflict: "text_id",
    select: buildSelectParam(allColumns)
  });

  const response = await fetch(getRestUrl(`${table}${query}`), {
    method: "POST",
    headers: getHeaders({
      Prefer: "resolution=merge-duplicates,return=representation"
    }),
    body: JSON.stringify(row)
  });
  const rows = await parseResponse<TextRow[]>(response);

  if (rows.length === 0) {
    throw new Error(`Failed to load upserted text card: ${card.text_id}`);
  }

  return rowToCard(rows[0]);
}
