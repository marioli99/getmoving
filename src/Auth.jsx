import React, { useState } from "react";
import { supabase } from "./supabase.js";
import { forcaSenha } from "./regras.js";

const IconeGoogle = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.2z" />
    <path fill="#34A853" d="M24 46c6 0 11-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.3v5.7C7.8 41 15.3 46 24 46z" />
    <path fill="#FBBC05" d="M11.7 28.2c-.4-1.3-.7-2.7-.7-4.2s.3-2.9.7-4.2v-5.7H4.3A22 22 0 0 0 2 24c0 3.6.9 6.9 2.3 9.9l7.4-5.7z" />
    <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 30 2 24 2 15.3 2 7.8 7 4.3 14.1l7.4 5.7c1.7-5.2 6.6-9 12.3-9z" />
  </svg>
);

const IconeApple = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.8-2-1.6-.2-3.1.9-3.9.9s-2.1-.9-3.4-.9C5.7 6.8 4 7.9 3 9.7c-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.2 2.6 1.3-.1 1.8-.8 3.4-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.2-2.6.7-1 1-1.5 1.5-2.6-3.9-1.5-3.6-6.8-1.6-7.9zM13.9 4.6c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3.1 1.6-.7.8-1.3 2-1.1 3.2 1.2.1 2.4-.6 3.1-1.5z" />
  </svg>
);

export default function Auth({ aoEntrar }) {
  const [modo, setModo] = useState("entrar"); // entrar | criar | recuperar
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const forca = forcaSenha(senha);

  const trocar = (m) => { setModo(m); setErro(""); setSucesso(""); };

  const social = async (provider) => {
    setErro(""); setOcupado(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) { setErro(traduzir(error.message)); setOcupado(false); }
    // em caso de sucesso o navegador sai da página para o provedor
  };

  const enviar = async () => {
    setErro(""); setSucesso("");

    if (modo === "recuperar") {
      if (!email.includes("@")) return setErro("Digite o e-mail da sua conta.");
      setOcupado(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/#nova-senha",
      });
      setOcupado(false);
      if (error) return setErro(traduzir(error.message));
      return setSucesso("Se essa conta existir, o link de redefinição chega no e-mail em instantes.");
    }

    if (!email.includes("@")) return setErro("Digite um e-mail válido.");
    if (modo === "criar") {
      if (nome.trim().length < 2) return setErro("Escreva como você quer aparecer no ranking.");
      if (!forca.valida) return setErro(forca.obvia
        ? "Essa senha é fácil demais de adivinhar. Troque por outra."
        : "A senha precisa cumprir os quatro requisitos abaixo.");
    } else if (!senha) {
      return setErro("Digite sua senha.");
    }

    setOcupado(true);
    if (modo === "criar") {
      const { data, error } = await supabase.auth.signUp({
        email, password: senha,
        options: { data: { nome: nome.trim() }, emailRedirectTo: window.location.origin },
      });
      setOcupado(false);
      if (error) return setErro(traduzir(error.message));
      if (!data.session) return setSucesso("Confirme o e-mail que acabamos de enviar e depois volte para entrar.");
      aoEntrar?.();
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      setOcupado(false);
      if (error) return setErro(traduzir(error.message));
      aoEntrar?.();
    }
  };

  return (
    <div className="card">
      {erro && <p className="erro">{erro}</p>}
      {sucesso && <p className="ok-msg">{sucesso}</p>}

      {modo !== "recuperar" && (
        <>
          <div className="social">
            <button className="btn-social" onClick={() => social("google")} disabled={ocupado}>
              <IconeGoogle /> Continuar com Google
            </button>
            <button className="btn-social apple" onClick={() => social("apple")} disabled={ocupado}>
              <IconeApple /> Continuar com Apple
            </button>
          </div>
          <div className="ou">ou com e-mail</div>
        </>
      )}

      {modo === "criar" && (
        <>
          <label className="lab" htmlFor="nome">Como você aparece no ranking</label>
          <input id="nome" className="campo" value={nome} maxLength={24} autoComplete="nickname"
            onChange={(e) => setNome(e.target.value)} placeholder="Mari" />
        </>
      )}

      <label className="lab" htmlFor="email">E-mail</label>
      <input id="email" className="campo" type="email" value={email} autoComplete="email"
        onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />

      {modo !== "recuperar" && (
        <>
          <label className="lab" htmlFor="senha">Senha</label>
          <input id="senha" className="campo" type="password" value={senha}
            autoComplete={modo === "criar" ? "new-password" : "current-password"}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviar()} placeholder="••••••••••" />
        </>
      )}

      {modo === "criar" && senha.length > 0 && (
        <div className="forca">
          <div className="forca-barras">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className={"forca-b" + (forca.nota >= n ? " n" + forca.nota : "")} />
            ))}
          </div>
          <ul>
            {forca.criterios.map((c) => (
              <li key={c.txt} className={c.ok ? "ok" : ""}>{c.txt}</li>
            ))}
          </ul>
          {forca.obvia && <p className="erro" style={{ marginTop: 8 }}>Essa senha contém uma palavra comum demais.</p>}
        </div>
      )}

      <button className="btn btn-prim btn-full" onClick={enviar} disabled={ocupado}>
        {ocupado ? "Um instante…"
          : modo === "criar" ? "Criar conta"
          : modo === "recuperar" ? "Enviar link de redefinição"
          : "Entrar"}
      </button>

      {modo === "entrar" && (
        <>
          <button className="link" style={{ width: "100%" }} onClick={() => trocar("criar")}>
            Ainda não tenho conta — criar
          </button>
          <button className="link" style={{ width: "100%", marginTop: -6 }} onClick={() => trocar("recuperar")}>
            Esqueci minha senha
          </button>
        </>
      )}
      {modo !== "entrar" && (
        <button className="link" style={{ width: "100%" }} onClick={() => trocar("entrar")}>
          Já tenho conta — entrar
        </button>
      )}
    </div>
  );
}

function traduzir(msg = "") {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha errados.";
  if (m.includes("already registered")) return "Já existe conta com esse e-mail. Tente entrar.";
  if (m.includes("email not confirmed")) return "Confirme o e-mail antes de entrar. Procure na caixa de spam.";
  if (m.includes("password should be")) return "A senha é curta demais.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas seguidas. Espere alguns minutos.";
  if (m.includes("provider is not enabled")) return "Esse login ainda não foi ativado no painel do Supabase.";
  if (m.includes("failed to fetch")) return "Sem conexão com o servidor. Verifique a internet.";
  return msg;
}
