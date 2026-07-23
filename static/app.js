/* ============================================================
   Balubied Payroll Agent — Enhanced Frontend Engine
   Analytics | Sorting | Modal | Notifications | Dark Mode
   ============================================================ */

// ─── Default Data ───
const defaultLogs = `EmployeeID,Name,Nationality,BasicSalary,Housing,ShiftStart,ShiftEnd,CheckIn,CheckOut,SickDays,CashSales,TamweelSales,OvertimeHours
101,Ahmed Al-Ghamdi,Saudi,4000,1000,08:00,17:00,08:45,17:00,35,2,1,5
102,John Doe,Expat,5000,1500,08:00,17:00,08:00,17:00,2,0,4,8
103,Sara Al-Otaibi,Saudi,6000,1500,08:00,17:00,08:10,17:00,0,3,2,0
104,Fahad Al-Zahrani,Saudi,3500,1000,08:00,17:00,10:00,17:00,0,1,0,2
105,Michael Smith,Expat,8000,2000,08:00,17:00,08:30,17:00,0,5,5,12`;

let currentKpis = { gross: 0, gosi: 0, penalties: 0, net: 0 };
let currentPayrollData = [];
let currentPage = 1;
const rowsPerPage = 10;
let sortColumn = -1;
let sortAsc = true;

// ─── Init ───
document.addEventListener("DOMContentLoaded", () => {
    restoreDefaultLogs();
    loadThemePreference();
});

// ─── Theme Management ───
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.getAttribute("data-theme") === "dark";
    const newTheme = isDark ? "light" : "dark";
    html.setAttribute("data-theme", newTheme);
    localStorage.setItem("balubied-theme", newTheme);
    showToast(
        isDark ? "☀️" : "🌙",
        isDark ? "الوضع النهاري" : "الوضع الليلي",
        isDark ? "تم التبديل إلى المظهر الفاتح" : "تم التبديل إلى المظهر الداكن",
        "info"
    );
}

function loadThemePreference() {
    const saved = localStorage.getItem("balubied-theme");
    if (saved) {
        document.documentElement.setAttribute("data-theme", saved);
    }
}

// ─── Tab Switching ───
function switchTab(tabId) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".nav-tab-btn").forEach(el => el.classList.remove("active"));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add("active");

    const targetBtn = document.querySelector(`.nav-tab-btn[data-tab="${tabId}"]`);
    if (targetBtn) targetBtn.classList.add("active");

    const pageTitles = {
        "tab-simulation": "Balubied Payroll Agent — وكيل الرواتب والتدقيق اللحظي",
        "tab-payroll": "كشوف مسير الرواتب المعتمدة (WPS & SIF Reports)",
        "tab-analytics": "لوحة التحليلات والبيانات الإحصائية (Analytics Dashboard)",
        "tab-eosg": "حاسبة مكافأة نهاية الخدمة والبدلات (KSA EOSG Calculator)",
        "tab-chat": "مستشار بالبيد الذكي للرواتب (AI Agent Copilot Chat)"
    };
    if (pageTitles[tabId]) {
        document.getElementById("page-title").innerText = pageTitles[tabId];
    }

    // Refresh analytics when tab is opened
    if (tabId === "tab-analytics" && currentPayrollData.length > 0) {
        renderAnalyticsDashboard();
    }
}

// ─── State Management ───
function restoreDefaultLogs() {
    document.getElementById("raw-csv-input").value = defaultLogs;
    resetKPIs();

    document.getElementById("anomalies-count").innerText = "0 تنبيهات";
    document.getElementById("anomalies-container").innerHTML = `<div class="alert-item empty">لا توجد سجلات حضور معالجة بعد لتصفية الانحرافات.</div>`;

    document.getElementById("download-csv-btn").disabled = true;
    document.getElementById("download-sif-btn").disabled = true;
    document.getElementById("run-audit-btn").disabled = true;
    document.getElementById("audit-result-box").innerText = "تقرير المدقق المالي سيظهر هنا بالتفصيل فور تشغيل فحص المطابقة...";
    document.getElementById("audit-result-box").classList.remove("active");
    document.getElementById("audit-badge").innerText = "بانتظار التحقق";

    const tbody = document.querySelector("#payroll-output-table tbody");
    tbody.innerHTML = `<tr class="empty-state"><td colspan="10">يرجى الضغط على زر بدء المحاكاة والمعالجة الحية...</td></tr>`;

    setAgentState("خامل", "جاهز للعمل المباشر", "warning");
    document.getElementById("progress-section").style.display = "none";

    const terminal = document.getElementById("agent-terminal");
    terminal.innerHTML = `<div class="log-line system">[نظام] الوكيل 'سند' جاهز لبدء معالجة الرواتب والتدقيق اللحظي...</div>`;

    currentPayrollData = [];
    document.getElementById("pagination-bar").innerHTML = "";

    // Reset analytics
    document.getElementById("analytics-content").innerHTML = `
        <div class="analytics-empty">
            <span class="empty-icon">📊</span>
            <p>قم بتشغيل المحاكاة والمعالجة الحية أولاً لعرض التحليلات والبيانات الإحصائية.</p>
        </div>`;
}

function resetKPIs() {
    currentKpis = { gross: 0, gosi: 0, penalties: 0, net: 0 };
    document.getElementById("kpi-gross-pay").innerText = "0.00 ر.س";
    document.getElementById("kpi-gosi").innerText = "0.00 ر.س";
    document.getElementById("kpi-penalties").innerText = "0.00 ر.س";
    document.getElementById("kpi-net-pay").innerText = "0.00 ر.س";
}

function setAgentState(statusBadge, stateText, statusColor) {
    document.getElementById("agent-state-label").innerText = stateText;
    const badge = document.getElementById("terminal-status");
    badge.innerText = statusBadge;
    badge.className = `badge badge-${statusColor}`;
}

