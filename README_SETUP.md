# Dansk Supervisor V2.2 GitHub API Setup

## Formål

Denne API fungerer som mellemled mellem Custom GPT'en og GitHub-repositoriet. GPT'en må ikke skrive direkte til GitHub. Den skal kalde denne API, som håndterer autentificering, validering og filopdateringer sikkert via miljøvariabler.

Som standard gemmes kun metadata, klassifikation, kilder og faglige noter. Hele ophavsretligt beskyttede tekster bør ikke gemmes her.

## 1. Installér afhængigheder

```bash
npm install
```

## 2. Kør lokalt i udvikling

```bash
npm run dev
```

Standardporten er `3000`, medmindre du sætter `PORT` i `.env`.

## 3. Opret GitHub fine-grained token

Opret et fine-grained personal access token i GitHub med adgang til:

- Repository: `KOlsen14/Dansk-Supervisor-2.2`
- Permission: `Contents`
- Access level: `Read and write`

Tokenet skal kun bruges på serveren som `GITHUB_TOKEN`.

## 4. Sæt `.env`

Opret en `.env`-fil i projektroden med:

```env
GITHUB_TOKEN=your_github_token_here
GITHUB_OWNER=KOlsen14
GITHUB_REPO=Dansk-Supervisor-2.2
GITHUB_BRANCH=main
ACTION_API_KEY=your_strong_secret_here
PORT=3000
```

Vigtigt:

- `GITHUB_TOKEN` må aldrig ligge i frontend.
- `GITHUB_TOKEN` må aldrig ligge i `openapi.yaml`.
- `ACTION_API_KEY` er den nøgle, GPT Action sender som `Authorization: Bearer <ACTION_API_KEY>`.

## 5. Deploy API'en

API'en kan deployes på flere platforme:

### Render

- Opret en ny Web Service
- Forbind repo eller upload projektet
- Build command: `npm install && npm run build`
- Start command: `npm run start`
- Sæt miljøvariablerne i Render dashboardet

### Railway

- Opret et nyt projekt
- Deploy fra repo
- Sæt miljøvariablerne i Railway
- Brug `npm run build` og `npm run start`

### Fly.io

- Opret app
- Sæt secrets for miljøvariablerne
- Kør som en almindelig Node-service

### Vercel serverless

- Express-appen eksporteres fra `src/server.ts`, så den kan pakkes ind i en serverless route
- Hvis du vælger Vercel, bør du tilføje en lille Vercel-entrypoint senere, som videresender requests til appen
- Miljøvariablerne sættes i Vercel-projektet, aldrig i klienten

Den stærkeste standardløsning her er Render eller Railway, fordi det matcher en lille vedvarende Express-API direkte.

## 6. Indsæt `openapi.yaml` i GPT Builder

I GPT Builder:

1. Gå til `Actions`
2. Opret en ny action
3. Indsæt indholdet af `openapi.yaml`
4. Sæt server-URL til din deployede API
5. Sørg for, at GPT'en sender:

```http
Authorization: Bearer YOUR_ACTION_API_KEY
```

Brug samme værdi som `ACTION_API_KEY` på serveren.

## 7. Vigtig driftsregel for GPT'en

GPT'en må først sige, at noget er "gemt i GitHub", når API'et faktisk har returneret succes.

Det betyder i praksis:

- Ingen succesmelding før HTTP 200 fra `PUT /texts/{text_id}`
- Hvis API'et returnerer fejl, skal GPT'en formulere det som en fejl eller en manglende lagring

## Arkivprincip

Projektets logik bør følge denne arbejdsdeling:

- Det faste tekstarkiv styrer vurderinger og faglig baseline
- Den dynamiske tekstdatabase udvider tekstkendskabet med nye tekstkort
- Databasen bør primært gemme metadata, klassifikation, kilder og noter

## Endpoints

- `GET /health`
- `GET /texts`
- `GET /texts/{text_id}`
- `POST /texts/search`
- `PUT /texts/{text_id}`
- `POST /texts/validate`

Alle endpoints kræver:

```http
Authorization: Bearer <ACTION_API_KEY>
```
