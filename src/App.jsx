import React, { useState, useEffect, useCallback } from "react";
import { supabase, configurado, diagnostico } from "./supabase.js";
import { forcaSenha } from "./regras.js";
import Landing from "./Landing.jsx";
import Painel from "./Painel.jsx";

/* Impede que um erro isolado apague a tela inteira */
class Barreira extends React.Component {
  constructor(p) { super(p); this.state = { erro: null }; }
  static getDerivedStateFromError(erro) { return { erro }; }
  componentDidCatch(erro, info) { console.error("Erro na interface:", erro, info); }
  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div className="mid" style={{ paddingTop: 50 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>Algo quebrou aqui</h1>
        <p className="sec-int">A mensagem abaixo ajuda a descobrir o quê.</p>
        <div className="card">
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--mono)", fontSize: 12.5, margin: 0 }}>
            {String(this.state.erro?.message || this.state.erro)}
          </pre>
        </div>
        <button className="btn btn-prim btn-full" style={{ marginTop: 16 }}
          onClick={() => window.location.reload()}>Recarregar</button>
      </div>
    );
  }
}

export default function App() {
  return (
    <Barreira>
      {configurado ? <Conteudo /> : <TelaConfig />}
    </Barreira>
  );
}

/* Aparece quando o .env não foi lido — antes isso dava página em branco */
function TelaConfig() {
  return (
    <div className="mid" style={{ paddingTop: 50 }}>
      <p className="eyebrow">getmoving</p>
      <h1 style={{ fontSize: 30, fontWeight: 800, margin: "8px 0 10px" }}>Falta conectar o Supabase</h1>
      <p className="sec-int">
        O site subiu, mas não achou as chaves. Crie o arquivo <code>.env</code> na raiz do projeto
        (a mesma pasta do <code>package.json</code>) com estas duas linhas:
      </p>
      <div className="card">
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--mono)", fontSize: 13, margin: 0 }}>
{`VITE_SUPABASE_URL=https://seuprojeto.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...`}
        </pre>
      </div>
      <p className="nota" style={{ textAlign: "left" }}>
        Sem aspas, sem espaço em volta do <code>=</code>, tudo numa linha só.<br />
        Depois de salvar, <b>pare o servidor com Ctrl+C e rode <code>npm run dev</code> de novo</b> —
        o Vite só lê o .env quando inicia.
      </p>
      <div className="card" style={{ marginTop: 20 }}>
        <p className="eyebrow" style={{ marginBottom: 8 }}>O que chegou até aqui</p>
        <p style={{ fontFamily: "var(--mono)", fontSize: 13 }}>
          URL: {diagnostico.url || "— vazia —"}<br />
          Chave: {diagnostico.temChave ? diagnostico.chaveCurta : "— vazia —"}
        </p>
      </div>
    </div>
  );
}

function Conteudo() {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [recuperando, setRecuperando] = useState(false);
  const [perfis, setPerfis] = useState([]);
  const [checkins, setCheckins] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evento, s) => {
      setSessao(s);
      if (evento === "PASSWORD_RECOVERY") setRecuperando(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const carregarDados = useCallback(async () => {
    if (!sessao) return;
    const [p, c] = await Promise.all([
      supabase.from("perfis").select("id, nome, avatar_path, bio"),
      supabase.from("checkins")
        .select("id, user_id, dia, tipo, pts, nota, foto_path, criado_em")
        .order("criado_em", { ascending: true }),
    ]);
    if (p.error) console.error("perfis:", p.error.message); else setPerfis(p.data || []);
    if (c.error) console.error("checkins:", c.error.message); else setCheckins(c.data || []);
  }, [sessao]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  useEffect(() => {
    if (!sessao) return;
    const canal = supabase
      .channel("grupo-ao-vivo")
      .on("postgres_changes", { event: "*", schema: "public", table: "checkins" }, carregarDados)
      .on("postgres_changes", { event: "*", schema: "public", table: "perfis" }, carregarDados)
      .subscribe();
    return () => supabase.removeChannel(canal);
  }, [sessao, carregarDados]);

  if (carregando) return <div className="carregando">carregando…</div>;
  if (recuperando) return <NovaSenha aoTerminar={() => setRecuperando(false)} />;

  return sessao ? (
    <Painel
      sessao={sessao}
      perfis={perfis}
      checkins={checkins}
      recarregar={carregarDados}
      sair={() => supabase.auth.signOut()}
    />
  ) : (
    <Landing />
  );
}

function NovaSenha({ aoTerminar }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const forca = forcaSenha(senha);

  const salvar = async () => {
    if (!forca.valida) return setErro("A senha precisa cumprir os quatro requisitos.");
    setOcupado(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setOcupado(false);
    if (error) return setErro(error.message);
    window.location.hash = "";
    aoTerminar();
  };

  return (
    <div className="mid" style={{ paddingTop: 60 }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 8 }}>Escolha uma nova senha</h1>
      <p className="sec-int">O link do e-mail te trouxe até aqui. Defina a senha e entre.</p>
      <div className="card">
        {erro && <p className="erro">{erro}</p>}
        <label className="lab" htmlFor="nova">Nova senha</label>
        <input id="nova" className="campo" type="password" value={senha} autoComplete="new-password"
          onChange={(e) => setSenha(e.target.value)} onKeyDown={(e) => e.key === "Enter" && salvar()} />
        <div className="forca">
          <div className="forca-barras">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className={"forca-b" + (forca.nota >= n ? " n" + forca.nota : "")} />
            ))}
          </div>
          <ul>{forca.criterios.map((c) => <li key={c.txt} className={c.ok ? "ok" : ""}>{c.txt}</li>)}</ul>
        </div>
        <button className="btn btn-prim btn-full" onClick={salvar} disabled={ocupado}>
          {ocupado ? "Salvando…" : "Salvar senha"}
        </button>
      </div>
    </div>
  );
}
