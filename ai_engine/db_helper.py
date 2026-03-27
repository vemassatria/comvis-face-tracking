import pymysql
import sys
import os
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

def get_connection():
    try:
        conn = pymysql.connect(
            host=os.getenv("DB_HOST", "db-classinsight-it-18cf.j.aivencloud.com"),
            port=int(os.getenv("DB_PORT", 15183)),
            user=os.getenv("DB_USER", "avnadmin"),
            password=os.getenv("DB_PASS"),
            database=os.getenv("DB_NAME", "defaultdb"),
            autocommit=True
        )
        return conn
    except Exception as e:
        print(f"Error connecting to MariaDB Platform: {e}")
        return None

def register_student_only(nis, nama):
    conn = get_connection()
    if conn is None: return
    try:
        cursor = conn.cursor()
        query2 = """
            INSERT IGNORE INTO tb_siswa (nis, nama_lengkap, kelas) 
            VALUES (%s, %s, 'UMUM')
        """
        cursor.execute(query2, (nis, nama))
    except Exception as e:
        print(f"Error Register: {e}")
    finally:
        conn.close()

def log_atensi(id_sesi, nis, durasi, kategori, keterangan=""):
    conn = get_connection()
    if conn is None: return

    try:
        cursor = conn.cursor()
        query = """
            INSERT INTO tb_log_atensi (id_sesi, nis, waktu_kejadian, durasi_detik, kategori, keterangan) 
            VALUES (%s, %s, NOW(), %s, %s, %s)
        """
        cursor.execute(query, (id_sesi, nis, durasi, kategori, keterangan))
    except Exception as e:
        print(f"Error inserting log: {e}")
    finally:
        conn.close()
