// ============================================================
// /api/sessao-token  —  o "login" por token do RH
//
// Recebe { token }.  Resolve a pessoa pelo hash (no banco).
// Devolve o mínimo para a inicio.html se apresentar.
// NUNCA devolve CPF, e-mail nem o token.
//
// Roda com SERVICE_ROLE — só no servidor. A chave nunca vai
// para o navegador. Configure em Vercel → Settings → Env Vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
// ============================================================

import { createClient } from '@supabase/supabase-js';

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { db: { schema: 'sigmatr' }, auth: { persistSession: false } }
);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const token = (req.body && req.body.token || '').trim();
  if (!token) {
    return res.status(400).json({ erro: 'Token ausente' });
  }

  // 1. Resolve pessoa_id pelo hash do token (o hash é feito no banco)
  const { data: pid, error: e1 } = await db.rpc('pessoa_por_token', { p_token: token });
  if (e1) {
    return res.status(500).json({ erro: 'Falha ao validar o acesso' });
  }
  if (!pid) {
    // Token inválido OU pessoa desmobilizada. Não distinguimos — não vaza estado.
    return res.status(401).json({ erro: 'Acesso não reconhecido' });
  }

  // 2. Dados mínimos de apresentação (schema já é sigmatr no client)
  const { data: p, error: e2 } = await db
    .from('pessoas')
    .select('id, nome, empresa, codigo_publico, funcao_id, funcoes(nome)')
    .eq('id', pid)
    .single();

  if (e2 || !p) {
    return res.status(500).json({ erro: 'Falha ao carregar o cadastro' });
  }

  return res.status(200).json({
    pessoa_id:      p.id,
    nome:           p.nome,
    empresa:        p.empresa,
    funcao:         p.funcoes ? p.funcoes.nome : null,
    codigo_publico: p.codigo_publico
  });
}
