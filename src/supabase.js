import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* Se faltar qualquer uma das duas, NÃO criamos o cliente:
   o createClient joga uma exceção e a página inteira fica em branco.
   Em vez disso o App mostra uma tela explicando o que falta. */
export const configurado = Boolean(url && chave && url.startsWith("http"));

export const supabase = configurado
  ? createClient(url, chave, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export const diagnostico = {
  url: url || null,
  temChave: Boolean(chave),
  chaveCurta: chave ? chave.slice(0, 12) + "…" : null,
};
