import { abrirModalTarefas } from "./components/modalTarefas.js";
import { abrirModalCadastro } from "./components/modalCadastro.js";
import { abrirModalEdicao } from "./components/modalEdicao.js";

// --- CONFIGURAÇÃO E CONSTANTES ---
const supabaseUrl = 'https://rtrjdiocezpityurvhpb.supabase.co';
const supabaseKey = 'sb_publishable_Y9Jrgq2ylUEbcPGMG74fng_i5I0s5Oq';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// --- SISTEMA DE LOG (AUDITORIA) ---

/**
 * Registra qualquer alteração no banco de dados na tabela de logs.
 * @param {string} acao - O que foi feito (Ex: EXCLUIR ALUNO)
 * @param {string} tabela - Tabela afetada
 * @param {object} detalhes - Informações extras para auditoria
 */
async function registrarLog(acao, tabela, detalhes = {}) {
    const usuario = JSON.parse(sessionStorage.getItem('usuario_logado'));
    
    await _supabase.from('logs').insert([{
        usuario: usuario ? usuario.nome : "Desconhecido",
        acao: acao.toUpperCase(),
        tabela: tabela.toLowerCase(),
        detalhes: {
            ...detalhes,
            cargo_autor: usuario ? usuario.cargo : "N/A",
            horario_local: new Date().toLocaleString('pt-BR')
        }
    }]);
}

// --- FUNÇÕES DE APOIO (UTILITÁRIOS) ---

const formatarDataBR = (dataISO) => {
    if (!dataISO || dataISO === "---") return "---";
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
};

const calcularTempoConclusao = (dataTermino) => {
    if (!dataTermino) return "---";
    const diffMs = new Date(dataTermino) - new Date();
    if (diffMs < 0) return "---";
    
    const totalDias = Math.floor(diffMs / MS_PER_DAY);
    const meses = Math.floor(totalDias / 30);
    const semanas = Math.floor((totalDias % 30) / 7);
    const dias = totalDias % 7;
    return `${meses}m, ${semanas}sem e ${dias}d`;
};

const tempoConclusaoEmDias = (dataTermino) => {
    const dataFim = new Date(dataTermino);
    if (isNaN(dataFim.getTime())) return false;
    
    const diffMs = dataFim - new Date();
    const totalDias = Math.floor(diffMs / MS_PER_DAY);
    return totalDias <= 30 && totalDias > 0;
};

const calcularStatusFrequencia = (historico) => {
    if (!historico?.length) return "---";
    const datas = historico.map(p => new Date(p.data_presenca));
    const ultima = new Date(Math.max(...datas));
    const diff = Math.floor((new Date() - ultima) / MS_PER_DAY);
    return diff >= 14 ? "Muitas Faltas" : "Regular";
};

// --- FUNÇÕES DE APOIO (UTILITÁRIOS) ---

function atualizarOpcoesHorario() {
    const selectTurma = document.getElementById('turma');
    const selectDia = document.getElementById('dia');
    const selectHorario = document.getElementById('horario');
    
    if (!selectTurma || !selectHorario) return;

    const turma = selectTurma.value;
    const dia = selectDia ? selectDia.value : 'todos';
    const eBloco2h = (dia === 'sexta' || dia === 'sabado');

    const horarios = {
        manha: [
            { label: "08:00 - 09:00", bloco: 1 },
            { label: "09:00 - 10:00", bloco: 1 },
            { label: "10:00 - 11:00", bloco: 1 },
            { label: "11:00 - 12:00", bloco: 1 },
            { label: "08:00 - 10:00", bloco: 2 },
            { label: "10:00 - 12:00", bloco: 2 }
        ],
        tarde: [
            { label: "14:00 - 15:00", bloco: 1 },
            { label: "15:00 - 16:00", bloco: 1 },
            { label: "16:00 - 17:00", bloco: 1 },
            { label: "17:00 - 18:00", bloco: 1 },
            { label: "14:00 - 16:00", bloco: 2 },
            { label: "16:00 - 18:00", bloco: 2 }
        ]
    };

    const valorAntigo = selectHorario.value;
    selectHorario.innerHTML = '<option value="todos">Todos</option>';

    const listaParaRenderizar = horarios[turma] || [...horarios.manha, ...horarios.tarde];

    listaParaRenderizar.forEach(item => {
        if ((eBloco2h && item.bloco === 2) || (!eBloco2h && item.bloco === 1)) {
            const opt = document.createElement('option');
            opt.value = item.label;
            opt.textContent = item.label;
            selectHorario.appendChild(opt);
        }
    });

    selectHorario.value = Array.from(selectHorario.options).some(o => o.value === valorAntigo) 
        ? valorAntigo 
        : 'todos';
}