function appendTerminalLog(message, type = "calc") {
    const terminal = document.getElementById("agent-terminal");
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const logLine = document.createElement("div");
    logLine.className = `log-line ${type}`;
    logLine.innerText = `[${time}] ${message}`;
    terminal.appendChild(logLine);
    terminal.scrollTop = terminal.scrollHeight;
}

// ─── File Upload ───
function handleFileUpload() {
    const filePicker = document.getElementById("csv-file-picker");
    const file = filePicker.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById("raw-csv-input").value = e.target.result;
            appendTerminalLog(`📁 تم استيراد ملف جديد: ${file.name} (${file.size} bytes)`, "system");
            showToast("📁", "استيراد ملف", `تم تحميل ${file.name} بنجاح`, "success");
        };
        reader.readAsText(file);
    }
}

// ─── Simulated Data Generator ───
function generateSimulatedData() {
    const saudiFirst = ["خالد", "عبدالله", "عمر", "سعود", "ياسر", "فيصل", "نورة", "ريم", "منيرة", "سارة", "محمد", "أحمد", "عبدالرحمن", "ماجد", "سلطان", "لمى", "هند", "جواهر"];
    const saudiLast = ["الشهري", "العتيبي", "الدوسري", "الزهراني", "الغامدي", "القحطاني", "السبيعي", "الحربي", "المطيري", "العنزي", "البقمي", "الشمري", "المالكي"];
    const expatNames = ["Carlos Rivera", "Rajesh Kumar", "Tariq Mahmood", "David Chen", "Vikram Singh", "James Wilson", "Ahmed Hassan", "Ravi Patel", "Ali Hussain", "Mark Johnson", "Priya Sharma", "Brian Lee", "Yusuf Ibrahim"];

    const count = parseInt(document.getElementById("sim-count").value || 15);

    let csvContent = "EmployeeID,Name,Nationality,BasicSalary,Housing,ShiftStart,ShiftEnd,CheckIn,CheckOut,SickDays,CashSales,TamweelSales,OvertimeHours\n";

    const usedNames = new Set();

    for (let i = 1; i <= count; i++) {
        const isSaudi = Math.random() > 0.3;
        const empId = 200 + i;

        let name;
        do {
            name = isSaudi
                ? `${saudiFirst[Math.floor(Math.random() * saudiFirst.length)]} ${saudiLast[Math.floor(Math.random() * saudiLast.length)]}`
                : expatNames[Math.floor(Math.random() * expatNames.length)];
        } while (usedNames.has(name) && usedNames.size < (isSaudi ? saudiFirst.length * saudiLast.length : expatNames.length));
        usedNames.add(name);

        const nat = isSaudi ? "Saudi" : "Expat";
        const basic = Math.floor(Math.random() * 50 + 30) * 100;
        const housing = Math.floor(basic * 0.25);

        const lateMinutes = Math.random() > 0.5 ? (Math.random() > 0.7 ? Math.floor(Math.random() * 90 + 15) : Math.floor(Math.random() * 15)) : 0;
        const hh = Math.floor(lateMinutes / 60) + 8;
        const mm = lateMinutes % 60;
        const checkInStr = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;

        const sickDays = Math.random() > 0.8 ? Math.floor(Math.random() * 50) : Math.floor(Math.random() * 5);
        const cashSales = Math.floor(Math.random() * 6);
        const tamweelSales = Math.floor(Math.random() * 7);
        const overtimeHours = Math.random() > 0.5 ? Math.floor(Math.random() * 15) : 0;

        csvContent += `${empId},${name},${nat},${basic},${housing},08:00,17:00,${checkInStr},17:00,${sickDays},${cashSales},${tamweelSales},${overtimeHours}\n`;
    }

    document.getElementById("raw-csv-input").value = csvContent.trim();
    appendTerminalLog(`🎲 تم توليد بيانات ${count} موظف محاكاة بنجاح!`, "system");
    showToast("🎲", "توليد بيانات", `تم إنشاء ${count} سجل موظف عشوائي`, "info");
    restoreDefaultLogsStateOnly();
}

function restoreDefaultLogsStateOnly() {
    resetKPIs();
    document.querySelector("#payroll-output-table tbody").innerHTML = `<tr class="empty-state"><td colspan="10">بيانات المحاكاة جاهزة. انقر "بدء المحاكاة والمعالجة الحية"...</td></tr>`;
    document.getElementById("anomalies-container").innerHTML = `<div class="alert-item empty">بانتظار تشغيل المحاكاة...</div>`;
    document.getElementById("pagination-bar").innerHTML = "";
}

