const { ready, query, run, get } = require('../database/sqlite'); // As variáveis constantes recebem os dados presentes no arquivo em requisição

// Variável que seleciona (através dos comandos seguintes) o pedido
const SELECT_PEDIDO = `
  SELECT
    p.*,
    c.nome     AS cliente_nome,
    c.telefone AS cliente_telefone
  FROM pedidos p
  LEFT JOIN clientes c ON c.id = p.cliente_id
`;

// Funçõa que formatará o pedido
function formatarPedido(row, itens = []) { // Recebe row e um array com os itens selecionados
  if (!row) return null;
  return {
    _id:           row.id,
    id:            row.id,
    numeroPedido:  row.numero_pedido,
    cliente: {
      _id:      row.cliente_id,
      id:       row.cliente_id,
      nome:     row.cliente_nome,
      telefone: row.cliente_telefone,
    },
    itens: itens.map(it => ({
      _id:           it.id,
      peca:         it.peca_id,
      nomePeca:     it.nome_peca,
      tamanho:       it.tamanho,
      quantidade:    it.quantidade,
      precoUnitario: it.preco_unitario,
      subtotal:      it.subtotal,
    })),
    subtotal:       row.subtotal,
    taxaEntrega:    row.taxa_entrega,
    total:          row.total,
    formaPagamento: row.forma_pagamento,
    troco:          row.troco,
    status:         row.status,
    observacoes:    row.observacoes,
    mesa:           row.mesa,
    origem:         row.origem,
    gestor:         row.gestor_id,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

const Pedido = { // Variável pedido recebe:

  async findAll({ gestorId } = {}) { // De forma assíncrona procura tudo dentro de gestorId
    await ready; // Espera estar pronto
    let rows;
    if (gestorId) { // Se for verdadeiro:
      rows = query(`${SELECT_PEDIDO} WHERE p.gestor_id = ? ORDER BY p.created_at DESC`, [gestorId]);
    } else {
      rows = query(`${SELECT_PEDIDO} ORDER BY p.created_at DESC`);
    }
    return rows.map(row => {
      const itens = query('SELECT * FROM itens_pedidos WHERE pedido_id = ?', [row.id]);
      return formatarPedido(row, itens);
    });
  },

  async findById(id) { // De forma assíncrona procura um pedido por id
    await ready;
    const row = get(`${SELECT_PEDIDO} WHERE p.id = ?`, [id]);
    if (!row) return null;
    const itens = query('SELECT * FROM itens_pedidos WHERE pedido_id = ?', [id]);
    return formatarPedido(row, itens);
  },

  // De forma assíncrona cria um novo pedido
  async create({ clienteId, itens, taxaEntrega = 0, formaPagamento, troco = 0, observacoes = '', mesa = null, origem = 'balcao', gestorId = null }) {
    await ready;

    const Peca = require('./Pecas');
    let subtotal = 0;
    const itensProcessados = [];

    for (const item of itens) {
      const peca = await Peca.findById(item.peca);
      if (!peca) throw new Error(`Peça ID ${item.peca} não encontrada`);

      const preco   = peca.precos[item.tamanho] || 0;
      const subItem = preco * item.quantidade;
      subtotal     += subItem;

      itensProcessados.push({
        pecaId:       peca.id,
        nomePeca:     peca.nome,
        tamanho:       item.tamanho,
        quantidade:    item.quantidade,
        precoUnitario: preco,
        subtotal:      subItem,
      });
    }

    const total        = subtotal + (taxaEntrega || 0);
    const contagem     = get('SELECT COUNT(*) as total FROM pedidos');
    const numeroPedido = (contagem?.total || 0) + 1;

    const infoPedido = run(`
      INSERT INTO pedidos
        (numero_pedido, cliente_id, subtotal, taxa_entrega, total,
         forma_pagamento, troco, observacoes, mesa, origem, garcom_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [numeroPedido, clienteId, subtotal, taxaEntrega || 0, total,
        formaPagamento, troco || 0, observacoes, mesa, origem, gestorId]);

    const pedidoId = infoPedido.lastInsertRowid;

    for (const it of itensProcessados) {
      run(`
        INSERT INTO itens_pedidos
          (pedido_id, peca_id, nome_peca, tamanho, quantidade, preco_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [pedidoId, it.pecaId, it.nomePeca, it.tamanho, it.quantidade, it.precoUnitario, it.subtotal]);
    }

    return this.findById(pedidoId);
  },

  async updateStatus(id, status) { // De forma assíncrona atualiza o status do pedido por id
    await ready;
    const info = run(
      "UPDATE pedidos SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [status, id]
    );
    return info.changes > 0 ? this.findById(id) : null;
  },

  async delete(id) { // De forma assíncrona deleta o pedido por id
    await ready;
    // Deleta itens primeiro (sem CASCADE no sql.js)
    run('DELETE FROM itens_pedidos WHERE pedido_id = ?', [id]);
    const info = run('DELETE FROM pedidos WHERE id = ?', [id]);
    return info.changes > 0;
  },
};

module.exports = Pedido; // Através de um módulo exporta a variável Pedido