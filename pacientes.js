const router = require('express').Router();
const db = require('../db');

const COLUNAS = 'id, nome, cpf, telefone, email, data_nascimento, endereço, data_cadastro';

const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');

const texto = (v) => {
    const s = String(v ?? '').trim();
    return s === '' ? null : s;
};

function cpfValido(cpf) {
    if (cpf.length !== 11) return false;
    if (process.env.VALIDAR_CPF === 'false') return true;
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    for (const t of [9, 10]) {
        let soma = 0;
        for (let i = 0; i < t; i++) soma += Number(cpf[i]) * (t + 1 - i);
        if (((soma * 10) % 11) % 10 !== Number(cpf[t])) return false;
    }
    return true;
}

function dataValida(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return false;
  return iso <= new Date().toLocaleDateString('en-CA'); // não pode ser no futuro
}

function validar(body) {
  const nome = texto(body.nome);
  if (!nome || nome.length < 3) return { erro: 'Informe o nome completo.' };

  const cpf = soDigitos(body.cpf);
  if (!cpfValido(cpf)) return { erro: 'CPF inválido.' };

  const nascimento = texto(body.nascimento ?? body.data_nascimento);
  if (nascimento && !dataValida(nascimento)) return { erro: 'Data de nascimento inválida.' };

  const email = texto(body.email);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { erro: 'E-mail inválido.' };

  return {
    dados: { nome, cpf, telefone: texto(body.telefone), email, nascimento, endereco: texto(body.endereco) },
  };
}

async function respostaCpfDuplicado(cpf, res) {
  const { rows } = await db.query('SELECT nome FROM pacientes WHERE cpf = $1', [cpf]);
  const quem = rows[0] ? `: ${rows[0].nome}` : '';
  return res.status(409).json({ erro: `Já existe um paciente cadastrado com esse CPF${quem}.` });
}

router.get('/', async (req, res, next) => {
  try {
    const busca = String(req.query.busca ?? '').trim();
    const params = [];
    let where = '';
    if (busca) {
      params.push(`%${busca}%`);
      where = 'WHERE nome ILIKE $1';
      const digitos = soDigitos(busca);
      if (digitos) {
        params.push(`%${digitos}%`);
        where += ' OR cpf LIKE $2';
      }
    }
    const { rows } = await db.query(`SELECT ${COLUNAS} FROM pacientes ${where} ORDER BY nome LIMIT 500`, params);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
    const { rows } = await db.query(`SELECT ${COLUNAS} FROM pacientes WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ erro: 'Paciente não encontrado.' });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});

router.post('/', async (req, res, next) => {
  const { erro, dados } = validar(req.body || {});
  if (erro) return res.status(400).json({ erro });
  try {
    const { rows } = await db.query(
      `INSERT INTO pacientes (nome, cpf, telefone, email, data_nascimento, endereco)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLUNAS}`,
      [dados.nome, dados.cpf, dados.telefone, dados.email, dados.nascimento, dados.endereco]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return respostaCpfDuplicado(dados.cpf, res).catch(next);
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ erro: 'Identificador inválido.' });
  const { erro, dados } = validar(req.body || {});
  if (erro) return res.status(400).json({ erro });
  try {
    const { rows } = await db.query(
      `UPDATE pacientes
          SET nome = $1, cpf = $2, telefone = $3, email = $4, data_nascimento = $5, endereco = $6
        WHERE id = $7 RETURNING ${COLUNAS}`,
      [dados.nome, dados.cpf, dados.telefone, dados.email, dados.nascimento, dados.endereco, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Paciente não encontrado.' });
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return respostaCpfDuplicado(dados.cpf, res).catch(next);
    next(e);
  }
});



module.exports = router;