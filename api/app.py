from flask import Flask, jsonify, request
import mariadb
import sys
import os
from dotenv import load_dotenv

# Gunakan env dari direktori ai_engine untuk prototype
load_dotenv(dotenv_path='../ai_engine/.env')

app = Flask(__name__)

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
        print(f"Error connecting to MariaDB: {e}")
        return None

@app.route('/api/status-kelas/<id_sesi>', methods=['GET'])
def get_status_kelas(id_sesi):
    conn = get_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed"}), 500
        
    try:
        cursor = conn.cursor(dictionary=True)
        # Ambil data log atensi untuk sesi ini (misal 50 log terakhir)
        query = "SELECT * FROM tb_log_atensi WHERE id_sesi = ? ORDER BY waktu_kejadian DESC LIMIT 50"
        cursor.execute(query, (id_sesi,))
        logs = cursor.fetchall()
        
        # Format respons JSON standar
        return jsonify({
            "status": "success",
            "id_sesi": id_sesi,
            "data": logs
        })
    except mariadb.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/sesi', methods=['POST'])
def create_session():
    # Helper untuk Dashboard: Memulai Kelas Baru
    data = request.json
    id_sesi = data.get('id_sesi')
    mata_pelajaran = data.get('mata_pelajaran')
    nama_guru = data.get('nama_guru')
    
    conn = get_connection()
    if conn is None:
        return jsonify({"error": "DB connection failed"}), 500
        
    try:
        cursor = conn.cursor()
        query = "INSERT INTO tb_sesi_kelas (id_sesi, mata_pelajaran, nama_guru, waktu_mulai) VALUES (?, ?, ?, NOW())"
        cursor.execute(query, (id_sesi, mata_pelajaran, nama_guru))
        conn.commit()
        return jsonify({"status": "success", "message": f"Sesi {id_sesi} dimulai."})
    except mariadb.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(port=5000, debug=True)
