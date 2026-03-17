# LabFinance Full Stack

Esta versão pega o seu `index.html` original e adiciona persistência compartilhada com **Node.js + Express + PostgreSQL**.

## O que mudou

- o frontend continua praticamente igual ao seu original
- o hook `useLS` passou a buscar/salvar em `/api/store/:key` quando o app roda no servidor
- se abrir o HTML solto ou no GitHub Pages, ele ainda consegue cair no `localStorage`
- quando publicado com o backend, todos passam a usar os mesmos dados do banco

## Estrutura

- `public/index.html` → seu frontend adaptado
- `server/server.js` → API e entrega do frontend
- `server/db.js` → conexão com Postgres
- `schema.sql` → tabela do banco
- `.env.example` → variáveis de ambiente
- `render.yaml` → deploy mais fácil no Render

## Rodar localmente

1. Instale Node 20+ e PostgreSQL.
2. Crie um banco chamado `labfinance`.
3. Copie `.env.example` para `.env` e ajuste a `DATABASE_URL`.
4. Rode o SQL de `schema.sql`.
5. Execute:

```bash
npm install
npm start
```

Abra `http://localhost:3000`.

## Deploy no Render

1. Suba esta pasta para um repositório GitHub.
2. No Render, crie um novo Blueprint usando o `render.yaml`.
3. Aguarde a criação do banco e do serviço web.
4. Abra a URL gerada.

## Como os dados ficam salvos

O app grava 4 chaves no banco:

- `lf_projects`
- `lf_items`
- `lf_types`
- `lf_rubricas`

Elas guardam exatamente a mesma estrutura que você já tinha no navegador.

## Limitação atual

Esta entrega deixa o site **de pé e compartilhado**, mas ainda usa um modelo simples de armazenamento por chave JSON. Funciona bem para o seu estágio atual e evita reescrever toda a interface agora.

Se depois você quiser, a próxima evolução é migrar disso para tabelas reais (`projects`, `items`, `types`, `rubricas`, `users`).
