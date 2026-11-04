-- =====================================================================
-- SGCP - Sistema de Gestão para Clínica Podológica
-- Derivado do diagrama de classes (Fig. 2) e dos requisitos REQF/RN.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ACESSO  (REQF029, RQNF006, RQNF007)
-- Usuario / Podologa / Recepcionista -> uma tabela com perfil.
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome                  VARCHAR(120) NOT NULL,
    email                 VARCHAR(160) NOT NULL UNIQUE,
    senha_hash            VARCHAR(255) NOT NULL,           
    perfil                VARCHAR(20)  NOT NULL
                          CHECK (perfil IN ('PODOLOGA', 'RECEPCIONISTA')),
    registro_profissional VARCHAR(30),                     
    ativo                 BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_registro_podologa
        CHECK (perfil <> 'PODOLOGA' OR registro_profissional IS NOT NULL)
);

-- ---------------------------------------------------------------------
-- PACIENTES  (REQF001-003, RN001)
-- ---------------------------------------------------------------------
CREATE TABLE pacientes (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome            VARCHAR(120) NOT NULL,
    cpf             CHAR(11)     NOT NULL UNIQUE,         
    data_nascimento DATE,
    telefone        VARCHAR(20),
    email           VARCHAR(160),
    endereco        VARCHAR(200),
    data_cadastro   DATE         NOT NULL DEFAULT CURRENT_DATE,
    CONSTRAINT ck_cpf_digitos CHECK (cpf ~ '^[0-9]{11}$')
);

CREATE TABLE fichas_anamnese (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paciente_id        BIGINT NOT NULL UNIQUE
                       REFERENCES pacientes(id) ON DELETE RESTRICT,
    data_preenchimento DATE   NOT NULL DEFAULT CURRENT_DATE,
    queixa_principal   VARCHAR(255),
    diabetico          BOOLEAN NOT NULL DEFAULT FALSE,
    alergias           TEXT,
    medicamentos_em_uso TEXT,
    observacoes        TEXT
);


CREATE TABLE agendamentos (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    paciente_id          BIGINT NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    registrado_por       BIGINT REFERENCES usuarios(id),    
    data_hora            TIMESTAMP NOT NULL,
    duracao_prevista_min INT NOT NULL DEFAULT 60 CHECK (duracao_prevista_min > 0),  -- RN008
    status               VARCHAR(15) NOT NULL DEFAULT 'AGENDADO'
                         CHECK (status IN ('AGENDADO','CONFIRMADO','CONCLUIDO','CANCELADO','FALTOU')),
    origem               VARCHAR(15) NOT NULL
                         CHECK (origem IN ('PRESENCIAL','WHATSAPP','ONLINE')),
    tipo                 VARCHAR(15) NOT NULL DEFAULT 'CONSULTA'
                         CHECK (tipo IN ('CONSULTA','RETORNO')),
    encaixe_urgencia     BOOLEAN NOT NULL DEFAULT FALSE,   -- RN006
    observacao           VARCHAR(255)
);
CREATE INDEX ix_agendamentos_data ON agendamentos (data_hora);
CREATE INDEX ix_agendamentos_paciente ON agendamentos (paciente_id);

CREATE UNIQUE INDEX ux_agendamento_horario_ativo
    ON agendamentos (data_hora)
    WHERE status NOT IN ('CANCELADO') AND encaixe_urgencia = FALSE;

CREATE TABLE lembretes (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agendamento_id BIGINT NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
    data_envio     TIMESTAMP NOT NULL,
    canal          VARCHAR(10) NOT NULL CHECK (canal IN ('WHATSAPP','SMS','EMAIL')),
    status         VARCHAR(10) NOT NULL DEFAULT 'PENDENTE'
                   CHECK (status IN ('PENDENTE','ENVIADO','FALHOU'))
);

-- ---------------------------------------------------------------------
-- ATENDIMENTO  (REQF011-015, RN007, RN011-RN014)
-- ---------------------------------------------------------------------
CREATE TABLE procedimentos (            
    id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome                VARCHAR(120) NOT NULL UNIQUE,
    descricao           TEXT,
    valor_referencia    NUMERIC(10,2) NOT NULL CHECK (valor_referencia >= 0),
    duracao_media_min   INT NOT NULL DEFAULT 60 CHECK (duracao_media_min > 0)
);

CREATE TABLE atendimentos (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agendamento_id BIGINT NOT NULL UNIQUE REFERENCES agendamentos(id),  
    podologa_id    BIGINT NOT NULL REFERENCES usuarios(id),             -- RN007
    inicio         TIMESTAMP NOT NULL,
    fim            TIMESTAMP,
    valor_final    NUMERIC(10,2) CHECK (valor_final >= 0),              -- RN012
    status         VARCHAR(15) NOT NULL DEFAULT 'EM_ANDAMENTO'
                   CHECK (status IN ('EM_ANDAMENTO','CONCLUIDO','CANCELADO')),
    CONSTRAINT ck_fim_apos_inicio CHECK (fim IS NULL OR fim >= inicio)
);


