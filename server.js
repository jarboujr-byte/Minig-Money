const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let registeredUsers = [];

// 5 Coder fixés (entre 700 et 2100 coins, max 7 claims chacun)
let bonusCodes = [
    { code: "BONUS700", coins: 700, maxClaims: 7, claimedBy: [] },
    { code: "BONUS1000", coins: 1050, maxClaims: 7, claimedBy: [] },
    { code: "BONUS1500", coins: 1480, maxClaims: 7, claimedBy: [] },
    { code: "BONUS1800", coins: 1820, maxClaims: 7, claimedBy: [] },
    { code: "BONUS2100", coins: 2100, maxClaims: 7, claimedBy: [] }
];

const randomAvatars = [
    "https://api.dicebear.com/7.x/bottts/svg?seed=1",
    "https://api.dicebear.com/7.x/bottts/svg?seed=2",
    "https://api.dicebear.com/7.x/bottts/svg?seed=3",
    "https://api.dicebear.com/7.x/bottts/svg?seed=4",
    "https://api.dicebear.com/7.x/bottts/svg?seed=5"
];

function generateUniqueRandomId() {
    let availableIds = [];
    for (let i = 50; i <= 243; i++) {
        if (!registeredUsers.some(u => u.userNumber === i)) {
            availableIds.push(i);
        }
    }
    if (availableIds.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * availableIds.length);
    return availableIds[randomIndex];
}

app.post('/register', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: "Lazem t-kammel el username w el password!" });
        }
        const trimmedUser = username.trim();
        const isUserTaken = registeredUsers.some(u => u.username.toLowerCase() === trimmedUser.toLowerCase());
        if (isUserTaken) {
            return res.status(400).json({ error: "El username hetha ma5outh deja!" });
        }
        const uniqueId = generateUniqueRandomId();
        if (uniqueId === null) {
            return res.status(400).json({ error: "Koll el ar9am bin 50 w 243 ma5outha!" });
        }
        const randomAvatar = randomAvatars[Math.floor(Math.random() * randomAvatars.length)];
        const newUser = {
            username: trimmedUser,
            password,
            userNumber: uniqueId,
            avatar: randomAvatar,
            status: "Online",
            coins: 0,
            claimedCodes: []
        };
        registeredUsers.push(newUser);
        return res.json({ 
            success: true, 
            message: "Compte t-crea b nejah!", 
            user: { 
                username: newUser.username, 
                userNumber: newUser.userNumber, 
                avatar: newUser.avatar,
                status: newUser.status,
                coins: newUser.coins
            }
        });
    } catch (err) {
        return res.status(500).json({ error: "Erreur serveur!" });
    }
});

app.get('/search', (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ error: "A3mel ktaba fel recherche!" });
    }
    const q = query.trim().toLowerCase();
    const foundUser = registeredUsers.find(u => 
        u.userNumber.toString() === q || 
        u.username.toLowerCase() === q
    );
    if (!foundUser) {
        return res.status(404).json({ error: "Ma l9inech user b hetha el ID wala el username!" });
    }
    return res.json({
        username: foundUser.username,
        userNumber: foundUser.userNumber,
        avatar: foundUser.avatar,
        status: foundUser.status,
        coins: foundUser.coins
    });
});

app.post('/claim-bonus', (req, res) => {
    const { username, code } = req.body;
    if (!username || !code) {
        return res.status(400).json({ error: "Lazem t-dkhl el username w el code!" });
    }

    const user = registeredUsers.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user) {
        return res.status(404).json({ error: "User msh mawjoud!" });
    }

    const bonus = bonusCodes.find(b => b.code === code.trim().toUpperCase());
    if (!bonus) {
        return res.status(404).json({ error: "El code bonus ghalat wala msh mawjoud!" });
    }

    if (user.claimedCodes.includes(bonus.code)) {
        return res.status(400).json({ error: "sta3melt el code hetha min qbel!" });
    }

    if (bonus.claimedBy.length >= bonus.maxClaims) {
        return res.status(400).json({ error: "El code hetha wfew el 7 claims mte3ou!" });
    }

    bonus.claimedBy.push(user.username);
    user.claimedCodes.push(bonus.code);
    user.coins += bonus.coins;

    return res.json({
        success: true,
        message: `Mabrouk! Rba7t ${bonus.coins} coins!`,
        newCoins: user.coins
    });
});

app.get('/admin/codes', (req, res) => {
    return res.json({
        totalCodes: bonusCodes.length,
        codes: bonusCodes.map(b => ({
            code: b.code,
            coins: b.coins,
            claimsCount: b.claimedBy.length,
            maxClaims: b.maxClaims,
            claimedBy: b.claimedBy
        }))
    });
});

// Fallback pour renvoyer index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
