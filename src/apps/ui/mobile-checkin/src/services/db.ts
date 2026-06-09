import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDb() {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('checkin.db');
  
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS checkin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticketId TEXT NOT NULL,
      deviceId TEXT NOT NULL,
      scannedAt TEXT NOT NULL,
      scanResult TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS valid_tickets (
      ticketId TEXT PRIMARY KEY,
      code TEXT,
      gate TEXT,
      attendeeName TEXT,
      attendeeEmail TEXT,
      status TEXT NOT NULL,
      eventId TEXT,
      lastUpdated TEXT
    );
  `);

  // Migrate: add columns if they don't exist (safe on re-open)
  try {
    await db.execAsync(`ALTER TABLE valid_tickets ADD COLUMN code TEXT;`);
  } catch (_) {}
  try {
    await db.execAsync(`ALTER TABLE valid_tickets ADD COLUMN attendeeName TEXT;`);
  } catch (_) {}
  try {
    await db.execAsync(`ALTER TABLE valid_tickets ADD COLUMN attendeeEmail TEXT;`);
  } catch (_) {}
  try {
    await db.execAsync(`ALTER TABLE valid_tickets ADD COLUMN eventId TEXT;`);
  } catch (_) {}

  return db;
}

export type LocalTicket = {
  ticketId: string;
  code: string;
  gate: string;
  attendeeName: string;
  attendeeEmail: string;
  status: string;
  eventId: string;
  lastUpdated: string;
};

export async function upsertValidTickets(tickets: {
  id: string;
  gate: string | null;
  status: string;
  code?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  eventId?: string;
}[]) {
  const db = await initDb();
  await db.withTransactionAsync(async () => {
    for (const t of tickets) {
      await db.runAsync(
        `INSERT OR REPLACE INTO valid_tickets 
         (ticketId, code, gate, attendeeName, attendeeEmail, status, eventId, lastUpdated) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        t.id,
        t.code || '',
        t.gate || '',
        t.attendeeName || '',
        t.attendeeEmail || '',
        t.status,
        t.eventId || '',
        new Date().toISOString()
      );
    }
  });
}

export async function updateTicketStatuses(changes: { ticketId: string; status: string; scannedAt: string }[]) {
  const db = await initDb();
  await db.withTransactionAsync(async () => {
    for (const c of changes) {
      await db.runAsync(
        'UPDATE valid_tickets SET status = ?, lastUpdated = ? WHERE ticketId = ?',
        c.status === 'ACCEPTED' ? 'CHECKED_IN' : c.status,
        c.scannedAt,
        c.ticketId
      );
    }
  });
}

export async function checkTicketValidity(ticketId: string) {
  const db = await initDb();
  const row = await db.getFirstAsync('SELECT * FROM valid_tickets WHERE ticketId = ?', ticketId);
  return row as LocalTicket | null;
}

export async function markTicketAsCheckedInLocally(ticketId: string) {
  const db = await initDb();
  await db.runAsync(
    'UPDATE valid_tickets SET status = "CHECKED_IN", lastUpdated = ? WHERE ticketId = ?',
    new Date().toISOString(),
    ticketId
  );
}

export async function getAllLocalTickets(eventId?: string) {
  const db = await initDb();
  let rows: any[];
  if (eventId) {
    rows = await db.getAllAsync(
      'SELECT * FROM valid_tickets WHERE eventId = ? ORDER BY status DESC, attendeeName ASC',
      eventId
    );
  } else {
    rows = await db.getAllAsync(
      'SELECT * FROM valid_tickets ORDER BY status DESC, attendeeName ASC'
    );
  }
  return rows as LocalTicket[];
}

export async function getLocalTicketStats(eventId?: string) {
  const db = await initDb();
  let rows: any[];
  if (eventId) {
    rows = await db.getAllAsync(
      'SELECT status, COUNT(*) as count FROM valid_tickets WHERE eventId = ? GROUP BY status',
      eventId
    );
  } else {
    rows = await db.getAllAsync(
      'SELECT status, COUNT(*) as count FROM valid_tickets GROUP BY status'
    );
  }
  const stats: Record<string, number> = {};
  for (const row of rows as any[]) {
    stats[row.status] = row.count;
  }
  return stats;
}

/**
 * Only count VALID logs that haven't been synced — errors don't need to sync
 */
export async function addCheckinLog(
  ticketId: string,
  deviceId: string,
  scanResult: 'VALID' | 'INVALID' | 'ALREADY_SCANNED'
) {
  const db = await initDb();
  const scannedAt = new Date().toISOString();
  // Only save to sync queue if VALID (actual check-ins need to reach server)
  const needsSync = scanResult === 'VALID' ? 0 : 1; // 0 = unsynced (needs sync), 1 = already "done"
  await db.runAsync(
    'INSERT INTO checkin_logs (ticketId, deviceId, scannedAt, scanResult, synced) VALUES (?, ?, ?, ?, ?)',
    ticketId, deviceId, scannedAt, scanResult, needsSync
  );
}

/**
 * Only returns VALID logs that need to be pushed to server
 */
export async function getUnsyncedLogs() {
  const db = await initDb();
  const allRows = await db.getAllAsync(
    'SELECT * FROM checkin_logs WHERE synced = 0 AND scanResult = "VALID"'
  );
  return allRows as Array<{
    id: number;
    ticketId: string;
    deviceId: string;
    scannedAt: string;
    scanResult: 'VALID' | 'INVALID' | 'ALREADY_SCANNED';
    synced: number;
  }>;
}

export async function markLogsAsSynced(ids: number[]) {
  if (ids.length === 0) return;
  const db = await initDb();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`UPDATE checkin_logs SET synced = 1 WHERE id IN (${placeholders})`, ids);
}
