const OpenAI = require('openai');
const { Pool } = require('pg');
require('dotenv').config();

// Inicializar o pool de leitura (ai_reader) para maior segurança
const readerPool = new Pool({
  user: 'ai_reader',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: 'ai_reader_123',
  port: process.env.DB_PORT || 5432,
});

// Inicializa a API da OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key'
});

// O esquema do banco de dados (simplificado) para a IA entender
const dbSchemaContext = `
Você é um assistente de banco de dados e análise de métricas operacionais focado no Anexo 09 da Telefónica.
O banco de dados PostgreSQL contém o schema 'importador' e a tabela principal 'zeus_consolidado'.
A tabela 'importador.zeus_consolidado' possui as seguintes colunas relevantes (todas como TEXT):
tecnicos, empresa, recurso, janela_de_servi_o, in_cio_previsto, t_rmino_da_atividade, tipo_de_atividade, status, cidade, estado, zona_de_trabalho, tipo_de_servi_o, data_agendada_para_execu__o, sla_come_o, sla_fim, data_de_cria__o_da_atividade, motivo_de_cancelamento, atividade, cidade_para_estat_stica, dura__o, in_cio___fim, tempo_de_deslocamento, nome_operador, longitude, latitude, id_do_t_cnico, primeira_agenda_atividade.

Também existem as tabelas em 'public':
- 'resultados_irr': id, tipo_infracao, tecnico_id, tecnico_nome, protocolo, data_infracao, valor_multa, status.
- 'resultados_sla': id, tipo_infracao, tecnico_id, tecnico_nome, protocolo, data_infracao, valor_multa, sla_esperado, sla_realizado, status.

Regras adicionais de negócio:
- IRR significa Índice de Reincidência de Reparo.
- IFI significa Índice de Falha de Instalação.
- SLA é o tempo de atendimento (Parada de Relógio).

Sua resposta deve ser ESTRITAMENTE em formato JSON (sem markdown, sem bloco de código, apenas o JSON).
Formato esperado:
{
  "sql": "A query SQL segura para o PostgreSQL, que deve usar LIMIT 100 por precaução. NÃO modifique dados.",
  "explicacao": "Uma breve explicação em português do que a query faz e qual é a resposta para a pergunta do usuário",
  "tipo_visualizacao": "table" | "bar_chart" | "pie_chart" | "metric"
}
`;

exports.askAssistant = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem não fornecida' });
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy_key') {
       // Mock response para quando a chave não estiver configurada
       return res.status(200).json({
          explicacao: "Simulação: O assistente de IA recebeu a sua pergunta. Configure a variável OPENAI_API_KEY no arquivo .env do backend para habilitar a geração de relatórios dinâmicos reais.",
          tipo_visualizacao: "table",
          dados: [
             { mensagem: "Esta é uma tabela de demonstração", status: "API não configurada" }
          ]
       });
    }

    const prompt = `${dbSchemaContext}\n\nPergunta do usuário: "${message}"`;

    // Chamada para a API da OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: dbSchemaContext },
        { role: "user", content: message }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    });
    
    const responseText = completion.choices[0].message.content;
    
    // Limpeza de possíveis blocos markdown que a IA possa enviar por engano
    const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsedAI;
    try {
      parsedAI = JSON.parse(cleanJsonText);
    } catch (parseError) {
      console.error("Erro ao parsear JSON da IA:", cleanJsonText);
      return res.status(500).json({ error: 'A IA não retornou um JSON válido.', raw: cleanJsonText });
    }

    // Validação de segurança básica da Query
    const query = parsedAI.sql;
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('insert ') || lowerQuery.includes('update ') || lowerQuery.includes('delete ') || lowerQuery.includes('drop ') || lowerQuery.includes('truncate ')) {
      return res.status(403).json({ error: 'A IA gerou uma query perigosa que foi bloqueada.' });
    }

    // Executa a consulta
    const dbResult = await readerPool.query(query);

    return res.status(200).json({
      explicacao: parsedAI.explicacao,
      tipo_visualizacao: parsedAI.tipo_visualizacao,
      sql_executado: query,
      dados: dbResult.rows
    });
    
  } catch (error) {
    console.error("Erro no AI Controller:", error);
    res.status(500).json({ error: 'Falha interna ao processar a pergunta da IA.', details: error.message });
  }
};
