const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const { type } = req.body;
    const filePath = req.file.path;
    const backendDir = path.join(__dirname, '../../');
    let scriptName = '';

    if (type === 'tecnicos') {
      scriptName = 'import_tecnicos.py';
    } else if (type === 'producao_ba') {
      scriptName = 'import_planilha_ba.py';
    } else if (type === 'regras_extra') {
      scriptName = 'update_regras.py';
    } else {
      return res.status(400).json({ error: 'Tipo de upload inválido.' });
    }

    const pythonProcess = spawn('python', [path.join(backendDir, scriptName), filePath], { cwd: backendDir });

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        res.json({ message: 'Arquivo processado com sucesso!\n' + stdoutData });
      } else {
        console.error('Python error:', stderrData);
        res.status(500).json({ error: 'Erro ao processar arquivo.', details: stderrData });
      }
    });

  } catch (error) {
    console.error('Error in uploadFile:', error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};
