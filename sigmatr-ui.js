/* ============================================================================
   SIGMA TREINAMENTOS — sigmatr-ui.js  v1.0
   Casca única. CSS injetado pelo JS. Sem arquivo .css. Sem logo em base64.

   Herda a identidade visual do E-SIGMA (esigma-ui.js v2.0) — mesmos tokens,
   mesmo lockup, mesma sidebar, mesma primária. Prefixo st- para não colidir.

   O QUE MUDA EM RELAÇÃO AO esigma-ui.js — e por quê:

   E-SIGMA                                    | Sigma Treinamentos
   -------------------------------------------|---------------------------------
   querySelector('.es-header, .header')        | a casca CRIA o header
     → if(header) → falha em SILÊNCIO (erro 1) | → sem #app, PÂNICO vermelho
     → seletor duplo convida duplicar (erro 2) | → página não escreve classe st-
   grid mora na página (erro 3)                | grid mora na casca. Página não encosta.

   Como usar:
     <body data-shell="admin" data-pagina="matriz">
       <div id="app">...</div>
       <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
       <script src="sigmatr-ui.js"></script>
       <script>SigmaTR.init();</script>
     </body>

   Abra com ?debug para rodar a auditoria dos 3 erros de casca no console.
============================================================================ */

const SigmaTR = (() => {

  const VERSAO = '1.0.0';

  // ── Supabase ──────────────────────────────────────────────────────────────
  // Schema PRÓPRIO (mt01 v2). Não toca em public — lá mora o E-SIGMA.
  // Settings → API → Exposed schemas: adicionar `sigmatr`.
  const URL_SB = 'https://SEU-PROJETO.supabase.co';
  const KEY_SB = 'SUA-ANON-KEY';
  const SCHEMA = 'sigmatr';
  let db = null;

  // ── Identidade visual ─────────────────────────────────────────────────────
  // FONTE ÚNICA DE VERDADE DA MARCA. Trocar logo = subir no bucket. Não mexer
  // em página. NUNCA base64, NUNCA <img> hardcoded em página individual.
  const BRAND = {
    bucket: 'https://kiwiykgzogcxiseynzyy.supabase.co/storage/v1/object/public/LOGO-Empresas/',
    sistema:     { arq:'sigmacode.png', alt:'SIGMA CODE Engenharia' },
    contratante: { arq:'gcb.png', nome:'GCB Manutenção', alt:'GCB Manutenção' },
    produto:     'Sigma Treinamentos',
    subtitulo:   'Qualificação e Aptidão',
    contrato:    'Contrato SAP 4600686554'
  };
  const logoURL = m => BRAND.bucket + m.arq;

  /* REGRA DE MARCA — cravada no código, não no manual.
     Projeto Campo: superfície pública (QR, sem login) = SÓ SIGMA CODE.
     A casca simplesmente NÃO CONSEGUE renderizar a GCB quando o papel é
     'publico'. Não depende de ninguém lembrar. */
  const podeExibirContratante = papel => papel === 'admin' || papel === 'treinando';

  // ── Navegação ─────────────────────────────────────────────────────────────
  const NAV = {
    admin: [
      { grupo:'Principal' },
      { id:'aderencia',   label:'Aderência',      href:'admin.html',
        icon:'M3 3v18h18M7 16l4-6 4 3 5-8' },

      { grupo:'Pessoas' },
      { id:'pessoas',     label:'Pessoas',        href:'pessoas.html',
        icon:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
      { id:'importar',    label:'Importar do RH', href:'importar.html',
        icon:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3' },
      { id:'mobilizar',   label:'Mobilizar',      href:'mobilizar.html',
        icon:'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9zM9 14l2 2 4-4' },

      { grupo:'Conteúdo' },
      { id:'treinamentos',label:'Treinamentos',   href:'treinamentos.html',
        icon:'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',
        pages:['treinamentos.html','treinamento.html'] },
      { id:'revisoes',    label:'Revisões',       href:'revisoes.html',
        icon:'M3 2v6h6M21 12A9 9 0 0 0 6 5.3L3 8M21 22v-6h-6M3 12a9 9 0 0 0 15 6.7l3-2.7' },
      { id:'provas',      label:'Provas',         href:'provas.html',
        icon:'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },

      { grupo:'Regras' },
      { id:'funcoes',     label:'Funções',        href:'funcoes.html',
        icon:'M20 7h-9M14 17H5M17 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM7 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
      { id:'matriz',      label:'Matriz',         href:'matriz.html',
        icon:'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18' },
    ],
    // Treinando não tem menu: tem UMA lista e o que fazer agora.
    treinando: []
  };

  const SOON = [
    { label:'Reciclagem automática', icon:'M3 2v6h6M21 12A9 9 0 0 0 6 5.3L3 8M21 22v-6h-6M3 12a9 9 0 0 0 15 6.7l3-2.7' },
    { label:'Relatórios',            icon:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8' },
  ];

  // ── CSS — mesmos tokens do E-SIGMA. Injetado uma vez. ─────────────────────
  const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@600;700&display=swap');

/* ── grid: a CASCA é dona. A página NÃO escreve grid-area. (erro 3, morto) ── */
.st-app{display:grid;min-height:100vh;
  grid-template-columns:248px 1fr;
  grid-template-rows:64px 1fr;
  grid-template-areas:"header header" "side main";
  background:#F4F6FA}
.st-app[data-papel="treinando"],
.st-app[data-papel="publico"]{
  grid-template-columns:1fr;
  grid-template-areas:"header" "main"}
.st-header{grid-area:header}
.st-side{grid-area:side}
.st-main{grid-area:main;min-width:0;padding:24px 28px 72px}
@media(max-width:860px){
  .st-app{grid-template-columns:1fr;grid-template-areas:"header" "main"}
  .st-side{display:none}
  .st-side[data-aberto="1"]{display:flex;position:fixed;inset:64px 0 0 0;z-index:80;width:100%}
  .st-main{padding:16px 16px 88px}
}

/* ── header ── */
.st-header{position:sticky;top:0;z-index:40;background:#fff;border-bottom:1px solid #E5E7EB;
  display:flex;align-items:center;gap:14px;padding:0 20px;height:64px;
  box-shadow:0 1px 2px rgba(16,24,40,.06)}
.st-logo{height:32px;width:58px;flex:none;object-fit:contain}
.st-sep{width:1px;height:28px;background:#E5E7EB;flex:none}
.st-brand{display:flex;align-items:center;gap:14px;flex:none}
.st-cli{display:flex;align-items:center;gap:8px;flex:none}
.st-cli-logo{height:32px;width:auto;max-width:110px;flex:none;object-fit:contain}
.st-cli-nome{font-size:12.5px;font-weight:600;color:#6B7280;white-space:nowrap}
@media(max-width:860px){.st-cli-nome{display:none}}
.st-title{font-family:'Exo 2',sans-serif;font-size:15px;font-weight:700;color:#1F2937}
.st-sub{font-size:12px;color:#6B7280;margin-top:1px}
@media(max-width:600px){.st-sub,.st-cli{display:none}}
.st-sp{flex:1}
.st-burger{display:none;width:40px;height:40px;border:0;background:none;cursor:pointer;
  border-radius:8px;color:#4B5563;align-items:center;justify-content:center;margin-left:-8px}
.st-burger:hover{background:#F4F6FA}
@media(max-width:860px){.st-app[data-papel="admin"] .st-burger{display:flex}}
.st-burger svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2}

/* ── usuário ── */
.st-user{display:flex;align-items:center;gap:10px;padding:5px 12px 5px 5px;
  border:1px solid #E5E7EB;border-radius:999px;background:#fff;cursor:pointer;position:relative}
.st-user:hover{background:#F4F6FA}
.st-av{width:30px;height:30px;border-radius:50%;
  background:linear-gradient(135deg,#0F4CBA,#0B3A91);
  color:#fff;font-size:12px;font-weight:700;
  display:flex;align-items:center;justify-content:center;flex:none}
.st-uname{font-size:13px;font-weight:600;color:#1F2937}
.st-urole{font-size:11px;color:#6B7280}
@media(max-width:600px){.st-uname,.st-urole{display:none}}
.st-drop{position:absolute;top:calc(100% + 8px);right:0;width:210px;
  background:#fff;border:1px solid #E5E7EB;border-radius:12px;
  box-shadow:0 10px 24px -12px rgba(16,24,40,.2);z-index:100;display:none;overflow:hidden}
.st-drop.open{display:block}
.st-drop a,.st-drop div{display:flex;align-items:center;gap:10px;padding:11px 14px;
  font-size:13.5px;color:#4B5563;text-decoration:none;cursor:pointer;border-bottom:1px solid #F3F4F6}
.st-drop a:last-child,.st-drop div:last-child{border-bottom:none}
.st-drop a:hover,.st-drop div:hover{background:#F4F6FA;color:#1F2937}
.st-drop svg{width:16px;height:16px;flex:none;stroke:currentColor;fill:none;stroke-width:2}
.st-drop .logout{color:#EF4444}
.st-drop .logout:hover{background:#FEF2F2}

/* ── sidebar ── */
.st-side{background:linear-gradient(180deg,#1F2937,#141B26);
  display:flex;flex-direction:column;overflow-y:auto}
.st-side-scroll{flex:1;padding:10px}
.st-glabel{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
  color:#64748B;padding:12px 10px 5px}
.st-nav{display:flex;align-items:center;gap:11px;padding:9px 10px;border-radius:8px;
  color:#CBD5E1;font-size:13.5px;font-weight:500;margin-bottom:1px;
  text-decoration:none;transition:background .15s,color .15s;position:relative}
.st-nav:hover{background:#ffffff14;color:#fff}
.st-nav.active{background:linear-gradient(90deg,rgba(15,76,186,.9),rgba(15,76,186,.5));color:#fff}
.st-nav.active::before{content:"";position:absolute;left:-10px;top:8px;bottom:8px;
  width:4px;border-radius:0 3px 3px 0;background:#22C55E}
.st-nav svg{width:18px;height:18px;flex:none;stroke-width:2;stroke:currentColor;fill:none}
.st-nav.soon{opacity:.35;cursor:not-allowed;pointer-events:none}
.st-badge{font-size:9px;font-weight:700;background:#334155;color:#94A3B8;
  padding:1px 5px;border-radius:4px;margin-left:auto}
.st-sep-line{height:1px;background:#ffffff10;margin:8px 10px}
.st-foot{padding:10px;border-top:1px solid #ffffff14}
.st-cp{display:flex;align-items:center;gap:10px;padding:9px;border-radius:8px;background:#ffffff0a}
.st-cp-ic{width:32px;height:32px;border-radius:8px;background:#ffffff14;
  display:flex;align-items:center;justify-content:center;flex:none}
.st-cp-ic svg{width:16px;height:16px;stroke:#22C55E;fill:none;stroke-width:2}
.st-cp-a{font-size:12px;font-weight:600;color:#E2E8F0}
.st-cp-b{font-size:11px;color:#7F8EA3}

/* ── página ── */
.st-page-head{margin:0 0 20px}
.st-page-head h1{margin:0;font-family:'Exo 2',sans-serif;font-size:22px;font-weight:700;color:#1F2937}
.st-page-head p{margin:3px 0 0;font-size:13px;color:#6B7280}
.st-card{background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:20px;
  box-shadow:0 1px 2px rgba(16,24,40,.06)}
.st-mono{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-variant-numeric:tabular-nums}

/* ── TARJA de status ──
   Cor NUNCA sozinha: sempre palavra + forma. ~8% dos homens não distinguem
   verde de vermelho, e numa frente de obra isso é gente demais. */
.st-tarja{display:inline-flex;align-items:center;gap:7px;padding:4px 10px;border-radius:999px;
  font-size:11.5px;font-weight:700;letter-spacing:.02em;white-space:nowrap;border:1px solid}
.st-tarja::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor;flex:none}
.st-tarja[data-s="apto"]              {color:#15803D;background:#F0FDF4;border-color:#BBF7D0}
.st-tarja[data-s="vence_em_breve"]    {color:#B45309;background:#FFFBEB;border-color:#FDE68A}
.st-tarja[data-s="apto_com_pendencia"]{color:#B45309;background:#FFFBEB;border-color:#FDE68A}
.st-tarja[data-s="inapto_revisao"]    {color:#B91C1C;background:#FEF2F2;border-color:#FECACA}
.st-tarja[data-s="inapto_vencido"]    {color:#B91C1C;background:#FEF2F2;border-color:#FECACA}
.st-tarja[data-s="nunca_fez"]         {color:#475569;background:#F8FAFC;border-color:#E2E8F0}
.st-tarja[data-s^="inapto"]::before{border-radius:1px;transform:rotate(45deg)}
.st-tarja[data-s="nunca_fez"]::before{background:none;border:1.5px dashed currentColor}

/* ── botões ── */
.st-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
  min-height:40px;padding:0 16px;border-radius:8px;border:1px solid transparent;
  background:linear-gradient(135deg,#0F4CBA,#0B3A91);color:#fff;
  font:inherit;font-size:13.5px;font-weight:600;cursor:pointer;text-decoration:none;
  transition:filter .15s,box-shadow .15s}
.st-btn:hover{filter:brightness(1.08);box-shadow:0 4px 14px -6px rgba(15,76,186,.7)}
.st-btn[data-tom="quieto"]{background:#fff;color:#4B5563;border-color:#E5E7EB;box-shadow:none}
.st-btn[data-tom="quieto"]:hover{background:#F4F6FA;filter:none}
.st-btn[data-tom="perigo"]{background:#EF4444}
.st-btn:disabled{opacity:.45;cursor:not-allowed;filter:none;box-shadow:none}

/* ── campos ── (16px: abaixo disso o iOS dá zoom no foco. Não baixar.) */
.st-field{display:flex;flex-direction:column;gap:6px;margin-bottom:16px}
.st-field label{font-size:13px;font-weight:600;color:#1F2937}
.st-field input,.st-field select{min-height:44px;padding:0 12px;font:inherit;font-size:16px;
  border:1px solid #E5E7EB;border-radius:8px;background:#fff;color:#1F2937}
.st-field input:focus{outline:none;border-color:#0F4CBA;box-shadow:0 0 0 3px rgba(15,76,186,.12)}
.st-field input[inputmode="numeric"]{font-family:ui-monospace,Consolas,monospace;letter-spacing:.06em}
.st-hint{font-size:12px;color:#6B7280}

/* ── vazio ── convite pra agir, não lamento */
.st-empty{text-align:center;padding:48px 20px;background:#fff;
  border:1px dashed #D1D5DB;border-radius:12px}
.st-empty h3{margin:0 0 6px;font-size:15px;color:#1F2937}
.st-empty p{margin:0 0 18px;font-size:13.5px;color:#6B7280}

/* ── avisos ── */
.st-toasts{position:fixed;right:24px;bottom:24px;z-index:95;display:flex;flex-direction:column;gap:8px;
  width:min(360px,calc(100% - 32px))}
.st-toast{padding:12px 14px;border-radius:10px;font-size:13.5px;color:#fff;background:#1F2937;
  box-shadow:0 10px 24px -12px rgba(16,24,40,.4);animation:st-up .18s ease-out}
.st-toast[data-tom="ok"]{background:#15803D}
.st-toast[data-tom="erro"]{background:#EF4444}
@keyframes st-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

/* ── ação deliberada com preview de impacto ── */
.st-modal{border:0;padding:0;border-radius:14px;width:min(480px,calc(100vw - 32px));
  box-shadow:0 24px 48px -16px rgba(16,24,40,.35)}
.st-modal::backdrop{background:rgba(16,24,40,.55)}
.st-modal-in{padding:22px;background:#fff}
.st-modal h2{margin:0 0 6px;font-family:'Exo 2',sans-serif;font-size:17px;color:#1F2937}
.st-modal p{margin:0 0 14px;font-size:13.5px;color:#6B7280}
.st-impact{margin:0 0 18px;padding:12px 14px;border-radius:8px;
  background:#FFFBEB;border-left:3px solid #F59E0B;font-size:13.5px;color:#78350F}
.st-modal-acts{display:flex;gap:8px;justify-content:flex-end}

/* ── FAB voltar ── */
.st-home{position:fixed;bottom:24px;left:24px;width:46px;height:46px;border-radius:50%;
  background:linear-gradient(135deg,#0F4CBA,#0B3A91);color:#fff;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 6px 20px -6px rgba(15,76,186,.7);z-index:90;text-decoration:none;
  transition:transform .15s}
.st-home:hover{transform:scale(1.1)}
.st-home svg{width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2.5}

/* ── pânico: erro de casca nº1 nunca mais em silêncio ── */
.st-panic{position:fixed;inset:0;z-index:9999;overflow:auto;padding:32px;
  background:#B91C1C;color:#fff;font-family:ui-monospace,Consolas,monospace;
  font-size:14px;line-height:1.65}
.st-panic h1{font-family:'Exo 2',sans-serif;font-size:18px;margin:0 0 12px;
  letter-spacing:.06em;text-transform:uppercase}
.st-panic code{background:rgba(0,0,0,.25);padding:2px 6px;border-radius:4px}

/* ==========================================================================
 * PLAYER — componentes do treinamento.
 * Moram AQUI, não na página. Página não escreve cor. (o erro nº2, de novo)
 * ======================================================================== */

/* Bloco de Controle de Documento — o rigor do CQ, visível, sem propaganda.
   O treinando vê que existe procedimento, revisão, aprovador e data. Isso
   muda a postura dele diante do vídeo: de "aula" para "documento". */
.st-doc{background:#fff;border:1px solid #E5E7EB;border-left:3px solid #0F4CBA;
  border-radius:12px;padding:14px 16px;margin-bottom:14px;
  box-shadow:0 1px 2px rgba(16,24,40,.06)}
.st-doc-eyebrow{font-size:10px;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:#6B7280}
.st-doc-titulo{font-family:'Exo 2',sans-serif;font-size:17px;font-weight:700;
  color:#1F2937;margin-top:3px;line-height:1.3}
.st-doc-meta{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;
  font-size:12px;color:#6B7280;margin-top:5px;line-height:1.5}
.st-doc-meta b{color:#4B5563;font-weight:600}

/* Faixa de rede. No 3G da refinaria o heartbeat falha — e o silêncio faz a
   pessoa reassistir com medo ou desistir. Dizer é feature, não erro. */
.st-rede{display:none;margin-bottom:12px;padding:10px 14px;border-radius:8px;
  background:#FFFBEB;border-left:3px solid #F59E0B;font-size:13.5px;color:#78350F}
.st-rede[data-ativa="1"]{display:block}

.st-player{background:#fff;border:1px solid #E5E7EB;border-radius:12px;
  overflow:hidden;box-shadow:0 1px 2px rgba(16,24,40,.06)}
.st-video{position:relative;background:#000;aspect-ratio:16/9}
.st-video > div{position:absolute;inset:0}
/* capa: o clique no iframe do YouTube abre menu e pausa. Interceptamos. */
.st-capa{position:absolute;inset:0;cursor:pointer;z-index:2}

/* Barra de COBERTURA, não de posição. Pular deixa buraco — e o buraco aparece. */
.st-barra{position:relative;height:8px;background:#E5E7EB}
.st-barra span[data-seg]{position:absolute;top:0;bottom:0;background:#22C55E}
.st-agulha{position:absolute;top:-2px;width:2px;height:12px;background:#0F4CBA;
  transition:left .3s linear}
.st-marca{position:absolute;top:0;bottom:0;width:2px;background:#1F2937}

.st-controles{display:flex;align-items:center;gap:12px;padding:12px 14px;flex-wrap:wrap}
.st-tempo{font-family:ui-monospace,Consolas,monospace;font-variant-numeric:tabular-nums;
  font-size:13px;color:#4B5563}
.st-vel-grupo{margin-left:auto;display:flex;align-items:center;gap:6px}
.st-vel-label{font-size:12px;color:#6B7280}
.st-vel{min-height:34px;padding:0 10px;font-size:12.5px}

.st-rodape-player{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:0 14px 14px}
/* "gravando" — o heartbeat visível. Confiança na rede ruim. */
.st-pulso{display:none;align-items:center;gap:6px;font-size:12px;color:#6B7280}
.st-pulso[data-ativo="1"]{display:inline-flex}
.st-pulso::before{content:"";width:7px;height:7px;border-radius:50%;background:#22C55E;
  animation:st-bat 2s ease-in-out infinite}
@keyframes st-bat{0%,100%{opacity:1}50%{opacity:.25}}
.st-btn-prova{margin-left:auto;display:none}
.st-btn-prova[data-pronto="1"]{display:inline-flex}

.st-nota-rodape{font-size:12px;color:#9CA3AF;margin-top:12px}

/* Checkpoint — alternativas. Alvo de 48px: mão suja, luva, celular velho. */
.st-cp-eyebrow{font-size:10px;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:#6B7280}
.st-cp-alts{display:flex;flex-direction:column;gap:8px;margin:16px 0}
.st-cp-alt{justify-content:flex-start;text-align:left;min-height:48px;height:auto;
  white-space:normal;padding:11px 14px;line-height:1.4}
.st-cp-nota{font-size:12px;color:#9CA3AF;margin:0}

@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

  // ── util ──────────────────────────────────────────────────────────────────
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const icon = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${
    d.split('M').filter(Boolean).map(p => `<path d="M${p}"/>`).join('')}</svg>`;

  const PAGE = window.location.pathname.split('/').pop() || 'admin.html';

  /* PÂNICO — substitui o `if (header) {...}` do E-SIGMA, que engolia o erro. */
  function panico(titulo, detalhe) {
    console.error('[sigmatr-ui] ' + titulo);
    const p = document.createElement('div');
    p.className = 'st-panic';
    p.innerHTML = `<h1>Casca não inicializada</h1><p>${titulo}</p><p>${detalhe}</p>
      <p>Página: <code>${esc(location.pathname)}</code> · sigmatr-ui ${VERSAO}</p>`;
    injectCSS();
    (document.body || document.documentElement).appendChild(p);
    throw new Error('[sigmatr-ui] ' + titulo);
  }

  function injectCSS() {
    if (document.getElementById('sigmatr-css')) return;
    const st = document.createElement('style');
    st.id = 'sigmatr-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ── header ────────────────────────────────────────────────────────────────
  function buildHeader(papel, nome, perfil) {
    const iniciais = (nome || '?').split(' ').filter(Boolean)
      .map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';

    const burger = papel === 'admin'
      ? `<button class="st-burger" id="st-burger" aria-label="Abrir menu">
           <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>` : '';

    // GCB só em superfície autenticada. Em 'publico' este bloco nem existe.
    const cli = podeExibirContratante(papel) ? `
        <div class="st-sep"></div>
        <div class="st-cli">
          <img class="st-cli-logo" src="${logoURL(BRAND.contratante)}" alt="${BRAND.contratante.alt}" height="32">
          <span class="st-cli-nome">${esc(BRAND.contratante.nome)}</span>
        </div>` : '';

    const user = papel === 'publico' ? '' : `
      <div class="st-user" id="st-user-btn">
        <span class="st-av">${esc(iniciais)}</span>
        <div>
          <div class="st-uname">${esc(nome)}</div>
          <div class="st-urole">${esc(perfil)}</div>
        </div>
        <div class="st-drop" id="st-drop">
          <a href="${papel === 'admin' ? 'admin.html' : 'inicio.html'}">
            <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
            Início
          </a>
          <div class="logout" id="st-logout">
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>
            Sair do sistema
          </div>
        </div>
      </div>`;

    return `${burger}
      <div class="st-brand">
        <img class="st-logo" src="${logoURL(BRAND.sistema)}" alt="${BRAND.sistema.alt}" width="58" height="32">
        <div class="st-sep"></div>
        <div>
          <div class="st-title">${esc(BRAND.produto)}</div>
          <div class="st-sub">${esc(BRAND.subtitulo)}</div>
        </div>
        ${cli}
      </div>
      <div class="st-sp"></div>
      ${user}`;
  }

  // ── sidebar ───────────────────────────────────────────────────────────────
  function buildSidebar(empresa, contrato) {
    let html = '<div class="st-side-scroll">';

    NAV.admin.forEach(it => {
      if (it.grupo) { html += `<div class="st-glabel">${esc(it.grupo)}</div>`; return; }
      const pages  = it.pages || [it.href];
      const active = pages.includes(PAGE) ? 'active' : '';
      html += `<a href="${it.href}" class="st-nav ${active}">${icon(it.icon)}${esc(it.label)}</a>`;
    });

    html += '<div class="st-sep-line"></div>';
    html += `<div class="st-glabel">Fatia 3 <span style="font-size:9px;color:#475569;text-transform:none;letter-spacing:0;font-weight:400">(em breve)</span></div>`;
    SOON.forEach(it => {
      html += `<span class="st-nav soon">${icon(it.icon)}${esc(it.label)}<span class="st-badge">breve</span></span>`;
    });

    html += '</div>';
    html += `
      <div class="st-foot">
        <div class="st-cp">
          <div class="st-cp-ic"><svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5z"/></svg></div>
          <div>
            <div class="st-cp-a">${esc(empresa)}</div>
            <div class="st-cp-b">${esc(contrato)}</div>
          </div>
        </div>
      </div>`;
    return html;
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  async function init(opts = {}) {
    if (document.documentElement.dataset.stMounted === '1') {
      console.warn('[sigmatr-ui] init() chamado duas vezes. Ignorando.');
      return;
    }

    const papel = document.body.dataset.shell;
    if (!papel) {
      panico('O &lt;body&gt; não declara <code>data-shell</code>.',
             'Valores: <code>admin</code> · <code>treinando</code> · <code>publico</code>.');
    }
    if (!['admin','treinando','publico'].includes(papel)) {
      panico(`data-shell desconhecido: <code>${esc(papel)}</code>.`,
             'Valores: admin · treinando · publico.');
    }

    const app = document.getElementById('app');
    if (!app) {
      panico('A página não tem <code>&lt;div id="app"&gt;</code>.',
             'É o ponto de montagem da casca. No E-SIGMA isso falhava em silêncio ' +
             '(<code>if (header) {…}</code>) e a página rodava pelada. Aqui não passa.');
    }

    injectCSS();

    let nome = opts.nome || '', perfil = opts.perfil || '';
    let empresa = BRAND.contratante.nome, contrato = BRAND.contrato;

    // Sessão — só nas superfícies autenticadas.
    // opts.demo = true: monta a casca sem Supabase (shell.html de referência).
    if (papel !== 'publico' && !opts.demo) {
      if (!window.supabase) {
        panico('supabase-js não carregado.',
               'Inclua o script do supabase-js ANTES de <code>sigmatr-ui.js</code>.');
      }
      db = window.supabase.createClient(URL_SB, KEY_SB, { db: { schema: SCHEMA } });

      const { data: { session } } = await db.auth.getSession();
      if (!session) { window.location.href = 'login.html'; return; }

      nome   = nome   || session.user.email.split('@')[0];
      perfil = perfil || (papel === 'admin' ? 'Administrador' : 'Treinando');

      try {
        const { data: p } = await db.from('pessoas')
          .select('nome, empresa').eq('auth_uid', session.user.id).single();
        if (p) { nome = p.nome || nome; if (p.empresa) empresa = p.empresa; }
      } catch (e) {}

      sessionStorage.setItem('st_user', JSON.stringify({ nome, perfil, email: session.user.email }));
    }

    // ── monta o grid. A página NÃO encosta nisto. ──
    const wrap = document.createElement('div');
    wrap.className = 'st-app';
    wrap.dataset.papel = papel;

    const header = document.createElement('header');
    header.className = 'st-header';
    header.innerHTML = buildHeader(papel, nome, perfil);
    wrap.appendChild(header);

    if (papel === 'admin') {
      const side = document.createElement('nav');
      side.className = 'st-side';
      side.dataset.aberto = '0';
      side.setAttribute('aria-label', 'Seções do painel');
      side.innerHTML = buildSidebar(empresa, contrato);
      wrap.appendChild(side);
    }

    const main = document.createElement('main');
    main.className = 'st-main';
    if (opts.titulo) {
      const h = document.createElement('div');
      h.className = 'st-page-head';
      h.innerHTML = `<h1>${esc(opts.titulo)}</h1>` +
                    (opts.subtitulo ? `<p>${esc(opts.subtitulo)}</p>` : '');
      main.appendChild(h);
    }
    app.parentNode.removeChild(app);
    main.appendChild(app);          // #app entra no slot. grid-area sempre certo.
    wrap.appendChild(main);

    document.body.insertBefore(wrap, document.body.firstChild);
    document.body.appendChild(Object.assign(document.createElement('div'), {
      className: 'st-toasts', id: 'st-toasts', role: 'status'
    }));

    // FAB voltar (não no índice de cada papel)
    const home = papel === 'admin' ? 'admin.html' : 'inicio.html';
    if (papel !== 'publico' && PAGE !== home) {
      const a = document.createElement('a');
      a.className = 'st-home'; a.href = home; a.title = 'Voltar ao início';
      a.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>`;
      document.body.appendChild(a);
    }

    bindEvents();
    document.documentElement.dataset.stMounted = '1';

    if (location.hostname === 'localhost' || location.search.includes('debug')) auditar();
  }

  function bindEvents() {
    const btn = document.getElementById('st-user-btn');
    const drop = document.getElementById('st-drop');
    if (btn && drop) {
      btn.addEventListener('click', e => { e.stopPropagation(); drop.classList.toggle('open'); });
      document.addEventListener('click', () => drop.classList.remove('open'));
    }
    const burger = document.getElementById('st-burger');
    if (burger) burger.addEventListener('click', () => {
      const s = document.querySelector('.st-side');
      s.dataset.aberto = s.dataset.aberto === '1' ? '0' : '1';
    });
    const out = document.getElementById('st-logout');
    if (out) out.addEventListener('click', async () => {
      if (db) await db.auth.signOut();
      sessionStorage.clear();
      window.location.href = 'login.html';
    });
  }

  /* ── AUDITORIA — o checklist dos 3 erros de casca, executável.
        Um checklist que ninguém roda não existe. ─────────────────────────── */
  function auditar() {
    const f = [];
    const wrap = document.querySelector('.st-app');
    if (!wrap) f.push('1. Casca ausente — .st-app não montou.');

    const app = document.getElementById('app');
    ['st-header','st-side','st-app','st-main','header','side'].forEach(c => {
      if (app && app.querySelector('.' + c))
        f.push(`2. Classe duplicada — a página escreveu .${c} dentro de #app. A casca é dona dessa classe.`);
    });

    if (wrap) [...wrap.children].forEach(el => {
      const ga = getComputedStyle(el).gridArea;
      if (!ga || ga === 'auto / auto / auto / auto')
        f.push(`3. grid-area faltando em <${el.tagName.toLowerCase()} class="${el.className}"> — vai vazar pro canto errado.`);
    });

    if (f.length) {
      console.group('%c[sigmatr-ui] AUDITORIA DE CASCA — ' + f.length + ' falha(s)',
                    'color:#B91C1C;font-weight:700');
      f.forEach(x => console.error(x));
      console.groupEnd();
    } else {
      console.log('%c[sigmatr-ui] casca ok · ' + VERSAO, 'color:#15803D;font-weight:700');
    }
    return f;
  }

  // ── componentes ───────────────────────────────────────────────────────────
  const ROTULO = {
    apto:'Apto', vence_em_breve:'Vence em breve', apto_com_pendencia:'Em carência',
    inapto_revisao:'Revisão nova', inapto_vencido:'Vencido', nunca_fez:'Não fez'
  };

  const tarja = (s, extra) =>
    `<span class="st-tarja" data-s="${esc(s)}">${esc(ROTULO[s] || s)}${extra ? ' · ' + esc(extra) : ''}</span>`;

  /* "apto, vence em 9 dias" — a frase que impede o RH de mobilizar quem vence
     na semana seguinte. É o alerta da fatia 2; o cálculo nasce agora. */
  function validade(valido_ate) {
    const dias = Math.floor((new Date(valido_ate) - new Date()) / 864e5);
    if (dias < 0)   return { status:'inapto_vencido',  dias, texto:`vencido há ${Math.abs(dias)} d` };
    if (dias <= 30) return { status:'vence_em_breve',  dias, texto:`vence em ${dias} d` };
    return { status:'apto', dias, texto:`vence em ${dias} d` };
  }

  function toast(texto, tom) {
    const cx = document.getElementById('st-toasts'); if (!cx) return;
    const t = document.createElement('div');
    t.className = 'st-toast'; if (tom) t.dataset.tom = tom;
    t.textContent = texto;
    cx.appendChild(t);
    setTimeout(() => t.remove(), tom === 'erro' ? 7000 : 4000);
  }

  /* Publicar revisão e mexer na matriz tornam gente inapta em massa.
     Nenhuma das duas pode ser um clique comum. */
  function confirmar({ titulo, texto, impacto, acao = 'Confirmar', tom = 'perigo' }) {
    return new Promise(res => {
      const d = document.createElement('dialog');
      d.className = 'st-modal';
      d.innerHTML = `<div class="st-modal-in">
          <h2>${esc(titulo)}</h2>
          ${texto ? `<p>${esc(texto)}</p>` : ''}
          ${impacto ? `<div class="st-impact">${esc(impacto)}</div>` : ''}
          <div class="st-modal-acts">
            <button class="st-btn" data-tom="quieto" value="nao">Cancelar</button>
            <button class="st-btn" data-tom="${esc(tom)}" value="sim">${esc(acao)}</button>
          </div></div>`;
      document.body.appendChild(d);
      d.querySelectorAll('button').forEach(b =>
        b.onclick = () => { d.close(); d.remove(); res(b.value === 'sim'); });
      d.showModal();
    });
  }

  const vazio = ({ titulo, texto, acao, href }) =>
    `<div class="st-empty"><h3>${esc(titulo)}</h3><p>${esc(texto)}</p>` +
    (acao ? `<a class="st-btn" href="${esc(href)}">${esc(acao)}</a>` : '') + '</div>';

  const fmt = {
    cpf: v => {
      const d = String(v||'').replace(/\D/g,'').slice(0,11);
      return d.replace(/(\d{3})(\d{3})?(\d{3})?(\d{2})?/,
        (_,a,b,c,e) => [a,b,c].filter(Boolean).join('.') + (e ? '-' + e : ''));
    },
    // Admin não precisa dos 11 dígitos pra conferir uma linha. LGPD é isso.
    cpfParcial: v => {
      const d = String(v||'').replace(/\D/g,'');
      return d.length === 11 ? `•••.•••.${d.slice(6,9)}-${d.slice(9)}` : '—';
    },
    data: d => d ? new Date(d).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}) : '—',
    codigo: c => String(c||'').toUpperCase().replace(/(.{4})(.{4})/,'$1 $2')
  };

  function mascararCPF(input) {
    input.setAttribute('inputmode','numeric');
    input.setAttribute('maxlength','14');
    input.setAttribute('autocomplete','off');
    input.addEventListener('input', () => {
      const fim = input.selectionStart === input.value.length;
      input.value = fmt.cpf(input.value);
      if (fim) input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  return {
    VERSAO, BRAND, init, auditar,
    tarja, validade, toast, confirmar, vazio, fmt, mascararCPF, esc,
    get db() { return db; }
  };
})();
