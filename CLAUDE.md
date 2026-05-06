# Wedding Website — Project Rules

## Google Apps Script Safety

The Apps Script (`docs/google-apps-script.js`) MUST only interact with the RSVP spreadsheet it is attached to. Specifically:

1. **Only use `SpreadsheetApp.getActiveSpreadsheet()`** — never open other spreadsheets by ID or URL
2. **Only use `appendRow()`** — never delete, clear, or overwrite existing rows
3. **Never access other Google services** (Drive, Gmail, Calendar, etc.) from the Apps Script
4. **Never install triggers** (onEdit, onOpen, time-based) that run automatically
5. **No external HTTP calls** except to Google's own reCAPTCHA verification endpoint

If broader spreadsheet functionality is ever needed, create a dedicated Google account for the wedding so the script has zero access to personal/work data.

## Typography — Chinese & English Sizing

Chinese characters render larger than English when using the Sacramento cursive font (which only covers Latin).

Rules:
- **Never** put Chinese text inside `font-esthetic` (Sacramento) elements — it looks wrong
- Chinese text should use **regular Josefin Sans** with `letter-spacing: 0.1rem` for slight spacing
- Place Chinese on a **separate line** below the English Sacramento heading (use `<p>` not `<span>`)
- Chinese font size should be ~60% of the English heading size
- Example: English `<h1>` at `2.25rem` → Chinese `<p>` at `1rem` with `letter-spacing: 0.1rem`
- No "/" separator between English and Chinese text
- This applies to all headings, labels, dropdown options, and placeholders across the entire site
- Standalone Chinese text (addresses, venue info) at their own size is fine
