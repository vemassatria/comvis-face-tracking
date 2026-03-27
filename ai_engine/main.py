import cv2 # type: ignore
import mediapipe as mp # type: ignore
import time
import math
import numpy as np
import os
from db_helper import log_atensi

BaseOptions = mp.tasks.BaseOptions
FaceLandmarker = mp.tasks.vision.FaceLandmarker
FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]
LEFT_IRIS = [474, 475, 476, 477] 
RIGHT_IRIS = [469, 470, 471, 472]
MOUTH = [78, 308, 82, 87, 13, 14, 312, 317]

EAR_THRESHOLD = 0.28
MAR_YAWN_THRESHOLD = 0.55
TIME_THRESHOLD = 4 
import sys
if len(sys.argv) >= 4:
    CURRENT_ID_SESI = sys.argv[1]
    CURRENT_NIS = sys.argv[2]
    CURRENT_NAMA = sys.argv[3]
else:
    CURRENT_ID_SESI = "BIO-123"
    CURRENT_NIS = "123456"
    CURRENT_NAMA = "Anonim"

# Daftarkan langsung agar Guru bisa memilihnya di Portal Dropdown!
try:
    import db_helper
    # Hanya mendaftarkan siswa. Jika id_sesi belum dibuat guru, maka log_atensi nanti akan ditolak DB.
    # Ini memastikan Sesi DIBUAT OLEH GURU terlebih dahulu.
    db_helper.register_student_only(CURRENT_NIS, CURRENT_NAMA)
except Exception as e:
    print(f"Err booting: {e}")

def calculate_ear(landmarks, eye_indices, img_w, img_h):
    p = [(landmarks[idx].x * img_w, landmarks[idx].y * img_h) for idx in eye_indices]
    v1 = math.sqrt((p[1][0] - p[5][0])**2 + (p[1][1] - p[5][1])**2)
    v2 = math.sqrt((p[2][0] - p[4][0])**2 + (p[2][1] - p[4][1])**2)
    h = math.sqrt((p[0][0] - p[3][0])**2 + (p[0][1] - p[3][1])**2)
    return (v1 + v2) / (2.0 * h) if h != 0 else 0

def calculate_mar(landmarks, mouth_indices, img_w, img_h):
    p = [(landmarks[idx].x * img_w, landmarks[idx].y * img_h) for idx in mouth_indices]
    v1 = math.sqrt((p[2][0] - p[3][0])**2 + (p[2][1] - p[3][1])**2)
    v2 = math.sqrt((p[4][0] - p[5][0])**2 + (p[4][1] - p[5][1])**2)
    v3 = math.sqrt((p[6][0] - p[7][0])**2 + (p[6][1] - p[7][1])**2)
    h = math.sqrt((p[0][0] - p[1][0])**2 + (p[0][1] - p[1][1])**2)
    return (v1 + v2 + v3) / (3.0 * h) if h != 0 else 0

def calculate_iris_center(landmarks, iris_indices, img_w, img_h):
    xs = [landmarks[idx].x * img_w for idx in iris_indices]
    ys = [landmarks[idx].y * img_h for idx in iris_indices]
    return (sum(xs)/len(iris_indices), sum(ys)/len(iris_indices))

def check_gaze(iris_center, eye_inner, eye_outer):
    d_inner = math.sqrt((iris_center[0] - eye_inner[0])**2 + (iris_center[1] - eye_inner[1])**2)
    d_outer = math.sqrt((iris_center[0] - eye_outer[0])**2 + (iris_center[1] - eye_outer[1])**2)
    ratio = d_inner / d_outer if d_outer > 0 else 1
    if ratio < 0.6: return "KIRI" 
    elif ratio > 1.6: return "KANAN"
    else: return "TENGAH"

def draw_hud_box(img, x, y, w, h, color):
    thickness = 2
    length = 20
    cv2.line(img, (x, y), (x + length, y), color, thickness)
    cv2.line(img, (x, y), (x, y + length), color, thickness)
    cv2.line(img, (x + w, y), (x + w - length, y), color, thickness)
    cv2.line(img, (x + w, y), (x + w, y + length), color, thickness)
    cv2.line(img, (x, y + h), (x + length, y + h), color, thickness)
    cv2.line(img, (x, y + h), (x, y + h - length), color, thickness)
    cv2.line(img, (x + w, y + h), (x + w - length, y + h), color, thickness)
    cv2.line(img, (x + w, y + h), (x + w, y + h - length), color, thickness)

