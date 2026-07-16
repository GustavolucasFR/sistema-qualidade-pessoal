import os
from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:postgres@localhost:5432/postgres')
with engine.connect() as conn:
    with open('c:/Users/TECNOMULTI/sistema-qualidade/db/init_ai_role.sql', 'r', encoding='utf-8') as f:
        sql = f.read()
    
    # We can split by statement or just execute as one block using raw connection or execution options
    # Or just execute blocks separated by double newlines if it causes issues.
    # We will use raw psycopg2 connection to run multiple statements at once.
    raw_conn = engine.raw_connection()
    try:
        with raw_conn.cursor() as cursor:
            cursor.execute(sql)
        raw_conn.commit()
        print("Role ai_reader created successfully.")
    except Exception as e:
        print("Error executing script:", e)
        raw_conn.rollback()
    finally:
        raw_conn.close()
