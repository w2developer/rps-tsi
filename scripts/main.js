import { abrirModalTarefas } from "./components/modalTarefas.js";
import { abrirModalCadastro } from "./components/modalCadastro.js";
import { abrirModalEdicao } from "./components/modalEdicao.js";

// 1. CONFIGURAÇÃO
const supabaseUrl = 'https://rtrjdiocezpityurvhpb.supabase.co';
const supabaseKey = 'sb_publishable_Y9Jrgq2ylUEbcPGMG74fng_i5I0s5Oq';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// --- FUNÇÕES DE APOIO ---

function formatarDataBR(dataISO) {
    if (!dataISO || dataISO === "---") return "---";
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
}

function calcularTempoConclusao(dataTermino) {
    if (!dataTermino) return "---";
    const diffMs = new Date(dataTermino) - new Date();
    if (diffMs < 0) return "---";
    
    const totalDias = Math.floor(diffMs / MS_PER_DAY);
    const meses = Math.floor(totalDias / 30);
    const semanas = Math.floor((totalDias % 30) / 7);
    const dias = totalDias % 7;
    return `${meses}m, ${semanas}sem e ${dias}d`;
}

function tempoConclusaoEmDias(dataTermino) {
    const dataFim = new Date(dataTermino);
    if (isNaN(dataFim.getTime())) {
        return false;
    }
    
    const diffMs = dataFim - new Date();
    const totalDias = Math.floor(diffMs / MS_PER_DAY);
    
    return totalDias <= 30 && totalDias > 0;
}

function calcularStatusFrequencia(historico) {
    if (!historico?.length) return "---";
    const datas = historico.map(p => new Date(p.data_presenca));
    const ultima = new Date(Math.max(...datas));
    const diff = Math.floor((new Date() - ultima) / MS_PER_DAY);
    return diff >= 14 ? "Muitas Faltas" : "Regular";
}

// 2. CARREGAR DADOS
async function carregarAlunos() {
    const tabela = document.getElementById('corpo-tabela');
    if (!tabela) return;

    const valorTurma = document.getElementById('turma').value;
    const valorDia = document.getElementById('dia').value;
    const termoPesquisa = document.getElementById('pesquisa').value.toLowerCase();

    const deParaTurma = { "manha": "Manhã", "tarde": "Tarde" };
    const deParaDia = { 
        "segunda": "Segunda/Terça", 
        "quarta": "Quarta/Quinta", 
        "sexta": "Sexta", 
        "sabado": "Sábado" 
    };

    let query = _supabase
        .from('alunos')
        .select('*, frequencia(*), tarefas(*)')
        .order('nome'); 

    if (valorTurma !== "todos") query = query.eq('turma', deParaTurma[valorTurma]);
    if (valorDia !== "todos") query = query.in('dia_aula', [deParaDia[valorDia], 'Flexível']);

    const { data: alunos, error } = await query;
    if (error) return console.error('Erro:', error.message);

    const hoje = new Date().toISOString().split('T')[0];
    const fragmento = document.createDocumentFragment();

    alunos.filter(a => a.nome.toLowerCase().includes(termoPesquisa)).forEach(aluno => {
        const freqStatus = calcularStatusFrequencia(aluno.frequencia);
        const presencaHoje = (aluno.frequencia || []).find(p => p.data_presenca === hoje);
        const tarefasPendentes = (aluno.tarefas || []).filter(t => !t.concluida).length;
        
        const ordenado = (aluno.frequencia || []).sort((a, b) => new Date(b.data_presenca) - new Date(a.data_presenca));
        const ultimaData = ordenado[0]?.data_presenca || "---";

        const tr = document.createElement('tr');
        tr.className = `aluno ${presencaHoje ? 'presente-hoje' : ''}`;
        tr.innerHTML = `
            <td>${aluno.nome}</td>
            <td>${formatarDataBR(aluno.data_termino)}</td>
            <td class="${tempoConclusaoEmDias(aluno.data_termino) ? 'rematricula' : ''}">
                ${tempoConclusaoEmDias(aluno.data_termino) ? 
                    (aluno.rematricula === 'no' ? 
                        `<button onclick="marcarRematricula(${aluno.id})" class="no">Aguardando Rematrícula</button>` :
                        `<button onclick="desmarcarRematricula(${aluno.id})" class="yes">Rematrícula OK</button>`
                    ) : 
                    calcularTempoConclusao(aluno.data_termino)
                }
            </td>
            <td>${formatarDataBR(ultimaData)}</td>
<td class="status-frequencia ${freqStatus === 'Muitas Faltas' ? 'muitas-faltas' : ''}">
    ${freqStatus === 'Muitas Faltas' ? 
        (aluno.contato_f === 'no' || !aluno.contato_f ? 
            `<button onclick="marcarContatoFaltas(${aluno.id})" class="no">
                Muitas Faltas
            </button>` :
            `<button onclick="desmarcarContatoFaltas(${aluno.id})" class="yes">
                Contato Feito
            </button>`
        ) : freqStatus
    }
</td>
            <td>${aluno.certificado_premium}</td>
            <td>
                <div class="operacoes">
                    <button class="btn-presenca" title="${presencaHoje ? 'Desmarcar' : 'Marcar'}" 
                        onclick="${presencaHoje ? `desmarcarPresenca(${presencaHoje.id})` : `marcarPresenca(${aluno.id})`}"
                        style="${presencaHoje ? 'background-color: #28a745;' : ''}">
                        <i class="${presencaHoje ? 'ri-check-double-line' : 'ri-check-line'}"></i>
                    </button>
                    <button class="btn-tarefas" onclick="verTarefas(${aluno.id})">
                        <i class="ri-survey-fill"></i>
                        ${tarefasPendentes > 0 ? `<span class="badge">${tarefasPendentes}</span>` : ''}
                    </button>
                    <button class="btn-excluir" onclick="excluirAluno(${aluno.id})">
                        <i class="ri-delete-bin-fill"></i>
                    </button>
                    <button class="btn-editar" onclick="editarAluno(${aluno.id})">
                        <i class="ri-edit-fill"></i>
                    </button>
                </div>
            </td>`;
        fragmento.appendChild(tr);
    });

    tabela.innerHTML = '';
    tabela.appendChild(fragmento);
}

