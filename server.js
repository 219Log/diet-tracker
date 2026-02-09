const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://iplgeluxclcwikjbyqxr.supabase.co',
  process.env.SUPABASE_KEY || ''
);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- GET all data ---
app.get('/api/data', async (req, res) => {
  try {
    const { data: members } = await supabase
      .from('members').select('name').order('id');
    const { data: records } = await supabase
      .from('records').select('member_name, date, weight, attended');

    const memberList = members.map(m => m.name);
    const recordMap = {};
    for (const m of memberList) recordMap[m] = {};
    for (const r of records) {
      if (!recordMap[r.member_name]) recordMap[r.member_name] = {};
      recordMap[r.member_name][r.date] = {
        weight: r.weight != null ? Number(r.weight) : null,
        attended: r.attended
      };
    }
    res.json({ members: memberList, records: recordMap });
  } catch (e) {
    console.error('GET /api/data error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// --- Save record ---
app.post('/api/record', async (req, res) => {
  try {
    const { member, date, weight, attended } = req.body;
    if (!member || !date) return res.status(400).json({ error: 'member, date required' });

    const { error } = await supabase
      .from('records')
      .upsert({
        member_name: member,
        date,
        weight: weight != null ? weight : null,
        attended: !!attended
      }, { onConflict: 'member_name,date' });

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/record error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// --- Add member ---
app.post('/api/member', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const { error } = await supabase
      .from('members')
      .insert({ name });

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'duplicate' });
      throw error;
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/member error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// --- Delete member ---
app.delete('/api/member/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);

    await supabase.from('records').delete().eq('member_name', name);
    const { error } = await supabase.from('members').delete().eq('name', name);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/member error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
