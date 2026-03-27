import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:math';
import 'dart:async';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ClassInsight Portal',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blueAccent),
        useMaterial3: true,
      ),
      home: const PortalScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class PortalScreen extends StatefulWidget {
  const PortalScreen({super.key});

  @override
  State<PortalScreen> createState() => _PortalScreenState();
}

class _PortalScreenState extends State<PortalScreen> {
  final TextEditingController _guruController = TextEditingController();
  final TextEditingController _kelasManualController = TextEditingController();
  final TextEditingController _mapelController = TextEditingController();
  
  List<dynamic> activeSessions = [];
  String? selectedSession;
  bool isLoading = true;
  bool isCreatingState = false;

  @override
  void initState() {
    super.initState();
    fetchActiveSessions();
  }

  Future<void> fetchActiveSessions() async {
    try {
      final response = await http.get(Uri.parse('http://127.0.0.1:5000/api/sesi-aktif'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          activeSessions = data['data'];
          if (activeSessions.isNotEmpty) {
            selectedSession = activeSessions.first['id_sesi'].toString();
          }
          isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Gagal menarik sesi: $e');
      setState(() { isLoading = false; });
    }
  }

  Future<void> _buatKelasBaru() async {
    String guruName = _guruController.text.trim();
    String mapel = _mapelController.text.trim();

    if (guruName.isEmpty || mapel.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Harap isi Nama Guru dan Mata Pelajaran!')));
      return;
    }

    // Generate PIN 5 digit
    String newPin = (10000 + Random().nextInt(90000)).toString();

    setState(() { isLoading = true; });
    try {
      final response = await http.post(
        Uri.parse('http://127.0.0.1:5000/api/sesi'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'id_sesi': newPin,
          'mata_pelajaran': mapel,
          'nama_guru': guruName,
        }),
      );

      if (response.statusCode == 200) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Kelas berhasil dibuat. Minta siswa masuk dengan PIN: $newPin'), backgroundColor: Colors.green));
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => DashboardPage(
              namaGuru: guruName,
              idSesi: newPin,
              isSelesai: false,
            ),
          ),
        );
      }
    } catch (e) {
      debugPrint('Gagal buat kelas: $e');
    } finally {
      if (mounted) setState(() { isLoading = false; });
    }
  }

  Future<void> _masukDashboard() async {
    String guruName = _guruController.text.trim();
    String finalSession = selectedSession ?? _kelasManualController.text.trim();

    if (guruName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Harap masukkan Nama Guru!')));
      return;
    }
    
    if (finalSession.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pilih atau ketik Kode PIN Kelas!')));
      return;
    }

    setState(() { isLoading = true; });
    bool isClosed = false;

    try {
      final checkRes = await http.get(Uri.parse('http://127.0.0.1:5000/api/cek-sesi/$finalSession'));
      if (checkRes.statusCode == 200) {
        final dataCheck = json.decode(checkRes.body);
        if (dataCheck['status'] == 'not_found') {
           setState(() { isLoading = false; });
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('PIN tidak ditemukan di Database!')));
           return;
        }
        isClosed = dataCheck['status'] == 'closed';
      }

      if (!isClosed) {
        await http.post(
          Uri.parse('http://127.0.0.1:5000/api/update-guru'),
          headers: {'Content-Type': 'application/json'},
          body: json.encode({'id_sesi': finalSession, 'nama_guru': guruName}),
        );
      }
    } catch (e) {
      debugPrint('Gagal update/cek nama guru: $e');
    }
    
    if (!mounted) return;
    setState(() { isLoading = false; });

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => DashboardPage(
          namaGuru: guruName,
          idSesi: finalSession,
          isSelesai: isClosed,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey.shade100,
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            width: 450,
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4))],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(Icons.admin_panel_settings, size: 64, color: Colors.blueAccent),
              const SizedBox(height: 16),
              const Text('Portal Administrator', textAlign: TextAlign.center, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const Text('Silakan kelola kelas pintar Anda', textAlign: TextAlign.center, style: TextStyle(color: Colors.black54)),
              const SizedBox(height: 32),
              
              TextField(
                controller: _guruController,
                decoration: const InputDecoration(
                  labelText: 'Identitas Guru',
                  prefixIcon: Icon(Icons.person),
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),

              if (isCreatingState) ...[
                // UI BUAT KELAS BARU
                TextField(
                  controller: _mapelController,
                  decoration: const InputDecoration(
                    labelText: 'Nama Mata Pelajaran',
                    prefixIcon: Icon(Icons.menu_book),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green.shade600,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: isLoading ? null : _buatKelasBaru,
                  child: isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text('BUAT KELAS BARU & MASUK', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                TextButton(
                  onPressed: () {
                    setState(() { isCreatingState = false; });
                    fetchActiveSessions();
                  },
                  child: const Text('Batal (Kembali ke Daftar Kelas)'),
                ),
              ] else ...[
                // UI MASUK KELAS YANG SUDAH ADA / RIWAYAT
                if (isLoading)
                  const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator()))
                else ...[
                  if (activeSessions.isNotEmpty) ...[
                    const Text('Pilih Kelas Aktif (PIN):', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: selectedSession,
                      decoration: const InputDecoration(border: OutlineInputBorder()),
                      items: activeSessions.map<DropdownMenuItem<String>>((sesi) {
                        return DropdownMenuItem<String>(
                          value: sesi['id_sesi'].toString(),
                          child: Text('PIN ${sesi['id_sesi']} - ${sesi['mata_pelajaran']}'),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setState(() { selectedSession = val; _kelasManualController.clear(); });
                      },
                    ),
                    const SizedBox(height: 16),
                    const Text('Atau Akses Riwayat (Ketik PIN):', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black87)),
                    const SizedBox(height: 8),
                  ],
                  if (activeSessions.isEmpty) ...[
                     const Text('Belum ada kelas terbuka di DB.', style: TextStyle(color: Colors.red)),
                     const SizedBox(height: 10),
                  ],
                  TextField(
                    controller: _kelasManualController,
                    decoration: const InputDecoration(
                      labelText: 'Ketik PIN Kelas Manual',
                      prefixIcon: Icon(Icons.numbers),
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (val) {
                      if (val.isNotEmpty) setState(() { selectedSession = null; });
                    },
                  ),
                ],
                const SizedBox(height: 24),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blueAccent,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: isLoading ? null : _masukDashboard,
                  child: const Text('PANTAU KELAS / RIWAYAT', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
                TextButton(
                  onPressed: () => setState(() { isCreatingState = true; }),
                  child: const Text('Buat Kelas PIN Baru', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
                ),
              ],
            ],
          ),
        ),
      ),
      ),
    );
  }
}