// 3. LOGICA DE INICIALIZAÇÃO E AUTO-SELEÇÃO
document.addEventListener('DOMContentLoaded', () => {
    const agora = new Date();
    const hora = agora.getHours();
    const diaSemana = agora.getDay(); // 0 = Domingo, 1 = Segunda...

    const selectTurma = document.getElementById('turma');
    const selectDia = document.getElementById('dia');

    // Seleção automática de Turno
    if (selectTurma) {
        selectTurma.value = (hora < 12) ? 'manha' : 'tarde';
    }

    // Seleção automática de Dia
    const mapaDias = {
        1: 'segunda',
        2: 'segunda',
        3: 'quarta',
        4: 'quarta',
        5: 'sexta',
        6: 'sabado'
    };

    if (selectDia) {
        selectDia.value = mapaDias[diaSemana] || 'todos';
    }

    carregarAlunos();

    ['turma', 'dia', 'pesquisa'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', carregarAlunos);
    });
});

// --- 4. AÇÕES GLOBAIS ---

window.marcarPresenca = async (id) => {
    const hoje = new Date().toISOString().split('T')[0];

    const { error: erroPresenca } = await _supabase
        .from('frequencia')
        .insert([
            { aluno_id: id, data_presenca: hoje }
        ]);

    if (erroPresenca) {
        if (erroPresenca.code === '23505') {
            Swal.fire('Atenção', 'Presença de hoje já foi marcada!', 'info');
        } else {
            Swal.fire('Erro', 'Erro ao marcar presença.', 'error');
        }
        return;
    }

    // Ao marcar presença, libera o "slot" de contato_f para uso futuro
    const { error: erroContato } = await _supabase
        .from('alunos')
        .update({ contato_f: 'no' })
        .eq('id', id);   // <- importantíssimo

    if (erroContato) {
        console.error(erroContato);
        // opcional: pode mostrar um alerta
        // Swal.fire('Erro', 'Presença marcada, mas não foi possível atualizar o status de contato.', 'warning');
    }

    carregarAlunos();
};

window.desmarcarPresenca = (presencaId) => {
    Swal.fire({
        title: 'Desmarcar?',
        text: "O registro de hoje será removido.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sim, desmarcar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { error } = await _supabase.from('frequencia').delete().eq('id', presencaId);
            if (!error) carregarAlunos();
        }
    });
};

