import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Define the absolute path for the local database file (allows DB_PATH env var for persistent cloud volumes)
const DB_FILE_PATH = process.env.DB_PATH || path.join(process.cwd(), '.draga-db.json');

// Helper to ensure file exists and read its contents
async function readDb(): Promise<Record<string, string>> {
  try {
    const data = await fs.readFile(DB_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      // File doesn't exist, create it with empty object
      await fs.writeFile(DB_FILE_PATH, JSON.stringify({}), 'utf-8');
      return {};
    }
    console.error('Error reading local db:', err);
    return {};
  }
}

// GET: Fetch a specific key from the local JSON database
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const db = await readDb();
    const value = db[key] || null;

    return NextResponse.json({ value });
  } catch (error) {
    console.error('Error in GET local-db:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Save or update a specific key in the local JSON database
export async function POST(request: Request) {
  try {
    const { key, value } = await request.json();

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const db = await readDb();
    db[key] = value;

    await fs.writeFile(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST local-db:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Remove a specific key from the local JSON database
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const db = await readDb();
    if (db[key] !== undefined) {
      delete db[key];
      await fs.writeFile(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE local-db:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
