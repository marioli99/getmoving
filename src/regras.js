export const REGRAS = [
  { id: "treino",   nome: "Treino",              sub: "Força, pilates, luta, dança — qualquer um", pts: 2, max: 1, cor: "a", ico: "🏋️", ex: "Pernas + abdômen" },
  { id: "cardio",   nome: "Cardio ou 8k passos", sub: "30 min de cardio ou a meta de passos",      pts: 2, max: 1, cor: "a", ico: "👟", ex: "Esteira 30 min" },
  { id: "refeicao", nome: "Refeição saudável",   sub: "Com proteína visível — até 3 por dia",      pts: 1, max: 3, cor: "r", ico: "🥗", ex: "Frango, arroz e brócolis" },
  { id: "agua",     nome: "Água do dia",         sub: "Registre quando bater a meta",              pts: 1, max: 1, cor: "r", ico: "💧", ex: "2,5 litros" },
];

export const MAX_DIA = 8;
export const regraDe = (id) => REGRAS.find((r) => r.id === id);

/* ---------- datas (fuso de São Paulo) ---------- */
export const diaISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const hojeISO = () => diaISO(new Date());

export function segundaDa(d) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
}

/* ---------- contas ---------- */
export const somaPts = (lista) => (lista || []).reduce((s, c) => s + c.pts, 0);

export function porDia(checkins) {
  const mapa = {};
  (checkins || []).forEach((c) => {
    (mapa[c.dia] = mapa[c.dia] || []).push(c);
  });
  return mapa;
}

export function calcSequencia(dias) {
  let n = 0;
  const d = new Date();
  if (!(dias[hojeISO()] || []).length) d.setDate(d.getDate() - 1);
  while ((dias[diaISO(d)] || []).length) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/* +5 por semana cheia, +3 por três treinos — só em semanas já fechadas */
export function calcBonus(dias) {
  const chaves = Object.keys(dias).filter((k) => dias[k].length).sort();
  if (!chaves.length) return 0;
  let total = 0;
  const limite = segundaDa(new Date());
  let cur = segundaDa(new Date(chaves[0] + "T12:00:00"));
  while (cur < limite) {
    let comRegistro = 0, treinos = 0;
    for (let i = 0; i < 7; i++) {
      const l = dias[diaISO(new Date(cur.getTime() + i * 864e5))] || [];
      if (l.length) comRegistro++;
      if (l.some((c) => c.tipo === "treino")) treinos++;
    }
    if (comRegistro === 7) total += 5;
    if (treinos >= 3) total += 3;
    cur = new Date(cur.getTime() + 7 * 864e5);
  }
  return total;
}

/* ---------- força da senha ---------- */
export function forcaSenha(s) {
  const criterios = [
    { ok: s.length >= 10,            txt: "10 caracteres ou mais" },
    { ok: /[a-z]/.test(s) && /[A-Z]/.test(s), txt: "maiúscula e minúscula" },
    { ok: /\d/.test(s),              txt: "pelo menos um número" },
    { ok: /[^A-Za-z0-9]/.test(s),    txt: "um símbolo (!, @, #…)" },
  ];
  const nota = criterios.filter((c) => c.ok).length;
  const fracas = ["123456", "senha", "password", "qwerty", "gymrat", "movimenta"];
  const obvia = fracas.some((f) => s.toLowerCase().includes(f));
  return { criterios, nota, obvia, valida: nota === 4 && !obvia };
}
