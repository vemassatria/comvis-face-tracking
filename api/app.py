from flask import Flask, jsonify, request
import mariadb
import sys
import os
from dotenv import load_dotenv

# Gunakan env dari direktori ai_engine untuk prototype
load_dotenv(dotenv_path='../ai_engine/.env')

app = Flask(__name__)

# Bypass aturan CORS browser untuk Flutter Web
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    return response

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

@app.route('/api/sesi-aktif', methods=['GET'])
def get_sesi_aktif():
    conn = get_connection()
    if conn is None:
        return jsonify({'error': 'Database error'}), 500
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id_sesi, mata_pelajaran FROM tb_sesi_kelas WHERE status = 'Berjalan'")
        sessions = [{"id_sesi": row[0], "mata_pelajaran": row[1]} for row in cursor.fetchall()]
        return jsonify({'status': 'success', 'data': sessions}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/update-guru', methods=['POST'])
def update_guru():
    data = request.json
    if not data: return jsonify({"error": "No data"}), 400
    
    id_sesi = data.get('id_sesi')
    nama_guru = data.get('nama_guru')
    
    conn = get_connection()
    if conn is None: return jsonify({"error": "DB err"}), 500
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE tb_sesi_kelas SET nama_guru = ? WHERE id_sesi = ?", (nama_guru, id_sesi))
        conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/tutup-sesi', methods=['POST'])
def tutup_sesi():
    data = request.json
    id_sesi = data.get('id_sesi')
    conn = get_connection()
    if conn is None: return jsonify({"error": "DB err"}), 500
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE tb_sesi_kelas SET waktu_selesai = NOW(), status = 'Selesai' WHERE id_sesi = ?", (id_sesi,))
        conn.commit()
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/cek-sesi/<id_sesi>', methods=['GET'])
def cek_sesi(id_sesi):
    conn = get_connection()
    if conn is None: return jsonify({"error": "DB err"}), 500
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT status FROM tb_sesi_kelas WHERE id_sesi = ?", (id_sesi,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"status": "not_found", "message": "PIN tidak ditemukan."})
        if row['status'] != 'Berjalan':
            return jsonify({"status": "closed", "message": "Sesi telah ditutup."})
        return jsonify({"status": "active", "message": "Sesi berjalan."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(port=5000, debug=True)
