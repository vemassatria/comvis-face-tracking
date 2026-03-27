import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'dart:async';

void main() {
  runApp(const ClassInsightApp());
}

class ClassInsightApp extends StatelessWidget {
  const ClassInsightApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ClassInsight Dashboard',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: const DashboardScreen(),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  List<dynamic> logs = [];
  Timer? timer;
  bool isLoading = true;
  String currentSession = "BIO-123";

  @override
  void initState() {
    super.initState();
    fetchLogs();
    // Refresh otomatis setiap 5 detik
    timer = Timer.periodic(const Duration(seconds: 5), (Timer t) => fetchLogs());
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  Future<void> fetchLogs() async {
    try {
      final response = await http.get(Uri.parse('http://127.0.0.1:5000/api/status-kelas/$currentSession'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        setState(() {
          logs = data['data'];
          isLoading = false;
        });
      }
    } catch (e) {
      print('Error fetching logs: $e');
      setState(() { isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Monitoring Kelas: $currentSession'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: fetchLogs,
          )
        ],
      ),
      body: isLoading 
        ? const Center(child: CircularProgressIndicator())
        : logs.isEmpty 
          ? const Center(child: Text("Belum ada log atensi yang terekam."))
          : ListView.builder(
              itemCount: logs.length,
              itemBuilder: (context, index) {
                var log = logs[index];
                bool isTidur = log['kategori'] == 'Mengantuk';
                
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: isTidur ? Colors.red : Colors.orange,
                      child: const Icon(Icons.warning, color: Colors.white),
                    ),
                    title: Text("NIS: ${log['nis']} - ${log['kategori']}"),
                    subtitle: Text("Durasi: ${log['durasi_detik']} detik | Waktu: ${log['waktu_kejadian']}"),
                  ),
                );
              },
            ),
    );
  }
}