// --- LÓGICA DE DADOS (SUPABASE & RENDER) ---

async function carregarAlunos() {
    const tabela = document.getElementById('corpo-tabela');
    if (!tabela) return;

    // --- CAPTURA DOS FILTROS ---
    const valorTurma = document.getElementById('turma').value;
    const valorDia = document.getElementById('dia').value;
    const valorHorario = document.getElementById('horario').value;
    const termoPesquisa = document.getElementById('pesquisa').value.toLowerCase();

    const deParaTurma = { "manha": "Manhã", "tarde": "Tarde" };
    const deParaDia = { 
        "segunda": "Segunda/Terça", 
        "quarta": "Quarta/Quinta", 
        "sexta": "Sexta", 
        "sabado": "Sábado" 
    };

    // --- CONSTRUÇÃO DA QUERY ---
    let query = _supabase
        .from('alunos')
        .select('*, frequencia(*), tarefas(*)')
        .order('nome'); 

    // Filtro de Turma (Sempre aplicado)
    if (valorTurma !== "todos") {
        query = query.eq('turma', deParaTurma[valorTurma]);
    }
    
    // Filtro de Dia (Inclui Flexíveis)
    if (valorDia !== "todos") {
        query = query.in('dia_aula', [deParaDia[valorDia], 'Flexível']);
    }

    // --- FILTRO DE HORÁRIO ---
    if (valorHorario !== "todos") {
        const diaSelecionado = document.getElementById('dia').value;
        const diasSemFlexivel = ['sexta', 'sabado'];

        if (diasSemFlexivel.includes(diaSelecionado)) {
            // Na sexta e sábado, traz APENAS o horário exato
            query = query.eq('horario_estudo', valorHorario);
        } else {
            // Nos outros dias, traz o horário exato OU Flexível
            query = query.or(`horario_estudo.eq."${valorHorario}",horario_estudo.eq."Flexível"`);
        }
    }

    const { data: alunos, error } = await query;
    if (error) return console.error('Erro:', error.message);

    atualizarContagemPresentes(alunos);

    // --- 3. RENDERIZAÇÃO ---
    const hoje = new Date().toISOString().split('T')[0];
    const fragmento = document.createDocumentFragment();

    alunos.filter(a => a.nome.toLowerCase().includes(termoPesquisa)).forEach(aluno => {
        const freqStatus = calcularStatusFrequencia(aluno.frequencia);
        const presencaHoje = (aluno.frequencia || []).find(p => p.data_presenca === hoje);
        const tarefasPendentes = (aluno.tarefas || []).filter(t => !t.concluida).length;
        const ordenado = (aluno.frequencia || []).sort((a, b) => new Date(b.data_presenca) - new Date(a.data_presenca));
        const ultimaData = ordenado[0]?.data_presenca || "---";

        const exibirHorario = aluno.horario_estudo && aluno.horario_estudo !== 'Flexível' 
            ? aluno.horario_estudo 
            : (aluno.horario_estudo === 'Flexível' ? 'Flexível' : 'SEM HORÁRIO');

        const exibirUltimaPresenca = (ultimaData === hoje) 
            ? `<span style="color: #28a745; font-weight: bold;">Presente Hoje</span>` 
            : formatarDataBR(ultimaData);

        const tr = document.createElement('tr');
        tr.className = `aluno ${presencaHoje ? 'presente-hoje' : ''}`;
        tr.innerHTML = `
            <td>
                ${aluno.nome}
                <div style="font-size: 0.75rem; color: #666; margin-top: 2px;">
                    ${exibirHorario}
                </div>
            </td>
            <td>${formatarDataBR(aluno.data_termino)}</td>
            <td class="${tempoConclusaoEmDias(aluno.data_termino) ? 'rematricula' : ''}">
                ${tempoConclusaoEmDias(aluno.data_termino) ? 
                    (aluno.rematricula === 'no' ? 
                        `<button onclick="marcarRematricula(${aluno.id}, '${aluno.nome}')" class="no">Aguardando Rematrícula</button>` :
                        `<button onclick="desmarcarRematricula(${aluno.id}, '${aluno.nome}')" class="yes">Rematrícula OK</button>`
                    ) : calcularTempoConclusao(aluno.data_termino)
                }
            </td>
            <td>${exibirUltimaPresenca}</td>
            <td class="status-frequencia ${freqStatus === 'Muitas Faltas' ? 'muitas-faltas' : ''}">
                ${freqStatus === 'Muitas Faltas' ? 
                    (aluno.contato_f === 'no' || !aluno.contato_f ? 
                        `<button onclick="marcarContatoFaltas(${aluno.id}, '${aluno.nome}')" class="no">Muitas Faltas</button>` :
                        `<button onclick="desmarcarContatoFaltas(${aluno.id}, '${aluno.nome}')" class="yes">Contato Feito</button>`
                    ) : freqStatus
                }
            </td>
            <td>${aluno.certificado_premium}</td>
            <td>
                <div class="operacoes">
                    <div class="dropdown" onclick="toggleDropdown(event, this)">
                    ${tarefasPendentes > 0 ? `<span class="badge variante-absoluta">${tarefasPendentes}</span>` : ''}
                        <button class="dropdown-btn"><i class="ri-menu-line"></i></button>
                        <div class="dropdown-content">
                            <button class="" title="${presencaHoje ? 'Desmarcar' : 'Marcar'}" 
                                onclick="${presencaHoje ? `desmarcarPresenca(${presencaHoje.id}, ${aluno.id}, '${aluno.nome}')` : `marcarPresenca(${aluno.id}, '${aluno.nome}')`}"
                                style="${presencaHoje ? 'color: #28a745;' : ''}">
                                <i class="${presencaHoje ? 'ri-check-double-line' : 'ri-check-line'}"></i>
                                <span>${presencaHoje ? 'Desmarcar' : 'Marcar Presença'}</span>
                            </button>
                            <button class="" onclick="verTarefas(${aluno.id})">
                                <i class="ri-survey-fill"></i>
                                <span>Adicionar Tarefa</span>
                                ${tarefasPendentes > 0 ? `<span class="badge">${tarefasPendentes}</span>` : ''}
                            </button>
                            <button class="" onclick="excluirAluno(${aluno.id}, '${aluno.nome}')">
                                <i class="ri-delete-bin-fill"></i>
                                <span>Excluir Aluno</span>
                            </button>
                            <button class="" onclick="editarAluno(${aluno.id})">
                                <i class="ri-edit-fill"></i>
                                <span>Editar Aluno</span>
                            </button>
                        </div>
                    </div>
                </div>
            </td>`;
        fragmento.appendChild(tr);
    });

    tabela.innerHTML = '';
    tabela.appendChild(fragmento);
}

