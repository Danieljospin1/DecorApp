import * as SQLite from "expo-sqlite";

const db = SQLite.openDatabaseSync("mydecor.db");

export default db;