// ─── Live Simulation Engine ───
async function runLiveSimulation() {
    const rawData = document.getElementById("raw-csv-input").value.trim();
    if (!rawData) {
        showToast("⚠️", "خطأ", "لا توجد بيانات بصمة للمعالجة!", "error");
        return;
    }

    const simBtn = document.getElementById("start-simulation-btn");
    const speedMs = parseInt(document.getElementById("sim-speed").value || 400);

    simBtn.disabled = true;
    simBtn.innerText = "⚡ المحاكاة جارية لحظياً...";

    setAgentState("جاري المعالجة", "يعالج الرواتب والخصومات لحظياً", "success");

    const progressSection = document.getElementById("progress-section");
    const progressBarFill = document.getElementById("progress-bar-fill");
    const progressPercent = document.getElementById("progress-percent");
    const progressStatus = document.getElementById("progress-status");

    progressSection.style.display = "block";
    progressBarFill.style.width = "0%";
    progressPercent.innerText = "0%";
    progressStatus.innerText = "🤖 الوكيل 'سند': جارٍ تحليل هيكلية السجلات والربط مع محرك FastAPI...";

    appendTerminalLog("🚀 تفكيك السجل وبدء تدفق حساب المعالجة الحية...", "system");
    showToast("🚀", "بدء المحاكاة", "الوكيل سند يبدأ معالجة الرواتب...", "info");

    const formData = new FormData();
    formData.append("raw_data", rawData);

    try {
        const response = await fetch("/api/payroll/process", {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.detail || "فشل الاتصال بالخادم");
        }

        const employees = result.data;
        currentPayrollData = employees;
        const total = employees.length;

        const tbody = document.querySelector("#payroll-output-table tbody");
        tbody.innerHTML = "";

        resetKPIs();
        document.getElementById("anomalies-container").innerHTML = "";

        // Stream employees one by one
        for (let i = 0; i < total; i++) {
            const emp = employees[i];
            const percent = Math.round(((i + 1) / total) * 100);

            progressBarFill.style.width = `${percent}%`;
            progressPercent.innerText = `${percent}%`;
            progressStatus.innerText = `🤖 يعالج الموظف [${i + 1}/${total}]: ${emp.Name} (${emp.Nationality === 'Saudi' ? 'سعودي' : 'مقيم'})`;

            appendTerminalLog(
                `👤 [${emp.EmployeeID}] ${emp.Name} | الأساسي+السكن: ${emp.BasicPlusHousing} | العمل الإضافي: ${emp.OvertimePay} | GOSI: ${emp.GOSI_Deduction}`,
                "calc"
            );

            if (parseFloat(emp.Late_Penalty) > 0) {
                appendTerminalLog(`⚠️ جزاء تأخير رُصد على ${emp.Name}: خصم ${emp.Late_Penalty} ر.س`, "alert");
            }
            if (parseFloat(emp.Sick_Deduction) > 0) {
                appendTerminalLog(`🤒 خصم مرضي مادة 117 على ${emp.Name}: خصم ${emp.Sick_Deduction} ر.س`, "alert");
            }
            if (parseFloat(emp.Commission) > 0) {
                appendTerminalLog(`🌟 عمولة مكتسبة لـ ${emp.Name}: +${emp.Commission} ر.س`, "calc");
            }
            if (parseFloat(emp.OvertimePay) > 0) {
                appendTerminalLog(`⏱️ أجر عمل إضافي لـ ${emp.Name}: +${emp.OvertimePay} ر.س (${emp.OvertimeHours} ساعة)`, "calc");
            }

            // Append row
            const tr = document.createElement("tr");
            tr.className = "row-entering";
            tr.setAttribute("data-name", emp.Name.toLowerCase());
            tr.setAttribute("data-id", emp.EmployeeID);
            tr.setAttribute("data-nat", emp.Nationality);
            tr.setAttribute("data-index", i);
            tr.onclick = () => openEmployeeModal(i);
            tr.innerHTML = `
                <td><strong>${emp.EmployeeID}</strong></td>
                <td>${emp.Name}</td>
                <td><span class="badge ${emp.Nationality === 'Saudi' ? 'badge-success' : 'badge-info'}">${emp.Nationality === 'Saudi' ? 'سعودي 🇸🇦' : 'مقيم 🌍'}</span></td>
                <td>${parseFloat(emp.BasicPlusHousing).toLocaleString()} ر.س</td>
                <td><span style="color:var(--success); font-weight:700;">+${parseFloat(emp.Commission).toLocaleString()} ر.س</span></td>
                <td>-${parseFloat(emp.GOSI_Deduction).toLocaleString()} ر.س</td>
                <td>-${parseFloat(emp.Late_Penalty).toLocaleString()} ر.س</td>
                <td>-${parseFloat(emp.Sick_Deduction).toLocaleString()} ر.س</td>
                <td><strong style="color:var(--balubaid-navy); font-size:0.92rem;">${parseFloat(emp.NetPay).toLocaleString()} ر.س</strong></td>
                <td><span class="badge badge-success">تم ✅</span></td>
            `;
            tbody.appendChild(tr);

            updateKpiLive(emp);
            await new Promise(r => setTimeout(r, speedMs));
        }

        // Add summary row
        addSummaryRow(tbody);

        // Setup pagination
        currentPage = 1;
        renderPagination();

        // Detect anomalies
        detectAnomalies(rawData);

        appendTerminalLog("✅ مكتمل! تم حساب كافة السجلات ومطابقة التأمينات.", "system");
        appendTerminalLog("⚖️ الوكيل 'سند' جاهز لإصدار صك الاعتماد القانوني عبر Gemini.", "audit");

        document.getElementById("download-csv-btn").disabled = false;
        document.getElementById("download-sif-btn").disabled = false;
        document.getElementById("run-audit-btn").disabled = false;
        setAgentState("مكتمل", "تمت المعالجة - بانتظار التدقيق النهائي", "success");

        showToast("✅", "اكتملت المعالجة", `تم معالجة ${total} موظف بنجاح`, "success");

        // Confetti effect!
        launchConfetti();

    } catch (e) {
        appendTerminalLog(`❌ خطأ أثناء المعالجة: ${e.message}`, "alert");
        showToast("❌", "خطأ", e.message, "error");
        setAgentState("خطأ", "فشل المحاكاة الحية", "error");
    } finally {
        simBtn.disabled = false;
        simBtn.innerText = "▶️ إعادة المحاكاة والمعالجة الحية للوكيل الذكي";
    }
}

// ─── KPI Updater ───
function updateKpiLive(emp) {
    currentKpis.gross += parseFloat(emp.BasicPlusHousing) + parseFloat(emp.Commission) + parseFloat(emp.OvertimePay || 0);
    currentKpis.gosi += parseFloat(emp.GOSI_Deduction);
    currentKpis.penalties += parseFloat(emp.Late_Penalty) + parseFloat(emp.Sick_Deduction);
    currentKpis.net += parseFloat(emp.NetPay);

    animateKpiValue("kpi-gross-pay", currentKpis.gross);
    animateKpiValue("kpi-gosi", currentKpis.gosi);
    animateKpiValue("kpi-penalties", currentKpis.penalties);
    animateKpiValue("kpi-net-pay", currentKpis.net);
}

