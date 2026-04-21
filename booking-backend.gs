/**
 * belisio — Terminbuchung Backend
 * Google Apps Script — als Web App deployen
 *
 * Anleitung zum Deployen:
 *  1. Gehe zu https://script.google.com → Neues Projekt
 *  2. Benenne das Projekt z.B. "belisio Buchung"
 *  3. Füge diesen Code ein
 *  4. Klicke "Bereitstellen" → "Neue Bereitstellung"
 *  5. Typ: Web App
 *     - Ausführen als: Ich (dein Google-Account)
 *     - Zugriff: Alle (auch anonym)
 *  6. Klicke "Bereitstellen" → URL kopieren
 *  7. Trage die URL in script.js ein (APPS_SCRIPT_URL)
 */

/* ── KONFIGURATION ─────────────────────────────────────────── */
const CONFIG = {
  calendarId:   'primary',          // 'primary' = dein Hauptkalender
                                    // oder z.B. 'deine@email.de'
  eventDuration: 60,                // Termindauer in Minuten
  timezone:      'Europe/Berlin',
  ownerEmail:    'kontakt@belisio.de',
  ownerName:     'belisio Webdesign',
  notifyOwner:   true,              // E-Mail an dich bei jeder Buchung
};

/* ── CORS — OPTIONS preflight ──────────────────────────────── */
function doOptions() {
  return buildCorsResponse('');
}

/* ── POST: Buchung entgegennehmen ──────────────────────────── */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { name, company, email, phone, project, date, time } = data;

    // Eingaben validieren
    if (!name || !email || !date || !time) {
      return buildCorsResponse(JSON.stringify({
        success: false,
        error: 'Fehlende Pflichtfelder'
      }));
    }

    /* Datum & Uhrzeit parsen ─────────────────────────────── */
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute]     = time.split(':').map(Number);

    const startTime = new Date(year, month - 1, day, hour, minute, 0);
    const endTime   = new Date(startTime.getTime() + CONFIG.eventDuration * 60 * 1000);

    /* Google Kalender-Eintrag erstellen ──────────────────── */
    const calendar = CalendarApp.getCalendarById(CONFIG.calendarId)
                  || CalendarApp.getDefaultCalendar();

    const title = `Erstgespräch belisio${company ? ' — ' + company : ' — ' + name}`;

    const description = [
      '📅 Buchung über belisio.de',
      '',
      `👤 Name:       ${name}`,
      company ? `🏢 Unternehmen: ${company}` : '',
      `📧 E-Mail:     ${email}`,
      phone   ? `📞 Telefon:    ${phone}`   : '',
      project ? `\n💬 Zum Projekt:\n${project}` : '',
      '',
      '──────────────────────────────',
      'Kostenloses Erstgespräch (30 Min.)',
      'Video-Call oder Telefon — Details per E-Mail',
    ].filter(Boolean).join('\n');

    const event = calendar.createEvent(title, startTime, endTime, {
      description: description,
      guests:      email,
      sendInvites: true,  // Google schickt dem Gast automatisch eine Einladung
                          // (funktioniert auch ohne Google-Konto via E-Mail)
    });

    // Farbe für belisio-Termine
    event.setColor(CalendarApp.EventColor.YELLOW); // passt zu Gold

    /* Bestätigungs-E-Mail an Kunden ──────────────────────── */
    const customerHtml = buildCustomerEmail(name, date, time, company);
    GmailApp.sendEmail(email, 'Ihr Termin bei belisio ist bestätigt ✓', '', {
      htmlBody:  customerHtml,
      name:      CONFIG.ownerName,
      replyTo:   CONFIG.ownerEmail,
    });

    /* Benachrichtigung an Inhaber ────────────────────────── */
    if (CONFIG.notifyOwner) {
      const ownerHtml = buildOwnerEmail(name, company, email, phone, project, date, time);
      GmailApp.sendEmail(CONFIG.ownerEmail, `Neue Buchung: ${name} — ${formatDateDE(date)} ${time} Uhr`, '', {
        htmlBody: ownerHtml,
        name:     'belisio Buchungssystem',
      });
    }

    return buildCorsResponse(JSON.stringify({ success: true }));

  } catch (err) {
    Logger.log('Fehler: ' + err.message);
    return buildCorsResponse(JSON.stringify({ success: false, error: err.message }));
  }
}

/* ── E-Mail-Templates ──────────────────────────────────────── */

