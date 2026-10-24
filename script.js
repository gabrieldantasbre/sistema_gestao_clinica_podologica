(function () {
    "use strict";

    console.log("Script carregado com sucesso!");

    var GUIAS = {
        agenda: { title: "Agenda", sub: "Consultas de hoje e proximos agendamentos" },
        pacientes: { title: "Pacientes", sub: "Cadastro e consulta de pacientes" },
        atendimento: { title: "Atendimento", sub: "Registro de prontuario por consulta" },
        cobranca: { title: "Cobrança", sub: "Lançamentos e status de pagamento" },
        estoque: { title: "Estoque", sub: "Materiais usados nos atendimentos" }
    };

    var CHAVES = {
        pacientes: "clinica_pacientes",
        agenda: "clinica_agenda",
        prontuarios: "clinica_prontuarios",
        financeiro: "clinica_financeiro",
        estoque: "clinica_estoque"
    };

    function load(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            if (!raw) return fallback;
            var parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : fallback;
        } catch (e) { return fallback; }
    }

    function save(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error("Nãoo foi possivel salvar os dados localmente.", e);
        }
    }

    function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
    function todayISO() { return new Date().toISOString().slice(0, 10); }
    function fmtDate(iso) {
        if (!iso) return "-";
        var p = iso.split("-");
        return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : iso;
    }
    function fmtMoney(n) {
        return "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function onlyDigits(s) { return (s || "").replace(/\D/g, ""); }
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    var seeded = !localStorage.getItem(CHAVES.pacientes);
    var state = {
        pacientes: load(CHAVES.pacientes, []), agenda: load(CHAVES.agenda, []),
        prontuarios: load(CHAVES.prontuarios, []), financeiro: load(CHAVES.financeiro, []), estoque: load(CHAVES.estoque, [])
    };

    if (seeded) {
        var p1 = uid();
        var p2 = uid();
        state.pacientes = [
            { 
                id: p1, 
                nome: "Marina Souza Alves", 
                cpf: "123.456.789-00", 
                telefone: "(11) 91234-5678", 
                nascimento: "1988-04-12", 
                endereco: "Rua ” Vila Mariana" },

            { 
                id: p2, 
                nome: "Carlos Eduardo Pires", 
                cpf: "987.654.321-00", 
                telefone: "(11) 99876-5432", 
                nascimento: "1975-11-03", 
                endereco: "Av. Rio Branco, 450 ” Centro" }
        ];

        state.agenda = [
            { 
                id: uid(), 
                pacienteId: p1, 
                data: todayISO(), 
                hora: "14:00", 
                obs: "Avaliaçãoo inicial", 
                status: "confirmado" 
            },

            { 
                id: uid(), 
                pacienteId: p2, 
                data: todayISO(), 
                hora: "16:30", 
                obs: "Retorno", 
                status: "agendado"
            }
        ];

        state.prontuarios = [{ id: uid(), pacienteId: p2, data: "2026-09-18", queixa: "Unha encravada no pe direito", procedimento: "Remoção parcial ", obs: "Orientado sobre corte correto da unha e retorno em 20 dias." }];

        state.financeiro = [{ 
            id: uid(), 
            pacienteId: p2, 
            valor: 120, 
            forma: "Pix", 
            status: "pago", 
            data: "2026-09-18" 
        
        }];


        state.estoque = [
            { id: uid(), nome: "Luvas descartÃ¡veis", quantidade: 40, minimo: 20, unidade: "par" },
            { id: uid(), nome: "Ãlcool 70%", quantidade: 3, minimo: 2, unidade: "frasco" },
            { id: uid(), nome: "LÃ¢minas de bisturi nÂº15", quantidade: 6, minimo: 10, unidade: "un" }
        ];
        persistAll();
    }

 
    if (localStorage.getItem(CHAVES.financeiro) === null && state.pacientes.length) {
        state.financeiro = [{
            id: uid(), pacienteId: state.pacientes[0].id, valor: 120,
            forma: "Pix", status: "pago", data: todayISO()
        }];
        save(CHAVES.financeiro, state.financeiro);
    }
    var chaveMigracaoFinanceiro = CHAVES.financeiro + "_migracao_exemplos_v1";
    if (!localStorage.getItem(chaveMigracaoFinanceiro)) {
        if (!state.financeiro.length && state.pacientes.length) {
            state.financeiro = [{
                id: uid(), pacienteId: state.pacientes[0].id, valor: 120,
                forma: "Pix", status: "pago", data: todayISO()
            }];
            save(CHAVES.financeiro, state.financeiro);
        }
        localStorage.setItem(chaveMigracaoFinanceiro, "1");
    }
    if (localStorage.getItem(CHAVES.estoque) === null) {
        state.estoque = [
            { id: uid(), nome: "Luvas descartáveis", quantidade: 40, minimo: 20, unidade: "par" },
            { id: uid(), nome: "Álcool 70%", quantidade: 3, minimo: 2, unidade: "frasco" },
            { id: uid(), nome: "Lâminas de bisturi nº 15", quantidade: 6, minimo: 10, unidade: "un" }
        ];
        save(CHAVES.estoque, state.estoque);
    }

    function persistAll() {
        save(CHAVES.pacientes, state.pacientes);
        save(CHAVES.agenda, state.agenda);
        save(CHAVES.prontuarios, state.prontuarios);
        save(CHAVES.financeiro, state.financeiro);
        save(CHAVES.estoque, state.estoque);
    }

    function pacienteNome(id) {
        var p = state.pacientes.filter(function (x) { return x.id === id; })[0];
        return p ? p.nome : "Paciente removido";
    }

    function trocaGuia(name) {
        if (!GUIAS[name]) { console.error("Guia nÃ£o encontrada: ", name); return; }
        document.querySelectorAll(".guia-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === name); });
        document.querySelectorAll(".panel").forEach(function (p) { p.classList.toggle("active", p.id === "guia-" + name); });
        document.getElementById("painelTitulo").textContent = GUIAS[name].title;
        document.getElementById("painelsubtitulo").textContent = GUIAS[name].sub;
    }
    document.getElementById("guiaNav").addEventListener("click", function (e) {
        var btn = e.target.closest(".guia-btn");
        if (btn) trocaGuia(btn.dataset.tab);
    });

    function fillPacienteSelects() {
        var selects = [document.getElementById("agPaciente"), document.getElementById("atPaciente"), document.getElementById("cbPaciente")];
        var opts = state.pacientes.length
            ? state.pacientes.map(function (p) { return '<option value="' + p.id + '">' + esc(p.nome) + "</option>"; }).join("")
            : '<option value="">Cadastre um paciente primeiro</option>';
        selects.forEach(function (s) { if (s) s.innerHTML = opts; });
    }

    function carregarStats() {
        var hoje = todayISO();

        var consultaHoje = state.agenda.filter(function (a) { return a.data === hoje; }).length;

        var pendencias = state.financeiro.filter(function (f) { return f.status === "pendente"; }).length;

        var estoqueBaixo = state.estoque.filter(function (e) { return Number(e.quantidade) <= Number(e.minimo); }).length;

        var cards = [
            { num: consultaHoje, lbl: "Consultas hoje" },
            { num: state.pacientes.length, lbl: "Pacientes cadastrados" },
            { num: pendencias, lbl: "Cobranças pendentes", warn: pendencias > 0 },
            { num: estoqueBaixo, lbl: "Itens com estoque baixo", warn: estoqueBaixo > 0 }
        ];
        document.getElementById("statrow").innerHTML = cards.map(function (c) {
            return '<div class="stat-card' + (c.warn ? " warn" : "") + '"><div class="num">' + c.num + '</div><div class="lbl">' + c.lbl + '</div></div>';
        }).join("");
    }

    function carregarAgenda() {
        var rows = state.agenda.slice().sort(function (a, b) { return (a.data + a.hora).localeCompare(b.data + b.hora); });

        var el = document.getElementById("agendaList");

        if (!rows.length) { 
            el.innerHTML = '<div class="empty"> Nenhum agendamento ainda. Use o formulÃ¡rio ao lado para marcar a primeira consulta. </div>'; return; 
        }

        var statusLabel = { 
            agendado: ["Agendado", "pending"], 
            confirmado: ["Confirmado", "ok"], 
            concluido: ["Concluido", "ok"], 
            cancelado: ["Cancelado", "low"] 
        };

        el.innerHTML = '<table><thead><tr><th>Paciente</th><th>Data</th><th>Hora</th><th>Status</th></tr></thead><tbody>' + rows.map(function (a) {
            var st = statusLabel[a.status] || ["Agendado", "pending"];
            return "<tr><td>" + esc(pacienteNome(a.pacienteId)) + (a.obs ? '<div style="color: var( --muted); font-size:12px;">' + '</div>' : "") + "</td><td>" + fmtDate(a.data) + esc(a.hora) + '</td><td><span class="badge ' + st[1] + '">' + st[0] + "</span></td></tr>";
        }).join("") + "</tbody></table>";
    }

    document.getElementById("formagendamento").addEventListener("submit", function (e) {
        e.preventDefault();
        if (!state.pacientes.length) { 
            alert("Cadastre um paciente antes de agendar."); return; 
        }
        state.agenda.push({ 

            id: uid(), 
            pacienteId: document.getElementById("agPaciente").value, 
            data: document.getElementById("agData").value, 
            hora: document.getElementById("agHora").value, 
            obs: document.getElementById("agObs").value.trim(), 
            status: "agendado" 

        });

        save(CHAVES.agenda, state.agenda);
        e.target.reset();
        carregarAgenda();
        carregarStats();
    });

    // -- Pacientes (vericação e gravar)

    function carregarPaciente(filter) {

        var el = document.getElementById("listapacientes");
        var lista = state.pacientes;

        if (filter) {
            var f = filter.toLowerCase();
            lista = lista.filter(function (p) {
                return p.nome.toLowerCase().indexOf(f) > -1 || onlyDigits(p.cpf).indexOf(onlyDigits(f)) > -1;
            });
        }

        if (!lista.length) {
            el.innerHTML = '<div class="empty">' + (state.pacientes.length ? "Nenhum paciente encontrado para essa busca." : "Nenhum paciente cadastrado ainda.") + "</div>";
            return;
        }

        el.innerHTML = '<table><thead><tr><th>Nome</th><th>CPF</th><th>Telefone</th></tr></thead><tbody>' + lista.slice().reverse().map(function (p) {
            return "<tr><td>" + esc(p.nome) + "</td><td>" + esc(p.cpf) + "</td><td>" + esc(p.telefone || "-") + "</td></tr>";
        }).join("") + "</tbody></table>";
    }

    document.getElementById("pcPesquisa").addEventListener("input", function (e) {
        carregarPaciente(e.target.value);
    });

    document.getElementById("formPaciente").addEventListener("submit", function (e) {
        e.preventDefault();

        var msg = document.getElementById("pcMsg");
        if (msg) msg.textContent = "";

        var nome = document.getElementById("pcNome").value.trim();
        var cpf = document.getElementById("pcCpf").value.trim();

        var digitoCpf  = onlyDigits(cpf);

        var existentes = state.pacientes.filter(function (p) {
            return onlyDigits(p.cpf) === digitoCpf && digitoCpf;
        })[0];

        if (existentes) {
            if (msg) msg.textContent = "Já existe um paciente cadastrado com esse CPF: " + existentes.nome;
            return;
        }

        state.pacientes.push({
            id: uid(),
            nome: nome,
            cpf: cpf,
            telefone: document.getElementById("pcTel").value.trim(),
            endereco: document.getElementById("pcEnd").value,
            nascimento: document.getElementById("pcNas").value.trim()
        });

        save(CHAVES.pacientes, state.pacientes);
        e.target.reset();
        fillPacienteSelects();
        carregarPaciente(), carregarStats();

    });

    function carregarProntuario() {
        var el = document.getElementById("prontuarioList");
        var rows = state.prontuarios.slice().sort(function (a, b) { 
            return b.data.localeCompare(a.data);
        })

        if (!rows.length) {
            el.innerHTML = '<div class="field"> Nenhum atendimento registrado ainda. </div>'; return;
        }
        el.innerHTML = '<table><thead><tr><th>Paciente</th><th>Data</th><th>Queixa / procedimento</th></tr></thead><tbody>' + rows.map(function (r) {
            return "<tr><td>" + esc(pacienteNome(r.pacienteId)) + "</td><td>" + fmtDate(r.data) + "</td><td>" + esc(r.queixa) + (r.procedimento ? '<div style="color: var(--muted); font-size: 12px;">' + esc(r.procedimento) + "</div>" : "") + "</td></tr>";
        }).join("") + "</tbody></table>";
    }

    document.getElementById("formAtendimento").addEventListener("submit", function (e) {
        e.preventDefault();
        if (!state.pacientes.length) {
            alert("Cadastre um paciente antes de registrar um atendimento."); return;
        }

        state.prontuarios.push({
            id: uid(),
            pacienteId: document.getElementById("atPaciente").value,
            data: document.getElementById("atData").value || todayISO(),
            queixa: document.getElementById("atQueixa").value.trim(),
            procedimento: document.getElementById("atProc").value.trim(),
            obs: document.getElementById("atObs").value.trim()
        });

        save(CHAVES.prontuarios, state.prontuarios);
        e.target.reset();
        carregarProntuario();
    });

    // cobrança -----------------
    function carregarCobranca() {
        var el = document.getElementById("cobrancaList");
        var rows = state.financeiro.slice().sort(function (a, b) {
            return String(b.data || "").localeCompare(String(a.data || ""));
        });

        if (!rows.length) {
            el.innerHTML = '<div class="empty">Nenhuma cobrança registrada ainda.</div>'; return;
        }

        el.innerHTML = '<table><thead><tr><th>Paciente</th><th>Valor</th><th>Forma</th><th>Status</th></tr></thead><tbody>' + rows.map (function (f) {
            var badge = f.status === "pago" ? '<span class="badge ok">Pago</span>' : '<span class="badge pending">Pendente</span>';
            return "<tr><td>" + esc(pacienteNome(f.pacienteId)) + "</td><td>" + fmtMoney(f.valor) + "</td><td>" + esc(f.forma) + "</td><td>" + badge + "</td></tr>";
        }).join("") + "</tbody></table>";
    }

    document.getElementById("formCobranca").addEventListener("submit", function(e) {
        e.preventDefault();
        if (!state.pacientes.length) {
            alert("Cadastre um paciente antes de lançar uma cobrança."); return;
        }

        state.financeiro.push({
            id: uid(),
            pacienteId: document.getElementById("cbPaciente").value,
            valor: parseFloat(document.getElementById("cbValor").value || "0"),
            forma: document.getElementById("cbForma").value,
            status: document.getElementById("cbStatus").value,
            data: todayISO()
        });


        save(CHAVES.financeiro, state.financeiro);
        e.target.reset();
        carregarCobranca();
        carregarStats();
    });

    // Estoque -----------

    function carregarEstoque() {
        var el = document.getElementById("estoqueList");
        if (!state.estoque.length) {
            el.innerHTML = '<div class="empty">Nenhum item cadastrado ainda.</div>'; return;
        }

        el.innerHTML = '<table><thead><tr><th>Material</th><th>Quantidade</th><th></th></tr></thead><tbody>' + 
            state.estoque.map(function (it) {
                var low = Number(it.quantidade) <=Number(it.minimo);
                return "<tr><td>" + esc(it.nome) + (low ? ' <span class="badge low">Estoque baixo</span>' : "") + '</td><td><div class="qty-ctl">' +
                '<button type="button" data-act="dec" data-id="' + it.id + '">−</button><span>' + it.quantidade + " " + esc(it.unidade || "un") + '</span>' +
                '<button type="button" data-act="inc" data-id="' + it.id + '">+</button></div></td><td></td></tr>';
            }).join("") + "</tbody></table>";
    }

    document.getElementById("formEstoque").addEventListener("submit", function (e) {
        e.preventDefault();
        state.estoque.push({
            id: uid(),
            nome: document.getElementById("esNome").value.trim(),
            quantidade: Number(document.getElementById("esQtd").value || 0),
            unidade: document.getElementById("esUnidade").value.trim(),
            minimo: Number(document.getElementById("esMin").value || 0)
        });
        save(CHAVES.estoque, state.estoque);
        e.target.reset();
        document.getElementById("esMin").value = 5;
        carregarEstoque();
        carregarStats();
    });

    document.getElementById("estoqueList").addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-act]");
        if(!btn) return;
        var item = state.estoque.filter(function (i) {
            return i.id === btn.dataset.id;
        })[0];

        if (!item) return;
        item.quantidade = Math.max(0, Number(item.quantidade) + (btn.dataset.act === "inc" ? 1 : -1));
        save(CHAVES.estoque, state.estoque);
        carregarEstoque();
        carregarStats();
    });



    // INIT
    document.getElementById("agData").value = todayISO();
    document.getElementById("atData").value = todayISO();
    fillPacienteSelects();
    carregarPaciente();
    carregarStats();
    carregarAgenda();
    carregarProntuario();
    carregarCobranca();
    carregarEstoque();
})();
