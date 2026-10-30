# Baú de Achadinhos - Dashboard Automático Shopee

Criei do zero, sem saber programar, com Claude Code, em 2 noites.

O que faz:
- Dashboard em localhost:3000 com Pendentes / Aprovados / Rejeitados (0 pendentes, 4 aprovados)
- Fila de postagem com intervalo de 2h anti-ban (canal simulado)
- Agendador automático a cada 6h, filtra produtos com +200 vendas, nota 4.7+, comissão 5%+
- Liga sozinho no boot do Windows via iniciar.bat na Inicializar
- Modo simulado funcionando enquanto aguardo liberação da API (Meu API: AppID -)

Links reais já testados e postados no Status:
- s.shopee.com.br/5VWVeA4jYa (organizador de cabos)
- s.shopee.com.br/7AeJe1DrXn (fone bluetooth)

Fluxo: Shopee API → filtros → IA reescreve → /pendentes → você: APROVAR → /aprovados → fila (2h) → canal

Como rodar:
npm install
npm run dev
Abrir localhost:3000

Stack: Next.js 14, Tailwind, Node, Shopee Affiliate Open API

Vaga remota: Busco primeira oportunidade como automação / growth afiliados / Next.js júnior