function buildCustomerEmail(name, date, time, company) {
  return `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0D;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#141414;border:1px solid #242424;border-radius:4px;overflow:hidden;max-width:600px;">

        <!-- Header -->
        <tr>
          <td style="padding:40px 48px 32px;border-bottom:1px solid #242424;">
            <p style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:300;color:#F5F0E8;letter-spacing:0.05em;">belisio</p>
            <p style="margin:6px 0 0;font-size:11px;color:#6B6560;letter-spacing:0.15em;text-transform:uppercase;">Webdesign-Agentur</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 48px;">
            <p style="margin:0 0 8px;font-size:11px;color:#C8A96E;letter-spacing:0.2em;text-transform:uppercase;">Terminbestätigung</p>
            <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:32px;font-weight:300;color:#F5F0E8;line-height:1.2;">
              Ihr Termin ist<br><em style="font-style:italic;color:#C8A96E;">bestätigt.</em>
            </h1>

            <p style="margin:0 0 32px;font-size:14px;color:#B8B2AA;line-height:1.8;">
              Hallo ${name},<br><br>
              wir freuen uns auf unser Gespräch! Hier sind Ihre Termindetails:
            </p>

            <!-- Termin-Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(200,169,110,0.06);border:1px solid rgba(200,169,110,0.2);border-radius:2px;margin:0 0 32px;">
              <tr>
                <td style="padding:24px 28px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #242424;">
                        <span style="font-size:11px;color:#6B6560;letter-spacing:0.12em;text-transform:uppercase;">Datum</span>
                      </td>
                      <td style="padding:8px 0;border-bottom:1px solid #242424;text-align:right;">
                        <span style="font-size:14px;color:#F5F0E8;">${formatDateDE(date)}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #242424;">
                        <span style="font-size:11px;color:#6B6560;letter-spacing:0.12em;text-transform:uppercase;">Uhrzeit</span>
                      </td>
                      <td style="padding:8px 0;border-bottom:1px solid #242424;text-align:right;">
                        <span style="font-size:14px;color:#F5F0E8;">${time} Uhr (30 Min.)</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;">
                        <span style="font-size:11px;color:#6B6560;letter-spacing:0.12em;text-transform:uppercase;">Format</span>
                      </td>
                      <td style="padding:8px 0;text-align:right;">
                        <span style="font-size:14px;color:#F5F0E8;">Video-Call oder Telefon</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 16px;font-size:14px;color:#B8B2AA;line-height:1.8;">
              Sie erhalten in Kürze eine separate Kalender-Einladung mit dem Link zum Video-Call.
              Falls Sie Fragen haben, antworten Sie einfach auf diese E-Mail.
            </p>

            <p style="margin:0;font-size:14px;color:#B8B2AA;line-height:1.8;">
              Bis bald,<br>
              <strong style="color:#F5F0E8;">Ihr belisio-Team</strong>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 48px;border-top:1px solid #242424;">
            <p style="margin:0;font-size:11px;color:#6B6560;letter-spacing:0.05em;">
              belisio Webdesign · <a href="mailto:kontakt@belisio.de" style="color:#C8A96E;text-decoration:none;">kontakt@belisio.de</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildOwnerEmail(name, company, email, phone, project, date, time) {
  return `
<div style="font-family:monospace;font-size:14px;color:#333;padding:20px;">
  <h2 style="color:#9E7D45;">📅 Neue Buchung eingegangen</h2>
  <table style="border-collapse:collapse;width:100%;max-width:500px;">
    <tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Name</td>
        <td style="padding:8px 12px;border:1px solid #ddd;">${name}</td></tr>
    ${company ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Unternehmen</td>
        <td style="padding:8px 12px;border:1px solid #ddd;">${company}</td></tr>` : ''}
    <tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">E-Mail</td>
        <td style="padding:8px 12px;border:1px solid #ddd;"><a href="mailto:${email}">${email}</a></td></tr>
    ${phone ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Telefon</td>
        <td style="padding:8px 12px;border:1px solid #ddd;">${phone}</td></tr>` : ''}
    <tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Datum</td>
        <td style="padding:8px 12px;border:1px solid #ddd;"><strong>${formatDateDE(date)} um ${time} Uhr</strong></td></tr>
    ${project ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;background:#f9f9f9;font-weight:bold;">Projekt</td>
        <td style="padding:8px 12px;border:1px solid #ddd;">${project}</td></tr>` : ''}
  </table>
  <p style="margin-top:16px;color:#666;">Der Termin wurde automatisch in deinen Google Kalender eingetragen.</p>
</div>`;
}

/* ── Hilfsfunktionen ───────────────────────────────────────── */

function formatDateDE(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const days   = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  const months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  return `${days[date.getDay()]}, ${day}. ${months[month - 1]} ${year}`;
}

function buildCorsResponse(body) {
  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}