// FUNÇÕES DE APOIO (UTILITÁRIOS)

function atualizarContagemPresentes(alunos) {
    const spanQtd = document.getElementById('qtd-presente');
    if (!spanQtd) return;

    const hoje = new Date().toISOString().split('T')[0];

    const totalPresentes = alunos.filter(aluno => {
        // Ignora flexíveis na contagem
        if (aluno.horario_estudo === 'Flexível' || aluno.dia_aula === 'Flexível') {
            return false;
        }

        // Verifica se existe presença hoje
        return (aluno.frequencia || []).some(p => p.data_presenca === hoje);
    }).length;

    // Atualiza o texto do span
    spanQtd.textContent = totalPresentes > 0 ? `(${totalPresentes})` : '';
}

// --- AÇÕES GLOBAIS (WINDOW) ---

window.marcarPresenca = async (id, nome) => {
    const hoje = new Date().toISOString().split('T')[0];
    const { error: erroPresenca } = await _supabase.from('frequencia').insert([{ aluno_id: id, data_presenca: hoje }]);

    if (erroPresenca) {
        const msg = erroPresenca.code === '23505' ? 'Presença de hoje já foi marcada!' : 'Erro ao marcar presença.';
        Swal.fire('Atenção', msg, erroPresenca.code === '23505' ? 'info' : 'error');
        return;
    }

    await _supabase.from('alunos').update({ contato_f: 'no' }).eq('id', id);
    
    await registrarLog('MARCAR_PRESENCA', 'frequencia', { aluno: nome, aluno_id: id, data: hoje });
    carregarAlunos();
};

