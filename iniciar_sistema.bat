@echo off
echo ====================================================
echo    INICIANDO O SISTEMA DE QUALIDADE E MONITORAMENTO
echo ====================================================
echo.

echo Iniciando o Backend...
start "Backend do Sistema" cmd /k "cd c:\Users\TECNOMULTI\sistema-qualidade\backend && npm run dev"
timeout /t 2 /nobreak >nul

echo Iniciando o Frontend...
start "Frontend do Sistema" cmd /k "cd c:\Users\TECNOMULTI\sistema-qualidade\frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo Iniciando o Monitor de Uploads (Analytis)...
start "Monitor de Uploads" cmd /k "cd c:\Users\TECNOMULTI\sistema-qualidade\analytics && python monitor_arquivos.py"

echo.
echo Tudo iniciado com sucesso! 
echo O painel vai abrir no seu navegador. Voce pode minimizar (mas nao feche) as janelinhas pretas!
timeout /t 5 >nul
