const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ erro: 'Usuário e senha são obrigatórios.' });
        }

        const query = 'SELECT id, username, password, role, must_change_password FROM importador.usuarios WHERE username = $1';
        const { rows } = await pool.query(query, [username]);

        if (rows.length === 0) {
            return res.status(401).json({ erro: 'Credenciais inválidas.' });
        }

        const user = rows[0];
        
        // Verifica a senha encriptada
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            // Se falhar o bcrypt, verifica se é texto plano por razões de migração
            if (password === user.password) {
                // Migra para bcrypt no fundo
                const salt = await bcrypt.genSalt(10);
                const hashed = await bcrypt.hash(password, salt);
                await pool.query('UPDATE importador.usuarios SET password = $1 WHERE id = $2', [hashed, user.id]);
            } else {
                return res.status(401).json({ erro: 'Credenciais inválidas.' });
            }
        }

        // Gera token JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, must_change_password: user.must_change_password },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            message: 'Login bem-sucedido',
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                must_change_password: user.must_change_password
            }
        });
    } catch (err) {
        console.error("Erro na rota login:", err);
        res.status(500).json({ erro: 'Falha interna ao realizar login.' });
    }
};

const setupAdmin = async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS importador.usuarios (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'viewer',
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        const { rows } = await pool.query("SELECT * FROM importador.usuarios WHERE username = 'admin'");
        if (rows.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash('admin123', salt);
            await pool.query(
                "INSERT INTO importador.usuarios (username, password, role) VALUES ($1, $2, 'admin')",
                ['admin', hashed]
            );
            res.json({ message: 'Admin configurado com sucesso. Use admin / admin123' });
        } else {
            res.json({ message: 'Admin já existe.' });
        }
    } catch (err) {
        console.error("Erro no setup:", err);
        res.status(500).json({ erro: 'Falha no setup.' });
    }
};

const changePassword = async (req, res) => {
    try {
        // userId vem do token JWT via middleware verifyToken
        const { currentPassword, newPassword } = req.body;
        const userId = req.userId;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ erro: 'Senha atual e nova senha são obrigatórias.' });
        }

        const { rows } = await pool.query('SELECT id, password FROM importador.usuarios WHERE id = $1', [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado.' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ erro: 'Senha atual incorreta.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashed = await bcrypt.hash(newPassword, salt);

        await pool.query('UPDATE importador.usuarios SET password = $1, must_change_password = FALSE WHERE id = $2', [hashed, userId]);

        res.json({ message: 'Senha alterada com sucesso.' });
    } catch (err) {
        console.error("Erro ao alterar senha:", err);
        res.status(500).json({ erro: 'Falha interna ao alterar senha.' });
    }
};

module.exports = {
    login,
    setupAdmin,
    changePassword
};