window.desmarcarPresenca = (presencaId, alunoId, nome) => {
    Swal.fire({
        title: 'Desmarcar?',
        text: `O registro de hoje para ${nome} será removido.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, desmarcar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { error } = await _supabase.from('frequencia').delete().eq('id', presencaId);
            if (!error) {
                await registrarLog('DESMARCAR_PRESENCA', 'frequencia', { aluno: nome, aluno_id: alunoId });
                carregarAlunos();
            }
        }
    });
};

window.excluirAluno = (id, nome) => {
    Swal.fire({
        title: 'Confirmar Exclusão',
        text: `Deseja excluir o aluno ${nome} e todo o histórico?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            await _supabase.from('alunos').delete().eq('id', id);
            await registrarLog('EXCLUIR_ALUNO', 'alunos', { aluno_deletado: nome, id_deletado: id });
            carregarAlunos();
        }
    });
};

window.verTarefas = id => abrirModalTarefas(id, _supabase);

// Para cadastros e edições, o log deve ser inserido dentro dos componentes ou após o retorno da função.
window.editarAluno = id => abrirModalEdicao(id, _supabase, async () => {
    await registrarLog('EDITAR_ALUNO', 'alunos', { aluno_id: id });
    carregarAlunos();
});

window.abrirModalCadastro = () => abrirModalCadastro(_supabase, async () => {
    await registrarLog('CADASTRAR_ALUNO', 'alunos', { info: 'Novo aluno adicionado' });
    carregarAlunos();
});

window.concluirTarefa = async (idTarefa, alunoId) => {
    const { error } = await _supabase.from('tarefas').update({ concluida: true }).eq('id', idTarefa);
    if (!error) {
        await registrarLog('CONCLUIR_TAREFA', 'tarefas', { tarefa_id: idTarefa, aluno_id: alunoId });
        document.getElementById('modal-tarefas')?.remove();
        abrirModalTarefas(alunoId, _supabase);
    }
};

window.deletarTarefa = async (idTarefa, alunoId) => {
    Swal.fire({ title: 'Excluir tarefa?', icon: 'question', showCancelButton: true }).then(async (result) => {
        if (result.isConfirmed) {
            const { error } = await _supabase.from('tarefas').delete().eq('id', idTarefa);
            if (!error) {
                await registrarLog('DELETAR_TAREFA', 'tarefas', { tarefa_id: idTarefa, aluno_id: alunoId });
                document.getElementById('modal-tarefas')?.remove();
                abrirModalTarefas(alunoId, _supabase);
            }
        }
    });
};

window.marcarRematricula = async (id, nome) => {
    Swal.fire({ title: `Confirmar rematrícula de ${nome}?`, icon: 'warning', showCancelButton: true }).then(async (result) => {
        if (result.isConfirmed) {
            const { error } = await _supabase.from('alunos').update({ rematricula: 'yes' }).eq('id', id);
            if (!error) {
                await registrarLog('MARCAR_REMATRICULA', 'alunos', { aluno: nome, status: 'YES' });
                carregarAlunos();
            } else {
                Swal.fire('Erro!', error.message, 'error');
            }
        }
    });
};

