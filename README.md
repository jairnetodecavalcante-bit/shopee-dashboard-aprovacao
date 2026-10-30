# shopee-dashboard-aprovacao

Painel local (Next.js 14 + Tailwind) para o perfil de achadinhos: garimpa produtos na API de afiliados da
Shopee, reescreve título e texto, você revisa e aprova, e o sistema posta com 2h de intervalo.

```
Shopee API ─► filtros ─► IA reescreve ─► /pendentes ─► você: APROVAR ─► /aprovados ─► fila (2h) ─► canal
                                                         └─ REJEITAR ─► /rejeitados
```

## Como rodar

Requer Node.js 18.17 ou superior.

```bash
npm install
cp .env.example .env.local      # Windows: copy .env.example .env.local
# abra o .env.local e preencha as chaves (veja abaixo)
npm run dev
```

Abra http://localhost:3000. O garimpo e a fila de postagens só funcionam **enquanto o servidor estiver
rodando** (computador ligado). Para deixar rodando continuamente use `npm run build` e `npm start`.

## Chaves no `.env.local`

| Variável | Para quê |
|---|---|
| `SHOPEE_APP_ID`, `SHOPEE_APP_SECRET` | Painel de afiliados Shopee > Open API |
| `ANTHROPIC_API_KEY` | Reescrever título e texto (console.anthropic.com) |
| `PUBLICADOR` | `simulado` (padrão, só registra em `data/postagens-simuladas.log`), `telegram` ou `webhook` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Se `PUBLICADOR=telegram` |
| `WEBHOOK_URL` | Se `PUBLICADOR=webhook` (Make, n8n, Zapier) |

Os demais ajustes (intervalos, filtros, produtos por rodada) estão comentados no `.env.example`.

## Garimpo automático

- A cada **6 horas** roda uma rodada, **um nicho por vez**, nesta ordem: moda feminina, beleza, cuidados pessoais,
  skincare, fitness, utilidades domésticas. A cada volta o nicho usa outra palavra-chave (edite em `src/lib/nichos.ts`).
- Busca os mais vendidos e só mantém produtos com **mais de 200 vendas, nota acima de 4,7 e comissão acima de 5%**.
- Salva até 5 por rodada (os de maior preço × comissão), sem repetir produtos já garimpados.
- Cada produto vira uma pasta em `pendentes/` com foto, `produto.json` e o texto no estilo achadinho:
  gancho ("achei esse achado que..."), 2 benefícios, 1 ponto de atenção.
- O botão **Garimpar agora** no painel roda uma rodada na hora (útil para testar).
- Se preferir categorias da Shopee em vez de palavras-chave, preencha `CAT_ID_<NICHO>` no `.env.local`.

### Atenção: o texto é gerado por IA e precisa da sua revisão

A API da Shopee **não envia a descrição do produto**. A IA recebe só nome, preço, nota, vendas e loja, e é instruída
a não inventar medidas, materiais, resultados ou promessas de saúde. Mesmo assim, **abra o produto e confira se os
benefícios batem antes de clicar em APROVAR**. Cada card automático traz esse lembrete.

## Aprovar, rejeitar e postar

- **APROVAR**: grava `publicacao.txt` e move a pasta para `aprovados/`. Só aprova com título, texto e **link de afiliado**.
  Entra na **fila**: o 1º vai logo (se não houve post nas últimas 2h) e cada seguinte sai 2h depois do anterior.
- **REJEITAR**: move a pasta para `rejeitados/`.
- O texto publicado é sempre: título reescrito + texto original + **link** + **`#afiliado`** (a hashtag é a última linha).
- Se uma postagem falhar, o sistema tenta de novo em 10 minutos (até 3 vezes). Depois aparece "Tentar de novo" na fila.
- Se o servidor ficar desligado, os posts atrasados saem na volta, respeitando o intervalo de 2h.

### Canais de postagem

- **Telegram**: crie um bot com @BotFather, adicione o bot como administrador do seu canal e use o `@canal` em
  `TELEGRAM_CHAT_ID`. Envia foto + texto.
- **Webhook**: envia `{ id, texto, link, nicho, imagem_url }` para sua URL. Com Make ou n8n você publica onde quiser.
- Instagram e WhatsApp **não** têm integração direta neste projeto (exigem contas comerciais e APIs próprias).
  Use o webhook para conectá-los.

## Adicionar produtos manualmente

Crie uma pasta em `pendentes/` (só letras, números, `-` e `_`) com `produto.json` e uma foto:

```json
{
  "titulo_original": "Título como veio da Shopee",
  "titulo_reescrito": "Seu título reescrito",
  "descricao_original": "Descrição da Shopee, sem alterações.",
  "texto_achadinho": "Opcional: seu texto no estilo achadinho (substitui a descrição no post).",
  "link_afiliado": "https://shope.ee/seu-link"
}
```

Os produtos `*-exemplo` em `pendentes/` são só demonstração e podem ser apagados.

## Estrutura

```
pendentes/ aprovados/ rejeitados/   pastas dos produtos
data/                               estado do garimpo, fila e logs (não vai para o git)
src/lib/shopee.ts                   cliente da API (assinatura SHA256)
src/lib/garimpo.ts                  rodada de garimpo e rodízio de nichos
src/lib/reescrita.ts                reescrita com IA
src/lib/fila.ts, publicadores.ts    fila com intervalo e canais de postagem
src/lib/agendador.ts                timers (iniciado por src/instrumentation.ts)
```

> Confira sempre os termos atuais do programa Shopee Afiliados e as regras do canal onde você posta.
