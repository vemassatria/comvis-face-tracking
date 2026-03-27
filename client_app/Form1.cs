using System;
using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace StudentClient
{
    public partial class Form1 : Form
    {
        private TextBox txtNis;
        private TextBox txtNama;
        private TextBox txtSessionCode;
        private Button btnStart;
        private NotifyIcon trayIcon;
        private Label lblClose;
        private Label lblMinimize;

        // Untuk dragging form borderless
        public const int WM_NCLBUTTONDOWN = 0xA1;
        public const int HT_CAPTION = 0x2;

        [DllImport("user32.dll")]
        public static extern int SendMessage(IntPtr hWnd, int Msg, int wParam, int lParam);
        [DllImport("user32.dll")]
        public static extern bool ReleaseCapture();

        public Form1()
        {
            InitializeComponent();
            SetupModernUI();
            SetupTrayIcon();
        }

        private void SetupModernUI()
        {
            this.Text = "ClassInsight Client";
            this.Size = new Size(400, 300);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.None; // Borderless
            this.BackColor = Color.FromArgb(30, 30, 30); // Dark theme

            // Panel Header untuk drag
            Panel headerPanel = new Panel();
            headerPanel.Size = new Size(this.Width, 35);
            headerPanel.Location = new Point(0, 0);
            headerPanel.BackColor = Color.FromArgb(45, 45, 48);
            headerPanel.MouseDown += HeaderPanel_MouseDown;

            Label lblTitle = new Label { Text = "ClassInsight", Font = new Font("Segoe UI", 10, FontStyle.Bold), ForeColor = Color.White, Location = new Point(10, 8), AutoSize = true };
            headerPanel.MouseDown += HeaderPanel_MouseDown;
            lblTitle.MouseDown += HeaderPanel_MouseDown;

            // Tombol Custom Close & Minimize
            lblClose = new Label { Text = "X", Font = new Font("Segoe UI", 10, FontStyle.Bold), ForeColor = Color.DarkGray, Location = new Point(this.Width - 30, 8), Cursor = Cursors.Hand, AutoSize = true };
            lblClose.Click += (s, e) => Application.Exit();
            lblClose.MouseEnter += (s, e) => lblClose.ForeColor = Color.Red;
            lblClose.MouseLeave += (s, e) => lblClose.ForeColor = Color.DarkGray;

            lblMinimize = new Label { Text = "-", Font = new Font("Segoe UI", 14, FontStyle.Bold), ForeColor = Color.DarkGray, Location = new Point(this.Width - 60, 5), Cursor = Cursors.Hand, AutoSize = true };
            lblMinimize.Click += (s, e) => this.WindowState = FormWindowState.Minimized;
            lblMinimize.MouseEnter += (s, e) => lblMinimize.ForeColor = Color.White;
            lblMinimize.MouseLeave += (s, e) => lblMinimize.ForeColor = Color.DarkGray;

            headerPanel.Controls.Add(lblTitle);
            headerPanel.Controls.Add(lblClose);
            headerPanel.Controls.Add(lblMinimize);

            // Form Body
            Label lblHeader = new Label { Text = "Sesi Pembelajaran", Font = new Font("Segoe UI", 16, FontStyle.Bold), ForeColor = Color.White, Location = new Point(95, 60), AutoSize = true };
            
            Label lblNama = new Label { Text = "Nama:", Font = new Font("Segoe UI", 10), ForeColor = Color.LightGray, Location = new Point(50, 110), AutoSize = true };
            txtNama = new TextBox { Location = new Point(150, 108), Width = 180, Font = new Font("Segoe UI", 10), BackColor = Color.FromArgb(50, 50, 50), ForeColor = Color.White, BorderStyle = BorderStyle.FixedSingle };

            Label lblNis = new Label { Text = "NIS:", Font = new Font("Segoe UI", 10), ForeColor = Color.LightGray, Location = new Point(50, 145), AutoSize = true };
            txtNis = new TextBox { Location = new Point(150, 143), Width = 180, Font = new Font("Segoe UI", 10), BackColor = Color.FromArgb(50, 50, 50), ForeColor = Color.White, BorderStyle = BorderStyle.FixedSingle };

            Label lblSession = new Label { Text = "PIN Kelas:", Font = new Font("Segoe UI", 10), ForeColor = Color.LightGray, Location = new Point(50, 180), AutoSize = true };
            txtSessionCode = new TextBox { Location = new Point(150, 178), Width = 180, Font = new Font("Segoe UI", 10), BackColor = Color.FromArgb(50, 50, 50), ForeColor = Color.White, BorderStyle = BorderStyle.FixedSingle };

            btnStart = new Button { Text = "Mulai Sesi", Location = new Point(150, 225), Width = 180, Height = 35, Font = new Font("Segoe UI", 10, FontStyle.Bold), BackColor = Color.FromArgb(0, 122, 204), ForeColor = Color.White, FlatStyle = FlatStyle.Flat };
            btnStart.FlatAppearance.BorderSize = 0;
            btnStart.Cursor = Cursors.Hand;
            btnStart.Click += BtnStart_Click;

            this.Controls.Add(headerPanel);
            this.Controls.Add(lblHeader);
            this.Controls.Add(lblNama);
            this.Controls.Add(txtNama);
            this.Controls.Add(lblNis);
            this.Controls.Add(txtNis);
            this.Controls.Add(lblSession);
            this.Controls.Add(txtSessionCode);
            this.Controls.Add(btnStart);
        }

        private void HeaderPanel_MouseDown(object sender, MouseEventArgs e)
        {
            if (e.Button == MouseButtons.Left)
            {
                ReleaseCapture();
                SendMessage(Handle, WM_NCLBUTTONDOWN, HT_CAPTION, 0);
            }
        }

        private void SetupTrayIcon()
        {
            trayIcon = new NotifyIcon();
            trayIcon.Icon = SystemIcons.Application;
            trayIcon.Text = "ClassInsight is running.";
            trayIcon.Visible = false;

            ContextMenuStrip menu = new ContextMenuStrip();
            menu.Items.Add("Buka Aplikasi", null, (s, e) => ShowApp());
            menu.Items.Add("Hentikan Sesi & Keluar", null, (s, e) => Application.Exit());
            trayIcon.ContextMenuStrip = menu;
            
            trayIcon.DoubleClick += (s, e) => ShowApp();
        }

        private void BtnStart_Click(object sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(txtNis.Text) || string.IsNullOrWhiteSpace(txtSessionCode.Text) || string.IsNullOrWhiteSpace(txtNama.Text))
            {
                MessageBox.Show("Harap isi Nama, NIS dan PIN Kelas secara lengkap!", "Peringatan", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            try
            {
                using (System.Net.WebClient client = new System.Net.WebClient())
                {
                    string url = "https://api-classinsight.onrender.com/api/cek-sesi/" + txtSessionCode.Text;
                    string resp = client.DownloadString(url);
                    if (resp.Contains("\"status\": \"not_found\""))
                    {
                        MessageBox.Show("PIN Kelas tidak ditemukan dalam sistem!", "Akses Ditolak", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        return;
                    }
                    if (resp.Contains("\"status\": \"closed\""))
                    {
                        MessageBox.Show("Sesi kelas ini sudah DITUTUP atau diakhiri oleh Guru!", "Akses Ditolak", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        return;
                    }
                }

                ProcessStartInfo startInfo = new ProcessStartInfo();
            
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string pyPortable = System.IO.Path.Combine(baseDir, "ai_engine", "main.py");
            string venvPortable = System.IO.Path.Combine(baseDir, "ai_engine", "venv", "Scripts", "python.exe");

            if(System.IO.File.Exists(venvPortable) && System.IO.File.Exists(pyPortable)) {
                // Di komputer teman yang dikirim via ZIP lengkap dengan VENV
                startInfo.FileName = venvPortable;
                startInfo.Arguments = $"\"{pyPortable}\" \"{txtSessionCode.Text}\" \"{txtNis.Text}\" \"{txtNama.Text}\"";
            } else if (System.IO.File.Exists(pyPortable)) {
                // Di komputer teman tanpa VENV, tapi ada global Python
                startInfo.FileName = "python";
                startInfo.Arguments = $"\"{pyPortable}\" \"{txtSessionCode.Text}\" \"{txtNis.Text}\" \"{txtNama.Text}\"";
            } else {
                // Mode Debugging Lokal di laptop Anda
                startInfo.FileName = @"c:\KULIAH\cinta\comvis\ai_engine\venv\Scripts\python.exe";
                startInfo.Arguments = $@"""c:\KULIAH\cinta\comvis\ai_engine\main.py"" ""{txtSessionCode.Text}"" ""{txtNis.Text}"" ""{txtNama.Text}""";
            }
                startInfo.UseShellExecute = false;
                startInfo.CreateNoWindow = true; 
                Process.Start(startInfo);
                
                MessageBox.Show("Sesi dimulai! AI membaca atensi Anda. Aplikasi Terminise ke System Tray.", "Informasi", MessageBoxButtons.OK, MessageBoxIcon.Information);
                HideApp();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Gagal memulai modul AI: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void HideApp()
        {
            this.Hide();
            trayIcon.Visible = true;
        }

        private void ShowApp()
        {
            this.Show();
            trayIcon.Visible = false;
        }
    }
}