function animateKpiValue(elementId, targetValue) {
    const el = document.getElementById(elementId);
    el.innerText = targetValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) + " ر.س";
    el.style.transform = "scale(1.08)";
    setTimeout(() => { el.style.transform = "scale(1)"; }, 200);
}

// ─── Summary Row ───
function addSummaryRow(tbody) {
    const tr = document.createElement("tr");
    tr.className = "summary-row";
    tr.innerHTML = `
        <td colspan="3"><strong>📊 الإجمالي (${currentPayrollData.length} موظف)</strong></td>
        <td><strong>${currentKpis.gross.toLocaleString(undefined, {minimumFractionDigits: 2})} ر.س</strong></td>
        <td></td>
        <td><strong>-${currentKpis.gosi.toLocaleString(undefined, {minimumFractionDigits: 2})} ر.س</strong></td>
        <td colspan="2"><strong>-${currentKpis.penalties.toLocaleString(undefined, {minimumFractionDigits: 2})} ر.س</strong></td>
        <td><strong>${currentKpis.net.toLocaleString(undefined, {minimumFractionDigits: 2})} ر.س</strong></td>
        <td></td>
    `;
    tbody.appendChild(tr);
}

// ─── CSV Parser ───
function parseCSVString(text) {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",");
    return lines.slice(1).map(line => {
        const values = line.split(",");
        const obj = {};
        headers.forEach((h, i) => {
            obj[h.trim()] = values[i] ? values[i].trim() : "";
        });
        return obj;
    });
}

// ─── Anomaly Detection ───
function detectAnomalies(rawData) {
    const employees = parseCSVString(rawData);
    const container = document.getElementById("anomalies-container");
    container.innerHTML = "";

    let alertCount = 0;

    employees.forEach(emp => {
        const name = emp.Name;
        const sickDays = parseInt(emp.SickDays || 0);
        const tamweelSales = parseInt(emp.TamweelSales || 0);

        let lateMin = 0;
        if (emp.ShiftStart && emp.CheckIn) {
            const startParts = emp.ShiftStart.split(":");
            const inParts = emp.CheckIn.split(":");
            if (startParts.length === 2 && inParts.length === 2) {
                const sMin = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
                const iMin = parseInt(inParts[0]) * 60 + parseInt(inParts[1]);
                lateMin = Math.max(0, iMin - sMin);
            }
        }

        if (lateMin > 60) {
            alertCount++;
            const div = document.createElement("div");
            div.className = "alert-item critical";
            div.innerHTML = `
                <span class="alert-icon">🚨</span>
                <div class="alert-text">
                    تأخير حرج للموظف <strong>${name}</strong> بقيمة <strong>${lateMin} دقيقة</strong> عن الوردية الرسمية.
                </div>
            `;
            container.appendChild(div);
        }

        if (sickDays > 30) {
            alertCount++;
            const div = document.createElement("div");
            div.className = "alert-item";
            div.style.borderColor = "var(--warning)";
            div.innerHTML = `
                <span class="alert-icon">🤒</span>
                <div class="alert-text">
                    تجاوز الحد الأقصى للمرضي المدفوع للموظف <strong>${name}</strong> (سجل <strong>${sickDays} يوم</strong>).
                </div>
            `;
            container.appendChild(div);
        }

        if (tamweelSales >= 4) {
            alertCount++;
            const div = document.createElement("div");
            div.className = "alert-item";
            div.style.borderRightColor = "var(--success)";
            div.innerHTML = `
                <span class="alert-icon">🌟</span>
                <div class="alert-text">
                    أداء تمويل استثنائي للموظف <strong>${name}</strong> (${tamweelSales} عقود ناجحة).
                </div>
            `;
            container.appendChild(div);
        }
    });

    document.getElementById("anomalies-count").innerText = `${alertCount} تنبيهات`;

    if (alertCount === 0) {
        container.innerHTML = `<div class="alert-item empty">لم يتم رصد أي تجاوزات أو انحرافات في هذا السجل.</div>`;
    }

    if (alertCount > 0) {
        showToast("🚨", "تنبيهات", `تم رصد ${alertCount} انحراف/تنبيه في السجلات`, "warning");
    }
}

// ─── Audit ───
async function runAuditCheck() {
    const auditBtn = document.getElementById("run-audit-btn");
    const resultBox = document.getElementById("audit-result-box");
    const badge = document.getElementById("audit-badge");

    auditBtn.innerText = "⚖️ جاري تدقيق اللوائح عبر Gemini...";
    auditBtn.disabled = true;
    resultBox.innerText = "⏳ يستدعي الوكيل 'سند' لوائح العمل ويطابق توقيت البصمات عبر الذكاء الاصطناعي...";
    resultBox.classList.add("active");
    badge.innerText = "جاري التدقيق المالي...";

    setAgentState("تدقيق AI", "يقوم الوكيل بتدقيق البصمة بقوانين العمل", "warning");
    appendTerminalLog("🤖 بدء استدعاء نموذج Gemini لمطابقة كشوف الرواتب باللوائح...", "audit");
    showToast("⚖️", "التدقيق المالي", "جاري مطابقة البيانات مع اللوائح...", "info");

    try {
        const response = await fetch("/api/payroll/audit", { method: "POST" });
        const result = await response.json();

        if (response.ok && result.status === "success") {
            resultBox.innerText = result.audit_report;
            badge.innerText = "معتمد ومطابق";
            setAgentState("معتمد", "تم الاعتماد النهائي وبناء صك المطابقة", "success");
            appendTerminalLog("📜 صك الاعتماد النهائي صدر بنجاح!", "audit");
            showToast("📜", "اعتماد نهائي", "تم إصدار صك المطابقة القانونية بنجاح", "success");
        } else {
            resultBox.innerText = "فشل التدقيق: " + (result.audit_report || "خطأ مجهول");
            badge.innerText = "مرفوض للمراجعة";
            setAgentState("تنبيه", "توجد ملاحظات قانونية تحتاج مراجعة", "error");
        }
    } catch (e) {
        resultBox.innerText = "خطأ في الاتصال بالخادم المالي: " + e.message;
        badge.innerText = "مرفوض للمراجعة";
        setAgentState("خطأ", "فشل الاتصال بـ Gemini", "error");
    } finally {
        auditBtn.innerText = '⚖️ تشغيل صك الاعتماد النهائي للمدقق "سند"';
        auditBtn.disabled = false;
    }
}

