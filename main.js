const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const Loki = require('lokijs');
const Fuse = require('fuse.js');

let mainWindow;
let serverProcess;
let db;
let server;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', process.platform === 'darwin' ? 'app-logo.icns' : 'app-logo.png')
  });

  // Only create a new server if one doesn't already exist
  if (!server) {
    server = express();
    const port = 3000;

    // Initialize LokiJS
    const dbPath = path.join(app.getPath('userData'), 'notes.db');
    console.log('Database path:', dbPath);
    db = new Loki(dbPath, {
      autoload: true,
      autoloadCallback: initializeDatabase,
      autosave: true,
      autosaveInterval: 4000
    });

    function initializeDatabase() {
      let notes = db.getCollection('notes');
      if (notes === null) {
        notes = db.addCollection('notes', { indices: ['id'] });
      }
    }

    // Middleware
    server.use(bodyParser.urlencoded({ extended: true }));
    server.use(bodyParser.json());
    server.use(express.static(path.join(__dirname, 'public')));

    // Logging middleware
    server.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });

    // Routes
    server.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    server.post('/api/notes', (req, res) => {
      console.log('Received note:', req.body);
      const { content } = req.body;
      const notes = db.getCollection('notes');
      const newNote = {
        content,
        created_at: new Date().toISOString(),
        charCount: content.length
      };
      const inserted = notes.insert(newNote);
      console.log('Note inserted, ID:', inserted.$loki);
      res.json({ id: inserted.$loki });
    });

    server.get('/api/notes', (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const offset = (page - 1) * limit;

      const notes = db.getCollection('notes');
      const totalNotes = notes.count();
      const totalPages = Math.ceil(totalNotes / limit);
      const paginatedNotes = notes.chain().simplesort('$loki', true).offset(offset).limit(limit).data();

      res.json({
        notes: paginatedNotes,
        currentPage: page,
        totalPages: totalPages,
        totalNotes: totalNotes
      });
    });

    server.delete('/api/notes/:id', (req, res) => {
      const id = parseInt(req.params.id);
      const notes = db.getCollection('notes');
      const note = notes.findOne({ '$loki': id });
      if (note) {
        notes.remove(note);
        console.log('Note deleted, ID:', id);
        res.json({ message: `Note ${id} deleted`, changes: 1 });
      } else {
        res.status(404).json({ message: `Note ${id} not found` });
      }
    });

    server.post('/api/search', (req, res) => {
      const { query } = req.body;
      const notes = db.getCollection('notes');
      const allNotes = notes.chain().data();

      const options = {
        keys: ['content'],
        includeScore: true,
        threshold: 0.4
      };

      const fuse = new Fuse(allNotes, options);
      const results = fuse.search(query);

      console.log('Search results:', results.length);
      res.json(results.map(result => result.item));
    });

    serverProcess = server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      mainWindow.loadURL(`http://localhost:${port}`);
    });
  } else {
    // If server already exists, just load the URL
    mainWindow.loadURL(`http://localhost:3000`);
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    if (serverProcess) {
      serverProcess.close();
    }
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('will-quit', (event) => {
  if (serverProcess) {
    serverProcess.close();
  }
  if (db) {
    db.close();
  }
});