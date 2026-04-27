const API = '/api';

let cpecas   = [];
let cClientes = [];

let TOKEN          = localStorage.getItem('pz_token') || '';
let USUARIO_LOGADO = JSON.parse(localStorage.getItem('pz_usuario') || 'null');
let setorEmFechamento = null;
//essas linhas a cima criam boa parte das variaveis


//esse inicio é sobre o login
async function fazerLogin() {
  const email = document.getElementById('l-email').value.trim();
  const senha = document.getElementById('l-senha').value;
  const btn   = document.getElementById('btn-login');
  const erro  = document.getElementById('login-erro');

  //valida senha
  if (!email || !senha) {
    erro.style.display = 'block';
    erro.textContent   = 'Preencha e-mail e senha.';
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Entrando...';
  erro.style.display = 'none';


  try {
    const res  = await fetch(API + '/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, senha }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Credenciais inválidas');

    TOKEN = data.token;
    USUARIO_LOGADO = data.usuario;
    localStorage.setItem('pz_token', TOKEN);
    localStorage.setItem('pz_usuario', JSON.stringify(data.usuario));

    aplicarPerfil(data.usuario);
    document.body.classList.add('logado');

  } catch (e) {
    erro.style.display = 'block';
    erro.textContent   = e.message;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Entrar';
  }
}


//limpa o status de armazenamento
function sair() {
  TOKEN = '';
  USUARIO_LOGADO = null;
  localStorage.removeItem('pz_token');
  localStorage.removeItem('pz_usuario');
  document.body.classList.remove('logado');
  document.getElementById('l-senha').value = '';
}

//ativa o usuario quando loga
if (TOKEN && USUARIO_LOGADO) {
  aplicarPerfil(USUARIO_LOGADO);
  document.body.classList.add('logado');
}

//adiicona uma classe para exebição

function toast(msg, tipo = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `show ${tipo}`;
  setTimeout(() => el.className = '', 3000);
}

//essas duas linhas adicionam ou removem itens do html, isso é usado para mudar a tela da pagina para a nova pagina do usuario
function abrir(id)  { document.getElementById(id).classList.add('open'); }
function fechar(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-bg').forEach(bg =>
  bg.addEventListener('click', e => { if (e.target === bg) bg.classList.remove('open'); })
);

function R$(v) {
  return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',');
}

//atualiza o status do pedido, dizendo se ja tão fazendo, entregando, etc
function badge(s) {
  const r = {
    recebido:     '📥 Recebido',
    em_preparo:   '⚙️ Fabricando',
    saiu_entrega: '🚚 Saiu p/ Entrega',
    entregue:     '✅ Entregue',
    cancelado:    '❌ Cancelado',
  };
  return `<span class="badge b-${s}">${r[s] || s}</span>`;
}

//para casos de erros
async function api(method, url, body) {
  const opts = {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };
  
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(API + url, opts);
  const data = await res.json();
  //caso de erro de conecção
  if (res.status === 401) { sair(); throw new Error('Sessão expirada'); }
  if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
  return data;
}

//permições ao tipo de perfil usuario
function aplicarPerfil(usuario) {
  document.getElementById('sb-nome').textContent   = usuario.nome;
  document.getElementById('sb-perfil').textContent = usuario.perfil;

  const perfil  = usuario.perfil;
  const isAdmin = perfil === 'Administrador';
  const isGar   = perfil === 'gestor';

  function show(id, visible, type = 'flex') {
    const el = document.getElementById(id);
    if (el) el.style.display = visible ? type : 'none';
  }

  function showEl(el, visible, type = 'flex') {
    if (el) el.style.display = visible ? type : 'none';
  }

  show('menu-usuarios',   isAdmin, 'block');
  show('btn-usuarios',    isAdmin, 'flex');
  show('sb-group-gestor', isGar,   'block');
  show('btn-nav-setores',   isGar,   'flex');

  showEl(document.querySelector('[onclick*="clientes"]'),  !isGar);
  showEl(document.querySelector('[onclick*="pedidos"]'),   !isGar);
  showEl(document.querySelector('[onclick*="dashboard"]'), !isGar);
  showEl(document.querySelector('.sb-group'), !isGar, 'block');

  const labelpecas = document.getElementById('nav-pecas-label');
  if (labelpecas) labelpecas.textContent = isGar ? 'menu' : 'pecas';

  const titulopecas = document.getElementById('pg-pecass-titulo');
  const subpecas    = document.getElementById('pg-pecas-sub');
  if (titulopecas) titulopecas.textContent = isGar ? 'menu' : 'pecas';
  if (subpecas  )    subpecas  .textContent    = isGar ? 'pecas disponíveis hoje' : 'Gerencie o cardápio';
  show('btn-nova-peca', !isGar, 'inline-flex');

  show('stat-fat', !isGar, 'block');
  show('stat-cli', !isGar, 'block');


  //setores livres ou não
  if (isGar) {
    ir('setores', document.getElementById('btn-nav-setores'));
  } else {
    ir('dashboard', document.querySelector('[onclick*="dashboard"]'));
  }
}

