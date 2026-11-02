// MediTriagem · Assistente de triagem (HTML + CSS + JS puro + localStorage)

const KEY_ESTADO = "triagem_estado";
const KEY_HISTORICO = "triagem_historico";

const PERGUNTAS = [
  {
    id: "sintoma",
    texto: "1/3 · Qual é o seu sintoma principal?",
    opcoes: [
      { rotulo: "Febre", valor: "febre", peso: 1 },
      { rotulo: "Dor de cabeça", valor: "dor_cabeca", peso: 1 },
      { rotulo: "Tosse", valor: "tosse", peso: 0 },
      { rotulo: "Dor abdominal", valor: "dor_abdominal", peso: 2 },
      { rotulo: "Falta de ar", valor: "falta_ar", peso: 3 },
      { rotulo: "Dor no peito", valor: "dor_peito", peso: 3 },
    ],
  },
  {
    id: "intensidade",
    texto: "2/3 · Qual a intensidade?",
    opcoes: [
      { rotulo: "Leve", valor: "leve", peso: 0 },
      { rotulo: "Moderada", valor: "moderada", peso: 1 },
      { rotulo: "Intensa", valor: "intensa", peso: 2 },
    ],
  },
  {
    id: "duracao",
    texto: "3/3 · Há quanto tempo isso começou?",
    opcoes: [
      { rotulo: "Menos de 24h", valor: "menos_24h", peso: 0 },
      { rotulo: "1 a 3 dias", valor: "1_3_dias", peso: 1 },
      { rotulo: "Mais de 3 dias", valor: "mais_3_dias", peso: 1 },
    ],
  },
];

const NIVEIS = {
  baixa: { nome: "Baixa", acao: "Observe os sintomas, hidrate-se e descanse. Procure uma UBS se persistirem." },
  media: { nome: "Média", acao: "Agende uma consulta nas próximas 24–48h." },
  alta: { nome: "Alta", acao: "Procure uma UPA ou pronto atendimento hoje." },
  emergencia: { nome: "Emergência", acao: "Ligue 192 (SAMU) ou vá imediatamente ao pronto-socorro." },
};

const messagesArea = document.getElementById("messagesArea");
const optionsArea = document.getElementById("optionsArea");
const historyList = document.getElementById("historyList");
const limparBtn = document.getElementById("limparBtn");

let estado = { mensagens: [], passo: 0, respostas: {} };
let historico = [];

// ---------- Persistência ----------
function carregar() {
  try {
    const e = JSON.parse(localStorage.getItem(KEY_ESTADO));
    if (e && Array.isArray(e.mensagens)) estado = e;
    const h = JSON.parse(localStorage.getItem(KEY_HISTORICO));
    if (Array.isArray(h)) historico = h;
  } catch (err) {
    console.warn("Dados locais inválidos, reiniciando.", err);
    localStorage.removeItem(KEY_ESTADO);
    localStorage.removeItem(KEY_HISTORICO);
  }
}

function salvar() {
  localStorage.setItem(KEY_ESTADO, JSON.stringify(estado));
  localStorage.setItem(KEY_HISTORICO, JSON.stringify(historico));
}

// ---------- DOM ----------
function criarBalao(m) {
  const div = document.createElement("div");
  div.classList.add("msg", m.de);
  if (m.nivel) div.classList.add("resultado", m.nivel);
  div.textContent = m.texto; // textContent evita XSS
  return div;
}

function renderMensagens() {
  messagesArea.replaceChildren(...estado.mensagens.map(criarBalao));
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

function adicionarMensagem(de, texto, nivel) {
  const m = { de, texto, nivel };
  estado.mensagens.push(m);
  messagesArea.appendChild(criarBalao(m));
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

function renderOpcoes() {
  optionsArea.replaceChildren();
  if (estado.passo < PERGUNTAS.length) {
    PERGUNTAS[estado.passo].opcoes.forEach((op) => {
      const btn = document.createElement("button");
      btn.className = "neon-btn";
      btn.textContent = op.rotulo;
      btn.addEventListener("click", () => responder(op));
      optionsArea.appendChild(btn);
    });
  } else {
    const btn = document.createElement("button");
    btn.className = "neon-btn";
    btn.textContent = "🔄 Nova triagem";
    btn.addEventListener("click", novaTriagem);
    optionsArea.appendChild(btn);
  }
}

function renderHistorico() {
  historyList.replaceChildren();
  if (historico.length === 0) {
    const li = document.createElement("li");
    li.className = "vazio";
    li.textContent = "Nenhuma triagem realizada ainda.";
    historyList.appendChild(li);
    return;
  }
  [...historico].reverse().forEach((h) => {
    const li = document.createElement("li");
    li.classList.add(h.nivel);
    const titulo = document.createElement("strong");
    titulo.textContent = `${h.sintoma} · urgência ${NIVEIS[h.nivel].nome}`;
    const data = document.createElement("small");
    data.textContent = h.data;
    li.append(titulo, data);
    historyList.appendChild(li);
  });
}

// ---------- Lógica ----------
function calcularNivel(r) {
  const sint = PERGUNTAS[0].opcoes.find((o) => o.valor === r.sintoma);
  const inten = PERGUNTAS[1].opcoes.find((o) => o.valor === r.intensidade);
  const dur = PERGUNTAS[2].opcoes.find((o) => o.valor === r.duracao);
  const score = sint.peso + inten.peso + dur.peso;
  const critico = sint.peso === 3;

  if ((critico && r.intensidade === "intensa") || score >= 6) return "emergencia";
  if (critico || score >= 4) return "alta";
  if (score >= 2) return "media";
  return "baixa";
}

function perguntar() {
  adicionarMensagem("bot", PERGUNTAS[estado.passo].texto);
  renderOpcoes();
  salvar();
}

function responder(opcao) {
  const p = PERGUNTAS[estado.passo];
  adicionarMensagem("user", opcao.rotulo);
  estado.respostas[p.id] = opcao.valor;
  estado.passo++;

  if (estado.passo < PERGUNTAS.length) {
    perguntar();
  } else {
    finalizar();
  }
}

function finalizar() {
  const nivel = calcularNivel(estado.respostas);
  const info = NIVEIS[nivel];
  adicionarMensagem("bot", `Nível de urgência: ${info.nome.toUpperCase()}. ${info.acao}`, nivel);

  const sintomaRotulo = PERGUNTAS[0].opcoes.find((o) => o.valor === estado.respostas.sintoma).rotulo;
  historico.push({ sintoma: sintomaRotulo, nivel, data: new Date().toLocaleString("pt-BR") });
  renderHistorico();
  renderOpcoes();
  salvar();
}

function novaTriagem() {
  estado.passo = 0;
  estado.respostas = {};
  adicionarMensagem("bot", "Vamos começar uma nova triagem.");
  perguntar();
}

function limparHistorico() {
  if (!confirm("Apagar todas as mensagens e o histórico de triagens?")) return;
  localStorage.removeItem(KEY_ESTADO);
  localStorage.removeItem(KEY_HISTORICO);
  estado = { mensagens: [], passo: 0, respostas: {} };
  historico = [];
  messagesArea.replaceChildren();
  iniciar();
}

// ---------- Inicialização ----------
function iniciar() {
  if (estado.mensagens.length === 0) {
    adicionarMensagem("bot", "Olá! Sou o MediTriagem. Vou fazer 3 perguntas rápidas para estimar o nível de urgência.");
    perguntar();
  } else {
    renderMensagens();
    renderOpcoes();
  }
  renderHistorico();
}

limparBtn.addEventListener("click", limparHistorico);
carregar();
iniciar();
