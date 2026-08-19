# PTC2.0 Migration Scripts

## Import Live Google Sheets Data

The importer reads the live Google Spreadsheet used by v1 and writes into the PTC2.0 Supabase database. It never writes to the v1 repository or Google Sheets.

### Authentication

Google Sheets credentials are loaded automatically from the v1 environment file:

```text
C:\SandeshTemp\Personal\PTC\tennis-club\.env
```

The v1 environment must define these variables:

```text
SHEETS_SPREADSHEET_ID
SHEETS_CLIENT_EMAIL
SHEETS_PRIVATE_KEY
```

The PTC2.0 environment must define:

```text
DATABASE_URL
```

The importer uses the Google service account to request a read-only Sheets OAuth token. Do not copy credentials into PTC2.0, commit `.env` files, or print secret values.

### Commands

From `C:\SandeshTemp\Personal\PTC2.0`:

```powershell
# Read Google Sheets, validate, and create a report. No database writes.
npm run db:import-google

# Apply the validated import to PTC2.0 Supabase.
npm run db:import-google -- --apply
```

Always run the dry run first. The apply command is explicit and uses cached lookups, idempotent inserts/upserts, and batched availability writes.

After an import, refresh cached standings and verify parity:

```powershell
node scripts/recompute-standings.mjs
node scripts/compare-standings.mjs
```

The comparison command reads the active season from both systems. A successful result has `"match": true` and zero point differences. The v1 `sets` value is total set points, while the v2 `sets` field is sets won; that metric difference is expected and does not indicate a standings-point mismatch.

The importer preserves two v1 details that are important for parity:

- All sets from one imported match share one v2 score version, so v2 does not hide sets 1 and 2 behind the latest-set filter.
- Raw v1 point values are stored as legacy point overrides. This handles historical rows such as `6-7` exactly as v1 while retaining actual-game values for display.

### Imported Sheets

- `Players`
- `Seasons`
- `Matches`
- `Scores`
- `Availability`
- `Settings` is read for source completeness; values are not blindly copied into private configuration.
- `SubRequests`
- `SubOffers`

The importer preserves UUID relationships in Supabase and resolves legacy player names only during import. It decodes abandoned score rows and `Set|P0`, `Set|P1`, and `Set|P2` pairing overrides.

### Reports and Safety

Each run writes a JSON reconciliation report to:

```text
PTC2.0\reports\google-sheets-import-<timestamp>.json
```

The report contains source row counts, imported counts, warnings, and errors. An apply run rolls back when validation errors occur. Future or placeholder seasons without usable date ranges are reported as warnings and skipped.

The current successful import was run on 2026-08-19. It imported the active live season data and reported 14 skipped undated placeholder seasons (`PTC-2027` through `PTC-2040`).

## Supabase Schema Migrations

Apply the explicit PTC2.0 migrations with:

```powershell
npm run db:apply-supabase
```

This loads `.env.local` and applies the four 2026-08-18 migrations in dependency order. It targets PTC2.0 Supabase only.
