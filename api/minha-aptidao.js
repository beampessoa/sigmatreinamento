// ============================================================
// /api/minha-aptidao  —  a aptidão da FUNÇÃO do treinando
//
// Recebe { token }. Resolve a pessoa pelo token e lê a
// vw_aptidao_pessoa (o cálculo de "cumpriu todos os obrigatórios"
// já vive na view). A minha_aptidao() do banco resolve por sessão
// (pessoa_atual), que o treinando não tem — por isso lemos a view
// filtrada pelo pessoa_id aqui, com service_role.
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

  // 1. token → pessoa_id
  const { data: pid, error: e1 } = await db.rpc('pessoa_por_token', { p_token: token });
  if (e1)  return res.status(500).json({ erro: 'Falha ao validar o acesso' });
  if (!pid) return res.status(401).json({ erro: 'Acesso não reconhecido' });

  // 2. aptidão da função (a view já calcula "cumpriu todos os obrigatórios")
  const { data: A, error } = await db
    .from('vw_aptidao_pessoa')
    .select('nome, funcao, apto_no_escopo, exigidos_gerenciados, liberados, ' +
            'em_carencia, nunca_fez, inapto_revisao, inapto_vencido, ' +
            'vence_em, dias_para_vencer, codigo_publico, bloqueio')
    .eq('pessoa_id', pid)
    .maybeSingle();

  if (error) return res.status(500).json({ erro: 'Falha ao ler a aptidão' });

  return res.status(200).json(A || null);
}
