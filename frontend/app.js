const API_BASE = window.location.origin;

const els = {
  busca: document.getElementById('busca'),
  filtroCategoria: document.getElementById('filtroCategoria'),
  listaItens: document.getElementById('listaItens'),
  listaCarrinho: document.getElementById('listaCarrinho'),
  totalGeral: document.getElementById('totalGeral'),
  formPedido: document.getElementById('formPedido'),
  nomeCliente: document.getElementById('nomeCliente'),
  observacoes: document.getElementById('observacoes'),
  msg: document.getElementById('msg')
};

let cardapio = [];
const carrinho = new Map();

function formatoBR(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function carregarCardapio() {
  const params = new URLSearchParams();
  const cat = els.filtroCategoria.value.trim();
  const q = els.busca.value.trim();
  if (cat) params.set('categoria', cat);
  if (q) params.set('q', q);

  const url = `${API_BASE}/cardapio${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Falha ao carregar cardápio');
  cardapio = await res.json();
  renderCardapio();
}

function renderCardapio() {
  els.listaItens.innerHTML = '';
  if (!cardapio.length) {
    els.listaItens.innerHTML = '<p>Nenhum item encontrado.</p>';
    return;
  }
  for (const item of cardapio) {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <div class="title">
        <strong>${item.nome}</strong>
        <span>${formatoBR(item.preco)}</span>
      </div>
      <span class="categoria">${item.categoria}</span>
      <button data-id="${item.id}">Adicionar</button>
    `;
    div.querySelector('button').addEventListener('click', () => adicionarAoCarrinho(item));
    els.listaItens.appendChild(div);
  }
}

function adicionarAoCarrinho(item) {
  const key = String(item.id);
  const atual = carrinho.get(key) || { id: key, nome: item.nome, precoUnit: item.preco, quantidade: 0 };
  atual.quantidade += 1;
  carrinho.set(key, atual);
  renderCarrinho();
}

function alterarQtd(id, delta) {
  const it = carrinho.get(String(id));
  if (!it) return;
  it.quantidade += delta;
  if (it.quantidade <= 0) carrinho.delete(String(id));
  renderCarrinho();
}

function renderCarrinho() {
  els.listaCarrinho.innerHTML = '';
  let total = 0;
  for (const it of carrinho.values()) {
    const subtotal = it.quantidade * it.precoUnit;
    total += subtotal;
    const row = document.createElement('div');
    row.className = 'linha';
    row.innerHTML = `
      <div>
        <strong>${it.nome}</strong><br/>
        <small>${it.quantidade} x ${formatoBR(it.precoUnit)} = <b>${formatoBR(subtotal)}</b></small>
      </div>
      <div class="qtd">${it.quantidade}</div>
      <button class="btn-qtd">–</button>
      <button class="btn-qtd">+</button>
    `;
    const [ , , btnMenos, btnMais] = row.children;
    btnMenos.addEventListener('click', () => alterarQtd(it.id, -1));
    btnMais.addEventListener('click', () => alterarQtd(it.id, +1));
    els.listaCarrinho.appendChild(row);
  }
  els.totalGeral.textContent = formatoBR(total);
}

async function enviarPedido(evt) {
  evt.preventDefault();
  els.msg.textContent = '';

  if (carrinho.size === 0) {
    els.msg.textContent = 'Adicione itens ao carrinho antes de enviar.';
    return;
  }

  const itens = Array.from(carrinho.values()).map(i => ({
    id: i.id,
    nome: i.nome,
    quantidade: i.quantidade,
    precoUnit: i.precoUnit
  }));

  const payload = {
    nomeCliente: els.nomeCliente.value.trim(),
    observacoes: els.observacoes.value.trim(),
    itens
  };

  try {
    const res = await fetch(`${API_BASE}/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha ao enviar pedido');

    els.msg.textContent = data.message || 'Pedido enviado com sucesso!';
    carrinho.clear();
    renderCarrinho();
    els.formPedido.reset();
  } catch (err) {
    els.msg.textContent = err.message || 'Erro inesperado. Tente novamente.';
  }
}

els.filtroCategoria.addEventListener('change', carregarCardapio);
els.busca.addEventListener('input', () => {
  clearTimeout(window.__t);
  window.__t = setTimeout(carregarCardapio, 250);
});
els.formPedido.addEventListener('submit', enviarPedido);

carregarCardapio().catch(() => {
  els.listaItens.innerHTML = '<p>Não foi possível carregar o cardápio. Tente recarregar a página.</p>';
});