window.excluirAluno = (id) => {
    Swal.fire({
        title: 'Confirmar Exclusão',
        text: 'Deseja excluir o aluno e todo o histórico?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            await _supabase.from('alunos').delete().eq('id', id);
            carregarAlunos();
        }
    });
};

window.verTarefas = id => abrirModalTarefas(id, _supabase);
window.editarAluno = id => abrirModalEdicao(id, _supabase, carregarAlunos);
window.abrirModalCadastro = () => abrirModalCadastro(_supabase, carregarAlunos);

window.concluirTarefa = async (idTarefa, alunoId) => {
    const { error } = await _supabase.from('tarefas').update({ concluida: true }).eq('id', idTarefa);
    if (!error) {
        const m = document.getElementById('modal-tarefas');
        if (m) m.remove();
        abrirModalTarefas(alunoId, _supabase);
    }
};

window.deletarTarefa = async (idTarefa, alunoId) => {
    Swal.fire({
        title: 'Excluir tarefa?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { error } = await _supabase.from('tarefas').delete().eq('id', idTarefa);
            if (!error) {
                const m = document.getElementById('modal-tarefas');
                if (m) m.remove();
                abrirModalTarefas(alunoId, _supabase);
            }
        }
    });
};

window.marcarRematricula = (id) => {
    if (!id || isNaN(id)) {
        Swal.fire('Erro!', 'ID do aluno inválido!', 'error');
        return;
    }

    Swal.fire({
        title: 'Confirmar Ação',
        text: 'Confirmar rematrícula do aluno?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Marcar Rematrícula'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { error } = await _supabase
                .from('alunos')
                .update({ rematricula: 'yes' })
                .eq('id', id);

            if (error) {
                console.error('Erro:', error);
                Swal.fire('Erro!', error.message, 'error');
            } else {
                carregarAlunos();
                Swal.fire('Sucesso!', 'Rematrícula confirmada com sucesso!', 'success');
            }
        }
    });
};

window.desmarcarRematricula = (id) => {
    if (!id || isNaN(id)) {
        Swal.fire('Erro!', 'ID do aluno inválido!', 'error');
        return;
    }

    Swal.fire({
        title: 'Confirmar Ação',
        text: 'Desmarcar a rematrícula do aluno?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim!',
        confirmButtonColor: '#dc3545'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { data: aluno } = await _supabase
                .from('alunos')
                .select('rematricula')
                .eq('id', id)
                .single();

            const novoStatus = aluno.rematricula === 'yes' ? 'no' : 'yes';

            const { error } = await _supabase
                .from('alunos')
                .update({ rematricula: novoStatus })
                .eq('id', id);

            if (error) {
                console.error('Erro:', error);
                Swal.fire('Erro!', error.message, 'error');
            } else {
                carregarAlunos();
                Swal.fire('Sucesso!', `Rematrícula desmarcada!`, 'success');
            }
        }
    });
};

window.marcarContatoFaltas = (id) => {
    if (!id || isNaN(id)) {
        Swal.fire('Erro!', 'ID inválido!', 'error');
        return;
    }

    Swal.fire({
        title: 'Contato realizado?',
        text: 'Contato com o aluno de muitas faltas foi feito?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, contatei!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { error } = await _supabase
                .from('alunos')
                .update({ contato_f: 'yes' })   // <- coluna contato_f
                .eq('id', id);

            if (error) {
                Swal.fire('Erro!', error.message, 'error');
            } else {
                carregarAlunos();
                Swal.fire('Sucesso!', 'Contato marcado como feito!', 'success');
            }
        }
    });
};

window.desmarcarContatoFaltas = (id) => {
    if (!id || isNaN(id)) {
        Swal.fire('Erro!', 'ID inválido!', 'error');
        return;
    }

    Swal.fire({
        title: 'Desmarcar contato?',
        text: 'Deseja voltar o status para "Muitas Faltas" sem contato?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Desmarcar',
        confirmButtonColor: '#dc3545'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { error } = await _supabase
                .from('alunos')
                .update({ contato_f: 'no' })   // <- coluna contato_f
                .eq('id', id);

            if (error) {
                Swal.fire('Erro!', error.message, 'error');
            } else {
                carregarAlunos();
                Swal.fire('Sucesso!', 'Contato desmarcado!', 'success');
            }
        }
    });
};

// 5. INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', () => {
    carregarAlunos();
    ['turma', 'dia', 'pesquisa'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', carregarAlunos);
    });
});