window.desmarcarRematricula = async (id, nome) => {
    Swal.fire({ title: `Desmarcar rematrícula de ${nome}?`, icon: 'warning', showCancelButton: true }).then(async (result) => {
        if (result.isConfirmed) {
            const { data } = await _supabase.from('alunos').select('rematricula').eq('id', id).single();
            const novoStatus = data.rematricula === 'yes' ? 'no' : 'yes';
            await _supabase.from('alunos').update({ rematricula: novoStatus }).eq('id', id);
            await registrarLog('ALTERAR_REMATRICULA', 'alunos', { aluno: nome, novo_status: novoStatus });
            carregarAlunos();
        }
    });
};

window.marcarContatoFaltas = (id, nome) => {
    Swal.fire({ title: `Contato realizado com ${nome}?`, icon: 'warning', showCancelButton: true }).then(async (result) => {
        if (result.isConfirmed) {
            await _supabase.from('alunos').update({ contato_f: 'yes' }).eq('id', id);
            await registrarLog('CONTATO_FALTAS', 'alunos', { aluno: nome, status: 'CONTATO_FEITO' });
            carregarAlunos();
        }
    });
};

window.desmarcarContatoFaltas = (id, nome) => {
    Swal.fire({ title: `Desmarcar contato de ${nome}?`, icon: 'warning', showCancelButton: true }).then(async (result) => {
        if (result.isConfirmed) {
            await _supabase.from('alunos').update({ contato_f: 'no' }).eq('id', id);
            await registrarLog('REVERTER_CONTATO_FALTAS', 'alunos', { aluno: nome });
            carregarAlunos();
        }
    });
};

window.toggleDropdown = (event, dropdown) => {
    event.stopPropagation(); // Impede clique na tabela

    // Fecha todos os outros dropdowns
    document.querySelectorAll('.dropdown-content').forEach(dd => {
        dd.classList.remove('show');
    });

    // Toggle deste dropdown
    const content = dropdown.querySelector('.dropdown-content');
    content.classList.toggle('show');
}

// Fecha dropdowns quando clica fora
document.addEventListener('click', function() {
    document.querySelectorAll('.dropdown-content').forEach(dd => {
        dd.classList.remove('show');
    });
});

// --- 6. RELATÓRIOS (PDF) ---

const gerarTabelaPDF = (titulo, colunas, linhas, nomeArquivo, corDestaque) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`RPS-TSI | ${titulo}`, 14, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Relatório extraído em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);
    doc.autoTable({
        startY: 30,
        head: [colunas],
        body: linhas,
        headStyles: { fillColor: corDestaque },
        theme: 'striped',
        styles: { font: "helvetica", fontSize: 9 },
    });
    
    // Log da extração do PDF
    registrarLog('GERAR_RELATORIO', 'sistema', { tipo: titulo });
    
    doc.save(`${nomeArquivo}_${new Date().getTime()}.pdf`);
};

// --- 7. INICIALIZAÇÃO DA INTERFACE ---

