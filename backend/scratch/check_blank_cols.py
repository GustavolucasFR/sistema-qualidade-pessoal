import pandas as pd
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
        # Convert to string and check if it's empty or nan
        series = df[col].astype(str).replace('nan', '').replace('None', '').str.strip()
        empty_count = series.eq('').sum()
        empty_stats[col] = (empty_count / len(df)) * 100
        
    # Sort by percentage of empty values descending
    sorted_stats = sorted(empty_stats.items(), key=lambda x: x[1], reverse=True)
    
    print("\nColumns with more than 90% blank values:")
    for col, pct in sorted_stats:
        if pct > 90:
            print(f"{col}: {pct:.2f}% blank")
