# SGCP 

Servidor Node.js (Express) que entrega o front-end e a API. Neste primeiro passo, o módulo
**Pacientes** grava e lê do banco PostgreSQL. Agenda, Atendimento, Cobrança e Estoque
ainda usam o navegador.

## Antes de começar
- Node.js (LTS) instalado: `node -v`
- PostgreSQL rodando, com o banco `sgcp` criado e o `sql/schema.sql` já executado (`\dt` mostra 14 tabelas)

## Como rodar (Windows)
1. Abra esta pasta no VS Code e abra o terminal (Terminal > Novo Terminal).
2. Crie o arquivo de configuração e preencha a senha do PostgreSQL:
   ```
   copy .env.example .env
   ```
   Abra o `.env` e troque `DB_PASSWORD` pela senha que você criou na instalação.
3. Instale as dependências (uma vez só):
   ```
   npm install
   ```
4. Inicie o servidor:
   ```
   npm start
   ```
5. Teste a conexão com o banco: http://localhost:3000/api/health  → deve mostrar `"ok": true`
6. Abra o sistema: http://localhost:3000 → aba **Pacientes**.

> O WAMP/Apache não é usado. O próprio Node entrega as páginas na porta 3000.

## Rotas da API
| Método | Rota | O que faz | Requisito |
|---|---|---|---|
| GET | `/api/health` | Testa a conexão com o banco | — |
| GET | `/api/pacientes?busca=` | Lista/busca por nome ou CPF | REQF002 |
| GET | `/api/pacientes/:id` | Um paciente | REQF002 |
| POST | `/api/pacientes` | Cadastra (valida CPF, impede duplicidade) | REQF001 |
| PUT | `/api/pacientes/:id` | Atualiza dados | REQF003 |

Não existe DELETE de propósito: o paciente tem agendamentos e prontuário ligados.

## Problemas comuns
| Mensagem | Causa e solução |
|---|---|
| `password authentication failed` | Senha errada no `.env` |
| `ECONNREFUSED` / "Servidor indisponível" | Serviço do PostgreSQL parado (`services.msc`) ou API fora do ar |
| `database "sgcp" does not exist` | Rode `CREATE DATABASE sgcp;` no psql |
| `relation "pacientes" does not exist` | O `schema.sql` não foi executado no banco `sgcp` |
| `EADDRINUSE` | Porta 3000 ocupada: mude `PORT` no `.env` |
| "CPF inválido" ao testar | O CPF precisa ser válido. Para usar CPFs fictícios, coloque `VALIDAR_CPF=false` no `.env` e reinicie |

## Estrutura
```
server.js          servidor e rotas gerais
db.js              conexão com o PostgreSQL
routes/pacientes.js rotas de pacientes (validação + SQL)
public/            front-end (index.html, style.css, script.js)
sql/schema.sql     criação do banco
.env.example       modelo de configuração (o .env real NÃO vai para o GitHub)
```
