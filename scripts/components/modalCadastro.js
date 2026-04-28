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

    // --- LÓGICA DE IMPORTAÇÃO JSON ---
    document.getElementById('import-json').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        // Dentro do leitor do arquivo JSON no modalCadastro.js
        reader.onload = async (event) => {
            try {
                const dadosBrutos = JSON.parse(event.target.result);
                if (!Array.isArray(dadosBrutos)) throw new Error("O JSON deve ser uma lista []");

                // 1. Prepara a lista de alunos com o status do certificado vindo do JSON
                const listaAlunos = dadosBrutos.map(item => ({
                    nome: item.nome,
                    turma: item.turma,
                    dia_aula: item.dia_aula,
                    data_termino: item.data_termino,
                    // Usa o valor do JSON ou um padrão caso esteja vazio
                    certificado_premium: item.certificado_premium || "No aguardo" 
                }));

                // Insere os alunos e recupera os IDs
                const { data: alunosInseridos, error: errAlunos } = await supabase
                    .from('alunos')
                    .insert(listaAlunos)
                    .select();

                if (errAlunos) throw errAlunos;

                // 2. Prepara a lista de presenças usando as datas vindas do JSON
                // Fazemos um de-para usando o nome para ligar o ID gerado aos dados do JSON
                const registrosPresenca = alunosInseridos.map(alunoInserido => {
                    const dadosOriginais = dadosBrutos.find(d => d.nome === alunoInserido.nome);
                    return {
                        aluno_id: alunoInserido.id,
                        // Usa a data do JSON ou a data de hoje como fallback
                        data_presenca: dadosOriginais.ultima_presenca || new Date().toISOString().split('T')[0]
                    };
                });

                const { error: errFreq } = await supabase.from('frequencia').insert(registrosPresenca);
                if (errFreq) throw errFreq;

                alert(`Sucesso! ${listaAlunos.length} alunos importados com as presenças e certificados do arquivo.`);
                modalDiv.remove();
                aoSalvar();
            } catch (err) {
                alert("Erro na importação: " + err.message);
                console.error(err);
            }
        };
        reader.readAsText(file);
    };

    // --- SALVAMENTO MANUAL ---
    document.getElementById('form-cadastro-aluno').onsubmit = async (e) => {
        e.preventDefault();
        
        const novoAluno = {
            nome: document.getElementById('cad-nome').value,
            turma: document.getElementById('cad-turma').value,
            dia_aula: document.getElementById('cad-dia').value,
            data_termino: document.getElementById('cad-termino').value
        };

        const { error } = await supabase.from('alunos').insert([novoAluno]);

        if (error) {
            Swal.fire('Erro', "Erro ao cadastrar: " + error.message, 'error');
        } else {
            // Alerta de confirmação antes de fechar
            Swal.fire({
                title: 'Cadastrado!',
                text: 'O aluno foi salvo com sucesso.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            
            modalDiv.remove();
            aoSalvar();
        }
    };

    document.getElementById('btn-cancelar-cad').onclick = () => modalDiv.remove();
}