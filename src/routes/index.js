// Requisições inseridas nas variáveis
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const auth = require('../middlewares/auth');

// Variáveis que vão receber os caminhos para os respectivos arquivos
const Usuario = require('../models/Usuario');
const Pecas = require('../models/Pecas');
const Cliente = require('../models/Cliente');
const Pedido = require('../models/Pedido');


router.post('/auth/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha são obrigatórios'});

        const usuario = await Usuario.findByEmail(email);
        if (!usuario) return res.status(401).json({ erro: 'Credenciais inválidas'});

        const ok = await Usuario.verificarSenha(senha, usuario.senha);
        if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas'})

        const token = jwt.sign( 
            { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
            process.env.JWT_SECRET,
            {expiresIn: '8h'}
        );

        res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil}});
    } catch (e) { res.status(500).json({ erro: e.message}); }
});

router.get('/pecas', auth, async (req, res))