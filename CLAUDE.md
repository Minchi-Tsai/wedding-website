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

Chinese characters render larger than English when using the Sacramento cursive font (which only covers Latin). When mixing Chinese and English in the same heading or line:

- Wrap Chinese text in a `<span>` with a smaller `font-size` (~60% of the English size)
- Example: English at `2rem` → Chinese at `1.2rem`
- This applies everywhere Chinese appears alongside `font-esthetic` (Sacramento) headings
- Standalone Chinese text (addresses, subtitles) at their own size is fine
