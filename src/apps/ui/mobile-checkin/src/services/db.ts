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
      gate TEXT,
      status TEXT NOT NULL,
      lastUpdated TEXT
    );
  `);
  return db;
}

export async function upsertValidTickets(tickets: { id: string; gate: string | null; status: string }[]) {
  const db = await initDb();
  await db.withTransactionAsync(async () => {
    for (const t of tickets) {
      await db.runAsync(
        'INSERT OR REPLACE INTO valid_tickets (ticketId, gate, status, lastUpdated) VALUES (?, ?, ?, ?)',
        t.id, t.gate || '', t.status, new Date().toISOString()
      );
    }
  });
}

export async function updateTicketStatuses(changes: { ticketId: string; status: string; scannedAt: string }[]) {
  const db = await initDb();
  await db.withTransactionAsync(async () => {
    for (const c of changes) {
      // We only update if the ticket exists in valid_tickets
      await db.runAsync(
        'UPDATE valid_tickets SET status = ?, lastUpdated = ? WHERE ticketId = ?',
        c.status, c.scannedAt, c.ticketId
      );
    }
  });
}

export async function checkTicketValidity(ticketId: string) {
  const db = await initDb();
  const row = await db.getFirstAsync('SELECT * FROM valid_tickets WHERE ticketId = ?', ticketId);
  return row as { ticketId: string; gate: string; status: string; lastUpdated: string } | null;
}

export async function markTicketAsCheckedInLocally(ticketId: string) {
  const db = await initDb();
  await db.runAsync('UPDATE valid_tickets SET status = "CHECKED_IN", lastUpdated = ? WHERE ticketId = ?', new Date().toISOString(), ticketId);
}

export async function addCheckinLog(ticketId: string, deviceId: string, scanResult: 'VALID' | 'INVALID' | 'ALREADY_SCANNED') {
  const db = await initDb();
  const scannedAt = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO checkin_logs (ticketId, deviceId, scannedAt, scanResult, synced) VALUES (?, ?, ?, ?, ?)',
    ticketId, deviceId, scannedAt, scanResult, 0
  );
}

export async function getUnsyncedLogs() {
  const db = await initDb();
  const allRows = await db.getAllAsync('SELECT * FROM checkin_logs WHERE synced = 0');
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
