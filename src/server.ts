import "dotenv/config";

import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";

import { assertSupabaseConfig, getTextCardById, listTextSummaries, upsertTextCard } from "./supabase";
import type { SearchFilters, TextCard, TextSummary } from "./types";
import { parseSearchRequest, validateTextCard } from "./validation";

const serverEnvSchema = z.object({
  ACTION_API_KEY: z.string().min(1),
  PORT: z.string().optional()
});

const parsedEnv = serverEnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Missing server environment variables: ${parsedEnv.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ")}`
  );
}

assertSupabaseConfig();

const app = express();
const actionApiKey = parsedEnv.data.ACTION_API_KEY;
const port = Number(parsedEnv.data.PORT ?? 3000);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function matchesFilters(summary: TextSummary, filters?: SearchFilters): boolean {
  if (!filters) {
    return true;
  }

  if (
    filters.primær_tekstkategori &&
    summary.primær_tekstkategori.toLowerCase() !== filters.primær_tekstkategori.toLowerCase()
  ) {
    return false;
  }

  if (filters.fp9_relevans && summary.fp9_relevans.toLowerCase() !== filters.fp9_relevans.toLowerCase()) {
    return false;
  }

  if (filters.status && summary.status.toLowerCase() !== filters.status.toLowerCase()) {
    return false;
  }

  return true;
}

function scoreSummary(summary: TextSummary, query: string): number {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  if (terms.length === 0) {
    return 1;
  }

  const searchableFields = [
    summary.titel,
    summary.ophav,
    summary.genre,
    summary.primær_tekstkategori,
    summary.temaer.join(" ")
  ]
    .join(" ")
    .toLowerCase();

  return terms.reduce((score, term) => score + (searchableFields.includes(term) ? 1 : 0), 0);
}

function authenticateRequest(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header("Authorization");

  if (authorization !== `Bearer ${actionApiKey}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

app.use(authenticateRequest);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "dansk-supervisor-supabase-api"
  });
});

app.get("/texts", async (_req, res, next) => {
  try {
    const texts = await listTextSummaries();
    res.json(texts);
  } catch (error) {
    next(error);
  }
});

app.get("/texts/:text_id", async (req, res, next) => {
  try {
    const textCard = await getTextCardById(req.params.text_id);

    if (!textCard) {
      res.status(404).json({ error: "Text card not found" });
      return;
    }

    res.json(textCard);
  } catch (error) {
    next(error);
  }
});

app.post("/texts/search", async (req, res, next) => {
  try {
    const parsedRequest = parseSearchRequest(req.body);

    if (!parsedRequest.valid || !parsedRequest.data) {
      res.status(400).json({
        valid: false,
        errors: parsedRequest.errors
      });
      return;
    }

    const { query, filters } = parsedRequest.data;
    const summaries = await listTextSummaries(filters);
    const results = summaries
      .filter((summary) => matchesFilters(summary, filters))
      .map((summary) => ({
        summary,
        score: scoreSummary(summary, query)
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score || left.summary.text_id.localeCompare(right.summary.text_id))
      .slice(0, 20)
      .map(({ summary }) => summary);

    res.json(results);
  } catch (error) {
    next(error);
  }
});

app.put("/texts/:text_id", async (req, res, next) => {
  try {
    const textId = req.params.text_id;

    if (req.body?.text_id && req.body.text_id !== textId) {
      res.status(400).json({
        error: "Path parameter text_id must match body.text_id"
      });
      return;
    }

    const existingCard = await getTextCardById(textId);
    const now = new Date().toISOString();

    const candidateCard: TextCard = {
      ...req.body,
      text_id: textId,
      oprettet: req.body?.oprettet ?? existingCard?.oprettet ?? now,
      sidst_opdateret: now
    };

    const validation = validateTextCard(candidateCard);

    if (!validation.valid) {
      res.status(400).json({
        valid: false,
        errors: validation.errors
      });
      return;
    }

    const storedCard = await upsertTextCard(candidateCard);

    res.json({
      ok: true,
      text_id: textId,
      card: storedCard
    });
  } catch (error) {
    next(error);
  }
});

app.post("/texts/validate", (req, res) => {
  const validation = validateTextCard(req.body);

  res.json({
    valid: validation.valid,
    errors: validation.errors
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode =
    typeof error === "object" && error !== null && "status" in error && typeof error.status === "number"
      ? error.status
      : 500;
  const message = error instanceof Error ? error.message : "Unknown server error";
  res.status(statusCode).json({ error: message });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`dansk-supervisor-supabase-api listening on port ${port}`);
  });
}

export default app;
