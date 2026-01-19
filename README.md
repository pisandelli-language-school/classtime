# ClassTime

![ClassTime Logo](public/logo.svg)

> Sistema de Gestão de Horas, Contratos e Pagamentos para Escolas de Idiomas.

O **ClassTime** é uma plataforma full-stack moderna desenvolvida para otimizar o fluxo operacional entre Professores, Gerentes e Financeiro. Ele substitui planilhas manuais por um fluxo digital de aprovação de horas e geração automática de faturas.

## 🚀 Tech Stack

- **Framework**: [Nuxt 4](https://nuxt.com) (Vue 3)
- **Runtime**: [Bun](https://bun.sh)
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Auth**: Supabase Auth
- **UI**: Nuxt UI (TailwindCSS)
- **Testing**: Vitest + @nuxt/test-utils

## 🛠️ Configuração do Ambiente

### Pré-requisitos
- [Bun](https://bun.sh) instalado (v1.0+)
- Conta no Supabase

### Instalação

1.  **Clone o repositório**:
    ```bash
    git clone https://github.com/seu-org/classtime.git
    cd classtime
    ```

2.  **Instale as dependências**:
    ```bash
    bun install
    ```

3.  **Configuração de Variáveis de Ambiente**:
    Crie um arquivo `.env` na raiz:
    ```bash
    DATABASE_URL="postgres://..."
    DIRECT_URL="postgres://..."
    SUPABASE_URL="https://..."
    SUPABASE_KEY="anon-key"
    SUPABASE_SERVICE_KEY="service-role-key" # Para scripts administrativos
    GOOGLE_WORKSPACE_DOMAIN="suaescola.com.br"
    ```

4.  **Prepare o Banco de Dados**:
    ```bash
    bun x prisma migrate dev
    bun x prisma db seed # Opcional: Popular com dados de teste
    ```

5.  **Rode o servidor de desenvolvimento**:
    ```bash
    bun run dev
    ```

## 🧪 Testes

O projeto utiliza **Vitest** para testes unitários e de integração.

- **Rodar todos os teste**:
  ```bash
  bun run test
  ```
- **Rodar com relatório detalhado**:
  ```bash
  bun run test --reporter=verbose
  ```

## 📚 Documentação (Help System)

O sistema possui uma central de ajuda integrada, construída com **Nuxt Content**.
Acesse `/help` após iniciar a aplicação para ler os guias de uso para Professores e Gerentes.

## 🏗️ Arquitetura

- `server/api`: Endpoints da API (H3 handlers).
- `prisma/schema.prisma`: Definição do banco de dados.
- `app/pages`: Rotas do Nuxt (Frontend).
- `content/help`: Arquivos Markdown da documentação.

---
Desenvolvido com 💙 pela equipe de Engenharia.
