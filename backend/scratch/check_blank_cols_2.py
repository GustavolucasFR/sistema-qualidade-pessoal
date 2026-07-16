import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
with engine.connect() as conn:
    print("Fetching data...")
    res = conn.execute(text("SELECT * FROM importador.zeus_consolidado;"))
    df = pd.DataFrame(res.fetchall(), columns=res.keys())
    
    print(f"Total rows: {len(df)}")
    if len(df) == 0:
        exit(0)
        
    empty_stats = {}
    for col in df.columns:
        # A value is considered empty if it is NaN, None, or a string that is empty or just whitespace or 'nan'
        is_null = df[col].isna()
        is_empty_str = df[col].astype(str).str.strip().isin(['', 'nan', 'None', 'null', 'NaN', '<NA>'])
        empty_count = (is_null | is_empty_str).sum()
        empty_stats[col] = (empty_count / len(df)) * 100
        
    sorted_stats = sorted(empty_stats.items(), key=lambda x: x[1], reverse=True)
    
    print("\nColumns with more than 90% blank values:")
    for col, pct in sorted_stats:
        if pct > 90:
            print(f"{col}: {pct:.2f}% blank")
    
    print("\nColumns with more than 99% blank values:")
    for col, pct in sorted_stats:
        if pct > 99:
            print(f"{col}: {pct:.2f}% blank")
