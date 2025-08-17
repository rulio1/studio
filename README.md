# Chirp 🐦

Bem-vindo ao Chirp, uma moderna plataforma de mídia social construída com Next.js e Firebase. Este repositório contém o código-fonte de um aplicativo web completo, demonstrando a criação de uma experiência social interativa e em tempo real.

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
  - **Chirp AI**: Um assistente de IA para conversar e tirar dúvidas.
  - **Geração de Posts e Imagens**: Crie conteúdo para posts e imagens usando IA.

## 🛠️ Tecnologias Utilizadas

- **Framework**: [Next.js](https://nextjs.org/) (com App Router)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
- **Backend e Banco de Dados**: [Firebase](https://firebase.google.com/) (Firestore, Authentication, Storage)
- **Estilização**: [Tailwind CSS](https://tailwindcss.com/)
- **Componentes UI**: [Shadcn/ui](https://ui.shadcn.com/)
- **Inteligência Artificial**: [Genkit](https://firebase.google.com/docs/genkit)
- **Formulários**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)

## 🚀 Como Executar Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/rulio1/chirp-app.git
   cd chirp-app
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   - Renomeie o arquivo `.env.local.example` para `.env.local`.
   - Preencha com as chaves do seu projeto Firebase.

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para ver o resultado.