class DashboardPage extends StatefulWidget {
  final String namaGuru;
  final String idSesi;
  final bool isSelesai;
  
  const DashboardPage({super.key, required this.namaGuru, required this.idSesi, required this.isSelesai});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  late String currentSession;
  List<dynamic> logs = [];
  Timer? timer;

  @override
  void initState() {
    super.initState();
    currentSession = widget.idSesi;
    fetchLogs();
    if (!widget.isSelesai) {
      timer = Timer.periodic(const Duration(seconds: 5), (Timer t) => fetchLogs());
    }
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  Future<void> fetchLogs() async {
    if (currentSession.isEmpty) return;
    try {
      final response = await http.get(Uri.parse('http://127.0.0.1:5000/api/status-kelas/$currentSession'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (mounted) setState(() { logs = data['data']; });
      }
    } catch (e) {
      debugPrint('Error fetching logs: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.isSelesai ? 'Riwayat Laporan (Selesai: $currentSession)' : 'Monitoring Kelas (PIN: $currentSession)', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
            Text('Guru Pengajar: ${widget.namaGuru}', style: const TextStyle(fontSize: 14, color: Colors.black54)),
          ],
        ),
        backgroundColor: widget.isSelesai ? Colors.grey.shade300 : Colors.blue.shade100,
        actions: [
          if (widget.isSelesai)
            IconButton(
              icon: const Icon(Icons.arrow_back, color: Colors.black87),
              tooltip: 'Kembali ke Portal',
              onPressed: () => Navigator.pop(context),
            )
          else
            IconButton(
              icon: const Icon(Icons.exit_to_app, color: Colors.blueAccent),
              tooltip: 'Akhiri Kelas',
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Akhiri Sesi Kelas?'),
                    content: const Text('Menyelesaikan sesi ini akan mencatat "Waktu Selesai" secara permanen di database dan menghapus PIN dari daftar aktif.'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Batal')),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                        onPressed: () async {
                          Navigator.pop(ctx);
                          try {
                            await http.post(
                              Uri.parse('http://127.0.0.1:5000/api/tutup-sesi'),
                              headers: {'Content-Type': 'application/json'},
                              body: json.encode({'id_sesi': currentSession}),
                            );
                          } catch (e) {
                            debugPrint('Gagal tutup sesi: $e');
                          }
                          if (!mounted) return;
                          Navigator.pop(context); // Kembali ke layar sebelumnya
                        },
                        child: const Text('Ya, Tutup Kelas', style: TextStyle(color: Colors.white)),
                      ),
                    ],
                  ),
                );
              },
            ),
          const SizedBox(width: 10),
        ],
      ),
      body: logs.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shield_outlined, size: 80, color: Colors.green.shade400),
                  const SizedBox(height: 16),
                  Text('Lingkungan Kelas Terkendali.', style: TextStyle(color: Colors.green.shade700, fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text('Kosong / Belum ada aktivitas atensi merugikan.', style: TextStyle(color: Colors.grey.shade600, fontSize: 16)),
                  const SizedBox(height: 8),
                  Text('Pastikan siswa menggunakan PIN: $currentSession', style: const TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.bold)),
                ],
              )
            )
          : ListView.builder(
              itemCount: logs.length,
              itemBuilder: (context, index) {
                final log = logs[index];
                
                Color cardColor = Colors.white;
                IconData iconData = Icons.warning_amber_rounded;

                if (log['kategori'] == 'Mengantuk' || log['kategori'] == 'Tidak Ada Di Tempat') {
                  cardColor = Colors.red.shade100;
                  iconData = Icons.dangerous;
                } else if (log['kategori'] == 'Menguap' || log['kategori'] == 'Teralih/Menoleh' || log['kategori'] == 'Menunduk' || log['kategori'] == 'Berbicara') {
                  cardColor = Colors.orange.shade100;
                  iconData = Icons.warning;
                } else if (log['kategori'].toString().contains('BOSAN') || log['kategori'].toString().contains('SEDIH')) {
                  cardColor = Colors.blue.shade100;
                  iconData = Icons.mood_bad;
                }

                return Card(
                  color: cardColor,
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  elevation: 2,
                  child: ListTile(
                    leading: Icon(iconData, color: Colors.black87, size: 30),
                    title: Text('NIS: ${log['nis']} - ${log['kategori']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    subtitle: Text('Durasi: ${log['durasi_detik']} dtk | Jam: ${log['waktu_kejadian']}', style: const TextStyle(color: Colors.black87)),
                    trailing: const Icon(Icons.history, color: Colors.black38),
                  ),
                );
              },
            ),
    );
  }
}
