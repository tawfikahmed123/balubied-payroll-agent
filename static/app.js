const defaultLogs = `EmployeeID,Name,Nationality,BasicSalary,Housing,ShiftStart,ShiftEnd,CheckIn,CheckOut,SickDays,CashSales,TamweelSales
101,Ahmed Al-Ghamdi,Saudi,4000,1000,08:00,17:00,08:45,17:00,35,2,1
102,John Doe,Expat,5000,1500,08:00,17:00,08:00,17:00,2,0,4
103,Sara Al-Otaibi,Saudi,6000,1500,08:00,17:00,08:10,17:00,0,3,2
104,Fahad Al-Zahrani,Saudi,3500,1000,08:00,17:00,10:00,17:00,0,1,0
105,Michael Smith,Expat,8000,2000,08:00,17:00,08:30,17:00,0,5,5`;

let currentKpis = { gross: 0, gosi: 0, penalties: 0, net: 0 };

document.addEventListener("DOMContentLoaded", () => {
    restoreDefaultLogs();
});

function restoreDefaultLogs() {
    document.getElementById("raw-csv-input").value = defaultLogs;
    setStep(1);
    
    // Reset KPIs
    resetKPIs();
    
    // Reset anomalies
    document.getElementById("anomalies-count").innerText = "0 تنبيهات";
    document.getElementById("anomalies-container").innerHTML = `<div class="alert-item empty">لا توجد سجلات حضور معالجة بعد لتصفية الانحرافات.</div>`;
    
    // Clear downstream buttons & terminal
    document.getElementById("download-csv-btn").disabled = true;
    document.getElementById("run-audit-btn").disabled = true;
    document.getElementById("audit-result-box").innerText = "تقرير المدقق المالي سيظهر هنا بالتفصيل فور تشغيل فحص المطابقة...";
    document.getElementById("audit-result-box").classList.remove("active");
    document.getElementById("audit-badge").innerText = "بانتظار التحقق";
    
    const tbody = document.querySelector("#payroll-output-table tbody");
    tbody.innerHTML = `<tr class="empty-state"><td colspan="10">يرجى الضغط على زر بدء المحاكاة والمعالجة الحية لبدء تدفق الموظفين...</td></tr>`;

    // Reset Agent status
    setAgentState("خامل", "جاهز للعمل المباشر", "warning");
    document.getElementById("progress-section").style.display = "none";

    // Reset Terminal
    const terminal = document.getElementById("agent-terminal");
    terminal.innerHTML = `<div class="log-line system">[نظام] الوكيل 'سند' جاهز لبدء معالجة الرواتب والتدقيق اللحظي...</div>`;
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

function handleFileUpload() {
    const filePicker = document.getElementById("csv-file-picker");
    const file = filePicker.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById("raw-csv-input").value = e.target.result;
            setStep(1);
            appendTerminalLog(`📁 تم استيراد ملف جديد: ${file.name} (${file.size} bytes)`, "system");
        };
        reader.readAsText(file);
    }
}

// Generate Realistic Random Simulation Data
function generateSimulatedData() {
    const saudiFirst = ["خالد", "عبدالله", "عمر", "سعود", "ياسر", "فيصل", "نورة", "ريم", "منيرة"];
    const saudiLast = ["الشهري", "العتيبي", "الدوسري", "الزهراني", "الغامدي", "القحطاني", "السبيعي"];
    const expatNames = ["Carlos Rivera", "Rajesh Kumar", "Tariq Mahmood", "David Chen", "Vikram Singh"];

    let csvContent = "EmployeeID,Name,Nationality,BasicSalary,Housing,ShiftStart,ShiftEnd,CheckIn,CheckOut,SickDays,CashSales,TamweelSales\n";
    
    // Generate 7-10 employees
    const count = 8;
    for (let i = 1; i <= count; i++) {
        const isSaudi = Math.random() > 0.35;
        const empId = 200 + i;
        const name = isSaudi 
            ? `${saudiFirst[Math.floor(Math.random() * saudiFirst.length)]} ${saudiLast[Math.floor(Math.random() * saudiLast.length)]}`
            : expatNames[Math.floor(Math.random() * expatNames.length)];
        const nat = isSaudi ? "Saudi" : "Expat";
        const basic = Math.floor(Math.random() * 40 + 35) * 100; // 3500-7500
        const housing = Math.floor(basic * 0.25);
        
        // Late simulation
        const lateMinutes = Math.random() > 0.5 ? (Math.random() > 0.7 ? Math.floor(Math.random() * 70 + 20) : Math.floor(Math.random() * 15)) : 0;
        const checkInHour = 8;
        const checkInMin = lateMinutes;
        const checkInStr = `08:${checkInMin < 10 ? '0' + checkInMin : checkInMin}`;
        
        // Sick days
        const sickDays = Math.random() > 0.75 ? Math.floor(Math.random() * 40) : Math.floor(Math.random() * 5);
        const cashSales = Math.floor(Math.random() * 5);
        const tamweelSales = Math.floor(Math.random() * 6);

        csvContent += `${empId},${name},${nat},${basic},${housing},08:00,17:00,${checkInStr},17:00,${sickDays},${cashSales},${tamweelSales}\n`;
    }

    document.getElementById("raw-csv-input").value = csvContent.trim();
    appendTerminalLog("🎲 تم توليد بيانات موظفين جديدة محاكاة بنجاح!", "system");
    restoreDefaultLogsStateOnly();
}

