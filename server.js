const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Data helpers ---
function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Read error:', e.message);
  }
  return { members: ['쟘', '푸히히', '평이', '에바다'], records: {} };
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Init file if not exists
if (!fs.existsSync(DATA_FILE)) writeData(readData());

// --- API ---
app.get('/api/data', (req, res) => {
  res.json(readData());
});

app.post('/api/record', (req, res) => {
  const { member, date, weight, attended } = req.body;
  if (!member || !date) return res.status(400).json({ error: 'member, date required' });
  const data = readData();
  if (!data.records[member]) data.records[member] = {};
  data.records[member][date] = {
    weight: weight != null ? weight : null,
    attended: !!attended
  };
  writeData(data);
  res.json({ ok: true });
});

app.post('/api/member', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const data = readData();
  if (data.members.includes(name)) return res.status(409).json({ error: 'duplicate' });
  data.members.push(name);
  data.records[name] = {};
  writeData(data);
  res.json({ ok: true });
});

app.delete('/api/member/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const data = readData();
  const idx = data.members.indexOf(name);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  data.members.splice(idx, 1);
  delete data.records[name];
  writeData(data);
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
