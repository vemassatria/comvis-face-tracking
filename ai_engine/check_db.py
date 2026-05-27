import os
import sys
from db_helper import get_connection

def check():
    conn = get_connection()
    if not conn:
        print("FAILED TO CONNECT")
        return
    
    cursor = conn.cursor()
    cursor.execute("SHOW TABLES")
    print("TABLES:", cursor.fetchall())
    
    cursor.execute("SELECT * FROM tb_sesi_kelas ORDER BY waktu_mulai DESC LIMIT 5")
    print("SESI:", cursor.fetchall())
    
    cursor.execute("SELECT * FROM tb_siswa ORDER BY created_at DESC LIMIT 5")
    print("SISWA:", cursor.fetchall())
    
    cursor.execute("SELECT * FROM tb_log_atensi ORDER BY waktu_kejadian DESC LIMIT 10")
    print("LOG ATENSI:", cursor.fetchall())

if __name__ == '__main__':
    check()