ALTER TABLE agendamentos
    ADD COLUMN atendimento_origem_id BIGINT REFERENCES atendimentos(id);

CREATE TABLE itens_atendimento (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    atendimento_id  BIGINT NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
    procedimento_id BIGINT NOT NULL REFERENCES procedimentos(id),
    quantidade      INT NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    valor_cobrado   NUMERIC(10,2) NOT NULL CHECK (valor_cobrado >= 0)
);

CREATE TABLE evolucoes_caso (           -- REQF013
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    atendimento_id BIGINT NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
    data           DATE NOT NULL DEFAULT CURRENT_DATE,
    descricao      TEXT NOT NULL
);

CREATE TABLE orientacoes_pos_atendimento (   -- REQF014
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    atendimento_id BIGINT NOT NULL REFERENCES atendimentos(id) ON DELETE CASCADE,
    descricao      TEXT NOT NULL
);

-- ---------------------------------------------------------------------
-- ESTOQUE  (REQF016-019, REQF027)
-- ---------------------------------------------------------------------
CREATE TABLE produtos (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome             VARCHAR(120) NOT NULL UNIQUE,
    unidade_medida   VARCHAR(20)  NOT NULL,
    quantidade_atual NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (quantidade_atual >= 0),
    estoque_minimo   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
    ativo            BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE movimentacoes_estoque (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    produto_id     BIGINT NOT NULL REFERENCES produtos(id),
    atendimento_id BIGINT REFERENCES atendimentos(id),   
    tipo           VARCHAR(10) NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA')),
    quantidade     NUMERIC(10,2) NOT NULL CHECK (quantidade > 0),
    data_hora      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    motivo         VARCHAR(200)
);
CREATE INDEX ix_mov_estoque_produto ON movimentacoes_estoque (produto_id, data_hora);

CREATE FUNCTION fn_atualiza_estoque() RETURNS TRIGGER AS $$
BEGIN
    UPDATE produtos
       SET quantidade_atual = quantidade_atual +
           CASE NEW.tipo WHEN 'ENTRADA' THEN NEW.quantidade ELSE -NEW.quantidade END
     WHERE id = NEW.produto_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualiza_estoque
    AFTER INSERT ON movimentacoes_estoque
    FOR EACH ROW EXECUTE FUNCTION fn_atualiza_estoque();

-- ---------------------------------------------------------------------
-- FINANCEIRO  (REQF020-026, RN013-RN014)

-- ---------------------------------------------------------------------
CREATE TABLE contas_pagar (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    descricao      VARCHAR(200) NOT NULL,
    valor          NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    vencimento     DATE NOT NULL,
    data_pagamento DATE,
    status         VARCHAR(10) NOT NULL DEFAULT 'PENDENTE'
                   CHECK (status IN ('PENDENTE','PAGA','VENCIDA')),
    CONSTRAINT ck_paga_com_data CHECK (status <> 'PAGA' OR data_pagamento IS NOT NULL)
);

CREATE TABLE movimentacoes_financeiras (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('RECEITA','DESPESA')),
    valor           NUMERIC(10,2) NOT NULL CHECK (valor > 0),
    data            DATE NOT NULL DEFAULT CURRENT_DATE,
    descricao       VARCHAR(200),
    forma_pagamento VARCHAR(15) CHECK (forma_pagamento IN ('PIX','CARTAO','DINHEIRO','TRANSFERENCIA','BOLETO')),
    atendimento_id  BIGINT UNIQUE REFERENCES atendimentos(id),   
    conta_pagar_id  BIGINT UNIQUE REFERENCES contas_pagar(id),   
   
    CONSTRAINT ck_receita CHECK (tipo <> 'RECEITA' OR conta_pagar_id IS NULL),
    CONSTRAINT ck_despesa CHECK (tipo <> 'DESPESA' OR atendimento_id IS NULL)
);
CREATE INDEX ix_mov_fin_data ON movimentacoes_financeiras (data, tipo);

-- ---------------------------------------------------------------------
-- RELATÓRIOS E DASHBOARD (REQF025-028): não são tabelas, são consultas.
-- ---------------------------------------------------------------------
CREATE VIEW vw_estoque_baixo AS
    SELECT id, nome, quantidade_atual, estoque_minimo, unidade_medida
      FROM produtos
     WHERE ativo AND quantidade_atual <= estoque_minimo;

CREATE VIEW vw_resumo_financeiro_mensal AS
    SELECT date_trunc('month', data)::date AS mes,
           SUM(valor) FILTER (WHERE tipo = 'RECEITA') AS receitas,
           SUM(valor) FILTER (WHERE tipo = 'DESPESA') AS despesas,
           COALESCE(SUM(valor) FILTER (WHERE tipo = 'RECEITA'), 0)
         - COALESCE(SUM(valor) FILTER (WHERE tipo = 'DESPESA'), 0) AS saldo
      FROM movimentacoes_financeiras
     GROUP BY 1
     ORDER BY 1;
