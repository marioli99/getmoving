import React, { useState, useMemo, useRef } from "react";
import { supabase } from "./supabase.js";
import { comprimir, comprimirQuadrado } from "./imagem.js";
import {
  REGRAS, MAX_DIA, regraDe, diaISO, hojeISO, segundaDa,
  somaPts, porDia, calcSequencia, calcBonus,
} from "./regras.js";

const urlPublica = (bucket, path) =>
  path ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;

const urlFoto = (p) => urlPublica("provas", p);
const urlAvatar = (p) => urlPublica("perfis", p);

/* foto de perfil, com inicial quando não houver imagem */
function Avatar({ perfil, tam = 40 }) {
  const src = urlAvatar(perfil?.avatar_path);
  const estilo = { width: tam, height: tam, flex: `0 0 ${tam}px`, fontSize: tam * 0.42 };
  return src
    ? <img className="avatar" style={estilo} src={src} alt="" />
    : <span className="avatar avatar-vazio" style={estilo}>{(perfil?.nome || "?")[0].toUpperCase()}</span>;
}

export default function Painel({ sessao, perfis, checkins, recarregar, sair }) {
  const [aba, setAba] = useState("hoje");
  const [aviso, setAviso] = useState("");
  const uid = sessao.user.id;

  const meuPerfil = perfis.find((p) => p.id === uid) || { id: uid, nome: sessao.user.email };
  const meus = useMemo(() => checkins.filter((c) => c.user_id === uid), [checkins, uid]);
  const meusDias = useMemo(() => porDia(meus), [meus]);
  const hoje = meusDias[hojeISO()] || [];
  const ptsHoje = somaPts(hoje);
  const seq = calcSequencia(meusDias);

  const cores = [];
  hoje.forEach((c) => {
    const r = regraDe(c.tipo);
    for (let i = 0; i < c.pts; i++) cores.push(r.cor);
  });

  return (
    <>
      <div className="topo">
        <div className="mid topo-row">
          <div>
            <p className="eyebrow">Desafio Movimenta</p>
            <p className="logo" style={{ color: "#fff", fontSize: 26 }}>GET MOVING</p>
          </div>
          <button className="sair" onClick={sair}>Sair</button>
        </div>
      </div>

      <div className="mid" style={{ paddingBottom: 70 }}>
        <div className="card" style={{ marginTop: -14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12 }}>
            <div>
              <p className="eyebrow">
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
              <p className="score">{ptsHoje}<span> / {MAX_DIA}</span></p>
            </div>
            <button className="perfil-atalho" onClick={() => setAba("perfil")} title="Editar perfil">
              <Avatar perfil={meuPerfil} tam={46} />
              <span>{meuPerfil.nome}</span>
            </button>
          </div>
          <div className="metro">
            {Array.from({ length: MAX_DIA }, (_, i) => (
              <div key={i} className={"slot" + (cores[i] ? " on" : "") + (cores[i] === "r" ? " rosa" : "")} />
            ))}
          </div>
          <div className="legenda">
            <span><i className="pip a" />movimento (4)</span>
            <span><i className="pip r" />alimentação e água (4)</span>
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--linha)", display: "flex", justifyContent: "space-between", fontSize: 14 }}>
            <span>Sequência atual</span>
            <b style={{ fontFamily: "var(--mono)" }}>{seq} {seq === 1 ? "dia" : "dias"}</b>
          </div>
        </div>

        <div className="abas">
          {[["hoje", "Hoje"], ["feed", "Feed"], ["ranking", "Ranking"], ["historico", "Histórico"], ["perfil", "Perfil"]].map(([k, t]) => (
            <button key={k} className={"aba" + (aba === k ? " sel" : "")}
              onClick={() => { setAba(k); setAviso(""); }}>{t}</button>
          ))}
        </div>

        {aba === "hoje" && <AbaHoje uid={uid} hoje={hoje} recarregar={recarregar} setAviso={setAviso} />}
        {aba === "feed" && <AbaFeed checkins={checkins} perfis={perfis} />}
        {aba === "ranking" && <AbaRanking perfis={perfis} checkins={checkins} uid={uid} />}
        {aba === "historico" && <AbaHistorico meusDias={meusDias} />}
        {aba === "perfil" && (
          <AbaPerfil perfil={meuPerfil} sessao={sessao} recarregar={recarregar} setAviso={setAviso} sair={sair} />
        )}

        {aviso && <p className="nota">{aviso}</p>}
      </div>
    </>
  );
}