document.addEventListener('DOMContentLoaded', () => {
    const agora = new Date();
    const hora = agora.getHours();
    const diaSemana = agora.getDay();

    const selectTurma = document.getElementById('turma');
    const selectDia = document.getElementById('dia');
    const selectHorario = document.getElementById('horario');
    const btnTermino = document.getElementById('btnTermino');
    const btnFaltas = document.getElementById('btnFaltas');

    // 1. Auto-seleção inicial de Turma e Dia
    if (selectTurma) {
        selectTurma.value = (hora < 12) ? 'manha' : 'tarde';
    }

    const mapaDias = { 1: 'segunda', 2: 'segunda', 3: 'quarta', 4: 'quarta', 5: 'sexta', 6: 'sabado' };
    if (selectDia) {
        selectDia.value = mapaDias[diaSemana] || 'todos';
    }

    // 2. Popula o select de horários com as opções corretas (Manhã/Tarde e 1h/2h)
    atualizarOpcoesHorario();

    // 3. Auto-seleção de Horário baseada na hora atual
    if (selectHorario) {
        const eFimDeSemana = (diaSemana === 5 || diaSemana === 6);
        const opcoes = Array.from(selectHorario.options);

        const opcaoParaSelecionar = opcoes.find(opt => {
            if (opt.value === "todos") return false;
            const h = opt.value.match(/\d{2}/g);
            if (h && h.length >= 4) {
                const hInicio = parseInt(h[0]);
                const hFim = parseInt(h[2]);
                const duracao = hFim - hInicio;
                const horaValida = hora >= hInicio && hora < hFim;

                if (eFimDeSemana) {
                    return horaValida && duracao === 2;
                } else {
                    return horaValida && duracao === 1;
                }
            }
            return false;
        });

        if (opcaoParaSelecionar) {
            selectHorario.value = opcaoParaSelecionar.value;
        } else {
            const fallback = opcoes.find(opt => {
                const h = opt.value.match(/\d{2}/g);
                return h && hora >= parseInt(h[0]) && hora < parseInt(h[2]);
            });
            selectHorario.value = fallback ? fallback.value : 'todos';
        }
    }

    // 4. Configuração dos Eventos de Filtro
    // Quando mudar Turma ou Dia, precisamos atualizar a lista de horários antes de carregar
    selectTurma?.addEventListener('change', () => {
        atualizarOpcoesHorario();
        carregarAlunos();
    });

    selectDia?.addEventListener('change', () => {
        atualizarOpcoesHorario();
        carregarAlunos();
    });

    // Outros filtros que não mudam a lista de opções, apenas filtram
    ['pesquisa', 'horario'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', carregarAlunos);
    });

    // --- RELATÓRIOS (Mantidos como no seu original) ---

    btnTermino?.addEventListener('click', async () => {
        const hojeISO = new Date().toISOString().split('T')[0];
        const limite = new Date();
        limite.setDate(new Date().getDate() + 29);
        const dataLimite = limite.toISOString().split('T')[0];

        const { data, error } = await _supabase.from('alunos')
            .select('nome, turma, dia_aula, data_termino')
            .gte('data_termino', hojeISO)
            .lte('data_termino', dataLimite)
            .order('data_termino', { ascending: true });

        if (data?.length > 0) {
            const linhas = data.map(a => [a.nome.toUpperCase(), a.turma, a.dia_aula, formatarDataBR(a.data_termino)]);
            gerarTabelaPDF("Alunos Próximos ao Término", ["Nome", "Turma", "Dia", "Término"], linhas, "termino", [0, 0, 0]);
        } else {
            Swal.fire('Aviso', 'Nenhum aluno termina nos próximos 29 dias.', 'info');
        }
    });

    btnFaltas?.addEventListener('click', async () => {
        const { data } = await _supabase.from('alunos').select('nome, turma, dia_aula, frequencia(data_presenca)');
        const filtrados = data.filter(a => calcularStatusFrequencia(a.frequencia) === "Muitas Faltas").map(a => {
            const datas = a.frequencia.map(f => new Date(f.data_presenca));
            const ultima = datas.length ? new Date(Math.max(...datas)).toISOString().split('T')[0] : null;
            return [a.nome.toUpperCase(), a.turma, a.dia_aula, ultima ? formatarDataBR(ultima) : "Sem Registro"];
        });

        filtrados.length ? 
            gerarTabelaPDF("Relatório de Evasão", ["Nome", "Turma", "Dia", "Última Presença"], filtrados, "faltas", [0, 0, 0]) : 
            Swal.fire('Ótima notícia', 'Nenhum aluno com faltas críticas!', 'success');
    });

    // Carga inicial de dados
    carregarAlunos();
});