//exibe os pedidos em uma interface mais "bonita" para o usuario
async function carregarsetores(setorFiltro = null) {
  const grid = document.getElementById('grid-setores');
  grid.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';

  document.getElementById('setores-sub').textContent =
    `Olá, ${USUARIO_LOGADO?.nome}! Seus pedidos ativos.`;

  try {
    const url = `/pedidos?gestor=${USUARIO_LOGADO.id}`;
    const pedidos = await api('GET', url);

    const ativos = pedidos.filter(p => !['entregue','cancelado'].includes(p.status));

    document.getElementById('g-ped').textContent     = pedidos.length;
    document.getElementById('g-ped-sub').textContent = `${ativos.length} ativo(s)`;

    const setoresAtivas = new Set(ativos.map(p => p.setor).filter(Boolean));
    document.getElementById('g-setores').textContent   = setoresAtivas.size;
    document.getElementById('g-preparo').textContent = ativos.filter(p => p.status === 'em_preparo').length;
    document.getElementById('g-prontos').textContent = ativos.filter(p => p.status === 'saiu_entrega').length;

    const botoes = document.getElementById('setor-botoes');
    botoes.innerHTML = Array.from({length: 10}, (_, i) => {
      const n      = i + 1;
      const temPed = setoresAtivas.has(n);
      const ativo  = setorFiltro === n;
      return `
        <button class="btn btn-sm ${ativo ? 'btn-red' : temPed ? 'btn-green' : 'btn-ghost'}"
          onclick="carregarsetores(${n})"
          title="${temPed ? 'Setor com pedido ativo' : 'Setor livre'}">
          ${n}${temPed ? ' 🔴' : ''}
        </button>`;
    }).join('');
//fitra os pedidos
    const pedidosFiltrados = setorFiltro
      ? ativos.filter(p => p.setor === setorFiltro)
      : ativos;

      
    if (!pedidosFiltrados.length) {
      grid.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          <span class="ei">🚚</span>
          Nenhum pedido ativo no momento.<br>
          <button class="btn btn-red" style="margin-top:12px" onclick="abrirPedidosetor()">
            + Abrir primeiro pedido
          </button>
        </div>`;
      return;
    }
  
    //junta os pedidos os agrupando para cada setor

    const porsetor = {};
    pedidosFiltrados.forEach(p => {
      const key = p.setor || 'balcão';
      if (!porsetor[key]) porsetor[key] = [];
      porsetor[key].push(p);
    });
     //CRIA UM PAINEL DE PEDIDOS 
    grid.innerHTML = Object.entries(porsetor).map(([setor, peds]) => {
      const totalsetor  = peds.reduce((s, p) => s + (p.total || 0), 0);
      const todosItens = peds.flatMap(p => p.itens);
      const itensAgrup = {};
      todosItens.forEach(it => {
        const k = `${it.nomepecas} (${it.tamanho})`;
        itensAgrup[k] = (itensAgrup[k] || 0) + it.quantidade;
      });
      const statusAtual = peds[peds.length - 1]?.status;

      return `
        <div class="setor-card">
          <div class="setor-card-head">
            <div>
              <div class="setor-num">setor ${setor}</div>
              <div style="font-size:.72rem;color:var(--muted);margin-top:2px">
                ${peds.length} pedido(s) · ${peds[0]?.cliente?.nome || 'Sem cadastro'}
              </div>
            </div>
            ${badge(statusAtual)}
          </div>
          <div class="setor-card-body">
            ${Object.entries(itensAgrup).map(([nome, qtd]) => `
              <div class="setor-item">
                <strong>${qtd}x ${nome}</strong>
              </div>`).join('')}
            <div class="setor-total">
              <span style="color:var(--muted)">Total da setor</span>
              <span style="color:var(--gold)">${R$(totalsetor)}</span>
            </div>
          </div>
          <div class="setor-card-foot">
            <button class="btn btn-ghost btn-sm" style="flex:1"
              onclick="abrirPedidosetor(${setor})">
              + Item
            </button>
            <button class="btn btn-blue btn-sm"
              onclick="abrirStatus('${peds[peds.length-1]?._id}','${statusAtual}')">
              📝 Status
            </button>
            <button class="btn btn-green btn-sm"
              onclick="abrirFecharsetor(${setor}, ${totalsetor}, '${peds.map(p=>p._id).join(',')}')">
              ✅ Fechar
            </button>
          </div>
        </div>`;
    }).join('');

  } catch (e) {
    grid.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

//cria o pedido da setor
async function abrirPedidosetor(setorNum = null) {
  try {
    if (!cpecas.length)   cpecas   = await api('GET', '/pecas');
    if (!cClientes.length) cClientes = await api('GET', '/clientes');
  } catch (e) { toast('Erro ao carregar dados', 'err'); return; }

  document.getElementById('pm-cli').innerHTML =
    '<option value="">— Sem cadastro —</option>' +
    cClientes.map(c => `<option value="${c._id}">${c.nome} · ${c.telefone}</option>`).join('');

  document.getElementById('pm-setor').value = setorNum || '';
  document.getElementById('itens-setor-lista').innerHTML = '';
  document.getElementById('pm-obs').value  = '';
  document.getElementById('pm-sub').textContent = 'R$ 0,00';
  document.getElementById('pm-tot').textContent = 'R$ 0,00';

  addItemsetor();
  abrir('m-pedido-setor');
}

//organiza os pedidos em uma tabela
function addItemsetor() {
  const d = document.createElement('div');
  d.className = 'item-row';
  const opts = cpecas.filter(p => p.disponivel)
    .map(p => `<option value="${p._id}"
      data-p="${p.precos?.P||0}" data-m="${p.precos?.M||0}" data-g="${p.precos?.G||0}">
      ${p.nome}</option>`).join('');
  d.innerHTML = `
    <select class="ip" onchange="recalcsetor()"><option value="">Selecione...</option>${opts}</select>
    <select class="it" onchange="recalcsetor()">
      <option value="P">P</option><option value="M">M</option><option value="G" selected>G</option>
    </select>
    <input class="iq" type="number" value="1" min="1" oninput="recalcsetor()">
    <div class="is" style="font-size:.8rem;text-align:right;color:var(--muted)">R$ 0,00</div>
    <button class="btn-rm" onclick="this.parentElement.remove();recalcsetor()">×</button>`;
  document.getElementById('itens-setor-lista').appendChild(d);
}

//calcula a conta de cada setor, conforme a pessoa que está na setor vai pedindo vai sendo adicionado na conta da setor, e no final se torna possivel cobrar o valor sem tanta demora no caixa para calcular tudo pois será feito automaticamente pelo nosso sistema.
function recalcsetor() {
  let sub = 0;
  document.querySelectorAll('#itens-setor-lista .item-row').forEach(row => {
    const sel = row.querySelector('.ip');
    const tam = row.querySelector('.it').value.toLowerCase();
    const qtd = parseInt(row.querySelector('.iq').value) || 0;
    const pc  = parseFloat(sel.options[sel.selectedIndex]?.dataset?.[tam] || 0);
    const s   = pc * qtd; sub += s;
    row.querySelector('.is').textContent = R$(s);
  });
  document.getElementById('pm-sub').textContent = R$(sub);
  document.getElementById('pm-tot').textContent = R$(sub);
}

//verifica se está livre a setor para fazer o pedido
async function salvarPedidosetor() {
  const setor = parseInt(document.getElementById('pm-setor').value) || 0;
  if (!setor || setor < 1) { toast('Selecione a setor', 'err'); return; }

  const cliId = document.getElementById('pm-cli').value || null;
  const itens = []; let valido = true;
  document.querySelectorAll('#itens-setor-lista .item-row').forEach(row => {
    const pid = row.querySelector('.ip').value;
    if (!pid) { valido = false; return; }
    itens.push({
      pecas:      pid,
      tamanho:    row.querySelector('.it').value,
      quantidade: parseInt(row.querySelector('.iq').value) || 1,
    });
  });

  //pede para adcionar algum item essa programação
  if (!valido || !itens.length) { toast('Adicione ao menos um item', 'err'); return; }

  //verifica e organiza os clientes em tabelas
  let clienteId = cliId;
  if (!clienteId) {
    try {
      const todos = await api('GET', `/clientes?busca=setor ${setor}`);
      const existe = todos.find(c => c.nome === `setor ${setor}`);
      if (existe) {
        clienteId = existe._id;
      } else {
        const novo = await api('POST', '/clientes', { nome: `setor ${setor}`, telefone: 'setor' });
        clienteId = novo._id;
        cClientes = [];
      }
    } catch (e) { toast('Erro ao registrar setor', 'err'); return; }
  }

  //fala essa parte sobre o cliente fazer o pedido e seu status
  try {
    await api('POST', '/pedidos', {
      cliente:        clienteId,
      itens,
      taxaEntrega:    0,
      formaPagamento: 'pix',
      observacoes:    document.getElementById('pm-obs').value,
      setor,
      origem:         'setor',
      gestor:         USUARIO_LOGADO?.id,
    });
    toast(`Pedido lançado na setor ${setor}! 🛰️`);
    fechar('m-pedido-setor');
    carregarsetores();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

function abrirFecharsetor(setor, total, ids) {
  setorEmFechamento = { setor, total, ids: ids.split(',') };
  document.getElementById('fm-titulo').textContent = `Fechar setor ${setor}`;
  document.getElementById('fm-total').textContent  = R$(total);
  document.getElementById('fm-resumo').innerHTML   =
    `<p style="font-size:.82rem;color:var(--muted)">
      ${setorEmFechamento.ids.length} pedido(s) serão marcados como <strong style="color:var(--green)">Entregue</strong>.
    </p>`;
  abrir('m-fechar-setor');
}
 
//verifica a disponiblidade da setor
async function confirmarFechamento() {
  if (!setorEmFechamento) return;

  try {
    await Promise.all( 
      setorEmFechamento.ids.map(id =>
        api('PATCH', `/pedidos/${id}/status`, { status: 'entregue' })
      )
    );
    toast(`setor ${setorEmFechamento.setor} fechada! ✅`); //status da setor
    fechar('m-fechar-setor');
    setorEmFechamento = null;
    carregarsetores();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}
//envolve essa fuction a verificação de o usuario é administrador ou não , alem de dar permições e tirar dependendo do cargo
function ir(pg, btn) {
  const perfil = document.getElementById('sb-perfil').textContent;
  if (pg === 'usuarios' && perfil !== 'Administrador') {
    toast('Acesso restrito a Administradores', 'err'); return;
  }
  if (pg === 'setores' && perfil !== 'gestor') {
    toast('Área exclusiva para Garçom', 'err'); return;
  }
  if (perfil === 'gestor' && !['setores','pecas'].includes(pg)) {
    toast('Acesso não permitido para Garçom', 'err'); return;
  }
  document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('ativo'));
  document.getElementById('pg-' + pg).classList.add('ativa');
  if (btn) btn.classList.add('ativo');
  const loaders = {
    dashboard: carregarDashboard,
    pedidos:   carregarPedidos,
    pecas:    carregarpecas,
    clientes:  carregarClientes,
    usuarios:  carregarUsuarios,
    setores:     carregarsetores,
  };
  if (loaders[pg]) loaders[pg]();
}


// Essa função é responsável por utilizada para navegar entre seções com base no tipo de perfil 
async function carregarDashboard() {
  const h = new Date().getHours();
  const s = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  document.getElementById('dash-sub').textContent = `${s}! Aqui está o resumo.`;

  try {
    const [pecas, clientes, pedidos] = await Promise.all([
      api('GET', 'pecas'),
      api('GET', '/clientes'),
      api('GET', '/pedidos'),
    ]);

    cpecas   = pecas;
    cClientes = clientes;

    document.getElementById('s-piz').textContent = pecas.length;
    document.getElementById('s-cli').textContent = clientes.length;
    document.getElementById('s-ped').textContent = pedidos.length;
    document.getElementById('s-ent').textContent =
      pedidos.filter(p => p.status === 'saiu_entrega').length;
    document.getElementById('s-fat').textContent =
      R$(pedidos.reduce((acc, p) => acc + (p.total || 0), 0));

    const pend = pedidos.filter(p => !['entregue','cancelado'].includes(p.status)).length;
    document.getElementById('s-ped-sub').textContent = `${pend} pendente(s)`;

    const elP = document.getElementById('dash-pedidos');
    elP.innerHTML = pedidos.slice(0, 8).map(p => `
      <div class="mini-row">
        <div>
          <div class="mn">#${String(p.numeroPedido || '?').padStart(3,'0')} · ${p.cliente?.nome || '—'}</div>
          <div class="mc">${new Date(p.createdAt).toLocaleString('pt-BR')}</div>
        </div>
        <div style="text-align:right">
          ${badge(p.status)}<br>
          <small style="color:var(--muted)">${R$(p.total)}</small>
        </div>
      </div>`).join('') ||
      '<div class="empty"><span class="ei">📋</span>Nenhum pedido ainda</div>';

    const elC = document.getElementById('dash-cardapio');
    elC.innerHTML = pecas.filter(p => p.disponivel).slice(0, 8).map(p => `
      <div class="mini-row">
        <span>🛰️ ${p.nome}</span>
        <small style="color:var(--muted)">${R$(p.precos?.G)}</small>
      </div>`).join('') ||
      '<div class="empty"><span class="ei">⚙️</span>Nenhuma peca</div>';

  } catch (e) { toast('Erro dashboard: ' + e.message, 'err'); }
}


//--------------------------------------------------------------------------------
//é responsável por buscar uma lista de pecas de uma API e exibi-las dinamicamente em uma tabela HTML
async function carregarpecas() {
  const el = document.getElementById('tbl-pecas');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    cpecas = await api('GET', '/pecas');
    if (!cpecas.length) {
      el.innerHTML = '<div class="empty"><span class="ei">⚙️</span>Nenhuma peca</div>';
      return;
    }
    //innerHTML = essa propriedade permite ler ou alterar o conteudo de um elemento DOM
    el.innerHTML = ` 
      <table>
        <thead>
          <tr><th>Nome</th><th>Categoria</th><th>Ingredientes</th><th>P</th><th>M</th><th>G</th><th>Status</th><th>Ações</th>
        </thead>
        <tbody>
          ${cpecas.map(p => `
            <tr>
            
              <td><strong>${p.nome}</strong><br><small style="color:var(--muted)">${p.descricao || ''}</small></td>
              <td><span class="badge b-cat">${p.categoria || 'tradicional'}</span></td>
              <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.ingredientes}</td>
              <td>${R$(p.precos?.P)}</td>
              <td>${R$(p.precos?.M)}</td>
              <td><strong style="color:var(--gold)">${R$(p.precos?.G)}</strong></td>
              <td><span class="badge ${p.disponivel ? 'b-on' : 'b-off'}">${p.disponivel ? '✅ Disponível' : '❌ Off'}</span></td>
              <td><div style="display:flex;gap:5px"><button class="btn btn-ghost btn-sm" onclick="editarpeca('${p._id}')">✏️</button><button class="btn btn-danger btn-sm" onclick="deletarpeca('${p._id}','${p.nome}')">🗑️</button></div></td>
             </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}
// Strong = é um elemento semântico usado para indicar que um texto tem forte importância
//getElementById= vai atras de um elemento pelo id


//_____________________________________________________________________________
// essa fuction é responsavel por limpar os cadastros de pedidos de pecas, quando já entregue a pecas para liberar espaço
function abrirpeca() {
  document.getElementById('m-peca-t').textContent = 'Nova peca';
  ['p-id','p-nome','p-ing','p-desc','p-pp','p-pm','p-pg']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('p-cat').value  = 'tradicional';
  document.getElementById('p-disp').value = 'true';
  abrir('m-peca');
}

//_____________________________________________________________________________

//edita valores e coisas da peca

function editarpeca(id) {
  const p = cpecas.find(x => x._id === id);
  if (!p) return;
  document.getElementById('m-peca-t').textContent = 'Editar peca';
  document.getElementById('p-id').value   = p._id;
  document.getElementById('p-nome').value = p.nome;
  document.getElementById('p-ing').value  = p.ingredientes;
  document.getElementById('p-desc').value = p.descricao || '';
  document.getElementById('p-pp').value   = p.precos?.P || '';
  document.getElementById('p-cat').value  = p.categoria || 'tradicional';
  document.getElementById('p-disp').value = String(p.disponivel);
  abrir('m-peca');
}

//adiciona uma nova peca para o menu essa função aqui
async function salvarpeca() {
  const id   = document.getElementById('p-id').value;
  const nome = document.getElementById('p-nome').value.trim();
  const ing  = document.getElementById('p-ing').value.trim();
  if (!nome || !ing) { toast('Nome e ingredientes são obrigatórios', 'err'); return; }

  const d = {
    nome,
    ingredientes: ing,
    descricao:    document.getElementById('p-desc').value.trim(),
    precos: {
      P: parseFloat(document.getElementById('p-pp').value) || 0,
      M: parseFloat(document.getElementById('p-pm').value) || 0,
      G: parseFloat(document.getElementById('p-pg').value) || 0,
    },
    categoria:  document.getElementById('p-cat').value,
    disponivel: document.getElementById('p-disp').value === 'true',
  };

  try {
    id ? await api('PUT', '/pecas/' + id, d) : await api('POST', '/pecas', d);
    toast(id ? 'peca atualizada!' : 'peca criada!');
    fechar('m-peca');
    carregarpecas();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

//deleta uma pecas essa função
async function deletarpeca(id, nome) {
  if (!confirm(`Deletar "${nome}"?`)) return;
  try {
    await api('DELETE', '/pecas/' + id);
    toast('peca deletada!');
    carregarpecas();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

//essa função busca as informações sobre os clientes
async function carregarClientes(busca = '') {
  const el = document.getElementById('tbl-clientes');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const url = busca ? `/clientes?busca=${encodeURIComponent(busca)}` : '/clientes';
    cClientes = await api('GET', url);

    if (!cClientes.length) {
      el.innerHTML = '<div class="empty"><span class="ei">👥</span>Nenhum cliente</div>';
      return;
    }

    el.innerHTML = `
      <table>
        <thead><tr><th>Nome</th><th>Telefone</th><th>Endereço</th><th>Obs</th><th>Ações</th></tr></thead>
        <tbody>
          ${cClientes.map(c => `
            <tr>
              <td><strong>${c.nome}</strong></td>
              <td>${c.telefone}</td>
              <td style="font-size:.76rem;color:var(--muted)">${[c.endereco?.rua, c.endereco?.numero, c.endereco?.bairro, c.endereco?.cidade].filter(Boolean).join(', ') || '—'}</td>
              <td style="font-size:.76rem;color:var(--muted)">${c.observacoes || '—'}</td>
              <td><div style="display:flex;gap:5px"><button class="btn btn-ghost btn-sm" onclick="editarCliente('${c._id}')">✏️</button><button class="btn btn-danger btn-sm" onclick="deletarCliente('${c._id}','${c.nome}')">🗑️</button></div></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

//ese codigo serve para otimizar o desempenho de funções que são chamadas com muita frequência (que é o que mais tem nessa programação ksksks)
let _t;
function buscarCli(v) {
  clearTimeout(_t);
  _t = setTimeout(() => carregarClientes(v), 400);
}

//---------------------------------------------------
//cria e abre um novo cliente
function abrirCliente() {
  document.getElementById('m-cli-t').textContent = 'Novo Cliente';
  ['c-id','c-nome','c-tel','c-rua','c-num','c-bairro','c-cidade','c-cep','c-comp','c-obs']
    .forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  abrir('m-cliente');
}


//informações do cliente e editar ele
function editarCliente(id) {
  const c = cClientes.find(x => x._id === id);
  if (!c) return;
  document.getElementById('m-cli-t').textContent    = 'Editar Cliente';
  document.getElementById('c-id').value     = c._id;
  document.getElementById('c-nome').value   = c.nome;
  document.getElementById('c-tel').value    = c.telefone;
  document.getElementById('c-rua').value    = c.endereco?.rua || '';
  document.getElementById('c-num').value    = c.endereco?.numero || '';
  document.getElementById('c-bairro').value = c.endereco?.bairro || '';
  document.getElementById('c-cidade').value = c.endereco?.cidade || '';
  document.getElementById('c-cep').value    = c.endereco?.cep || '';
  document.getElementById('c-comp').value   = c.endereco?.complemento || '';
  document.getElementById('c-obs').value    = c.observacoes || '';
  abrir('m-cliente');
}

//essa função pode salvar alterações de um cliente ou criar contas de novos clientes.

async function salvarCliente() {
  const id   = document.getElementById('c-id').value;
  const nome = document.getElementById('c-nome').value.trim();
  const tel  = document.getElementById('c-tel').value.trim();
  if (!nome || !tel) { toast('Nome e telefone são obrigatórios', 'err'); return; }

  const d = {
    nome,
    telefone: tel,
    endereco: {
      rua:         document.getElementById('c-rua').value.trim(),
      numero:      document.getElementById('c-num').value.trim(),
      bairro:      document.getElementById('c-bairro').value.trim(),
      cidade:      document.getElementById('c-cidade').value.trim(),
      cep:         document.getElementById('c-cep').value.trim(),
      complemento: document.getElementById('c-comp').value.trim(),
    },
    observacoes: document.getElementById('c-obs').value.trim(),
  };

  try {
    id ? await api('PUT', '/clientes/' + id, d) : await api('POST', '/clientes', d);
    toast(id ? 'Cliente atualizado!' : 'Cliente cadastrado!');
    fechar('m-cliente');
    carregarClientes();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

//----------------------------------------
//deleta o cliente
async function deletarCliente(id, nome) {
  if (!confirm(`Deletar "${nome}"?`)) return;
  try {
    await api('DELETE', '/clientes/' + id);
    toast('Cliente deletado!');
    carregarClientes();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}


//ajuda na administração de pedidos e suas entregas
async function carregarPedidos() {
  const el = document.getElementById('tbl-pedidos');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const pedidos = await api('GET', '/pedidos');
    if (!pedidos.length) {
      el.innerHTML = '<div class="empty"><span class="ei">📋</span>Nenhum pedido</div>';
      return;
    }
    el.innerHTML = `
      <table>
        <thead>
          <tr><th>#</th><th>Cliente</th><th>Itens</th><th>Subtotal</th><th>Entrega</th><th>Total</th><th>Pagamento</th><th>Status</th><th>Data</th><th>Ações</th>
        </thead>
        <tbody>
          ${pedidos.map(p => `
            <tr>
              <td><strong style="color:var(--red)">#${String(p.numeroPedido||'?').padStart(3,'0')}</strong></td>
              <td><strong>${p.cliente?.nome || '—'}</strong><br><small style="color:var(--muted)">${p.cliente?.telefone || ''}</small></td>
              <td style="font-size:.76rem">${p.itens.map(it => `${it.quantidade}x ${it.nomepeca || '?'} (${it.tamanho})`).join('<br>')}</td>
              <td>${R$(p.subtotal)}</td><td>${R$(p.taxaEntrega)}</td>
              <td><strong style="color:var(--gold)">${R$(p.total)}</strong></td>
              <td style="font-size:.76rem">${(p.formaPagamento || '—').replace('_', ' ')}</td>
              <td>${badge(p.status)}</td>
              <td style="font-size:.7rem;color:var(--muted)">${new Date(p.createdAt).toLocaleString('pt-BR')}</td>
              <td><div style="display:flex;gap:5px"><button class="btn btn-blue btn-sm" onclick="abrirStatus('${p._id}','${p.status}')">📝</button><button class="btn btn-danger btn-sm" onclick="deletarPedido('${p._id}')">🗑️</button></div></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}

//abre o pedido para fazer a compra
async function abrirPedido() {
  try {
    if (!cpecas.length)   cpecas   = await api('GET', '/pecas');
    if (!cClientes.length) cClientes = await api('GET', '/clientes');
  } catch (e) { toast('Erro ao carregar dados', 'err'); return; }

  document.getElementById('ped-cli').innerHTML =
    '<option value="">— Selecione o cliente —</option>' +
    cClientes.map(c => `<option value="${c._id}">${c.nome} · ${c.telefone}</option>`).join('');

  document.getElementById('itens-lista').innerHTML = '';
  document.getElementById('ped-taxa').value  = '0';
  document.getElementById('ped-obs').value   = '';
  document.getElementById('ped-pag').value   = 'pix';
  document.getElementById('ped-sub').textContent = 'R$ 0,00';
  document.getElementById('ped-tot').textContent = 'R$ 0,00';
  document.getElementById('wrap-troco').style.display = 'none';

  addItem();
  abrir('m-pedido');
}

//isso adiciona os itens a compra
function addItem() {
  const d = document.createElement('div');
  d.className = 'item-row';
  const opts = cpecas
    .filter(p => p.disponivel)
    .map(p => `<option value="${p._id}" data-p="${p.precos?.P || 0}" data-m="${p.precos?.M || 0}" data-g="${p.precos?.G || 0}">${p.nome}</option>`).join('');

  d.innerHTML = `
    <select class="ip" onchange="recalc()"><option value="">Selecione...</option>${opts}</select>
    <select class="it" onchange="recalc()"><option value="P">P</option><option value="M">M</option><option value="G" selected>G</option></select>
    <input class="iq" type="number" value="1" min="1" oninput="recalc()">
    <div class="is" style="font-size:.8rem;text-align:right;color:var(--muted)">R$ 0,00</div>
    <button class="btn-rm" onclick="this.parentElement.remove(); recalc()">×</button>`;

  document.getElementById('itens-lista').appendChild(d);
}
//--------------------------------------------------------------------------

//calcula o subtotal e o total de um pedido online, desde o pedido até a taixa de entrega

function recalc() {
  let sub = 0;
  document.querySelectorAll('#itens-lista .item-row').forEach(row => {
    const sel = row.querySelector('.ip');
    const tam = row.querySelector('.it').value.toLowerCase();
    const qtd = parseInt(row.querySelector('.iq').value) || 0;
    const opt = sel.options[sel.selectedIndex];
    const pc  = parseFloat(opt?.dataset?.[tam] || 0);
    const s   = pc * qtd;
    sub += s;
    row.querySelector('.is').textContent = R$(s);
  });

  const taxa = parseFloat(document.getElementById('ped-taxa').value) || 0;
  document.getElementById('ped-sub').textContent = R$(sub);
  document.getElementById('ped-tot').textContent = R$(sub + taxa);
}

//--------------------------------------------------------------------------
//esse cdogo exibe ou oculta um campo de troco baseado na forma de pagamento selecionada pelo usuário. 
function toggleTroco() {
  const pag = document.getElementById('ped-pag').value;
  document.getElementById('wrap-troco').style.display =
    pag === 'dinheiro' ? 'block' : 'none';
}

//esse codigo guarda os dados do pedido, como qual sabor, tamanho e quantidade
async function salvarPedido() {
  const cliId = document.getElementById('ped-cli').value;
  if (!cliId) { toast('Selecione um cliente', 'err'); return; }

  const itens = [];
  let valido = true;
  document.querySelectorAll('#itens-lista .item-row').forEach(row => {
    const pid = row.querySelector('.ip').value;
    if (!pid) { valido = false; return; }
    itens.push({
      peca:      pid,
      tamanho:    row.querySelector('.it').value,
      quantidade: parseInt(row.querySelector('.iq').value) || 1,
    });
  });

  if (!valido || !itens.length) {
    toast('Adicione ao menos um item válido', 'err'); return;
  }

  try {
    await api('POST', '/pedidos', {
      cliente:        cliId,
      itens,
      taxaEntrega:    parseFloat(document.getElementById('ped-taxa').value) || 0,
      formaPagamento: document.getElementById('ped-pag').value,
      troco:          parseFloat(document.getElementById('ped-troco')?.value) || 0,
      observacoes:    document.getElementById('ped-obs').value,
    });
    toast('Pedido criado! 🛰️');
    fechar('m-pedido');
    carregarPedidos();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}


//exibe o status abrindo uma interface de visualização e tal
function abrirStatus(id, status) {
  document.getElementById('st-id').value  = id;
  document.getElementById('st-val').value = status;
  abrir('m-status');
}


//salva o pedido
async function salvarStatus() {
  const id     = document.getElementById('st-id').value;
  const status = document.getElementById('st-val').value;
  try {
    await api('PATCH', '/pedidos/' + id + '/status', { status });
    toast('Status atualizado!');
    fechar('m-status');
    carregarPedidos();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}


//apaga o pedido
async function deletarPedido(id) {
  if (!confirm('Deletar este pedido?')) return;
  try {
    await api('DELETE', '/pedidos/' + id);
    toast('Pedido deletado!');
    carregarPedidos();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}


// procura o usuario entre os já registrados e os exibe em uma tabela
async function carregarUsuarios() {
  const el = document.getElementById('tbl-usuarios');
  el.innerHTML = '<div class="spin-wrap"><div class="spin"></div> Carregando...</div>';
  try {
    const us = await api('GET', '/usuarios');

    if (!us.length) {
      el.innerHTML = '<div class="empty"><span class="ei">🔐</span>Nenhum usuário</div>'; //caso encontre o usuario
      return;
    }
    el.innerHTML = `
      <table>
        <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Criado em</th><th>Ações</th></tr></thead>
        <tbody>
          ${us.map(u => `
            <tr>
              <td><strong>${u.nome}</strong></td>
              <td>${u.email}</td>
              <td><span class="badge ${u.perfil === 'Administrador' ? 'b-admin' : 'b-atend'}">${u.perfil}</span></td>
              <td><span class="badge ${u.ativo ? 'b-on' : 'b-off'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
              <td style="font-size:.73rem;color:var(--muted)">${new Date(u.createdAt).toLocaleDateString('pt-BR')}</td>
              <td><button class="btn btn-danger btn-sm" onclick="deletarUsuario('${u._id}','${u.nome}')">🗑️</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    el.innerHTML = `<div class="empty" style="color:var(--red)">${e.message}</div>`;
  }
}
//ativa o perfil ao ele entrar no site / ser conectado
function abrirUsuario() {
  ['u-nome','u-email','u-senha'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('u-perfil').value = 'Atendente';
  abrir('m-usuario');
}

//adiciona um usuario e mantem salvo para a pessoa mais tarde poder acessar o site

async function salvarUsuario() {
  const nome  = document.getElementById('u-nome').value.trim();
  const email = document.getElementById('u-email').value.trim();
  const senha = document.getElementById('u-senha').value;
  if (!nome || !email || !senha) { toast('Preencha todos os campos', 'err'); return; }

  try {
    await api('POST', '/usuarios', {
      nome, email, senha,
      perfil: document.getElementById('u-perfil').value,
    });
    toast('Usuário criado!');
    fechar('m-usuario');
    carregarUsuarios();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

//deleta usuario
async function deletarUsuario(id, nome) {
  if (!confirm(`Deletar "${nome}"?`)) return;
  try {
    await api('DELETE', '/usuarios/' + id);
    toast('Usuário deletado!');
    carregarUsuarios();
  } catch (e) { toast('Erro: ' + e.message, 'err'); }
}

//os comentarios a cima foram digitados pelas nossas mãos esqueleticas de programador, prof :)


//Index.js inicializa o servidor e conexção com banco de dados e trata os erros
//script.js tambem conhecido como front endo comunica com a api e manipula o DOM
//Auth.js verifica o token, simplifica a implementação de login com provedores sociais
//os Models gerenciam a estrutura, persistência e regras de negócio dos dados
//routes definem caminhos, organiza aplicações e recebe parâmetros capturando URL para realizar certas operções
//.env guarda variaveis globais
//peca.bd é o banco de dados do programa da nossa empresa.
//package.json e package-lock.json nós importamos para nosso é um arquivo fundamental em projetos JavaScript/Node.js que funciona como a "certidão de nascimento" e painel de configuração do projeto
