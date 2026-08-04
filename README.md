# getmoving

Site do desafio Movimenta: 8 pontos por dia entre treino, cardio, refeição saudável e água.
Login por e-mail com senha forte, Google e Apple. Ranking, histórico e fotos de comprovação.

React + Vite no navegador, Supabase no servidor (autenticação, banco e armazenamento de fotos).

---

## O que você vai precisar

| Item | Custo | Obrigatório? |
|---|---|---|
| Conta no Supabase | grátis | sim |
| Conta na Vercel (ou Netlify) | grátis | sim |
| Conta no GitHub | grátis | sim |
| Google Cloud Console | grátis | só para o botão do Google |
| Apple Developer Program | **US$ 99 por ano** | só para o botão da Apple |

O botão da Apple é o único item pago do projeto. Se ainda não fizer sentido gastar isso,
suba o site só com e-mail e Google — o código já está pronto para os dois, e você liga a Apple
depois sem mexer em nada.

---

## 1. Criar o projeto no Supabase

1. Entre em supabase.com, crie um projeto e escolha a região **South America (São Paulo)**.
2. Guarde a senha do banco que ele pedir.
3. Abra **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql` e rode.
   Isso cria as tabelas, as regras de pontuação no servidor e o bucket das fotos.
4. Em **Project Settings > API**, copie a *Project URL* e a chave *anon public*.

Crie o arquivo `.env` na raiz do projeto:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

A chave *anon* pode ficar no navegador — é ela que o site usa. A chave *service_role* **nunca**
deve aparecer no código nem no `.env` do front.

---

## 2. Ajustar as regras de senha

Em **Authentication > Providers > Email**:

- Ative *Confirm email* (a pessoa só entra depois de clicar no link).
- Em *Minimum password length*, coloque **10**.
- Se aparecer a opção *Password requirements*, escolha a que exige letras, números e símbolos.
- Ative *Leaked password protection* (o Supabase compara com bases de senhas vazadas).

O site já valida os quatro critérios na tela, mas essa configuração garante que ninguém burle
chamando a API direto.

---

## 3. Ligar o Google

1. Em console.cloud.google.com, crie um projeto.
2. **APIs & Services > OAuth consent screen**: tipo *External*, preencha nome e e-mail de suporte.
3. **Credentials > Create credentials > OAuth client ID**, tipo *Web application*.
4. Em *Authorized redirect URIs*, cole a URL de callback que aparece no Supabase em
   **Authentication > Providers > Google** (algo como `https://xxxx.supabase.co/auth/v1/callback`).
5. Copie o *Client ID* e o *Client Secret* de volta para o Supabase e salve.

---

## 4. Ligar a Apple (opcional, pago)

1. Assine o Apple Developer Program (US$ 99/ano).
2. Em developer.apple.com: crie um **App ID** com *Sign in with Apple* ativado.
3. Crie um **Services ID** — é ele que representa o site.
4. No Services ID, configure o domínio do site e a URL de retorno do Supabase.
5. Crie uma **Key** com *Sign in with Apple* e baixe o arquivo `.p8` (só dá para baixar uma vez).
6. No Supabase, em **Authentication > Providers > Apple**, preencha Services ID, Team ID,
   Key ID e o conteúdo do `.p8`.

Detalhe que pega muita gente: a Apple manda o nome da pessoa **só no primeiro login**. Depois
disso ela some. O gatilho do banco já cuida disso salvando o nome na hora do cadastro.

---

## 5. Rodar e publicar

Localmente (precisa de Node 18 ou mais novo):

```bash
npm install
npm run dev
```

Publicando na Vercel:

1. Suba a pasta para um repositório no GitHub.
2. Na Vercel, *Add New > Project*, escolha o repositório (ela detecta Vite sozinha).
3. Em *Environment Variables*, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Depois do deploy, volte ao Supabase em **Authentication > URL Configuration** e coloque
   o endereço do site em *Site URL* e em *Redirect URLs*. Sem isso, o login do Google e da
   Apple volta para o lugar errado.

Se você não consegue rodar `npm` na máquina do trabalho, tudo bem: a Vercel builda no servidor
dela. Você edita pelo próprio GitHub e ela publica sozinha a cada commit.

---

## Como as regras ficam protegidas

A pontuação **não vem do navegador**. Um gatilho no banco reescreve os pontos a partir do tipo,
confere o limite do dia (treino 1×, cardio 1×, refeição 3×, água 1×) e recusa registro de dia
futuro ou de mais de um dia atrás. Mesmo quem souber usar a API não consegue inflar o placar.

As políticas de RLS deixam todo mundo logado **ver** os check-ins do grupo — é o que faz o
ranking funcionar — mas cada pessoa só cria e apaga os próprios. As fotos ficam numa pasta com
o ID de quem enviou, e ninguém escreve na pasta de outro.

---

## O que ainda não está pronto

- **Strava, Garmin e Mi Fitness automáticos.** Por enquanto a pessoa digita os passos. Para o
  Strava, o caminho é uma Edge Function no Supabase guardando o *client secret* e o token de
  cada usuário. Garmin depende de aprovação como parceiro. A Xiaomi não tem API pública.
- **Convite fechado.** Hoje qualquer um com o link cria conta. Se quiser turma fechada, dá para
  exigir um código de convite antes do cadastro.
- **Notificação de lembrete.** Precisa de push, que no iPhone só funciona se o site for
  instalado na tela de início.