// ─── Downloads ───
function downloadCSV() { window.open("/api/payroll/download", "_blank"); }
function downloadSIF() { window.open("/api/payroll/download-sif", "_blank"); }

// ─── Table Sort ───
function sortTable(colIndex) {
    if (currentPayrollData.length === 0) return;

    // Toggle sort direction
    if (sortColumn === colIndex) {
        sortAsc = !sortAsc;
    } else {
        sortColumn = colIndex;
        sortAsc = true;
    }

    // Update header indicators
    document.querySelectorAll("#payroll-output-table th").forEach(th => {
        th.classList.remove("sorted");
        const arrow = th.querySelector(".sort-arrow");
        if (arrow) arrow.textContent = "▼";
    });

    const activeHeader = document.querySelector(`#payroll-output-table th[data-col="${colIndex}"]`);
    if (activeHeader) {
        activeHeader.classList.add("sorted");
        const arrow = activeHeader.querySelector(".sort-arrow");
        if (arrow) arrow.textContent = sortAsc ? "▲" : "▼";
    }

    // Map columns to data keys
    const colKeys = ["EmployeeID", "Name", "Nationality", "BasicPlusHousing", "Commission", "GOSI_Deduction", "Late_Penalty", "Sick_Deduction", "NetPay"];
    const key = colKeys[colIndex];
    if (!key) return;

    const numericCols = ["BasicPlusHousing", "Commission", "GOSI_Deduction", "Late_Penalty", "Sick_Deduction", "NetPay"];
    const isNumeric = numericCols.includes(key);

    currentPayrollData.sort((a, b) => {
        let vA = a[key], vB = b[key];
        if (isNumeric) {
            vA = parseFloat(vA);
            vB = parseFloat(vB);
        } else {
            vA = (vA || "").toString().toLowerCase();
            vB = (vB || "").toString().toLowerCase();
        }
        if (vA < vB) return sortAsc ? -1 : 1;
        if (vA > vB) return sortAsc ? 1 : -1;
        return 0;
    });

    renderPayrollTable();
}

// ─── Table Renderer with Pagination ───
function renderPayrollTable() {
    const tbody = document.querySelector("#payroll-output-table tbody");
    tbody.innerHTML = "";

    const total = currentPayrollData.length;
    const start = (currentPage - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, total);
    const pageData = currentPayrollData.slice(start, end);

    pageData.forEach((emp, idx) => {
        const globalIdx = start + idx;
        const tr = document.createElement("tr");
        tr.setAttribute("data-name", emp.Name.toLowerCase());
        tr.setAttribute("data-id", emp.EmployeeID);
        tr.setAttribute("data-nat", emp.Nationality);
        tr.onclick = () => openEmployeeModal(globalIdx);
        tr.innerHTML = `
            <td><strong>${emp.EmployeeID}</strong></td>
            <td>${emp.Name}</td>
            <td><span class="badge ${emp.Nationality === 'Saudi' ? 'badge-success' : 'badge-info'}">${emp.Nationality === 'Saudi' ? 'سعودي 🇸🇦' : 'مقيم 🌍'}</span></td>
            <td>${parseFloat(emp.BasicPlusHousing).toLocaleString()} ر.س</td>
            <td><span style="color:var(--success); font-weight:700;">+${parseFloat(emp.Commission).toLocaleString()} ر.س</span></td>
            <td>-${parseFloat(emp.GOSI_Deduction).toLocaleString()} ر.س</td>
            <td>-${parseFloat(emp.Late_Penalty).toLocaleString()} ر.س</td>
            <td>-${parseFloat(emp.Sick_Deduction).toLocaleString()} ر.س</td>
            <td><strong style="font-size:0.92rem;">${parseFloat(emp.NetPay).toLocaleString()} ر.س</strong></td>
            <td><span class="badge badge-success">تم ✅</span></td>
        `;
        tbody.appendChild(tr);
    });

    // Add summary row on last page
    if (end >= total) {
        addSummaryRow(tbody);
    }

    renderPagination();
}

// ─── Pagination ───
function renderPagination() {
    const bar = document.getElementById("pagination-bar");
    const total = currentPayrollData.length;
    const totalPages = Math.ceil(total / rowsPerPage);

    if (totalPages <= 1) {
        bar.innerHTML = "";
        return;
    }

    bar.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.innerText = i;
        btn.className = i === currentPage ? "active" : "";
        btn.onclick = () => {
            currentPage = i;
            renderPayrollTable();
        };
        bar.appendChild(btn);
    }
}

