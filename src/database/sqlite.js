// ---------------------------------------------------
// sqlite.js - Conexão com SQLite usando sql.js
// sql.js é SQLite compilado para WebAssembly (puro JS),
// não precisa de Visual Studio nem de copilação nativa
// ---------------------------------------------------

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

 const DB_PATH = process.env.DB_PATH
    || path.join(__dirname, '..', '..', 'pecas.db');

// Módulo singleton - exporta { db, ready }
// "ready" é uma Promise que resolve quando o banco estiver pronto.
// Todos os models devem aguardar essa Promise antes de usar o db.

const state = { db: null };

const ready = (async () => {
    const SQL = await initSqlJs();

    // Se o arquivo já existe, carrega do disco
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        state.db = new SQL.Database(fileBuffer);
    } else {
        state.db = new SQL.Database();
    }

    const db = state.db;

    // Ativa chaves estrangeiras
    db.run('PRAGMA foreign_keys = ON');

    //------------------ Criação das Tabelas ---------------------
    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          nome        TEXT    NOT NULL,
          email       TEXT    NOT NULL UNIQUE,
          senha       TEXT    NOT NULL,
          perfil      TEXT    NOT NULL DEFAULT 'Atendente',
          ativo       INTEGER NOT NULL DEFAULT 1,
          created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
          updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          nome        TEXT    NOT NULL,
          telefone    TEXT    NOT NULL,
          endereco    TEXT    NOT NULL DEFAULT '{}',
          observacoes TEXT    NOT NULL DEFAULT '',
          ativo       INTEGER NOT NULL DEFAULT 1,
          created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
          updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS pecas (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          nome        TEXT    NOT NULL,
          categoria   TEXT    NOT NULL DEFAULT '',
          precos      TEXT    NOT NULL DEFAULT,
          disponivel  INTEGER NOT NULL DEFAULT 1,
          created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
          updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        )    
    `);



    db.run(`
        CREATE
    `)
})