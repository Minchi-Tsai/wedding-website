/**
 * Google Apps Script for Wedding RSVP with Guest List Validation
 *
 * SHEET STRUCTURE (two tabs in the same workbook):
 *
 * Tab "Guest List" columns:
 *   A: First Name(s)  — for couples use "David & Minchi"
 *   B: Last Name(s)
 *   C: Address
 *   D: Email
 *   E: Invited by
 *   F: Invitation
 *   G: Response        — auto-updated by this script ("Attending" / "Not Attending")
 *   H: Table #
 *   I: Notes
 *
 * Tab "RSVP" columns (auto-filled by website):
 *   A: Timestamp
 *   B: Name
 *   C: Email
 *   D: Attendance
 *   E: Guest Count
 *   F: Message
 *   G: Verified        — "YES" if matched guest list, "UNVERIFIED" if not
 *   H: Matched Guest   — the matched name from guest list (for reference)
 *
 * SETUP:
 * 1. Create both tabs with headers above
 * 2. Open Extensions > Apps Script from the spreadsheet
 * 3. Paste this code
 * 4. Deploy > New deployment > Web app (Execute as: Me, Access: Anyone)
 * 5. Copy the web app URL → set as data-rsvp-url in index.html
 *
 * REDEPLOY after changes:
 * Deploy > Manage deployments > Edit (pencil) > Version: New version > Deploy
 */

const RECAPTCHA_SECRET_KEY = '';
const RECAPTCHA_THRESHOLD = 0.5;

// Spreadsheet ID — from your Google Sheet URL
const SPREADSHEET_ID = '1_-1EVtzeWGZvs_jTyIA3hKVj7vrTjyz847tfOIwTEXM';
const SS = SpreadsheetApp.openById(SPREADSHEET_ID);

// Sheet tab names — update if you rename them
const GUEST_LIST_TAB = 'Guest List';
const RSVP_TAB = 'RSVP';

// Column index for "Response" in Guest List (G = 7)
const RESPONSE_COL = 7;

/**
 * Normalize a string for fuzzy comparison.
 * Lowercase, trim, collapse whitespace.
 * @param {string} s
 * @returns {string}
 */