// ─── Filter ───
function filterPayrollTable() {
    const search = document.getElementById("table-search-input").value.toLowerCase();
    const natFilter = document.getElementById("table-nat-filter").value;
    const rows = document.querySelectorAll("#payroll-output-table tbody tr:not(.summary-row)");

    rows.forEach(tr => {
        const name = tr.getAttribute("data-name") || "";
        const empId = tr.getAttribute("data-id") || "";
        const nat = tr.getAttribute("data-nat") || "";

        const matchesSearch = name.includes(search) || empId.includes(search);
        const matchesNat = natFilter === "ALL" || nat === natFilter;

        tr.style.display = (matchesSearch && matchesNat) ? "" : "none";
    });
}

// ─── Employee Detail Modal ───
function openEmployeeModal(index) {
    const emp = currentPayrollData[index];
    if (!emp) return;

    const modal = document.getElementById("employee-modal");
    const body = document.getElementById("modal-body");

    const basicPlusHousing = parseFloat(emp.BasicPlusHousing);
    const commission = parseFloat(emp.Commission);
    const overtimeHours = parseFloat(emp.OvertimeHours || 0);
    const overtimePay = parseFloat(emp.OvertimePay || 0);
    const gosi = parseFloat(emp.GOSI_Deduction);
    const late = parseFloat(emp.Late_Penalty);
    const sick = parseFloat(emp.Sick_Deduction);
    const net = parseFloat(emp.NetPay);
    const grossTotal = basicPlusHousing + commission + overtimePay;
    const totalDeductions = gosi + late + sick;

    // Salary breakdown percentages
    const basicPct = grossTotal > 0 ? ((basicPlusHousing / grossTotal) * 100).toFixed(1) : 0;
    const commPct = grossTotal > 0 ? ((commission / grossTotal) * 100).toFixed(1) : 0;
    const otPct = grossTotal > 0 ? ((overtimePay / grossTotal) * 100).toFixed(1) : 0;

    body.innerHTML = `
        <div class="modal-emp-header">
            <div class="modal-emp-avatar">${emp.Nationality === 'Saudi' ? '🇸🇦' : '🌍'}</div>
            <div class="modal-emp-info">
                <span class="emp-name">${emp.Name}</span>
                <span class="emp-id-badge">رقم الموظف: ${emp.EmployeeID} | ${emp.Nationality === 'Saudi' ? 'سعودي' : 'مقيم'}</span>
            </div>
        </div>

        <div style="margin-bottom: 0.8rem;">
            <span style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">تكوين الراتب الإجمالي</span>
            <div class="salary-breakdown-bar">
                <div class="salary-segment" style="width:${basicPct}%; background: var(--balubaid-navy);" title="الأساسي+السكن"></div>
                <div class="salary-segment" style="width:${commPct}%; background: var(--success);" title="العمولات"></div>
                <div class="salary-segment" style="width:${otPct}%; background: var(--info);" title="أجر إضافي"></div>
            </div>
            <div style="display:flex; gap:1rem; font-size:0.72rem; color:var(--text-muted); justify-content: center; margin-top: 0.3rem;">
                <span>🔵 الأساسي+السكن ${basicPct}%</span>
                <span>🟢 العمولات ${commPct}%</span>
                <span>🔵 إضافي ${otPct}%</span>
            </div>
        </div>

        <div class="modal-detail-grid">
            <div class="detail-item">
                <span class="detail-label">الأساسي + بدل السكن</span>
                <span class="detail-value">${basicPlusHousing.toLocaleString()} ر.س</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">العمولات المكتسبة</span>
                <span class="detail-value positive">+${commission.toLocaleString()} ر.س</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">ساعات العمل الإضافي</span>
                <span class="detail-value">${overtimeHours} ساعة</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">أجر العمل الإضافي</span>
                <span class="detail-value positive">+${overtimePay.toLocaleString()} ر.س</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">استقطاع التأمينات (GOSI)</span>
                <span class="detail-value negative">-${gosi.toLocaleString()} ر.س</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">خصم التأخير</span>
                <span class="detail-value negative">-${late.toLocaleString()} ر.س</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">خصم الإجازة المرضية</span>
                <span class="detail-value negative">-${sick.toLocaleString()} ر.س</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">إجمالي الخصومات</span>
                <span class="detail-value negative">-${totalDeductions.toLocaleString()} ر.س</span>
            </div>
            <div class="detail-item full-span">
                <span class="detail-label">💵 صافي الراتب المستحق</span>
                <span class="detail-value highlight">${net.toLocaleString()} ر.س</span>
            </div>
        </div>
    `;

    modal.classList.add("active");
}

function closeEmployeeModal() {
    document.getElementById("employee-modal").classList.remove("active");
}

function closeModalOverlay(event) {
    if (event.target === event.currentTarget) {
        closeEmployeeModal();
    }
}

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeEmployeeModal();
});

// ─── EOSG Calculator ───
async function calculateEOSG(e) {
    e.preventDefault();
    const basic = parseFloat(document.getElementById("eosg-basic").value);
    const housing = parseFloat(document.getElementById("eosg-housing").value);
    const years = parseFloat(document.getElementById("eosg-years").value);
    const reason = document.getElementById("eosg-reason").value;

    const resCard = document.getElementById("eosg-result-card");
    resCard.innerHTML = "⏳ جارٍ حساب المكافأة وفق نظام العمل السعودي...";

    try {
        const response = await fetch("/api/payroll/eosg", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                basic_salary: basic,
                housing: housing,
                years_of_service: years,
                reason: reason
            })
        });

        const res = await response.json();
        if (response.ok && res.status === "success") {
            const data = res.data;
            resCard.innerHTML = `
                <div class="eosg-result-grid">
                    <div class="eosg-kpi-item">
                        <label>الأجر الإجمالي الشهري</label>
                        <strong>${data.total_wage.toLocaleString()} ر.س</strong>
                    </div>
                    <div class="eosg-kpi-item">
                        <label>سنوات الخدمة المحسوبة</label>
                        <strong>${data.years} سنة</strong>
                    </div>
                    <div class="eosg-kpi-item">
                        <label>المستحق الأولي (المادة 84)</label>
                        <strong>${data.base_eosg.toLocaleString()} ر.س</strong>
                    </div>
                    <div class="eosg-kpi-item">
                        <label>نسبة الاستحقاق (المادة 85)</label>
                        <strong>${data.payable_ratio}</strong>
                    </div>
                    <div class="eosg-kpi-item highlight-eosg" style="grid-column: span 2;">
                        <label>صافي مكافأة نهاية الخدمة المستحقة</label>
                        <strong style="font-size: 1.5rem;">${data.final_eosg.toLocaleString()} ر.س</strong>
                    </div>
                </div>
            `;
            showToast("🧮", "حساب المكافأة", `صافي المكافأة: ${data.final_eosg.toLocaleString()} ر.س`, "success");
        } else {
            resCard.innerHTML = "خطأ في حساب المكافأة.";
        }
    } catch (err) {
        resCard.innerHTML = "فشل الاتصال بالخادم: " + err.message;
    }
}

