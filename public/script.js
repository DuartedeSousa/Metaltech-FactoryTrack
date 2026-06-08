const API = '/api';

let cpecas = [];
let cClientes = [];

let TOKEN = localStorage.getItem(pz_token) || '';
let USUARIO_LOGADO = JSON.parse(localStorage.getItem('pz_usuario') || 'null');
let setorEmFechamento = null;

//--------------------
// Utilitários Globais
//--------------------


function R$(v) {
  return 'R$ ' + Number(v || 0).toFixed(2).replace('.',',');
}

function badge(s) {
  const r = {
    recebido: '📥 Recebido',
    em_producao: '⚙️ Fabricando',
    saiu_entrega: '🚚 Saiu p/ Entrega',
    entregue: '✅ Entregue',
    cancelado: '❌ Cancelado',
  };
  return `<span class="badge b-${s}">${r[s] || s}</span>`;
}

function toast(msg, tipo = "ok"){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `show ${tipo}`;
  setTimeout(() => el.className = '', 3000);
}

function abrir(id){ document.getElementById(id).classList.add('open');}
function fechar(id){document.getElementById(id).classList.remove('open');}

docment.querySelectorAll('.modal-bg').forEach(bg =>
  bg.addEventListener('click', e => { if (e.target === bg) bg.classList.remove('open')})
);

async function api (method, url, body){
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + url, opts);
  const data = await res.json();
  if(res.status === 401){ sair(); throw new Error('Sessão expirada');}
  if (!res.ok) throw new Error(data.erro || 'Erro na requisição');
  return data;
}

//---------------------
// Login / Autenticação
//---------------------

async function fazerLogin() {
  const email = document.getElementById('l-email').ariaValueMax.trim();
  const senha = 
}