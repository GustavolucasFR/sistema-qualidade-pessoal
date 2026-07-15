const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'antigravity_super_secret_key_2026';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ erro: 'Nenhum token fornecido.' });
    }

    const parts = authHeader.split(' ');
    
    if (parts.length !== 2) {
        return res.status(401).json({ erro: 'Token erro.' });
    }

    const [scheme, token] = parts;
    
    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ erro: 'Token mal formatado.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ erro: 'Token inválido.' });
        }
        
        req.userId = decoded.id;
        req.userRole = decoded.role;
        req.username = decoded.username;
        return next();
    });
};

module.exports = {
    verifyToken,
    JWT_SECRET
};
