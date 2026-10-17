/**

 * Insider Desk – live data feed for TheLongevityInsider.Asia
 * Bound to the Editorial Pipeline sheet. Read-only: never writes to the sheet.
 * Deploy: Deploy → New deployment → Web app, Execute as: Me, Who has access: Anyone.
 * Returns JSON (or JSONP if ?callback=fn is given).
 */
var PIPELINE_TAB = 'Editorial Pipeline';
var DASHBOARD_TAB = 'Dashboard';
var MEMORY_LIMIT = 10; // most recent change-log lines exposed as "sheet memory"

// Header text -> output field. Only fields the site displays are exported.
var FIELDS = {
  'Post Date': 'date',
  'Target Time (SGT)': 'time',
  'Content Title': 'title',
  'Core Pillar': 'pillar',
  'Format': 'format',
  'Review Status': 'status',
  'Instagram Hook & Caption Summary': 'hook',
  'Buffer Post ID': 'bufferId',
  'Instagram Link': 'instagram',
  'Topic Key': 'topic',
  'Reach Thesis': 'thesis',
  'Latest Files (Review)': 'files'
};

function doGet(e) {
  var payload;
  try {
    payload = buildPayload_();
  } catch (err) {
    payload = { ok: false, error: String(err) };
  }
  var json = JSON.stringify(payload);
  var cb = e && e.parameter && e.parameter.callback;
  if (cb && /^[A-Za-z_$][\w$]{0,63}$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function buildPayload_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pipe = ss.getSheetByName(PIPELINE_TAB);
  if (!pipe) throw new Error('Missing tab: ' + PIPELINE_TAB);
  var values = pipe.getDataRange().getDisplayValues();

  // Find the header row (the one containing "Content Title").
  var h = -1;
  for (var i = 0; i < Math.min(values.length, 15); i++) {
    if (values[i].indexOf('Content Title') !== -1) { h = i; break; }
  }
  if (h < 0) throw new Error('Header row not found');
  var header = values[h];
  var cols = {};
  header.forEach(function (name, c) {
    var key = FIELDS[String(name).trim()];
    if (key) cols[key] = c;
  });
  // Change-log column: its header cell holds the sheet-level log ("... Change Log (who | what | when)").
  var logCol = -1;
  header.forEach(function (name, c) { if (/Change Log/i.test(name)) logCol = c; });

  var posts = [], memory = [];
  pushLog_(memory, logCol >= 0 ? header[logCol] : '', null);

  for (var r = h + 1; r < values.length; r++) {
    var row = values[r];
    var title = cols.title != null ? String(row[cols.title]).trim() : '';
    if (!title) continue;
    var p = { row: r + 1 };
    Object.keys(cols).forEach(function (k) { p[k] = String(row[cols[k]] || '').trim(); });
    posts.push(p);
    if (logCol >= 0) pushLog_(memory, row[logCol], r + 1);
  }
  memory.sort(function (a, b) { return a.when < b.when ? 1 : a.when > b.when ? -1 : 0; });

  var dash = { summary: '', notes: [] };
  var d = ss.getSheetByName(DASHBOARD_TAB);
  if (d) {
    var dv = d.getDataRange().getDisplayValues();
    for (var j = 0; j < dv.length; j++) {
      var line = dv[j].join(' ');
      if (!dash.summary && /Total Active Posts/i.test(line)) dash.summary = String(dv[j][1] || line).trim();
      var note = String(dv[j][7] || '').trim(); // column H: desk notes
      if (note) dash.notes.push(note);
    }
  }

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    sheetUrl: ss.getUrl(),
    posts: posts,
    dashboard: dash,
    memory: memory.slice(0, MEMORY_LIMIT)
  };
}

// Change-log lines look like "2026-10-13 12:40 SGT | Grok | H5: ... | reason".
// Export only timestamp, author and the "what" part (no reasons/internal notes).
function pushLog_(out, cell, row) {
  String(cell || '').split('\n').forEach(function (line) {
    var m = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}) SGT \| ([^|]+) \| ([^|]+)/);
    if (m) out.push({ when: m[1], who: m[2].trim(), what: m[3].trim().slice(0, 200), row: row });
  });
}
