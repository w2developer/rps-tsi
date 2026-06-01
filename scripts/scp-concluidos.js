import { abrirModalNovoConcluido } from "./components/modalNovoConcluido.js";
import { abrirModalEdicaoConcluido } from "./components/modalEdicaoConcluido.js";

// --- CONFIGURAÇÃO ---
const supabaseUrl = 'https://rtrjdiocezpityurvhpb.supabase.co';
const supabaseKey = 'sb_publishable_Y9Jrgq2ylUEbcPGMG74fng_i5I0s5Oq';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- AUDITORIA ---
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

// --- UTILITÁRIOS ---
const formatarDataBR = (dataISO) => {
    if (!dataISO || dataISO === "---") return "---";
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
};

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// --- LÓGICA DE DADOS ---
async function carregarAlunos() {
    const tabela = document.getElementById('corpo-tabela');
    if (!tabela) return;

    const inputPesquisa = document.getElementById('pesquisa');
    const termoPesquisa = inputPesquisa ? inputPesquisa.value.toLowerCase() : '';

    const { data: alunos, error } = await _supabase
        .from('concluidos')
        .select('*')
        .order('data_conclusao', { ascending: false }); 

    if (error) return console.error('Erro:', error.message);

    const fragmento = document.createDocumentFragment();

    alunos.filter(a => a.nome.toLowerCase().includes(termoPesquisa)).forEach(aluno => {
        const tr = document.createElement('tr');
        tr.className = 'aluno';
        
        // Renderiza as colunas baseadas na imagem da tabela
        tr.innerHTML = `
            <td>
                ${aluno.nome}
                <div style="font-size: 0.65rem; color: #666; margin-top: 2px;">
                    ${aluno.dia_aula || '---'} - ${aluno.horario_estudo || '---'}
                </div>
            </td>
            <td>${aluno.usuario || '---'}</td>
            <td style="text-transform: uppercase;">${aluno.curso_concluido || '---'}</td>
            <td>${formatarDataBR(aluno.data_conclusao)}</td>
            <td>${aluno.certificado || '---'}</td>
            <td>
                <div class="operacoes">
                    <div class="dropdown" onclick="toggleDropdown(event, this)">
                        <button class="dropdown-btn"><i class="ri-menu-line"></i></button>
                        <div class="dropdown-content">
                            <button onclick="alterarStatusCertificado(${aluno.id}, '${aluno.certificado || ''}', '${aluno.nome}')">
                                <i class="ri-checkbox-circle-line"></i> Status Certificado
                            </button>
                            <button onclick="editarAluno(${aluno.id})">
                                <i class="ri-edit-line"></i> Editar
                            </button>
                            <button onclick="excluirAluno(${aluno.id}, '${aluno.nome}')">
                                <i class="ri-delete-bin-line"></i> Excluir
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

// --- AÇÕES GLOBAIS ---
window.alterarStatusCertificado = async (id, statusAtual, nome) => {
    const { value: novoStatus } = await Swal.fire({
        title: `Certificado - ${nome}`,
        input: 'select',
        inputOptions: {
            '': 'Nenhum (null)',
            'Pronto para Entregue': 'Pronto para Entregue',
            'Entregue': 'Entregue'
        },
        inputValue: statusAtual,
        showCancelButton: true,
        confirmButtonText: 'Salvar',
        cancelButtonText: 'Cancelar'
    });

    if (novoStatus !== undefined) {
        const valorFinal = novoStatus === '' ? null : novoStatus;
        
        const { error } = await _supabase
            .from('concluidos')
            .update({ certificado: valorFinal })
            .eq('id', id);

        if (!error) {
            await registrarLog('ALTERAR_CERTIFICADO', 'concluidos', { aluno: nome, id, status: valorFinal });
            carregarAlunos();
        } else {
            Swal.fire('Erro', 'Não foi possível atualizar o status.', 'error');
        }
    }
};

window.excluirAluno = (id, nome) => {
    Swal.fire({
        title: 'Confirmar Exclusão',
        text: `Deseja excluir o registro de ${nome}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            await _supabase.from('concluidos').delete().eq('id', id);
            await registrarLog('EXCLUIR_CONCLUIDO', 'concluidos', { aluno: nome, id });
            carregarAlunos();
        }
    });
};

window.editarAluno = id => abrirModalEdicaoConcluido(id, _supabase, async () => {
    await registrarLog('EDITAR_CONCLUIDO', 'concluidos', { id });
    carregarAlunos();
});

window.abrirModalCadastro = () => abrirModalNovoConcluido(_supabase, async () => {
    await registrarLog('CADASTRAR_CONCLUIDO', 'concluidos', { info: 'Novo registro concluído' });
    carregarAlunos();
});

window.toggleDropdown = (event, dropdown) => {
    event.stopPropagation();
    document.querySelectorAll('.dropdown-content').forEach(dd => dd.classList.remove('show'));
    dropdown.querySelector('.dropdown-content').classList.toggle('show');
};

document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-content').forEach(dd => dd.classList.remove('show'));
});

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    const inputPesquisa = document.getElementById('pesquisa');
    if (inputPesquisa) inputPesquisa.addEventListener('input', debounce(carregarAlunos, 300));
    carregarAlunos();
});

// Atualiza a lista a cada 30 segundos
setInterval(carregarAlunos, 30000);