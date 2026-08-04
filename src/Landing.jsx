import React, { useState, useRef } from "react";
import { REGRAS, MAX_DIA } from "./regras.js";
import Auth from "./Auth.jsx";

export default function Landing() {
  const entrarRef = useRef(null);
  const irParaEntrar = () => entrarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <div className="bar">
        <div className="bar-in">
          <span className="logo">GET <em>MOVING</em></span>
          <button className="btn btn-prim btn-sm" onClick={irParaEntrar}>Entrar</button>
        </div>
      </div>

      <div className="mid">
        <section className="hero">
          <p className="eyebrow">Desafio Movimenta · 30 dias</p>
          <h1>8 pontos<em>por dia</em></h1>
          <p className="hero-sub">
            Treino, cardio, comida de verdade e água. Você marca o que fez, o grupo vê, e o placar
            conta constância — não quilos.
          </p>
          <DemoHero />
          <button className="btn btn-prim btn-full" style={{ marginTop: 22 }} onClick={irParaEntrar}>
            Entrar no desafio
          </button>
        </section>

        <section className="sec">
          <h2>Como funciona</h2>
          <p className="sec-int">Três coisas, todo dia. Leva menos de um minuto.</p>
          {[
            ["1", "Faça", "Treinou, caminhou, almoçou bem, bebeu sua água. O dia normal, só que registrado."],
            ["2", "Marque", "Abre o site, toca na categoria, tira a foto se quiser. Pronto."],
            ["3", "Compare", "O placar do grupo atualiza na hora. Quem apareceu todo dia sobe."],
          ].map(([n, t, d]) => (
            <div className="passo" key={n}>
              <span className="num">{n}</span>
              <div><b>{t}</b><p>{d}</p></div>
            </div>
          ))}
        </section>

        <section className="sec">
          <h2>A pontuação</h2>
          <p className="sec-int">
            Movimento vale 4, alimentação e água valem 4. Empatados de propósito: quem só fotografa
            prato não passa na frente de quem treina, e vice-versa.
          </p>
          <table className="tab">
            <thead><tr><th>Categoria</th><th>Pontos</th><th>Por dia</th></tr></thead>
            <tbody>
              {REGRAS.map((r) => (
                <tr key={r.id}>
                  <td>{r.nome}<span className="tab-sub">{r.sub}</span></td>
                  <td>{r.pts}</td>
                  <td>{r.max}×</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>Máximo no dia</td><td>{MAX_DIA}</td><td>—</td></tr></tfoot>
          </table>

          <h3 style={{ fontSize: 20, margin: "30px 0 10px" }}>Bônus de semana</h3>
          <table className="tab">
            <tbody>
              <tr><td>Sete dias seguidos com registro</td><td>+5</td></tr>
              <tr><td>Três treinos ou mais na semana</td><td>+3</td></tr>
            </tbody>
          </table>
          <p className="nota" style={{ textAlign: "left", marginTop: 12 }}>
            Somados automaticamente quando a semana fecha, de segunda a domingo.
          </p>
        </section>

        <section className="sec">
          <h2>O que não conta</h2>
          <p className="sec-int">As regras que mantêm o desafio saudável.</p>
          <div className="nao">
            <b>Nada disso pontua — e nada disso entra no grupo:</b>
            <ul>
              <li>Peso perdido, foto de balança, medida de cintura.</li>
              <li>Antes e depois, ou comentário sobre o corpo de alguém.</li>
              <li>Pular refeição, jejum forçado, dia de "só café".</li>
              <li>Prato sem proteína contando como refeição saudável.</li>
              <li>Dois treinos no mesmo dia para dobrar ponto.</li>
              <li>Foto antiga, repetida ou de outro dia.</li>
            </ul>
          </div>
          <p className="nota" style={{ textAlign: "left" }}>
            Descanso é parte do treino. Um dia parado na semana não tira ponto de ninguém.
          </p>
        </section>

        <section className="sec">
          <h2>Perguntas</h2>
          {[
            ["Preciso de academia?", "Não. Pilates, dança, luta, treino em casa, tudo conta como treino. O que vale é ter se mexido de propósito."],
            ["E se eu esquecer de marcar?", "Dá para registrar o dia anterior até o fim do dia seguinte. Depois disso, o dia fica sem pontos — a sequência quebra e recomeça."],
            ["Quem vê meus registros?", "Só quem está logado no desafio. O site não é público e ninguém de fora enxerga suas fotos."],
            ["Dá para ver os passos do meu relógio?", "Por enquanto você digita o número que o app mostra. A partir de 8.000 o ponto de cardio entra sozinho."],
            ["Quanto tempo dura?", "Trinta dias. Sete é pouco para virar hábito, noventa é longo demais para o grupo aguentar."],
          ].map(([q, a]) => (
            <div className="faq" key={q}><b>{q}</b><p>{a}</p></div>
          ))}
        </section>

        <section className="sec" ref={entrarRef}>
          <h2>Entrar</h2>
          <p className="sec-int">Crie sua conta ou entre com Google ou Apple.</p>
          <Auth />
        </section>

        <footer className="rodape">
          <p className="eyebrow">getmoving</p>
          <p className="nota" style={{ marginTop: 6 }}>
            Um desafio do @movimentamari.<br />
            Isto não é orientação médica ou nutricional.
          </p>
        </footer>
      </div>
    </>
  );
}

/* o medidor interativo — a mecânica do desafio como argumento de venda */
function DemoHero() {
  const [reg, setReg] = useState([]);
  const cores = [];
  reg.forEach((id) => {
    const r = REGRAS.find((x) => x.id === id);
    for (let i = 0; i < r.pts; i++) cores.push(r.cor);
  });
  const pts = cores.length;
  const usados = (id) => reg.filter((x) => x === id).length;

  return (
    <div className="card" style={{ textAlign: "left" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <p className="score">{pts}<span> / {MAX_DIA}</span></p>
        {pts > 0 && <button className="link" onClick={() => setReg([])}>limpar</button>}
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
      <div className="demo-btns">
        {REGRAS.map((r) => (
          <button key={r.id} className="demo-btn" disabled={usados(r.id) >= r.max}
            onClick={() => setReg([...reg, r.id])}>
            {r.ico} {r.nome}{r.max > 1 ? ` ${usados(r.id)}/${r.max}` : ""}
          </button>
        ))}
      </div>
      <p className="nota" style={{ marginTop: 12, fontSize: 12 }}>
        {pts === MAX_DIA ? "Dia completo. É isso que a gente persegue." : "Toque para ver como um dia enche."}
      </p>
    </div>
  );
}
