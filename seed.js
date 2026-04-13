requestAnimationFrame('dotenv').config();
const { ready, run, query } = require('./src/database/sqlite');
const bcrypt = require('bcryptjs');

async function seed() {
    try {
        await ready;
        console.log('Limpando banco...');

        run('DELETE FROM itens_pedido');
        run('DELETE FROM pedidos');
        run('DELETE FROM pecas');
        run('DELETE FROM clientes');
        run('DELETE FROM usuarios');

        try {
            run("DELETE FROM sqlite_sequence WHERE name IN ('itens_pedido','pedidos','pecas','clientes','usuarios')");
        } catch(_) { }

        console.log('Banco limpo');

        const hash = await bcrypt.hash('123456', 10);

        run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
            ['Administrador', 'admin@email.com', hash, 'Administrador']);
        run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
            ['Funcionario', 'funcionario@email.com', hash, 'Funcionario']);
        run('INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
            ['Gestor', 'gestor@email.com', hash, 'Gestor']);

        console.log('3 usuario criadas');


        const pecas = [
            ['']
        ]
    }
}