function restoreDefaultLogsStateOnly() {
    setStep(1);
    resetKPIs();
    document.getElementById("payroll-output-table").querySelector("tbody").innerHTML = `<tr class="empty-state"><td colspan="10">بيانات المحاكاة جاهزة. انقر "بدء المحاكاة والمعالجة الحية"...</td></tr>`;
    document.getElementById("anomalies-container").innerHTML = `<div class="alert-item empty">بانتظار تشغيل المحاكاة...</div>`;
}

// REAL-TIME STEP-BY-STEP AGENT SIMULATION
async function runLiveSimulation() {
    const rawData = document.getElementById("raw-csv-input").value.trim();
    if (!rawData) {
        alert("لا توجد بيانات بصمة للمشاركة!");
        return;
    }

    const simBtn = document.getElementById("start-simulation-btn");
    const speedMs = parseInt(document.getElementById("sim-speed").value || 500);

    simBtn.disabled = true;
    simBtn.innerText = "⚡ المحاكاة جارية لحظياً...";
    
    setAgentState("جاري المعالجة", "يعالج الرواتب والخصومات لحظياً", "success");
    setStep(2);

    // Show Progress Bar
    const progressSection = document.getElementById("progress-section");
    const progressBarFill = document.getElementById("progress-bar-fill");
    const progressPercent = document.getElementById("progress-percent");
    const progressStatus = document.getElementById("progress-status");
    
    progressSection.style.display = "block";
    progressBarFill.style.width = "0%";
    progressPercent.innerText = "0%";
    progressStatus.innerText = "🤖 الوكيل 'سند': جارٍ تحليل هيكلية السجلات والربط مع محرك FastAPI...";

    appendTerminalLog("🚀 تفكيك السجل وبدء تدفق حساب المعالجة الحية...", "system");

    // Call backend API first to retrieve processed payload
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
        const total = employees.length;

        // Clear output table
        const tbody = document.querySelector("#payroll-output-table tbody");
        tbody.innerHTML = "";
        
        resetKPIs();
        document.getElementById("anomalies-container").innerHTML = "";
        let anomalyCount = 0;

        // Stream employees line by line!
        for (let i = 0; i < total; i++) {
            const emp = employees[i];
            const percent = Math.round(((i + 1) / total) * 100);

            // Update Progress
            progressBarFill.style.width = `${percent}%`;
            progressPercent.innerText = `${percent}%`;
            progressStatus.innerText = `🤖 يعالج الموظف [${i + 1}/${total}]: ${emp.Name} (${emp.Nationality === 'Saudi' ? 'سعودي' : 'مقيم'})`;

            // Terminal Thought Stream
            appendTerminalLog(
                `👤 [${emp.EmployeeID}] ${emp.Name} | الراتب والبدل: ${emp.BasicPlusHousing} | GOSI: ${emp.GOSI_Deduction} | خصم التأخير: ${emp.Late_Penalty}`,
                "calc"
            );

            // Check specific anomalies for terminal alert
            if (parseFloat(emp.Late_Penalty) > 0) {
                appendTerminalLog(`⚠️ جزاء تأخير رُصد على ${emp.Name}: خصم ${emp.Late_Penalty} ر.س`, "alert");
            }
            if (parseFloat(emp.Sick_Deduction) > 0) {
                appendTerminalLog(`🤒 خصم إجازة مرضية مادة 117 على ${emp.Name}: خصم ${emp.Sick_Deduction} ر.س`, "alert");
            }
            if (parseFloat(emp.Commission) > 0) {
                appendTerminalLog(`🌟 عمولة مكتسبة لـ ${emp.Name}: +${emp.Commission} ر.س`, "calc");
            }

            // Append row to HTML table with animation
            const tr = document.createElement("tr");
            tr.className = "row-entering";
            tr.innerHTML = `
                <td><strong>${emp.EmployeeID}</strong></td>
                <td>${emp.Name}</td>
                <td><span class="badge ${emp.Nationality === 'Saudi' ? 'badge-success' : ''}">${emp.Nationality === 'Saudi' ? 'سعودي 🇸🇦' : 'مقيم 🌍'}</span></td>
                <td>${parseFloat(emp.BasicPlusHousing).toLocaleString()} ر.س</td>
                <td><span style="color:var(--success); font-weight:700;">+${parseFloat(emp.Commission).toLocaleString()} ر.س</span></td>
                <td>-${parseFloat(emp.GOSI_Deduction).toLocaleString()} ر.س</td>
                <td>-${parseFloat(emp.Late_Penalty).toLocaleString()} ر.س</td>
                <td>-${parseFloat(emp.Sick_Deduction).toLocaleString()} ر.س</td>
                <td><strong style="color:var(--balubaid-navy); font-size:0.95rem;">${parseFloat(emp.NetPay).toLocaleString()} ر.س</strong></td>
                <td><span class="badge badge-success">تم الحساب ✅</span></td>
            `;
            tbody.appendChild(tr);

            // Accumulate KPIs live
            updateKpiLive(emp);

            // Small dynamic delay for simulation speed
            await new Promise(r => setTimeout(r, speedMs));
        }

        // Detect Anomalies panel
        detectAnomalies(rawData);

        appendTerminalLog("✅ مكتمل! تم الانتهاء من حساب كافة السجلات ومطابقة التأمينات.", "system");
        appendTerminalLog("⚖️ الوكيل 'سند' جاهز لإصدار صك الاعتماد القانوني والتنفيذي عبر Gemini.", "audit");

        document.getElementById("download-csv-btn").disabled = false;
        document.getElementById("run-audit-btn").disabled = false;
        setAgentState("مكتمل", "تمت المعالجة - بانتظار التدقيق النهائي", "success");

    } catch (e) {
        appendTerminalLog(`❌ خطأ أثناء المعالجة: ${e.message}`, "alert");
        alert("خطأ: " + e.message);
        setAgentState("خطأ", "فشل المحاكاة الحية", "error");
    } finally {
        simBtn.disabled = false;
        simBtn.innerText = "▶️ إعادة المحاكاة والمعالجة الحية للوكيل الذكي";
    }
}

