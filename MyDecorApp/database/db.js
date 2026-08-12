
import * as SQLite from 'expo-sqlite';

let dbInstance = null;

export async function GetDBConnection() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('myDecor.db');
    console.log('Database connection opened.',dbInstance);
  }
  return dbInstance;
}
