// components/modalCadastro.js

export function abrirModalCadastro(supabase, aoSalvar) {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal';
    modalDiv.id = 'modal-cadastro';
    modalDiv.style.display = 'flex';

    modalDiv.innerHTML = `
        <div class="card-modal">
            <div class="header-modal">
                <h2>Cadastrar Novo Aluno</h2>
            </div>
            <div class="body-modal">
                <div style="background: #f4f4f4; padding: 10px; border-radius: 5px; margin-bottom: 20px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px;">Importar via JSON:</label>
                    <input type="file" id="import-json" accept=".json" style="font-size: 0.8rem;">
                    <p style="font-size: 0.7rem; color: #666; margin-top: 5px;">* O arquivo deve ser um array de objetos.</p>
                </div>

                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">

                <form id="form-cadastro-aluno" style="display: flex; flex-direction: column; gap: 15px;">
                    <div>
                        <label>Nome Completo:</label>
                        <input type="text" id="cad-nome" required style="width: 100%; padding: 8px;">
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label>Data de Nascimento:</label>
                            <input type="date" id="cad-nascimento" style="width: 100%; padding: 8px;">
                        </div>
                        <div style="flex: 1;">
                            <label>Código de Acesso:</label>
                            <input type="text" id="cad-codigo" style="width: 100%; padding: 8px;">
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1;">
                            <label>Turma:</label>
                            <select id="cad-turma" style="width: 100%; padding: 8px;">
                                <option value="Manhã">Manhã</option>
                                <option value="Tarde">Tarde</option>
                            </select>
                        </div>
                        <div style="flex: 1;">
                            <label>Dia de Aula:</label>
                            <select id="cad-dia" style="width: 100%; padding: 8px;">
                                <option value="Segunda/Terça">Segunda/Terça</option>
                                <option value="Quarta/Quinta">Quarta/Quinta</option>
                                <option value="Sexta">Sexta</option>
                                <option value="Sábado">Sábado</option>
                                <option value="Flexível">Flexível</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label>Horário de Estudo:</label>
                        <select id="cad-horario" style="width: 100%; padding: 8px;"></select>
                    </div>

                    <div>
                        <label>Data de Término:</label>
                        <input type="date" id="cad-termino" required style="width: 100%; padding: 8px;">
                    </div>

                    <div class="footer-modal" style="margin-top: 10px;">
                        <button type="button" id="btn-cancelar-cad" style="background: #ccc;">Cancelar</button>
                        <button type="submit" class="btn-presenca" style="background: #28a745; color: white;">Salvar Aluno</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);

    // --- LÓGICA DE HORÁRIOS ---
    const cadTurma = document.getElementById('cad-turma');
    const cadDia = document.getElementById('cad-dia');
    const cadHorario = document.getElementById('cad-horario');

    function atualizarHorariosCadastro() {
        const turma = cadTurma.value;
        const dia = cadDia.value;
        const eBloco2h = (dia === 'Sexta' || dia === 'Sábado');
        
        const horarios = {
            'Manhã': [
                { label: "08:00 - 09:00", bloco: 1 }, { label: "09:00 - 10:00", bloco: 1 },
                { label: "10:00 - 11:00", bloco: 1 }, { label: "11:00 - 12:00", bloco: 1 },
                { label: "08:00 - 10:00", bloco: 2 }, { label: "10:00 - 12:00", bloco: 2 }
            ],
            'Tarde': [
                { label: "14:00 - 15:00", bloco: 1 }, { label: "15:00 - 16:00", bloco: 1 },
                { label: "16:00 - 17:00", bloco: 1 }, { label: "17:00 - 18:00", bloco: 1 },
                { label: "14:00 - 16:00", bloco: 2 }, { label: "16:00 - 18:00", bloco: 2 }
            ]
        };

        cadHorario.innerHTML = dia === 'Flexível' ? '<option value="Flexível">Flexível</option>' : '';
        
        if (dia !== 'Flexível') {
            horarios[turma].forEach(item => {
                if ((eBloco2h && item.bloco === 2) || (!eBloco2h && item.bloco === 1)) {
                    const opt = document.createElement('option');
                    opt.value = item.label;
                    opt.textContent = item.label;
                    cadHorario.appendChild(opt);
                }
            });
        }
    }

    cadTurma.onchange = atualizarHorariosCadastro;
    cadDia.onchange = atualizarHorariosCadastro;
    atualizarHorariosCadastro();

    // --- IMPORTAÇÃO JSON ---
    document.getElementById('import-json').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const dadosBrutos = JSON.parse(event.target.result);
                if (!Array.isArray(dadosBrutos)) throw new Error("O JSON deve ser uma lista []");

                const listaAlunos = dadosBrutos.map(item => ({
                    nome: item.nome,
                    data_nascimento: item.data_nascimento || null,
                    turma: item.turma,
                    dia_aula: item.dia_aula,
                    horario_estudo: item.horario_estudo,
                    data_termino: item.data_termino,
                    certificado_premium: item.certificado_premium || "No aguardo" 
                }));

                const { data: alunosInseridos, error: errAlunos } = await supabase
                    .from('alunos')
                    .insert(listaAlunos)
                    .select();

                if (errAlunos) throw errAlunos;

                const registrosPresenca = [];
                const registrosUsuarios = [];

                // Gera registros de frequência e acessos vinculados
                alunosInseridos.forEach(alunoInserido => {
                    const dadosOriginais = dadosBrutos.find(d => d.nome === alunoInserido.nome);
                    if (dadosOriginais) {
                        registrosPresenca.push({
                            aluno_id: alunoInserido.id,
                            data_presenca: dadosOriginais.ultima_presenca || new Date().toISOString().split('T')[0]
                        });

                        if (dadosOriginais.codigo) {
                            const ano = dadosOriginais.data_nascimento ? dadosOriginais.data_nascimento.split('-')[0] : '0000';
                            registrosUsuarios.push({
                                aluno_id: alunoInserido.id,
                                codigo: dadosOriginais.codigo,
                                senha: ano
                            });
                        }
                    }
                });

                await supabase.from('frequencia').insert(registrosPresenca);
                if (registrosUsuarios.length > 0) {
                    await supabase.from('usuarios_aluno').insert(registrosUsuarios);
                }

                alert(`Sucesso! ${listaAlunos.length} alunos importados.`);
                modalDiv.remove();
                aoSalvar();
            } catch (err) {
                alert("Erro na importação: " + err.message);
            }
        };
        reader.readAsText(file);
    };

    // --- SALVAMENTO MANUAL ---
    document.getElementById('form-cadastro-aluno').onsubmit = async (e) => {
        e.preventDefault();
        
        const dataNasc = document.getElementById('cad-nascimento').value;
        const anoNasc = dataNasc ? dataNasc.split('-')[0] : '0000';

        const novoAluno = {
            nome: document.getElementById('cad-nome').value,
            data_nascimento: dataNasc,
            turma: cadTurma.value,
            dia_aula: cadDia.value,
            horario_estudo: cadHorario.value,
            data_termino: document.getElementById('cad-termino').value
        };

        // 1. Insere dados do aluno
        const { data: aluno, error: errAluno } = await supabase.from('alunos').insert([novoAluno]).select();
        if (errAluno) return Swal.fire('Erro', errAluno.message, 'error');

        // 2. Cria o usuário com senha padrão (ano)
        const { error: errUser } = await supabase.from('usuarios_aluno').insert([{
            aluno_id: aluno[0].id,
            codigo: document.getElementById('cad-codigo').value,
            senha: anoNasc
        }]);

        if (errUser) return Swal.fire('Erro', 'Aluno salvo, mas erro ao criar usuário: ' + errUser.message, 'error');

        Swal.fire({
            title: 'Cadastrado!',
            text: 'O aluno foi salvo com sucesso.',
            icon: 'success',
            timer: 1500,
            showConfirmButton: false
        });
        
        modalDiv.remove();
        aoSalvar();
    };

    document.getElementById('btn-cancelar-cad').onclick = () => modalDiv.remove();
}