# FairPlace

Marketplace local do FairPlace.

## Stack

- Next.js + TypeScript
- Tailwind CSS
- Neon PostgreSQL + Prisma
- Leaflet + OpenStreetMap
- Auth.js/NextAuth

## Estrutura

```text
src/
  app/                 Rotas, layouts e API routes do Next.js
  components/          Componentes compartilhados de interface
  features/            Módulos por domínio (auth, anúncios, mapa e usuários)
  lib/                 Integrações e utilitários compartilhados
  server/              Actions e queries executadas no servidor
  types/               Tipos compartilhados
prisma/                Schema e migrações do banco
public/                Arquivos públicos da aplicação
docs/                  Documentação existente do projeto
images/                Imagens existentes do projeto
```

## Desenvolvimento

1. Copie `.env.example` para `.env` e ajuste `DATABASE_URL`.
2. Instale as dependências com `npm install`.
3. Gere o cliente Prisma com `npm run db:generate`.
4. Inicie o projeto com `npm run dev`.