function updateKpiLive(emp) {
    currentKpis.gross += parseFloat(emp.BasicPlusHousing) + parseFloat(emp.Commission);
    currentKpis.gosi += parseFloat(emp.GOSI_Deduction);
    currentKpis.penalties += parseFloat(emp.Late_Penalty) + parseFloat(emp.Sick_Deduction);
    currentKpis.net += parseFloat(emp.NetPay);

    document.getElementById("kpi-gross-pay").innerText = currentKpis.gross.toLocaleString(undefined, {minimumFractionDigits: 2}) + " ر.س";
    document.getElementById("kpi-gosi").innerText = currentKpis.gosi.toLocaleString(undefined, {minimumFractionDigits: 2}) + " ر.س";
    document.getElementById("kpi-penalties").innerText = currentKpis.penalties.toLocaleString(undefined, {minimumFractionDigits: 2}) + " ر.س";
    document.getElementById("kpi-net-pay").innerText = currentKpis.net.toLocaleString(undefined, {minimumFractionDigits: 2}) + " ر.س";
}

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
            div.style.borderColor = "var(--balubaid-gold)";
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
            div.style.borderColor = "var(--balubaid-navy)";
            div.innerHTML = `
                <span class="alert-icon">🌟</span>
                <div class="alert-text">
                    أداء تمويل استثنائي للموظف <strong>${name}</strong> (تم حصر <strong>${tamweelSales} عقود ناجحة</strong>).
                </div>
            `;
            container.appendChild(div);
        }
    });
    
    document.getElementById("anomalies-count").innerText = `${alertCount} تنبيهات`;
    
    if (alertCount === 0) {
        container.innerHTML = `<div class="alert-item empty">لم يتم رصد أي تجاوزات أو انحرافات في هذا السجل.</div>`;
    }
}

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
    appendTerminalLog("🤖 بدء استدعاء نموذج Gemini لمطابقة كشوف الرواتب باللوائح والقرارات الوزارية...", "audit");

    try {
        const response = await fetch("/api/payroll/audit", { method: "POST" });
        const result = await response.json();
        
        if (response.ok && result.status === "success") {
            resultBox.innerText = result.audit_report;
            badge.innerText = "معتمد ومطابق";
            setStep(3);
            setAgentState("معتمد", "تم الاعتماد النهائي وبناء صك المطابقة", "success");
            appendTerminalLog("📜 صك الاعتماد النهائي صدر بنجاح وتم تحرير تقرير التدقيق!", "audit");
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
        auditBtn.innerText = "⚖️ تشغيل صك الاعتماد النهائي للمدقق \"سند\"";
        auditBtn.disabled = false;
    }
}

function downloadCSV() {
    window.open("/api/payroll/download", "_blank");
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
