// ============================================================
// /api/minha-ficha  —  a ficha do treinando
//
// Recebe { token }. Resolve a pessoa pelo token e chama
// sigmatr.minha_ficha(pessoa_id) — a sobrecarga criada no mt10.
// O cliente nunca lê a view direto (ela roda com privilégio do
// dono; SELECT solto vazaria todo mundo).
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

  // 2. ficha (a sobrecarga que aceita pessoa_id explícito)
  const { data, error } = await db.rpc('minha_ficha', { p_pessoa_id: pid });
  if (error) {
    return res.status(500).json({ erro: 'Falha ao carregar a ficha' });
  }

  // Dados de apresentação, para o cabeçalho da página
  const { data: p } = await db
    .from('pessoas')
    .select('nome, empresa, codigo_publico, funcoes(nome)')
    .eq('id', pid)
    .single();

  return res.status(200).json({
    pessoa: p ? {
      nome:           p.nome,
      empresa:        p.empresa,
      funcao:         p.funcoes ? p.funcoes.nome : null,
      codigo_publico: p.codigo_publico
    } : null,
    itens: data || []
  });
}
