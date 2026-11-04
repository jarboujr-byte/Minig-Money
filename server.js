const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let users = [];

// Admin Credentials requested by user
const ADMIN_USER = "Jr";
const ADMIN_PASS = "123123123";

// Generate 40 Bonus Codes between 700 and 2100
let bonusCodes = {};
for (let i = 1; i <= 40; i++) {
    const randomCoins = Math.floor(Math.random() * (2100 - 700 + 1)) + 700;
    bonusCodes[`BONUS${i * 50}_${randomCoins}`] = {
        coins: randomCoins,
        maxUses: 1, 
        usedCount: 0,
        claimedBy: []
    };
}
bonusCodes["BONUS700"] = { coins: 700, maxUses: 10, usedCount: 0, claimedBy: [] };
bonusCodes["BONUS2100"] = { coins: 2100, maxUses: 10, usedCount: 0, claimedBy: [] };

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }
    const existing = users.find(u => u.username === username);
    if (existing) {
        return res.status(400).json({ success: false, message: 'Username already exists.' });
    }

    const newUser = {
        id: Date.now().toString(),
        username,
        password,
        balance: 0,
        miningRate: 1,
        miners: { novice: 0, apprentice: 0, drill: 0, excavator: 0, quantum: 0 },
        createdAt: new Date()
    };
    users.push(newUser);
    res.json({ success: true, user: newUser });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid username or password.' });
    }
    res.json({ success: true, user });
});

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Admin credentials.' });
    }
});

// Buy Miner / Upgrade API
app.post('/api/buy-miner', (req, res) => {
    const { username, minerType, cost, rateIncrease } = req.body;
    const user = users.find(u => u.username === username);
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });

    if (user.balance < cost) {
        return res.status(400).json({ success: false, message: 'Not enough coins!' });
    }

    user.balance -= cost;
    user.miningRate += rateIncrease;
    if (!user.miners[minerType]) user.miners[minerType] = 0;
    user.miners[minerType]++;

    res.json({ success: true, balance: user.balance, miningRate: user.miningRate, miners: user.miners });
});

// Claim Bonus Code API (One-time use per user check)
app.post('/api/claim-bonus', (req, res) => {
    const { username, code } = req.body;
    const user = users.find(u => u.username === username);
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });

    const formattedCode = code ? code.trim().toUpperCase() : '';
    const bonus = bonusCodes[formattedCode];

    if (!bonus) {
        return res.status(400).json({ success: false, message: 'Invalid bonus code!' });
    }
    if (bonus.claimedBy.includes(username)) {
        return res.status(400).json({ success: false, message: 'You already claimed this bonus code!' });
    }

    bonus.claimedBy.push(username);
    bonus.usedCount++;
    user.balance += bonus.coins;

    res.json({ success: true, balance: user.balance, added: bonus.coins, message: `Successfully claimed ${bonus.coins} coins!` });
});

app.get('/api/admin/data', (req, res) => {
    res.json({
        success: true,
        users: users.map(u => ({ username: u.username, balance: u.balance, miningRate: u.miningRate, miners: u.miners })),
        bonusCodes
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