// ─── AI Chat ───
async function sendChatMessage() {
    const input = document.getElementById("chat-input");
    const msgText = input.value.trim();
    if (!msgText) return;

    const box = document.getElementById("chat-messages-box");

    const userMsg = document.createElement("div");
    userMsg.className = "chat-msg user";
    userMsg.innerHTML = `
        <div class="msg-avatar">👤</div>
        <div class="msg-bubble">${msgText}</div>
    `;
    box.appendChild(userMsg);
    input.value = "";
    box.scrollTop = box.scrollHeight;

    const agentMsg = document.createElement("div");
    agentMsg.className = "chat-msg agent";
    agentMsg.innerHTML = `
        <div class="msg-avatar">🤖</div>
        <div class="msg-bubble">⏳ يفكر 'سند' ويراجع كشوف الرواتب واللوائح...</div>
    `;
    box.appendChild(agentMsg);
    box.scrollTop = box.scrollHeight;

    try {
        const response = await fetch("/api/payroll/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: msgText })
        });

        const res = await response.json();
        if (response.ok && res.status === "success") {
            agentMsg.querySelector(".msg-bubble").innerText = res.reply;
        } else {
            agentMsg.querySelector(".msg-bubble").innerText = "عذراً: " + (res.reply || "فشل الاتصال بالذكاء الاصطناعي");
        }
    } catch (err) {
        agentMsg.querySelector(".msg-bubble").innerText = "خطأ في الشبكة: " + err.message;
    }
    box.scrollTop = box.scrollHeight;
}

