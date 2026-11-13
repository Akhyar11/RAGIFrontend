---
name: api-settings-workflow
description: "Use when building or changing the Admin API Settings UI, integration credentials/authentication, connection tests, sync actions, or sync result presentation."
---

# API Settings UI Workflow

Use this workflow for **Admin > Pengaturan Integrasi API** and its frontend service/types. The page configures a system-owned integration registry and starts backend-owned imports.

## Configuration and Credentials

- Keep integration definitions system-owned; the UI edits only registered connection settings. Do not add arbitrary create/delete controls for registry entries unless explicitly requested.
- Use the shared `adminService`/`apiClient` and strict request/response types. Do not call `fetch` or Axios directly from the page.
- Authentication schemes must be explicit and understandable: Bearer sends `Authorization: Bearer <token>`; API Key sends `X-API-KEY: <token>`. Never imply these are interchangeable.
- Never display or prefill a saved token. Read only the safe `token_configured` boolean and show a clear state such as “Token sudah tersimpan” or “Belum ada token tersimpan”.
- Keep the password/token input blank in edit mode. Its hint must say that blank preserves the existing token and a non-empty value replaces it.
- Omit `token` from the update payload when the input is blank. Do not submit an empty string or null as a credential replacement.
- Do not put credentials in toasts, URLs, browser logs, error detail, schema preview, or sync result state.

## Actions and Sync Results

- Keep **Uji Koneksi** and **Jalankan Sync** as separate actions. Health check reports connectivity only; sync invokes the registered backend sync endpoint and applies data to its target.
- Show the sync action in the row action menu for users with management permission. Disable it when the integration is inactive or its URL is missing.
- Use an explicit confirmation step before changing target data. While running, prevent duplicate submissions and accidental modal dismissal.
- On completion, display the number fetched, created, updated, and skipped. Show bounded skip details and actionable reasons; do not claim success if the backend returned an error.
- When an upstream response is 401, surface a safe explanation to check the selected authentication scheme and source permissions. Never display request headers or token values.
- Use the established UI kit (`Modal`, `Button`, `Input`, `Select`, `Badge`, `DropdownMenu`) and responsive design-system utilities. Keep the token status understandable at mobile widths.

## Required Verification

- Type-check the frontend and lint touched files; distinguish baseline lint findings from newly introduced ones.
- Verify API response parsing for both the `token_configured` boolean and the typed sync summary.
- If browser auth is available, verify the edit form, blank-token preservation hint, sync confirmation, loading state, and result/error states. Do not request or expose a real credential for testing.