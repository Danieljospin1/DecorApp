
import * as SQLite from 'expo-sqlite';

let dbInstance = null;

export async function GetDBConnection() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('localDB.db');
    console.log('Database connection opened.');
  }
  return dbInstance;
}