// ─── Analytics Dashboard ───
function renderAnalyticsDashboard() {
    const container = document.getElementById("analytics-content");
    if (currentPayrollData.length === 0) {
        container.innerHTML = `
            <div class="analytics-empty">
                <span class="empty-icon">📊</span>
                <p>قم بتشغيل المحاكاة والمعالجة الحية أولاً لعرض التحليلات.</p>
            </div>`;
        return;
    }

    const data = currentPayrollData;
    const totalEmployees = data.length;
    const saudiCount = data.filter(e => e.Nationality === "Saudi").length;
    const expatCount = totalEmployees - saudiCount;
    const saudiPct = ((saudiCount / totalEmployees) * 100).toFixed(0);
    const expatPct = ((expatCount / totalEmployees) * 100).toFixed(0);

    // Top earners
    const sorted = [...data].sort((a, b) => parseFloat(b.NetPay) - parseFloat(a.NetPay));
    const top5 = sorted.slice(0, 5);
    const maxNet = parseFloat(top5[0]?.NetPay || 1);

    // Deduction totals
    const totalGosi = data.reduce((s, e) => s + parseFloat(e.GOSI_Deduction), 0);
    const totalLate = data.reduce((s, e) => s + parseFloat(e.Late_Penalty), 0);
    const totalSick = data.reduce((s, e) => s + parseFloat(e.Sick_Deduction), 0);
    const totalDeductions = totalGosi + totalLate + totalSick;
    const gosiPct = totalDeductions > 0 ? ((totalGosi / totalDeductions) * 100).toFixed(0) : 0;
    const latePct = totalDeductions > 0 ? ((totalLate / totalDeductions) * 100).toFixed(0) : 0;
    const sickPct = totalDeductions > 0 ? ((totalSick / totalDeductions) * 100).toFixed(0) : 0;

    // Salary ranges
    const ranges = { "< 4,000": 0, "4,000 - 6,000": 0, "6,000 - 8,000": 0, "8,000 - 10,000": 0, "> 10,000": 0 };
    data.forEach(e => {
        const net = parseFloat(e.NetPay);
        if (net < 4000) ranges["< 4,000"]++;
        else if (net < 6000) ranges["4,000 - 6,000"]++;
        else if (net < 8000) ranges["6,000 - 8,000"]++;
        else if (net < 10000) ranges["8,000 - 10,000"]++;
        else ranges["> 10,000"]++;
    });

    const avgSalary = currentKpis.net / totalEmployees;
    const totalCommissions = data.reduce((s, e) => s + parseFloat(e.Commission), 0);
    const totalOvertime = data.reduce((s, e) => s + parseFloat(e.OvertimePay || 0), 0);

    // Build HTML
    container.innerHTML = `
        <!-- Summary Stats Row -->
        <div class="summary-stats-grid" style="margin-bottom: 1.4rem;">
            <div class="summary-stat">
                <span class="stat-value">${totalEmployees}</span>
                <span class="stat-label">إجمالي الموظفين</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${avgSalary.toLocaleString(undefined, {maximumFractionDigits: 0})} ر.س</span>
                <span class="stat-label">متوسط صافي الراتب</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${(totalCommissions + totalOvertime).toLocaleString(undefined, {maximumFractionDigits: 0})} ر.س</span>
                <span class="stat-label">إجمالي العمولات والإضافي</span>
            </div>
            <div class="summary-stat">
                <span class="stat-value">${totalDeductions.toLocaleString(undefined, {maximumFractionDigits: 0})} ر.س</span>
                <span class="stat-label">إجمالي الخصومات</span>
            </div>
        </div>

        <div class="analytics-grid">
            <!-- Nationality Distribution -->
            <div class="analytics-card">
                <h3>🏳️ توزيع الجنسيات</h3>
                <div class="donut-chart-container">
                    <div class="donut-chart" style="background: conic-gradient(var(--balubaid-navy) 0% ${saudiPct}%, var(--balubaid-gold) ${saudiPct}% 100%);">
                        <div class="donut-center">
                            <span class="donut-total">${totalEmployees}</span>
                            <span class="donut-label">موظف</span>
                        </div>
                    </div>
                    <div class="donut-legend">
                        <div class="legend-item">
                            <div class="legend-dot" style="background: var(--balubaid-navy);"></div>
                            <span>سعودي: ${saudiCount} (${saudiPct}%)</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-dot" style="background: var(--balubaid-gold);"></div>
                            <span>مقيم: ${expatCount} (${expatPct}%)</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Deduction Breakdown -->
            <div class="analytics-card">
                <h3>📉 تحليل الخصومات</h3>
                <div class="donut-chart-container">
                    <div class="donut-chart" style="background: conic-gradient(var(--info) 0% ${gosiPct}%, var(--error) ${gosiPct}% ${parseInt(gosiPct) + parseInt(latePct)}%, var(--warning) ${parseInt(gosiPct) + parseInt(latePct)}% 100%);">
                        <div class="donut-center">
                            <span class="donut-total" style="font-size:1rem;">${totalDeductions.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                            <span class="donut-label">ر.س</span>
                        </div>
                    </div>
                    <div class="donut-legend">
                        <div class="legend-item">
                            <div class="legend-dot" style="background: var(--info);"></div>
                            <span>GOSI: ${totalGosi.toLocaleString(undefined, {maximumFractionDigits: 0})} ر.س</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-dot" style="background: var(--error);"></div>
                            <span>تأخير: ${totalLate.toLocaleString(undefined, {maximumFractionDigits: 0})} ر.س</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-dot" style="background: var(--warning);"></div>
                            <span>مرضي: ${totalSick.toLocaleString(undefined, {maximumFractionDigits: 0})} ر.س</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Salary Distribution -->
            <div class="analytics-card">
                <h3>📊 توزيع نطاقات الرواتب</h3>
                <div class="bar-chart-container">
                    ${Object.entries(ranges).map(([range, count]) => {
                        const pct = totalEmployees > 0 ? ((count / totalEmployees) * 100).toFixed(0) : 0;
                        return `
                            <div class="bar-row">
                                <span class="bar-label">${range} ر.س</span>
                                <div class="bar-track">
                                    <div class="bar-fill" style="width:${pct}%; background: var(--gold-gradient);">
                                        <span>${count}</span>
                                    </div>
                                </div>
                                <span class="bar-value">${pct}%</span>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>

            <!-- Top Earners -->
            <div class="analytics-card full-width">
                <h3>🏆 أعلى الرواتب (Top 5)</h3>
                <div class="bar-chart-container">
                    ${top5.map((emp, i) => {
                        const pct = ((parseFloat(emp.NetPay) / maxNet) * 100).toFixed(0);
                        const colors = ["var(--balubaid-navy-gradient)", "linear-gradient(135deg, #1E40AF, #3B82F6)", "linear-gradient(135deg, #065F46, #10B981)", "var(--gold-gradient)", "linear-gradient(135deg, #7C3AED, #A78BFA)"];
                        return `
                            <div class="bar-row">
                                <span class="bar-label">${i + 1}. ${emp.Name}</span>
                                <div class="bar-track">
                                    <div class="bar-fill" style="width:${pct}%; background: ${colors[i]};">
                                        <span>${parseFloat(emp.NetPay).toLocaleString()} ر.س</span>
                                    </div>
                                </div>
                                <span class="bar-value">${emp.Nationality === 'Saudi' ? '🇸🇦' : '🌍'}</span>
                            </div>
                        `;
                    }).join("")}
                </div>
            </div>
        </div>
    `;

    // Animate bar fills after render
    setTimeout(() => {
        document.querySelectorAll(".bar-fill").forEach(bar => {
            const targetWidth = bar.style.width;
            bar.style.width = "0%";
            requestAnimationFrame(() => {
                bar.style.width = targetWidth;
            });
        });
    }, 50);
}

// ─── Toast Notifications ───
function showToast(icon, title, message, type = "info") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    container.appendChild(toast);

    // Auto remove after 4s
    setTimeout(() => {
        toast.classList.add("removing");
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ─── Confetti Effect ───
function launchConfetti() {
    const container = document.createElement("div");
    container.className = "confetti-container";
    document.body.appendChild(container);

    const colors = ["#C08A3E", "#002D54", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#8B5CF6"];

    for (let i = 0; i < 60; i++) {
        const piece = document.createElement("div");
        piece.className = "confetti-piece";
        piece.style.left = Math.random() * 100 + "%";
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.width = (Math.random() * 8 + 5) + "px";
        piece.style.height = (Math.random() * 8 + 5) + "px";
        piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
        piece.style.animationDuration = (Math.random() * 2 + 1.5) + "s";
        piece.style.animationDelay = (Math.random() * 0.8) + "s";
        container.appendChild(piece);
    }

    setTimeout(() => container.remove(), 4000);
}

function setStep(stepNum) {
    document.querySelectorAll(".step-card").forEach((card, index) => {
        if (index + 1 === stepNum) {
            card.classList.add("active");
        } else {
            card.classList.remove("active");
        }
    });
}
