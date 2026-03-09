# Free waitlist backend (Google Sheets)

No extra cost. Emails are stored in your own Google Sheet.

## 1. Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
2. Name it e.g. **ReStock Waitlist**.
3. In the first row, put: **Email** (A1), **Location** (B1), **IP** (C1), **Referrer** (D1), **Date** (E1).
4. Copy the **Sheet ID** from the URL:  
   `https://docs.google.com/spreadsheets/d/`**`SHEET_ID_HERE`**`/edit`  
   You’ll need this in the script.

## 2. Add the script

1. In the sheet, open **Extensions → Apps Script**.
2. Delete any sample code and paste this:

```javascript
function doGet() {
  return HtmlService.createHtmlOutput(
    '<p>This URL is for the waitlist form. Go to <a href="https://getrestock.app">getrestock.app</a> to join.</p>' +
    '<script>setTimeout(function(){ window.location.href = "https://getrestock.app"; }, 2000);</script>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var params = e.parameter || {};
  var email = (params.email || '').trim();
  var ip = (params.ip || '').trim();
  var location = (params.location || '').trim();
  var referrer = (params.referrer || '').trim();

  if (!email) {
    return createPostMessagePage(false);
  }

  // Column order: A=Email, B=Location, C=IP, D=Referrer, E=Date (date last)
  sheet.appendRow([email, location, ip, referrer, new Date()]);
  return createPostMessagePage(true);
}

// Tell the parent (postMessage) and redirect iframe so parent can detect success via same-origin load.
function createPostMessagePage(success) {
  var json = success ? '{"type":"waitlist","success":true}' : '{"type":"waitlist","success":false}';
  var q = success ? 'joined=1' : 'error=1';
  return HtmlService.createHtmlOutput(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><p>Thanks. You\'re on the list.</p>' +
    '<script>try { (window.top || window.parent).postMessage(' + json + ', "*"); } catch (e) {}' +
    'setTimeout(function(){ window.location.href = "https://getrestock.app?' + q + '"; }, 150);</script></body></html>'
  ).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

3. **Save** (Ctrl/Cmd+S). Name the project e.g. **Waitlist**.
4. If you already deployed, go to **Deploy → Manage deployments → Edit (pencil) → New version → Deploy** so the new script runs.

## 3. Deploy as web app

1. Click **Deploy → New deployment**.
2. Click the gear icon next to “Select type” → **Web app**.
3. Set:
   - **Description:** e.g. “Waitlist”
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**. Authorize the app when asked (Google account, allow access).
5. Copy the **Web app URL** (looks like `https://script.google.com/macros/s/.../exec`).

## 4. Connect the landing page

1. Open `index.html`.
2. Set `WAITLIST_ENDPOINT` to your web app URL:

```javascript
var WAITLIST_ENDPOINT = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
```

3. Upload the updated `index.html` to getrestock.app.

Submissions will POST to the script, get appended to your sheet, then the user is redirected back to getrestock.app?joined=1 and sees the success message.