/* ============================== HOJE ============================== */
function AbaHoje({ uid, hoje, recarregar, setAviso }) {
  const [aberto, setAberto] = useState(null);
  const [passos, setPassos] = useState("");
  const usados = (id) => hoje.filter((c) => c.tipo === id).length;

  const remover = async (c) => {
    const { error } = await supabase.from("checkins").delete().eq("id", c.id);
    if (error) return setAviso("Não consegui apagar agora. Tente de novo.");
    if (c.foto_path) await supabase.storage.from("provas").remove([c.foto_path]);
    recarregar();
  };

  const registrarPassos = async () => {
    const n = parseInt(passos, 10);
    if (!n || n < 0) return setAviso("Digite quantos passos você deu hoje.");
    if (n < 8000) return setAviso(`${n.toLocaleString("pt-BR")} passos. Faltam ${(8000 - n).toLocaleString("pt-BR")} para o ponto de cardio.`);
    if (usados("cardio") >= 1) return setAviso("O ponto de cardio de hoje já está registrado.");
    const { error } = await supabase.from("checkins").insert({
      user_id: uid, tipo: "cardio", pts: 2, dia: hojeISO(),
      nota: `${n.toLocaleString("pt-BR")} passos`,
    });
    if (error) return setAviso("Não consegui registrar agora.");
    setPassos("");
    setAviso("Cardio registrado pelos passos.");
    recarregar();
  };

  return (
    <>
      {aberto && (
        <FormRegistro regra={aberto} uid={uid} fechar={() => setAberto(null)}
          recarregar={recarregar} setAviso={setAviso} />
      )}

      {REGRAS.map((r) => {
        const u = usados(r.id), cheio = u >= r.max;
        return (
          <button key={r.id} className="acao" disabled={cheio} onClick={() => setAberto(r)}>
            <span className="ico">{r.ico}</span>
            <span className="acao-txt">
              <span className="acao-nome">{r.nome}{r.max > 1 ? `  ${u}/${r.max}` : ""}</span>
              <span className="acao-sub">{r.sub}</span>
            </span>
            <span className="acao-val">{cheio ? "completo" : `+${r.pts} pt${r.pts > 1 ? "s" : ""}`}</span>
          </button>
        );
      })}

      <div className="passos-box">
        <label className="lab" htmlFor="passos">
          Ou registre o cardio pelos passos do seu app (Strava, Mi Fitness, Garmin, Saúde)
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="passos" className="campo" style={{ marginBottom: 0 }} type="number"
            inputMode="numeric" min="0" placeholder="8000" value={passos}
            onChange={(e) => setPassos(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && registrarPassos()} />
          <button className="btn btn-prim" onClick={registrarPassos}>Somar</button>
        </div>
      </div>

      <p className="eyebrow" style={{ margin: "26px 0 10px" }}>Registros de hoje</p>
      {!hoje.length ? (
        <p className="vazio">Nenhum registro hoje ainda. Escolha uma das quatro acima.</p>
      ) : (
        [...hoje].reverse().map((c) => {
          const r = regraDe(c.tipo);
          const foto = urlFoto(c.foto_path);
          return (
            <div className="item" key={c.id}>
              {foto ? <img src={foto} alt="" /> : <span className="ico">{r.ico}</span>}
              <span className="item-txt">
                <span className="item-nome">{r.nome}</span>
                <span className="item-sub">
                  {new Date(c.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {c.nota ? " · " + c.nota : ""}
                </span>
              </span>
              <span className="item-pts">+{c.pts}</span>
              <button className="x" aria-label="Apagar registro" onClick={() => remover(c)}>×</button>
            </div>
          );
        })
      )}
    </>
  );
}

function FormRegistro({ regra, uid, fechar, recarregar, setAviso }) {
  const [nota, setNota] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [previa, setPrevia] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const inputRef = useRef(null);

  const escolher = async (arq) => {
    if (!arq) return;
    try {
      const blob = await comprimir(arq);
      setArquivo(blob);
      setPrevia(URL.createObjectURL(blob));
    } catch (e) {
      setAviso(e.message || "Não consegui usar essa imagem.");
    }
  };

  const salvar = async () => {
    setOcupado(true);
    let foto_path = null;

    if (arquivo) {
      foto_path = `${uid}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("provas")
        .upload(foto_path, arquivo, { contentType: "image/jpeg" });
      if (error) {
        setOcupado(false);
        return setAviso("A foto não subiu: " + error.message);
      }
    }

    const { error } = await supabase.from("checkins").insert({
      user_id: uid, tipo: regra.id, pts: regra.pts,
      nota: nota.trim() || null, foto_path, dia: hojeISO(),
    });
    setOcupado(false);
    if (error) {
      return setAviso(error.message.includes("Limite")
        ? "Esse limite do dia já foi atingido."
        : "Não consegui registrar: " + error.message);
    }
    setAviso("");
    fechar();
    recarregar();
  };

  const dica = regra.id === "refeicao"
    ? "Fotografe o prato — é o que aparece no feed do grupo."
    : "A foto é opcional, mas é ela que vale no feed.";

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>{regra.nome}</h3>

      <label className="lab" htmlFor="nota">O que foi? (opcional)</label>
      <input id="nota" className="campo" maxLength={60} value={nota} autoFocus
        onChange={(e) => setNota(e.target.value)} placeholder={regra.ex} />

      <label className="lab">Foto — {dica}</label>
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        style={{ display: "none" }} onChange={(e) => escolher(e.target.files[0])} />
      {previa ? (
        <div className="previa-box">
          <img className="previa" src={previa} alt="Prévia" />
          <button className="link" onClick={() => { setArquivo(null); setPrevia(null); }}>
            trocar foto
          </button>
        </div>
      ) : (
        <button className="btn btn-full" style={{ marginBottom: 12 }}
          onClick={() => inputRef.current?.click()}>
          📷 Escolher ou tirar foto
        </button>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" style={{ flex: 1 }} onClick={fechar}>Cancelar</button>
        <button className="btn btn-prim" style={{ flex: 1 }} onClick={salvar} disabled={ocupado}>
          {ocupado ? "Enviando…" : "Registrar"}
        </button>
      </div>
    </div>
  );
}

/* ============================== FEED ============================== */
function AbaFeed({ checkins, perfis }) {
  const comFoto = [...checkins].filter((c) => c.foto_path).reverse().slice(0, 40);
  const perfilDe = (id) => perfis.find((p) => p.id === id);

  if (!comFoto.length) {
    return (
      <>
        <p className="eyebrow" style={{ marginBottom: 10 }}>O que o grupo está comendo e treinando</p>
        <p className="vazio">Nenhuma foto ainda. Seja a primeira a postar um prato.</p>
      </>
    );
  }

  return (
    <>
      <p className="eyebrow" style={{ marginBottom: 10 }}>O que o grupo está comendo e treinando</p>
      {comFoto.map((c) => {
        const p = perfilDe(c.user_id);
        const r = regraDe(c.tipo);
        return (
          <article className="post" key={c.id}>
            <header className="post-top">
              <Avatar perfil={p} tam={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{p?.nome || "alguém"}</b>
                <span className="post-quando">
                  {r.ico} {r.nome} · {new Date(c.criado_em).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                  {" "}{new Date(c.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <span className="item-pts">+{c.pts}</span>
            </header>
            <img className="post-foto" src={urlFoto(c.foto_path)} alt="" loading="lazy" />
            {c.nota && <p className="post-nota">{c.nota}</p>}
          </article>
        );
      })}
    </>
  );
}

/* ============================== RANKING ============================== */
function AbaRanking({ perfis, checkins, uid }) {
  const linhas = perfis.map((p) => {
    const dias = porDia(checkins.filter((c) => c.user_id === p.id));
    let base = 0, ativos = 0;
    Object.keys(dias).forEach((k) => {
      const pts = somaPts(dias[k]);
      if (pts > 0) { base += pts; ativos++; }
    });
    return { perfil: p, ativos, bonus: calcBonus(dias), total: base + calcBonus(dias) };
  }).sort((a, b) => b.total - a.total || b.ativos - a.ativos);

  return (
    <>
      <p className="eyebrow" style={{ marginBottom: 10 }}>Classificação do desafio</p>
      {!linhas.length ? (
        <p className="vazio">Ninguém no desafio ainda.</p>
      ) : (
        linhas.map((l, i) => (
          <div className={"linha-rank" + (l.perfil.id === uid ? " eu" : "")} key={l.perfil.id}>
            <span className="pos">{i + 1}</span>
            <Avatar perfil={l.perfil} tam={38} />
            <span className="item-txt">
              <span className="item-nome">{l.perfil.nome}</span>
              <span className="item-sub">
                {l.ativos} {l.ativos === 1 ? "dia" : "dias"}{l.bonus ? ` · ${l.bonus} de bônus` : ""}
              </span>
            </span>
            <span className="rank-total">{l.total}</span>
          </div>
        ))
      )}
      <p className="nota">
        Bônus entra sozinho por semana fechada, de segunda a domingo:<br />
        sete dias com registro = +5 · três treinos ou mais = +3
      </p>
    </>
  );
}

/* ============================== HISTÓRICO ============================== */
function AbaHistorico({ meusDias }) {
  const fim = new Date(); fim.setHours(12, 0, 0, 0);
  const ini = segundaDa(new Date(fim.getTime() - 27 * 864e5));
  const celulas = [];
  let total = 0, ativos = 0, treinos = 0, cardios = 0, refs = 0;

  for (let i = 0; i < 28; i++) {
    const d = new Date(ini.getTime() + i * 864e5);
    const l = meusDias[diaISO(d)] || [];
    const p = somaPts(l);
    const futuro = d > fim;
    if (!futuro && p > 0) { total += p; ativos++; }
    l.forEach((c) => {
      if (c.tipo === "treino") treinos++;
      else if (c.tipo === "cardio") cardios++;
      else if (c.tipo === "refeicao") refs++;
    });
    celulas.push(
      <div key={i} title={`${diaISO(d)} — ${p} pontos`}
        className={"dia" + (p >= 7 ? " n3" : p >= 4 ? " n2" : p > 0 ? " n1" : "")}>
        {futuro ? "" : p || d.getDate()}
      </div>
    );
  }

  const resumo = [
    ["Pontos no período", total],
    ["Dias com registro", ativos],
    ["Treinos", treinos],
    ["Cardios", cardios],
    ["Refeições saudáveis", refs],
    ["Média por dia ativo", ativos ? (total / ativos).toFixed(1) : "0"],
  ];

  return (
    <>
      <p className="eyebrow" style={{ marginBottom: 10 }}>Seus últimos 28 dias</p>
      <div className="dow">{["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="grade">{celulas}</div>
      <p className="nota" style={{ marginBottom: 24 }}>
        Cada quadrado mostra os pontos do dia. Quanto mais escuro, mais perto dos 8.
      </p>
      {resumo.map(([t, v]) => (
        <div className="item" key={t}>
          <span className="item-txt"><span className="item-nome">{t}</span></span>
          <span className="item-pts">{v}</span>
        </div>
      ))}
    </>
  );
}

/* ============================== PERFIL ============================== */
function AbaPerfil({ perfil, sessao, recarregar, setAviso, sair }) {
  const [nome, setNome] = useState(perfil.nome || "");
  const [bio, setBio] = useState(perfil.bio || "");
  const [previa, setPrevia] = useState(null);
  const [novoAvatar, setNovoAvatar] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const inputRef = useRef(null);

  const mudou = nome.trim() !== (perfil.nome || "") || bio !== (perfil.bio || "") || Boolean(novoAvatar);

  const escolher = async (arq) => {
    if (!arq) return;
    try {
      const blob = await comprimirQuadrado(arq);
      setNovoAvatar(blob);
      setPrevia(URL.createObjectURL(blob));
    } catch (e) {
      setAviso(e.message || "Não consegui usar essa imagem.");
    }
  };

  const salvar = async () => {
    if (nome.trim().length < 2) return setAviso("O nome precisa ter pelo menos 2 letras.");
    setOcupado(true);
    const mudancas = { nome: nome.trim(), bio: bio.trim() || null };

    if (novoAvatar) {
      const caminho = `${perfil.id}/avatar-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("perfis")
        .upload(caminho, novoAvatar, { contentType: "image/jpeg", upsert: true });
      if (error) { setOcupado(false); return setAviso("A foto não subiu: " + error.message); }
      if (perfil.avatar_path) await supabase.storage.from("perfis").remove([perfil.avatar_path]);
      mudancas.avatar_path = caminho;
    }

    const { error } = await supabase.from("perfis").update(mudancas).eq("id", perfil.id);
    setOcupado(false);
    if (error) return setAviso("Não consegui salvar: " + error.message);
    setNovoAvatar(null);
    setPrevia(null);
    setAviso("Perfil atualizado.");
    recarregar();
  };

  const removerFoto = async () => {
    setOcupado(true);
    if (perfil.avatar_path) await supabase.storage.from("perfis").remove([perfil.avatar_path]);
    await supabase.from("perfis").update({ avatar_path: null }).eq("id", perfil.id);
    setOcupado(false);
    setNovoAvatar(null);
    setPrevia(null);
    recarregar();
  };

  return (
    <>
      <p className="eyebrow" style={{ marginBottom: 10 }}>Seu perfil</p>
      <div className="card">
        <div className="avatar-editor">
          {previa
            ? <img className="avatar" style={{ width: 92, height: 92, flex: "0 0 92px" }} src={previa} alt="" />
            : <Avatar perfil={perfil} tam={92} />}
          <div style={{ flex: 1 }}>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => escolher(e.target.files[0])} />
            <button className="btn btn-sm" onClick={() => inputRef.current?.click()}>
              {perfil.avatar_path || previa ? "Trocar foto" : "Adicionar foto"}
            </button>
            {(perfil.avatar_path || previa) && (
              <button className="link" style={{ marginLeft: 12 }} onClick={removerFoto} disabled={ocupado}>
                remover
              </button>
            )}
            <p className="nota" style={{ textAlign: "left", marginTop: 8, fontSize: 12 }}>
              A imagem é cortada em quadrado e reduzida antes de subir.
            </p>
          </div>
        </div>

        <label className="lab" htmlFor="pf-nome">Nome no ranking</label>
        <input id="pf-nome" className="campo" maxLength={24} value={nome}
          onChange={(e) => setNome(e.target.value)} />

        <label className="lab" htmlFor="pf-bio">Frase do perfil (opcional)</label>
        <input id="pf-bio" className="campo" maxLength={80} value={bio}
          onChange={(e) => setBio(e.target.value)} placeholder="Musculação 4x na semana e muito café" />

        <button className="btn btn-prim btn-full" onClick={salvar} disabled={ocupado || !mudou}>
          {ocupado ? "Salvando…" : mudou ? "Salvar alterações" : "Nada para salvar"}
        </button>
      </div>

      <p className="eyebrow" style={{ margin: "26px 0 10px" }}>Conta</p>
      <div className="item">
        <span className="item-txt">
          <span className="item-nome">E-mail</span>
          <span className="item-sub">{sessao.user.email}</span>
        </span>
      </div>
      <button className="btn btn-full" style={{ marginTop: 6 }}
        onClick={async () => {
          const { error } = await supabase.auth.resetPasswordForEmail(sessao.user.email, {
            redirectTo: window.location.origin + "/#nova-senha",
          });
          setAviso(error ? "Não consegui enviar agora." : "Link de troca de senha enviado para seu e-mail.");
        }}>
        Trocar senha
      </button>
      <button className="btn btn-full" style={{ marginTop: 8 }} onClick={sair}>Sair da conta</button>

      <p className="eyebrow" style={{ margin: "26px 0 10px" }}>Conexão com apps</p>
      <div className="int">
        <div className="int-top"><span style={{ fontWeight: 600 }}>Strava</span><span className="tag al">dá para ligar</span></div>
        <p>A API é aberta; falta uma função de servidor guardando o segredo do app. É o único dos três que sai rápido.</p>
      </div>
      <div className="int">
        <div className="int-top"><span style={{ fontWeight: 600 }}>Garmin</span><span className="tag">acesso sob aprovação</span></div>
        <p>A API de saúde é fechada e depende de aprovação como parceiro.</p>
      </div>
      <div className="int">
        <div className="int-top"><span style={{ fontWeight: 600 }}>Mi Fitness</span><span className="tag">sem API pública</span></div>
        <p>A Xiaomi não abre os dados. O caminho é o Health Connect no Android.</p>
      </div>
      <p className="nota">Enquanto isso, o campo de passos na aba Hoje cobre os três.</p>
    </>
  );
}
