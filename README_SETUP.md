# Dansk Supervisor V2.2 Supabase API Setup

## Formål

Denne API fungerer som mellemled mellem Custom GPT'en og Supabase. GPT'en må ikke skrive direkte til databasen uden om API'en. Den skal kalde denne API, som håndterer autentificering, validering, søgning og lagring sikkert via miljøvariabler.

GitHub er nu primært til kode, historik og deployment. Supabase er den dynamiske tekstdatabase.

Som standard gemmes kun metadata, klassifikation, kilder og faglige noter. Hele ophavsretligt beskyttede tekster bør ikke gemmes her.

## Output: hvad dette projekt giver dig nu

Projektet giver dig:

- en Node/TypeScript-API til GPT Actions
- Supabase som primær datalagring
- validering af tekstkort før lagring
- søgning og læsning via faste endpoints
- OpenAPI-spec til GPT Builder
- SQL-schema til Supabase
- CI-build i GitHub Actions
- deploy-klargøring til Render og Vercel

Det eneste, der mangler før GPT'en kan bruge løsningen live, er en offentlig deploy-URL og rigtige Supabase-miljøvariabler.

## 1. Installér afhængigheder

```bash
npm install
```

## 2. Opret tabellen i Supabase

Kør SQL'en i:

- `supabase/schema.sql`

Praktisk:

1. Åbn Supabase SQL Editor
2. Indsæt indholdet af `supabase/schema.sql`
3. Kør scriptet

Det opretter tabellen `public.texts` og de vigtigste indeks.

## 3. Sæt `.env`

Opret en `.env`-fil i projektroden med udgangspunkt i `.env.example`:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[REDACTED]
SUPABASE_TEXTS_TABLE=texts
ACTION_API_KEY=[REDACTED]
PORT=3000
```

Vigtigt:

- `SUPABASE_SERVICE_ROLE_KEY` må kun bruges på serveren
- `SUPABASE_SERVICE_ROLE_KEY` må aldrig ligge i frontend eller `openapi.yaml`
- `ACTION_API_KEY` er den nøgle, GPT Action sender som bearer token

## 4. Kør lokalt

Udvikling:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Start bygget version:

```bash
npm run start
```

## 5. Hvad API'en kan læse

API'en læser fra Supabase-tabellen `texts`.

Det betyder konkret:

- `GET /texts` returnerer summary-listen
- `GET /texts/{text_id}` returnerer ét tekstkort
- `POST /texts/search` søger i summary-felter
- `POST /texts/validate` validerer uden at gemme

## 6. Hvad API'en kan skrive

API'en kan:

- oprette et nyt tekstkort
- opdatere et eksisterende tekstkort
- gemme direkte i Supabase via upsert på `text_id`

## 7. Deploy API'en

### Render

- Repoet indeholder `render.yaml`
- Forbind repoet i Render
- Sæt miljøvariablerne
- Deploy

### Vercel

- Repoet indeholder `api/index.ts` og `vercel.json`
- Importér repoet i Vercel
- Sæt miljøvariablerne
- Deploy

### Railway eller Fly.io

- Brug almindelig Node-deploy
- Sæt de samme miljøvariabler

## 8. GitHub Actions build-check

Repoet indeholder:

- `.github/workflows/ci.yml`

Det giver automatisk build-kontrol ved push og pull requests.

## 9. Indsæt `openapi.yaml` i GPT Builder

I GPT Builder:

1. Gå til `Actions`
2. Opret en ny action
3. Indsæt indholdet af `openapi.yaml`
4. Sæt server-URL til din deployede API
5. Sørg for, at GPT'en sender:

```http
Authorization: Bearer YOUR_ACTION_API_KEY
```

## 10. Vigtig driftsregel for GPT'en

GPT'en må først sige, at noget er gemt, når API'et faktisk har returneret succes.

Det betyder:

- ingen succesmelding før HTTP 200 fra `PUT /texts/{text_id}`
- fejl fra API'et skal formuleres som manglende lagring eller valideringsfejl
