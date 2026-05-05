/**
 * Google Apps Script for Wedding RSVP
 *
 * SETUP:
 * 1. Create a Google Sheet with columns: Timestamp | Name | Email | Attendance | Guest Count | Message
 * 2. Open Extensions > Apps Script
 * 3. Paste this code
 * 4. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the web app URL and set it as data-rsvp-url in index.html
 *
 * OPTIONAL: reCAPTCHA v3 validation
 * - Set RECAPTCHA_SECRET_KEY below with your secret key
 * - If left empty, reCAPTCHA validation is skipped
 */

const RECAPTCHA_SECRET_KEY = ''; // Your reCAPTCHA v3 secret key (optional)
const RECAPTCHA_THRESHOLD = 0.5; // Score threshold (0.0 = bot, 1.0 = human)

function doPost(e) {
  try {
    const params = e.parameter;

    // Validate required fields
    if (!params.name || params.name.trim().length === 0) {
      return jsonResponse({ result: 'error', message: 'Name is required.' });
    }

    // Validate reCAPTCHA if configured
    if (RECAPTCHA_SECRET_KEY && RECAPTCHA_SECRET_KEY.length > 0) {
      const token = params.recaptcha_token || '';
      if (!token) {
        return jsonResponse({ result: 'error', message: 'Security verification failed.' });
      }

      const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
      const response = UrlFetchApp.fetch(verifyUrl, {
        method: 'post',
        payload: {
          secret: RECAPTCHA_SECRET_KEY,
          response: token,
        },
      });

      const captchaResult = JSON.parse(response.getContentText());
      if (!captchaResult.success || captchaResult.score < RECAPTCHA_THRESHOLD) {
        return jsonResponse({ result: 'error', message: 'Security verification failed.' });
      }
    }

    // Append row to the active sheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.appendRow([
      new Date(),                           // Timestamp
      params.name.trim(),                   // Name
      (params.email || '').trim(),          // Email
      (params.attendance || 'yes'),         // Attendance (yes/no)
      parseInt(params.guest_count) || 1,    // Guest Count
      (params.message || '').trim(),        // Message
    ]);

    return jsonResponse({ result: 'success', message: 'RSVP received!' });

  } catch (error) {
    return jsonResponse({ result: 'error', message: 'Server error: ' + error.message });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handle CORS preflight (GET requests)
function doGet() {
  return jsonResponse({ result: 'ok', message: 'RSVP endpoint is active.' });
}
