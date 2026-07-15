import os
import re

files_to_update = [
    r'c:\Users\TECNOMULTI\sistema-qualidade\backend\src\controllers\producaoBaController.js',
    r'c:\Users\TECNOMULTI\sistema-qualidade\backend\src\controllers\dreController.js'
]

pattern = re.compile(
    r"""(CASE WHEN UPPER\(pd\.cidade\) IN \('CABEDELO', 'GARANHUNS', 'MOSSORO', 'PARNAMIRIM', 'PATOS'\) THEN 'FiBrasil' ELSE 'Vivo' END \|\|\s*)\n(\s*CASE\s*WHEN LOWER\(TRIM\(pd\.projeto_matrix__fibra_dedicada_\)\))""",
    re.MULTILINE
)

replacement = r"""\1
          CASE 
            WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) = 'não' THEN 'Não'
            WHEN LOWER(TRIM(pd.realizou_reaproveitamento_do_drop_)) = 'sim' THEN 'Sim'
            ELSE '-'
          END ||
\2"""

for file_path in files_to_update:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = pattern.sub(replacement, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Updated {file_path}")
