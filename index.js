const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(express.json());

const TOKEN = process.env.TOKEN || "123456";

let pronto = false;
let conectado = false;

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './session'
  }),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-zygote',
      '--single-process'
    ]
  }
});


// 📲 QR CODE (CORRIGIDO)
client.on('qr', qr => {
  console.log('📲 Escaneie o QR abaixo:');
  qrcode.generate(qr, { small: true });
  pronto = false;
  conectado = false;
});


// ✅ CONECTADO
client.on('ready', () => {
  console.log('✅ WhatsApp conectado!');
  pronto = true;
  conectado = true;
});


// ❌ DESCONECTADO
client.on('disconnected', () => {
  console.log('❌ WhatsApp desconectado!');
  pronto = false;
  conectado = false;
});


// 📢 LOG DE GRUPO (pra pegar ID)
client.on('message', msg => {
  if (msg.from.includes('@g.us')) {
    console.log('📢 Grupo ID:', msg.from);
  }
});


client.initialize();


// 📩 ENVIO
app.post('/notify', async (req, res) => {

  if (req.headers.authorization !== TOKEN) {
    return res.status(401).send("Não autorizado");
  }

  if (!pronto) {
    return res.status(503).send("WhatsApp não está pronto");
  }

  const { destino, mensagem } = req.body;

  try {
    let chatId;

    if (destino.includes('@')) {
      chatId = destino;
    } else {
      chatId = destino + "@c.us";
    }

    await client.sendMessage(chatId, mensagem);

    res.send({ ok: true, enviado_para: chatId });

  } catch (err) {
    res.status(500).send({ erro: err.message });
  }
});


// 🌐 STATUS
app.get('/status', (req, res) => {
  res.json({
    status: pronto ? "online" : "starting",
    whatsapp: conectado ? "connected" : "disconnected",
    timestamp: new Date()
  });
});


app.listen(3000, () => {
  console.log('🚀 API rodando na porta 3000');
});