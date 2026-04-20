# WhatsApp API Docker 📲

API de notificações via WhatsApp utilizando Docker e Node.js.

## Pré-requisitos

- Docker
- Docker Compose
- Conta WhatsApp ativa

## Início Rápido

### 1. Subir o projeto

Execute o comando abaixo na pasta do projeto:

```bash
docker-compose up -d --build
```

Este comando:
- Constrói a imagem Docker
- Inicia o container em background
- Inicializa a aplicação

### 2. Ver os logs e escanear o QR Code

Após subir o projeto, visualize os logs para obter o QR code:

```bash
docker logs -f whatsapp-api
```

A saída será similar a:

```
📲 Escaneie o QR abaixo:
█████████████████████████████████████
█████████████████████████████████████
████ ▄▄▄▄▄ █▀▄▀▀█ ██▀█  █ ▄▄▄▄▄ ████
████ █   █ █▄  ▄█ ██ █  █ █   █ ████
████ █▄▄▄█ █ ▀ █▀  █ █▄██ █▄▄▄█ ████
████▄▄▄▄▄▄▄█ ▀ █ ▀ █▄▄ █ ▄▄▄▄▄▄▄████
█████████████████████████████████████
```

**Ação:** Abra o WhatsApp no seu celular e escaneie o QR code que aparecerá no terminal.

Após escanear, você verá a mensagem:
```
✅ WhatsApp conectado!
```

### 3. Testar a API

Após a conexão bem-sucedida, você pode enviar mensagens via API usando `curl`:

```bash
curl --location 'http://localhost:3000/notify' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: 123456' \
  --data-raw '{
    "mensagem": "Teste Notificação",
    "destino": "120363425907857152@g.us"
  }'
```

**Parâmetros:**
- `mensagem`: Texto da mensagem a enviar
- `destino`: ID do contato ou grupo no formato WhatsApp (`numero@c.us` para contato, `numero@g.us` para grupo)
- `Authorization`: Token de autenticação (padrão: `123456`)

## Endpoints

### POST `/notify`

Envia uma notificação via WhatsApp.

**Headers:**
```
Content-Type: application/json
Authorization: 123456
```

**Body:**
```json
{
  "mensagem": "Sua mensagem aqui",
  "destino": "120363425907857152@g.us"
}
```

**Resposta (sucesso):**
```json
{
  "status": "enviado",
  "mensagem": "Sua mensagem aqui"
}
```

## Variáveis de Ambiente

Você pode configurar as seguintes variáveis no arquivo `docker-compose.yml`:

- `TOKEN`: Token de autenticação da API (padrão: `123456`)

## Troubleshooting

### Problema: QR Code não aparece

**Solução:** Aguarde alguns segundos e execute novamente:
```bash
docker logs -f whatsapp-api
```

### Problema: "WhatsApp desconectado"

**Solução:** 
1. Verifique a conexão de internet
2. Reinicie o container:
```bash
docker-compose restart whatsapp-api
```

### Parar o projeto

Para parar e remover os containers:

```bash
docker-compose down
```

## Estrutura do Projeto

```
.
├── Dockerfile              # Configuração da imagem Docker
├── docker-compose.yml      # Orquestração dos containers
├── index.js               # Aplicação principal
├── package.json           # Dependências do Node.js
└── session/               # Dados de sessão (criado automaticamente)
```

## Dependências

- `express`: Framework web para Node.js
- `whatsapp-web.js`: Cliente WhatsApp Web
- `qrcode-terminal`: Gerador de QR code para terminal

## Notas Importantes

⚠️ **Segurança:** Não compartilhe seu token de autenticação. Em produção, altere o valor padrão da variável `TOKEN`.

⚠️ **Sessão:** Os dados da sessão são salvos na pasta `session/`. Não delete esta pasta durante o uso, ou será necessário escanear o QR code novamente.

⚠️ **Conta WhatsApp:** A conta utilizada para autenticação não poderá usar o WhatsApp Web em outro navegador simultaneamente.

## Licença

MIT
