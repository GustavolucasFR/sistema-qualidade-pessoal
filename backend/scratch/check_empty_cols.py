import pandas as pd
from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
with engine.connect() as conn:
    res = conn.execute(text("SELECT * FROM importador.zeus_consolidado LIMIT 10000;"))
    df = pd.DataFrame(res.fetchall(), columns=res.keys())
    
    empty_cols = []
    for col in df.columns:
        # Check if all values are null or empty string or 'nan'
        if df[col].astype(str).replace('nan', '').replace('None', '').str.strip().eq('').all():
            empty_cols.append(col)
            
    print(f"Total columns: {len(df.columns)}")
    print(f"Empty columns in sample: {len(empty_cols)}")
    print("Empty columns:")
    for c in empty_cols:
        print(c)
