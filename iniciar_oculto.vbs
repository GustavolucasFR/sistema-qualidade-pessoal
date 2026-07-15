Set WshShell = CreateObject("WScript.Shell")
' 1. Importador
WshShell.Run "cmd.exe /c cd ../inportador && node index.js > ""../sistema-qualidade/log_importador.txt"" 2>&1", 0, False
' 2. Motor Analitico
WshShell.Run "cmd.exe /c set PYTHONIOENCODING=utf-8 && analytics\venv\Scripts\python analytics\processar_tudo.py > ""log_motor.txt"" 2>&1", 0, False
' 3. Backend API
WshShell.Run "cmd.exe /c cd backend && node src/server.js > ""../log_backend.txt"" 2>&1", 0, False
' 4. Frontend Dashboard
WshShell.Run "cmd.exe /c cd frontend && npm.cmd run dev > ""../log_frontend.txt"" 2>&1", 0, False
