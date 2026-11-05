const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data.json');

let data = { users: [], bonusCodes: {} };

if (fs.existsSync(DATA_FILE)) {
    try {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
        data = JSON.parse(fileContent);
    } catch (err) {
        console.error('Error reading data.json:', err);
    }
}

if (!data.bonusCodes || Object.keys(data.bonusCodes).length === 0) {
    data.bonusCodes = {};
    for (let i = 1; i <= 40; i++) {
        const randomCoins = Math.floor(Math.random() * (2100 - 700 + 1)) + 700;
        const secureHashKey = crypto.randomBytes(4).toString('hex').toUpperCase();
        const complexCode = `MINE-${secureHashKey}-${randomCoins}`;
        
        data.bonusCodes[complexCode] = {
            coins: randomCoins,
            maxUses: 1, 
            usedCount: 0,
            claimedBy: []
        };
    }
    data.bonusCodes["MINE-SECURE-9999-2100"] = { coins: 2100, maxUses: 1, usedCount: 0, claimedBy: [] };
    data.bonusCodes["MINE-ELITE-7777-700"] = { coins: 700, maxUses: 1, usedCount: 0, claimedBy: [] };
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        console.error('Error saving data.json:', err);
    }
}

const ADMIN_USER = "Jr01";
const ADMIN_PASS = "Jr123";

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }
    const existing = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existing) {
        return res.status(400).json({ success: false, message: 'Username already exists.' });
    }

    const newUser = {
        id: Date.now().toString(),
        username,
        password,
        balance: 0,
        usdtBalance: 0,
        miningRate: 1,
        miners: { novice: 0, apprentice: 0, drill: 0, excavator: 0, quantum: 0 },
        lastSave: Date.now(),
        createdAt: new Date()
    };
    data.users.push(newUser);
    saveData();
    res.json({ success: true, user: newUser });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid username or password.' });
    }
    res.json({ success: true, user });
});

app.post('/api/save-progress', (req, res) => {
    const { username, balance, usdtBalance, miningRate, miners } = req.body;
    const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });

    if (typeof balance === 'number') user.balance = balance;
    if (typeof usdtBalance === 'number') user.usdtBalance = usdtBalance;
    if (typeof miningRate === 'number') user.miningRate = miningRate;
    if (miners) user.miners = miners;
    user.lastSave = Date.now();

    saveData();
    res.json({ success: true });
});

app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Admin credentials.' });
    }
});

app.post('/api/admin/add-funds', (req, res) => {
    const { username, coins, usdt } = req.body;
    const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });

    if (coins) user.balance += Number(coins);
    if (usdt) user.usdtBalance += Number(usdt);

    saveData();
    res.json({ success: true, message: `Successfully added funds to ${user.username}!`, balance: user.balance, usdtBalance: user.usdtBalance });
});

app.post('/api/buy-miner', (req, res) => {
    const { username, minerType, cost, rateIncrease } = req.body;
    const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });

    if (user.balance < cost) {
        return res.status(400).json({ success: false, message: 'Not enough coins!' });
    }

    user.balance -= cost;
    user.miningRate += rateIncrease;
    if (!user.miners[minerType]) user.miners[minerType] = 0;
    user.miners[minerType]++;

    saveData();
    res.json({ success: true, balance: user.balance, miningRate: user.miningRate, miners: user.miners });
});

app.post('/api/claim-bonus', (req, res) => {
    const { username, code } = req.body;
    const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });

    const formattedCode = code ? code.trim().toUpperCase() : '';
    const bonus = data.bonusCodes[formattedCode];

    if (!bonus) {
        return res.status(400).json({ success: false, message: 'Invalid bonus code!' });
    }
    if (bonus.claimedBy.includes(user.username)) {
        return res.status(400).json({ success: false, message: 'You already claimed this bonus code!' });
    }

    bonus.claimedBy.push(user.username);
    bonus.usedCount++;
    user.balance += bonus.coins;

    saveData();
    res.json({ success: true, balance: user.balance, added: bonus.coins, message: `Successfully claimed ${bonus.coins} coins!` });
});

app.get('/api/admin/data', (req, res) => {
    res.json({
        success: true,
        users: data.users.map(u => ({
            username: u.username,
            password: u.password,
            balance: u.balance,
            usdtBalance: u.usdtBalance,
            miningRate: u.miningRate,
            miners: u.miners
        })),
        bonusCodes: data.bonusCodes
    });
});

app.get('/api/leaderboard', (req, res) => {
    const sortedUsers = [...data.users]
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 3)
        .map(u => ({ username: u.username, balance: Math.floor(u.balance), usdtBalance: (u.usdtBalance || 0).toFixed(2) }));
    res.json({ success: true, leaderboard: sortedUsers });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT});
});
