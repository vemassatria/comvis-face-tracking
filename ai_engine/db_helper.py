import mariadb
import sys
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    try:
        conn = mariadb.connect(
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASS", "mtcdb"),
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", 3306)),
            database=os.getenv("DB_NAME", "classinsight_db")
        )
        return conn
    except mariadb.Error as e:
        print(f"Error connecting to MariaDB Platform: {e}")
        return None

def log_atensi(id_sesi, nis, durasi, kategori, keterangan=""):
    conn = get_connection()
    if conn is None: return

    try:
        cursor = conn.cursor()
        query = """
            INSERT INTO tb_log_atensi (id_sesi, nis, waktu_kejadian, durasi_detik, kategori, keterangan) 
            VALUES (?, ?, NOW(), ?, ?, ?)
        """
        cursor.execute(query, (id_sesi, nis, durasi, kategori, keterangan))
        conn.commit()
    except mariadb.Error as e:
        print(f"Error inserting log: {e}")
    finally:
        conn.close()
