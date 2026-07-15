$pastas = @(
    "backend\src",
    "backend\templates",
    "analytics",
    "dados\1_uploads_brutos",
    "dados\2_dados_consolidados",
    "dados\3_relatorios_pdf",
    "powerbi",
    "frontend"
)
New-Item -Path $pastas -ItemType Directory -Force | Out-Null
Set-Location "backend"
cmd.exe /c "npm init -y" | Out-Null
Set-Location "..\analytics"
if (Get-Command "python" -ErrorAction SilentlyContinue) { python -m venv venv } 
elseif (Get-Command "py" -ErrorAction SilentlyContinue) { py -m venv venv }
