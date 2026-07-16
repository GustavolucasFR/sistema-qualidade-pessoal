import subprocess

files_to_remove = [
    "dados/2_processados",
    "dados/2_dados_consolidados/Consolidado_Produtividade.xlsb",
    "dados/2_dados_consolidados/Efetividade Campo.xlsb",
    "dados/dicionarios/Produtividade PU_PCP.xlsb"
]

cmd_str = 'git rm --cached --ignore-unmatch ' + ' '.join(f'"{f}"' for f in files_to_remove)

print("Executando git filter-branch...")
res = subprocess.run([
    'git', 'filter-branch', '--force', '--index-filter',
    cmd_str,
    '--prune-empty', '--tag-name-filter', 'cat', '--', '--all'
], capture_output=True, text=True)

print(res.stdout)
if res.stderr:
    print("ERRO:", res.stderr)
