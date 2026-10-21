# SGCP — Protótipo (Sistema de Gestão para Clínica Podológica)

Protótipo de front-end do SGCP

## O que já funciona
- **Agenda:** novos agendamentos e lista de próximas consultas
- **Pacientes:** cadastro com verificação de CPF duplicado e busca
- **Atendimento:** registro de prontuário por paciente
- **Cobrança:** lançamento de cobranças (será revisto: ver pendências)
- **Estoque:** itens com ajuste de quantidade e alerta de estoque baixo

> Os dados ficam salvos no navegador (localStorage). Ainda não há backend nem banco de dados.

## Como abrir
Baixe o repositório e abra o arquivo `index.html` no navegador. Não precisa instalar nada.

## Estrutura
| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da página |
| `style.css` | Visual (paleta MidnightBlue / RoyalBlue / SteelBlue / WhiteSmoke) |
| `script.js` | Lógica (abas, formulários, armazenamento) |

## Pendências (alinhar com a documentação)
- [ ] Trocar o módulo Cobrança por Receitas, Despesas e Contas a pagar
- [ ] Anamnese, lembretes, relatórios e dashboard
- [ ] Login e perfis (podóloga e recepcionista)
- [ ] Backend, banco de dados e MER (capítulo 4 da documentação)