def main():
    model_path = os.path.join(os.path.dirname(__file__), 'face_landmarker.task')
    options = FaceLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=VisionRunningMode.VIDEO,
        num_faces=1)

    window_name = 'ClassInsight: Mesin AI - Pusat Komando HUD'
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.resizeWindow(window_name, 1280, 720) 

    with FaceLandmarker.create_from_options(options) as landmarker:
        cap = cv2.VideoCapture(0)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

        loss_focus_start_time = 0.0
        focus_loss_type = ""

        ema_ear = 0.0; ema_mar = 0.0
        ema_init = False
        alpha_ear = 0.4; alpha_mar = 0.3
        prev_frame_time = 0

        blink_count = 0; is_blinking = False
        scanline_y = 0

        while cap.isOpened():
            success, image = cap.read()
            if not success:
                cap = cv2.VideoCapture(1)
                success, image = cap.read()
                if not success: break
            
            # MEMBALIK KAMERA SEPERTI CERMIN (Mirror Effect / Normalisasi Selfie)
            image = cv2.flip(image, 1)

            image = cv2.resize(image, (1280, 720))
            img_h, img_w, _ = image.shape
            
            scanline_y += 10
            if scanline_y > img_h: scanline_y = 0
            
            # Perlu ubah kembali format BGR ke RGB untuk MediaPipe
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            frame_timestamp_ms = int(time.time() * 1000)
            result = landmarker.detect_for_video(mp_image, frame_timestamp_ms)

            status_text = "SISTEM: NORMAL [FOKUS]"
            bg_color = (0, 255, 0)
            
            is_sleepy, is_turned, is_yawning, is_absent = False, False, False, False
            proximity_status = "OPTIMAL"
            gaze_direction = "TENGAH"
            emotion = "NETRAL"

            if not result.face_landmarks:
                is_absent = True
            else:
                for face_landmarks in result.face_landmarks:
                    # EAR & Blink
                    l_ear = calculate_ear(face_landmarks, LEFT_EYE, img_w, img_h)
                    r_ear = calculate_ear(face_landmarks, RIGHT_EYE, img_w, img_h)
                    avg_ear = (l_ear + r_ear) / 2.0
                    if not ema_init:
                        ema_ear = avg_ear
                    else:
                        ema_ear = alpha_ear * avg_ear + (1 - alpha_ear) * ema_ear
                    
                    if ema_ear < EAR_THRESHOLD:
                        is_sleepy = True
                        if not is_blinking: is_blinking = True
                    else:
                        if is_blinking:
                            blink_count += 1
                            is_blinking = False

                    # MAR (Menguap / Mulut)
                    raw_mar = calculate_mar(face_landmarks, MOUTH, img_w, img_h)
                    if not ema_init:
                        ema_mar = raw_mar
                        ema_init = True
                    else:
                        ema_mar = alpha_mar * raw_mar + (1 - alpha_mar) * ema_mar
                    if ema_mar > MAR_YAWN_THRESHOLD: is_yawning = True

                    # EMOTION (Senyum, Terkejut, Sedih, Bosan, Netral)
                    lip_width = math.sqrt(((face_landmarks[308].x - face_landmarks[78].x)*img_w)**2 + ((face_landmarks[308].y - face_landmarks[78].y)*img_h)**2)
                    face_w = math.sqrt(((face_landmarks[454].x - face_landmarks[234].x)*img_w)**2)
                    smile_ratio = lip_width / face_w if face_w > 0 else 0
                    
                    # Deteksi Sedih (Frown) -> sudut bibir lebih rendah (y lebih besar) daripada bibir bawah tengah
                    lip_center_y = face_landmarks[14].y * img_h
                    left_corner_y = face_landmarks[308].y * img_h
                    right_corner_y = face_landmarks[78].y * img_h
                    frown_diff = ((left_corner_y - lip_center_y) + (right_corner_y - lip_center_y)) / 2.0
                    
                    if avg_ear > 0.35 and ema_mar > 0.15 and ema_mar < 0.45:
                        # Mata terbelalak dan mulut agak terbuka 
                        emotion = "TERKEJUT (KAGET)"
                    elif smile_ratio > 0.42 and ema_mar < 0.2: 
                        # Bibir melebar
                        emotion = "SENYUM (BAHAGIA)"
                    elif frown_diff > 2.5: 
                        # Sudut bibir tertarik ke bawah cukup drastis
                        emotion = "SEDIH (MURUNG)"
                    elif ema_ear > EAR_THRESHOLD and ema_ear <= (EAR_THRESHOLD + 0.05) and ema_mar < 0.1:
                        # Mata setengah tertutup / sayu (sedikit di atas batas terpejam)
                        emotion = "BOSAN (SAYU)"

                    # Gaze Tracking
                    if len(face_landmarks) >= 478:
                        # Kita ambil mata kanan pengguna untuk patokan lirik
                        r_iris_center = calculate_iris_center(face_landmarks, RIGHT_IRIS, img_w, img_h)
                        r_inner = (face_landmarks[133].x * img_w, face_landmarks[133].y * img_h)
                        r_outer = (face_landmarks[33].x * img_w, face_landmarks[33].y * img_h)
                        
                        # Jika kamera diflip, hasil kiri-kanan secara visual di layar akan tertukar.
                        # Karena kita balik gambar secara visual, logika lirik dari perspektif pengguna akan kembali normal (Kiri adalah layar kiri).
                        gaze_direction = check_gaze(r_iris_center, r_inner, r_outer)
                        
                        # Gambar Kornea
                        cv2.circle(image, (int(r_iris_center[0]), int(r_iris_center[1])), 4, (0, 0, 255), -1)
                        l_iris_center = calculate_iris_center(face_landmarks, LEFT_IRIS, img_w, img_h)
                        cv2.circle(image, (int(l_iris_center[0]), int(l_iris_center[1])), 4, (0, 0, 255), -1)

                    # Bounding Box & Proximity
                    x_min = img_w; y_min = img_h; x_max = 0; y_max = 0
                    for lm in face_landmarks:
                        x, y = int(lm.x * img_w), int(lm.y * img_h)
                        if x < x_min: x_min = x
                        if y < y_min: y_min = y
                        if x > x_max: x_max = x
                        if y > y_max: y_max = y

                    face_ratio = (x_max - x_min) / img_w
                    if face_ratio > 0.45: proximity_status = "TERLALU DEKAT"
                    elif face_ratio < 0.12: proximity_status = "TERLALU JAUH"

                    # Pose Menoleh (Yaw)
                    nose = face_landmarks[1]
                    lei = face_landmarks[133]; rei = face_landmarks[362]
                    d_left = math.sqrt(((nose.x - lei.x)*img_w)**2 + ((nose.y - lei.y)*img_h)**2)
                    d_right = math.sqrt(((nose.x - rei.x)*img_w)**2 + ((nose.y - rei.y)*img_h)**2)
                    ratio = d_left / d_right if d_right > 0 else 0
                    if ratio > 2.2 or ratio < 0.45: is_turned = True

                    # Pose Menunduk (Pitch Down)
                    forehead = face_landmarks[10]
                    chin = face_landmarks[152]
                    d_up = math.sqrt(((nose.x - forehead.x)*img_w)**2 + ((nose.y - forehead.y)*img_h)**2)
                    d_down = math.sqrt(((nose.x - chin.x)*img_w)**2 + ((nose.y - chin.y)*img_h)**2)
                    pitch_ratio = d_up / d_down if d_down > 0 else 0
                    is_looking_down = pitch_ratio > 1.6
                    
                    # Deteksi Berbicara (Bukaan Mulut Medium)
                    is_talking = ema_mar > 0.12 and ema_mar < 0.50 and emotion not in ["SENYUM (BAHAGIA)", "TERKEJUT (KAGET)"]
                    
                    # GAMBAR VISUAL HUD
                    draw_hud_box(image, x_min - 20, y_min - 40, x_max - x_min + 40, y_max - y_min + 60, (0, 255, 0))
                    cx, cy = int(nose.x * img_w), int(nose.y * img_h)
                    cv2.drawMarker(image, (cx, cy), (0, 255, 255), cv2.MARKER_CROSS, 20, 1)

            # Logika Status Utama (Dilokalkan)
            val_status = ""
            if is_absent:
                status_text = "KRITIKAL: TARGET HILANG!"
                bg_color = (0, 0, 255); val_status = "Tidak Ada Di Tempat"
            elif proximity_status != "OPTIMAL":
                status_text = f"PERINGATAN: JARAK {proximity_status}!"
                bg_color = (0, 165, 255); val_status = "Teralih/Menoleh" 
            elif is_sleepy:
                status_text = "KRITIKAL: MATA TERPEJAM!"
                bg_color = (0, 0, 255); val_status = "Mengantuk"
            elif is_looking_down:
                status_text = "PERINGATAN: MENUNDUK (FOKUS HILANG)!"
                bg_color = (0, 165, 255); val_status = "Menunduk"
            elif is_turned:
                status_text = "PERINGATAN: TERALIH / MENOLEH!"
                bg_color = (0, 0, 255); val_status = "Teralih/Menoleh"
            elif is_yawning:
                status_text = "PERINGATAN: MENGUAP!"
                bg_color = (0, 165, 255); val_status = "Menguap"
            elif is_talking:
                status_text = "PERINGATAN: INDIKASI BERBICARA!"
                bg_color = (0, 165, 255); val_status = "Berbicara"
            elif proximity_status != "OPTIMAL":
                status_text = f"PERINGATAN: JARAK {proximity_status}!"
                bg_color = (0, 165, 255); val_status = "Teralih/Menoleh" 
            elif gaze_direction != "TENGAH":
                status_text = f"PERINGATAN: MELIRIK KE {gaze_direction}!"
                bg_color = (0, 165, 255); val_status = "Teralih/Menoleh"
            elif emotion in ["BOSAN (SAYU)", "SEDIH (MURUNG)"]:
                status_text = f"PERINGATAN: PSIKOLOGIS - {emotion}!"
                bg_color = (0, 100, 255); val_status = emotion
            
            # Jika aman, tampilkan emosi positif
            if val_status == "":
                if emotion == "SENYUM (BAHAGIA)":
                    status_text = "SISTEM: PENGGUNA TERSENYUM :)"
                    bg_color = (255, 100, 100)
                elif emotion == "TERKEJUT (KAGET)":
                    status_text = "SISTEM: PENGGUNA TERKEJUT :O"
                    bg_color = (100, 255, 255)

            # Logic Detik Pelanggaran
            if val_status != "":
                if loss_focus_start_time == 0.0:
                    loss_focus_start_time = time.time(); focus_loss_type = val_status
                elif focus_loss_type != val_status:
                    loss_focus_start_time = time.time(); focus_loss_type = val_status
            else:
                if loss_focus_start_time > 0.0:
                    duration = int(time.time() - loss_focus_start_time)
                    if duration >= TIME_THRESHOLD:
                        log_atensi(CURRENT_ID_SESI, CURRENT_NIS, duration, focus_loss_type, "Sistem AI Deteksi Baru")
                loss_focus_start_time = 0.0; focus_loss_type = ""

            # --- RENDER OSD ---
            new_frame_time = time.time()
            fps = 1/(new_frame_time-prev_frame_time) if prev_frame_time > 0 else 0
            prev_frame_time = new_frame_time

            cv2.rectangle(image, (0, 0), (img_w, 60), (30,30,30), -1)
            cv2.putText(image, status_text, (30, 40), cv2.FONT_HERSHEY_DUPLEX, 1.2, bg_color, 2)
            cv2.putText(image, f"Sesi: {CURRENT_ID_SESI} | Emosi: {emotion}", (img_w - 530, 40), cv2.FONT_HERSHEY_PLAIN, 1.5, (200, 200, 200), 2)

            # Metrik di Kiri
            cv2.rectangle(image, (20, 100), (350, 360), (20, 20, 20), -1)
            cv2.rectangle(image, (20, 100), (350, 360), (0, 255, 0), 1)
            cv2.putText(image, "[DATA TELEMETRI]", (30, 130), cv2.FONT_HERSHEY_PLAIN, 1.2, (0, 255, 0), 2)
            if ema_init and not is_absent:
                cv2.putText(image, f"EAR (Mata): {ema_ear:.2f}", (30, 170), cv2.FONT_HERSHEY_PLAIN, 1.4, (0, 255, 255), 2)
                cv2.putText(image, f"MAR (Mulut): {ema_mar:.2f}", (30, 210), cv2.FONT_HERSHEY_PLAIN, 1.4, (255, 0, 255), 2)
            cv2.putText(image, f"Jarak    : {proximity_status}", (30, 250), cv2.FONT_HERSHEY_PLAIN, 1.2, (200, 200, 200), 1)
            cv2.putText(image, f"Kedipan  : {blink_count}", (30, 290), cv2.FONT_HERSHEY_PLAIN, 1.4, (0, 150, 255), 2)
            cv2.putText(image, f"Arah Mata: {gaze_direction}", (30, 330), cv2.FONT_HERSHEY_PLAIN, 1.4, (0, 0, 255), 2)

            if loss_focus_start_time > 0.0:
                dur = int(time.time() - loss_focus_start_time)
                cv2.putText(image, f"WAKTU PENALTI: {dur} Detik", (img_w//2 - 200, img_h - 50), cv2.FONT_HERSHEY_DUPLEX, 1.2, (0, 0, 255), 2)

            cv2.line(image, (0, scanline_y), (img_w, scanline_y), (0, 50, 0), 1)
            cv2.imshow(window_name, image)
            
            # CEK PENUTUPAN JENDELA (ESC DITEKAN ATAU TOMBOL 'X' DIKLIK)
            key = cv2.waitKey(1) & 0xFF
            if key == 27 or cv2.getWindowProperty(window_name, cv2.WND_PROP_VISIBLE) < 1:
                # Simpan sisa log jika masih melakukan pelanggaran saat layar diclose
                if loss_focus_start_time > 0.0:
                    dur = int(time.time() - loss_focus_start_time)
                    if dur >= TIME_THRESHOLD:
                        log_atensi(CURRENT_ID_SESI, CURRENT_NIS, dur, focus_loss_type, "Sistem AI (Sesi Berakhir)")
                break

        cap.release()
        cv2.destroyAllWindows()

if __name__ == '__main__':
    main()
