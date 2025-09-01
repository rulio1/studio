# Zispr 🐦

Bem-vindo ao Zispr, uma moderna plataforma de mídia social construída com Next.js e uma arquitetura de back-end híbrida e poderosa. Este repositório contém o código-fonte de um aplicativo web completo, demonstrando a criação de uma experiência social interativa e em tempo real.

## ✨ Funcionalidades

- **Autenticação de Usuários**: Sistema de cadastro e login seguro com e-mail e senha.
- **Feed em Tempo Real**: Veja posts de outros usuários e de quem você segue.
- **Perfis de Usuário**: Perfis personalizáveis com avatar, banner, bio e informações de contato.
- **Sistema de Seguir**: Siga e deixe de seguir outros usuários para personalizar seu feed.
- **Interações em Posts**: Curta, comente e republique posts.
- **Comunidades**: Crie e participe de comunidades baseadas em tópicos de interesse.
- **Mensagens Diretas**: Converse em tempo real com outros usuários.
- **Busca Inteligente**: Encontre usuários e posts por nome, @handle ou #hashtag.
- **Notificações**: Receba notificações sobre curtidas, novos seguidores, menções e mais.
- **Integração com IA (Genkit)**:
  - **Zispr AI**: Um assistente de IA para conversar e tirar dúvidas.
  - **Geração de Posts e Imagens**: Crie conteúdo para posts e imagens usando IA.

## 🛠️ Tecnologias Utilizadas

- **Framework**: [Next.js](https://nextjs.org/) (com App Router)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/)
- **Componentes UI**: [Shadcn/ui](https://ui.shadcn.com/)
- **Inteligência Artificial**: [Genkit](https://firebase.google.com/docs/genkit)
- **Formulários**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

### Arquitetura de Back-end

O Zispr utiliza uma abordagem de back-end híbrida para otimizar desempenho, escalabilidade e flexibilidade:

- **Firebase**: Utilizado para **autenticação de usuários**, envio de **notificações push** (via Firebase Cloud Messaging) e funcionalidades em **tempo real** (como contadores e status de presença).
- **Supabase (PostgreSQL)**: Atua como nosso banco de dados relacional principal. É responsável por gerenciar **perfis de usuário**, o **grafo social** (seguidores/seguindo) e a estrutura principal das postagens.
- **MongoDB**: Usado como um banco de dados flexível para armazenar o **conteúdo** gerado pelos usuários, como o texto dos posts, comentários, enquetes e outros tipos de mídia que podem evoluir com o tempo.

## 🚀 Como Executar Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/rulio1/zispr-app.git
   cd zispr-app
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   - Renomeie o arquivo `.env.local.example` para `.env.local`.
   - Preencha com as chaves dos seus projetos Firebase, Supabase e MongoDB.

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para ver o resultado.
