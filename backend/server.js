import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = __dirname;
const CARDAPIO_PATH = path.join(DATA_DIR, 'cardapio.json');
const PEDIDOS_PATH = path.join(DATA_DIR, 'pedidos.json');


const app = express();
app.use(cors());
app.use(express.json());


async function readJson(file) {
const raw = await fs.readFile(file, 'utf-8');
return JSON.parse(raw);
}


async function writeJson(file, data) {
const tmp = file + '.tmp';
await fs.writeFile(tmp, JSON.stringify(data, null, 2));
await fs.rename(tmp, file);
}


app.get('/cardapio', async (req, res) => {
try {
const { categoria, q } = req.query;
let itens = await readJson(CARDAPIO_PATH);
if (categoria) {
itens = itens.filter(i => i.categoria.toLowerCase() === String(categoria).toLowerCase());
}
if (q) {
const term = String(q).toLowerCase();
itens = itens.filter(i => i.nome.toLowerCase().includes(term));
}
res.json(itens);
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Erro ao carregar o cardápio.' });
}
});


app.post('/pedidos', async (req, res) => {
try {
const { nomeCliente, observacoes, itens } = req.body;


if (!nomeCliente || !Array.isArray(itens) || itens.length === 0) {
return res.status(400).json({ error: 'Dados inválidos: informe nomeCliente e ao menos 1 item.' });
}


const cardapio = await readJson(CARDAPIO_PATH);
const precoPorId = new Map(cardapio.map(i => [String(i.id), Number(i.preco)]));


const itensNormalizados = itens.map(i => ({
id: String(i.id),
nome: String(i.nome),
quantidade: Number(i.quantidade) || 1,
precoUnit: (precoPorId.get(String(i.id)) ?? Number(i.precoUnit)) || 0
}));


const total = itensNormalizados.reduce((acc, i) => acc + i.quantidade * i.precoUnit, 0);


const novoPedido = {
id: 'P' + Date.now(),
dataISO: new Date().toISOString(),
nomeCliente: String(nomeCliente),
observacoes: String(observacoes || ''),
itens: itensNormalizados,
total
};


const pedidos = await readJson(PEDIDOS_PATH).catch(async (e) => {
if (e.code === 'ENOENT') return [];
throw e;
});


pedidos.push(novoPedido);
await writeJson(PEDIDOS_PATH, pedidos);


res.status(201).json({ message: 'Pedido recebido com sucesso!', pedido: novoPedido });
} catch (err) {
console.error(err);
res.status(500).json({ error: 'Erro ao salvar o pedido.' });
}
});


app.get('/pedidos', async (req, res) => {
try {
const data = await readJson(PEDIDOS_PATH).catch(() => []);
res.json(data);
} catch (err) {
res.status(500).json({ error: 'Erro ao carregar pedidos.' });
}
});


app.use('/', express.static(path.join(__dirname, '../frontend')));


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Backend rodando em http://localhost:${PORT}`));