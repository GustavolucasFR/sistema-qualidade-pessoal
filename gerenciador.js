const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pidsFile = path.join(__dirname, 'pids.json');
const command = process.argv[2];

if (command === 'start') {
    if (fs.existsSync(pidsFile)) {
        console.log('⚠️ O sistema já parece estar rodando! Use a opção "Parar" antes de iniciar novamente.');
        process.exit(1);
    }

    console.log('Iniciando serviços de forma invisível...');
    const pids = [];

    const createDetached = (cmd, args, cwd, logName) => {
        const out = fs.openSync(path.join(__dirname, logName), 'a');
        const err = fs.openSync(path.join(__dirname, logName), 'a');

        const commandString = `${cmd} ${args.join(' ')}`;
        const child = spawn(commandString, {
            cwd: path.join(__dirname, cwd),
            detached: true,
            stdio: ['ignore', out, err],
            shell: true,
            windowsHide: true // Garante que a janela do CMD não apareça
        });

        child.unref(); // Permite que este script Node feche e deixe os processos rodando
        return child.pid;
    };

    try {
        // 1. Agente Importador
        pids.push(createDetached('node', ['index.js'], '../inportador', 'log_importador.txt'));
        
        // 2. Motor Analítico
        pids.push(createDetached('analytics\\venv\\Scripts\\python.exe', ['analytics\\processar_tudo.py'], '.', 'log_motor.txt'));
        
        // 3. Backend API
        pids.push(createDetached('node', ['src/server.js'], 'backend', 'log_backend.txt'));
        
        // 4. Frontend Dashboard (no Windows npm funciona melhor como npm.cmd)
        pids.push(createDetached('npm.cmd', ['run', 'dev'], 'frontend', 'log_frontend.txt'));

        fs.writeFileSync(pidsFile, JSON.stringify(pids));
        console.log('✅ Todos os serviços foram iniciados com sucesso e estão rodando escondidos!');
        console.log('📝 Você pode conferir os logs nos arquivos "log_...txt" gerados nesta pasta.');
    } catch (e) {
        console.error('Erro ao iniciar processos:', e);
    }

} else if (command === 'stop') {
    if (!fs.existsSync(pidsFile)) {
        console.log('O sistema não parece estar rodando pelo gerenciador (pids.json não encontrado).');
        console.log('Limpando processos Node que possam ter ficado travados por precaução...');
        try { execSync('taskkill /F /IM node.exe /T', { stdio: 'ignore' }); } catch(e){}
        process.exit(0);
    }

    const pids = JSON.parse(fs.readFileSync(pidsFile));
    console.log('Parando todos os serviços escondidos...');
    
    // Deleta o arquivo primeiro, pois podemos matar a nós mesmos no processo
    fs.unlinkSync(pidsFile);

    pids.forEach(pid => {
        try {
            // No Windows, matar o PID do CMD usando /T (Tree) mata todos os subprocessos filhos
            execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
        } catch (e) {
            // Processo pode já ter morrido antes
        }
    });

    console.log('✅ Todos os serviços foram desligados!');
} else {
    console.log('Comando inválido. Use "start" ou "stop".');
}
