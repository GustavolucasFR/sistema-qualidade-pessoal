import os
import shutil

base_dir = os.path.dirname(__file__)
uploads_dir = os.path.abspath(os.path.join(base_dir, '..', 'dados', '1_uploads_brutos'))
consolidados_dir = os.path.abspath(os.path.join(base_dir, '..', 'dados', '2_dados_consolidados'))

os.makedirs(consolidados_dir, exist_ok=True)

for filename in os.listdir(uploads_dir):
    if filename.endswith('.xlsb') or filename.endswith('.xlsx'):
        file_path = os.path.join(uploads_dir, filename)
        dest_path = os.path.join(consolidados_dir, filename)
        if os.path.exists(dest_path):
            os.remove(dest_path)
        shutil.move(file_path, dest_path)
        print(f"Moved {filename} to consolidados.")