function normalize(s) {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Split a couple field like "David & Minchi" or "David and Minchi"
 * into individual names.
 * @param {string} s
 * @returns {string[]}
 */
function splitNames(s) {
  return s.split(/\s*[&＆]\s*|\s+and\s+/i).map(function(n) { return normalize(n); }).filter(Boolean);
}

/**
 * Fuzzy match a submitted name against a guest list entry.
 * @param {string} submitted — normalized submitted name
 * @param {string} firstNames — raw First Name(s) from guest list
 * @param {string} lastNames — raw Last Name(s) from guest list
 * @returns {boolean}
 */
function fuzzyMatch(submitted, firstNames, lastNames) {
  var fn = normalize(firstNames);
  var ln = normalize(lastNames);

  // Build full name variations
  var fullName = (fn + ' ' + ln).trim();
  var fullNameReversed = (ln + ' ' + fn).trim();

  // 1. Exact full name match
  if (submitted === fullName || submitted === fullNameReversed) return true;

  // 2. First name only match
  if (submitted === fn) return true;

  // 3. Last name + any first name match (for couples)
  var individuals = splitNames(firstNames);
  for (var i = 0; i < individuals.length; i++) {
    var name = individuals[i];
    if (submitted === name) return true;
    if (submitted === name + ' ' + normalize(lastNames)) return true;
    if (submitted === normalize(lastNames) + ' ' + name) return true;
    // Substring: submitted contains individual or individual contains submitted
    if (submitted.length >= 2 && name.indexOf(submitted) >= 0) return true;
    if (name.length >= 2 && submitted.indexOf(name) >= 0) return true;
  }

  // 4. Substring match on full name (handles Chinese names like "小明" matching "王小明")
  if (submitted.length >= 2 && fullName.indexOf(submitted) >= 0) return true;
  if (fullName.length >= 2 && submitted.indexOf(fullName) >= 0) return true;

  return false;
}

/**
 * Find a matching guest in the Guest List tab.
 * @param {string} submittedName
 * @returns {{ row: number, name: string }|null} — row number (1-indexed) and display name, or null
 */
function findGuest(submittedName) {
  var ss = SS;
  var guestSheet = ss.getSheetByName(GUEST_LIST_TAB);

  if (!guestSheet) return null;

  var lastRow = guestSheet.getLastRow();
  if (lastRow < 2) return null;
  var data = guestSheet.getRange(1, 1, lastRow, 2).getValues();
  var sub = normalize(submittedName);

  // Skip header row (index 0)
  for (var i = 1; i < data.length; i++) {
    var firstNames = String(data[i][0] || '');
    var lastNames = String(data[i][1] || '');

    if (fuzzyMatch(sub, firstNames, lastNames)) {
      var displayName = (firstNames + ' ' + lastNames).trim();
      return { row: i + 1, name: displayName }; // +1 because sheet rows are 1-indexed
    }
  }

  return null;
}

function doPost(e) {
  try {
    var params = e.parameter;

    // Validate required fields
    if (!params.name || params.name.trim().length === 0) {
      return jsonResponse({ result: 'error', message: 'Name is required.' });
    }

    // Validate reCAPTCHA if configured
    if (RECAPTCHA_SECRET_KEY && RECAPTCHA_SECRET_KEY.length > 0) {
      var token = params.recaptcha_token || '';
      if (!token) {
        return jsonResponse({ result: 'error', message: 'Security verification failed.' });
      }

      var verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
      var response = UrlFetchApp.fetch(verifyUrl, {
        method: 'post',
        payload: { secret: RECAPTCHA_SECRET_KEY, response: token },
      });

      var captchaResult = JSON.parse(response.getContentText());
      if (!captchaResult.success || captchaResult.score < RECAPTCHA_THRESHOLD) {
        return jsonResponse({ result: 'error', message: 'Security verification failed.' });
      }
    }

    // Match against guest list
    var match = findGuest(params.name);
    var verified = match ? 'YES' : 'UNVERIFIED';
    var matchedName = match ? match.name : '';
    var attendance = params.attendance || 'yes';

    // Append RSVP row
    var ss = SS;
    var rsvpSheet = ss.getSheetByName(RSVP_TAB);
    if (!rsvpSheet) {
      return jsonResponse({ result: 'error', message: 'RSVP sheet not found. Please contact the couple.' });
    }

    rsvpSheet.appendRow([
      new Date(),
      params.name.trim(),
      attendance,
      parseInt(params.guest_count) || 1,
      (params.invitation_type || '').trim(),
      (params.email || '').trim(),
      (params.address || '').trim(),
      (params.message || '').trim(),
      verified,
      matchedName,
    ]);

    // Update Response column in Guest List if matched
    if (match) {
      var guestSheet = ss.getSheetByName(GUEST_LIST_TAB);
      var responseValue = attendance === 'yes' ? 'Attending' : 'Not Attending';
      guestSheet.getRange(match.row, RESPONSE_COL).setValue(responseValue);
    }

    // Send confirmation email to attending guests with valid email
    var guestEmail = params.email ? String(params.email).trim() : '';
    if (attendance === 'yes' && guestEmail.length > 0 && guestEmail.indexOf('@') > 0) {
      sendConfirmationEmail(guestEmail, params.name.trim());
    }

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

function doGet() {
  return jsonResponse({ result: 'ok', message: 'RSVP endpoint is active.' });
}

/**
 * Send RSVP confirmation email to attending guests.
 * @param {string} email
 * @param {string} name
 */
function sendConfirmationEmail(email, name) {
  var subject = 'RSVP Confirmed 已確認出席 — Minchi & David\'s Wedding';
  var hr = '<hr style="border: none; border-top: 1px solid #ddd; max-width: 100px; margin: 25px auto;">';
  var htmlBody = '<!DOCTYPE html><html><head><meta name="format-detection" content="address=no"></head>'
    + '<body style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #333;">'
    + '<div style="text-align: center; padding: 30px 20px;">'
    // Dear [Name]
    + '<p style="font-size: 16px; color: #333; margin-bottom: 2px;">Dear ' + name + ',</p>'
    + '<p style="font-size: 14px; color: #555; letter-spacing: 1px; margin-top: 0;">親愛的 ' + name + '，</p>'
    // Title
    + '<h1 style="font-size: 22px; font-weight: normal; color: #333; margin-bottom: 2px; margin-top: 20px;">Your RSVP is Confirmed</h1>'
    + '<p style="font-size: 14px; color: #555; letter-spacing: 1px; margin-top: 0;">您的出席回覆已確認</p>'
    + hr
    // Warm note
    + '<p style="font-size: 15px; color: #555; margin-bottom: 5px;">We\'re so happy you\'ll be celebrating with us.</p>'
    + '<p style="font-size: 14px; color: #555; letter-spacing: 1px; margin-top: 0;">很開心這一天有您相伴。</p>'
    + hr
    // Date & Time
    + '<p style="font-size: 17px; font-weight: bold; margin-bottom: 3px;">2026.11.29・<span style="font-size: 14px; letter-spacing: 1px;">週日</span></p>'
    + '<p style="font-size: 16px; font-weight: bold; margin-top: 15px; margin-bottom: 5px;">11:30 AM</p>'
    // Venue
    + '<p style="font-size: 16px; font-weight: bold; margin-top: 15px; margin-bottom: 2px;"><a href="https://maps.google.com/?q=Taipei+Marriott+Hotel" target="_blank" style="color: #b8976a; text-decoration: none;">Taipei Marriott Hotel</a></p>'
    + '<p style="font-size: 14px; letter-spacing: 1px; color: #555; margin-top: 0;">台北萬豪酒店</p>'
    + hr
    // Website link
    + '<a href="https://minchi-tsai.github.io/wedding-website/" target="_blank" style="color: #b8976a; text-decoration: none; font-size: 13px;">View Wedding Details ｜ 查看婚禮資訊</a>'
    + hr
    // Signature
    + '<p style="font-family: Georgia, serif; font-size: 24px; font-style: italic; color: #333; margin-top: 20px; margin-bottom: 0;">Minchi &amp; David</p>'
    + '<p style="font-size: 16px; letter-spacing: 1px; color: #555; margin-top: 5px;">旻淇 &amp; 大為</p>'
    + '</div>'
    // Footer blessing
    + '<div style="text-align: center; padding: 25px 20px; margin-top: 10px; background-color: #f5f0eb;">'
    + '<p style="font-size: 14px; color: #555; letter-spacing: 1px; margin-bottom: 5px;">誠摯期待您的到來，陪伴我們一同見證愛與幸福的美好時刻</p>'
    + '<p style="font-size: 13px; color: #777; margin-top: 0;">We sincerely look forward to having you with us as we celebrate this beautiful moment of love and happiness.</p>'
    + '</div>'
    + '</body></html>';

  try {
    GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
  } catch (err) {
    console.error('Failed to send email to ' + email + ': ' + err.message);
  }
}
