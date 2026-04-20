📲 WhatsApp API - Docker Compose

Este projeto permite subir uma API de WhatsApp via Docker, realizar autenticação via QR Code e enviar mensagens via HTTP.

🚀 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:

Docker
Docker Compose (ou plugin docker compose v2)

Verifique com:

docker --version
docker compose version
📦 Como subir o projeto

Na pasta raiz do projeto, execute:

docker-compose up -d --build

Ou (caso use Docker Compose v2):

docker compose up -d --build
📲 Primeiro uso (Autenticação WhatsApp)

Após subir o container, acompanhe os logs:

docker logs -f whatsapp-api

📌 Um QR Code será exibido no terminal.

👉 Escaneie com o WhatsApp (Configurações > Aparelhos conectados)

🔎 Verificando se está rodando

Após autenticar, a API estará disponível em:

http://localhost:3000
📤 Enviar mensagem via API

Exemplo usando curl:

curl --location 'http://localhost:3000/notify' \
--header 'Content-Type: application/json' \
--header 'Authorization: 123456' \
--data-raw '{
    "mensagem": "Teste Notificação",
    "destino": "120363425907857152@g.us"
}'
🧾 Parâmetros
Campo	Descrição
mensagem	Texto da mensagem a ser enviada
destino	ID do grupo ou número do WhatsApp
Authorization	Token de autenticação da API
🐳 Comandos úteis
Parar o container
docker-compose down
Ver logs em tempo real
docker logs -f whatsapp-api
Reiniciar serviço
docker-compose restart
