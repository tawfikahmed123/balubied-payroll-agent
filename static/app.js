const defaultLogs = `EmployeeID,Name,Nationality,BasicSalary,Housing,ShiftStart,ShiftEnd,CheckIn,CheckOut,SickDays,CashSales,TamweelSales
101,Ahmed,Saudi,4000,1000,08:00,17:00,08:45,17:00,35,2,1
102,John,Expat,5000,1500,08:00,17:00,08:00,17:00,2,0,4
103,Sara,Saudi,6000,1500,08:00,17:00,08:10,17:00,0,3,2
104,Fahad,Saudi,3500,1000,08:00,17:00,10:00,17:00,0,1,0
105,Mike,Expat,8000,2000,08:00,17:00,08:30,17:00,0,5,5`;

document.addEventListener("DOMContentLoaded", () => {
    restoreDefaultLogs();
});

function restoreDefaultLogs() {
    document.getElementById("raw-csv-input").value = defaultLogs;
    setStep(1);
    
    // Reset KPIs
    document.getElementById("kpi-gross-pay").innerText = "0.00 ر.س";
    document.getElementById("kpi-gosi").innerText = "0.00 ر.س";
    document.getElementById("kpi-penalties").innerText = "0.00 ر.س";
    document.getElementById("kpi-net-pay").innerText = "0.00 ر.س";
    
    // Reset anomalies
    document.getElementById("anomalies-count").innerText = "0 تنبيهات";
    document.getElementById("anomalies-container").innerHTML = `<div class="alert-item empty">لا توجد سجلات حضور معالجة بعد لتصفية الانحرافات.</div>`;
    
    // Clear downstream buttons
    document.getElementById("download-csv-btn").disabled = true;
    document.getElementById("run-audit-btn").disabled = true;
    document.getElementById("audit-result-box").innerText = "تقرير المدقق المالي سيظهر هنا بالتفصيل فور تشغيل فحص المطابقة...";
    document.getElementById("audit-result-box").classList.remove("active");
    document.getElementById("audit-badge").innerText = "بانتظار التحقق";
    
    const tbody = document.querySelector("#payroll-output-table tbody");
    tbody.innerHTML = `<tr class="empty-state"><td colspan="9">يرجى الضغط على زر المعالجة لبدء استيراد البيانات الحسابية...</td></tr>`;
}

function handleFileUpload() {
    const filePicker = document.getElementById("csv-file-picker");
    const file = filePicker.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById("raw-csv-input").value = e.target.result;
            setStep(1);
        };
        reader.readAsText(file);
    }
}

async function runPayrollCalculation() {
    const rawData = document.getElementById("raw-csv-input").value;
    const processBtn = document.getElementById("process-payroll-btn");
    
    processBtn.innerText = "⚡ جاري تحليل البصمة والحساب...";
    processBtn.disabled = true;
    
    const formData = new FormData();
    formData.append("raw_data", rawData);
    
    try {
        const response = await fetch("/api/payroll/process", {
            method: "POST",
            body: formData
        });
        
        const result = await response.json();
        if (response.ok) {
            renderPayrollTable(result.data);
            calculateKPIs(result.data);
            detectAnomalies(rawData);
            
            document.getElementById("download-csv-btn").disabled = false;
            document.getElementById("run-audit-btn").disabled = false;
            setStep(2);
        } else {
            alert("فشل المعالجة: " + result.detail);
        }
    } catch (e) {
        alert("خطأ في الاتصال بالخادم المالي: " + e.message);
    } finally {
        processBtn.innerText = "⚙️ بدء معالجة السجلات وتصدير الكشوف";
        processBtn.disabled = false;
    }
}

function renderPayrollTable(data) {
    const tbody = document.querySelector("#payroll-output-table tbody");
    tbody.innerHTML = "";
    
    data.forEach(emp => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${emp.EmployeeID}</td>
            <td><strong>${emp.Name}</strong></td>
            <td><span class="badge">${emp.Nationality === 'Saudi' ? 'سعودي' : 'مقيم'}</span></td>
            <td>${parseFloat(emp.BasicPlusHousing).toLocaleString()} ر.س</td>
            <td><span style="color:var(--success)">+${parseFloat(emp.Commission).toLocaleString()} ر.س</span></td>
            <td>-${parseFloat(emp.GOSI_Deduction).toLocaleString()} ر.س</td>
            <td>-${parseFloat(emp.Late_Penalty).toLocaleString()} ر.س</td>
            <td>-${parseFloat(emp.Sick_Deduction).toLocaleString()} ر.س</td>
            <td><strong>${parseFloat(emp.NetPay).toLocaleString()} ر.س</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

function calculateKPIs(data) {
    let grossTotal = 0;
    let gosiTotal = 0;
    let penaltiesTotal = 0;
    let netTotal = 0;
    
    data.forEach(emp => {
        grossTotal += parseFloat(emp.BasicPlusHousing) + parseFloat(emp.Commission);
        gosiTotal += parseFloat(emp.GOSI_Deduction);
        penaltiesTotal += parseFloat(emp.Late_Penalty) + parseFloat(emp.Sick_Deduction);
        netTotal += parseFloat(emp.NetPay);
    });
    
    document.getElementById("kpi-gross-pay").innerText = grossTotal.toLocaleString(undefined, {minimumFractionDigits: 2}) + " ر.س";
    document.getElementById("kpi-gosi").innerText = gosiTotal.toLocaleString(undefined, {minimumFractionDigits: 2}) + " ر.س";
    document.getElementById("kpi-penalties").innerText = penaltiesTotal.toLocaleString(undefined, {minimumFractionDigits: 2}) + " ر.س";
    document.getElementById("kpi-net-pay").innerText = netTotal.toLocaleString(undefined, {minimumFractionDigits: 2}) + " ر.س";
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
        // Calculate late minutes manually for alert rules
        const name = emp.Name;
        const sickDays = parseInt(emp.SickDays || 0);
        const cashSales = parseInt(emp.CashSales || 0);
        const tamweelSales = parseInt(emp.TamweelSales || 0);
        
        // Custom CheckIn parsing to find actual check-in time
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
        
        // Rule 1: Critical late alert (>60m)
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
        
        // Rule 2: Prolonged sick leave (>30 days)
        if (sickDays > 30) {
            alertCount++;
            const div = document.createElement("div");
            div.className = "alert-item";
            div.style.borderColor = "var(--primary-gold)";
            div.innerHTML = `
                <span class="alert-icon">🤒</span>
                <div class="alert-text">
                    تجاوز الحد الأقصى للمرضي المدفوع للموظف <strong>${name}</strong> (سجل <strong>${sickDays} يوم</strong>).
                </div>
            `;
            container.appendChild(div);
        }
        
        // Rule 3: High performance incentive (>4 financing contracts)
        if (tamweel_sales_alert = tamweelSales >= 4) {
            alertCount++;
            const div = document.createElement("div");
            div.className = "alert-item";
            div.style.borderColor = "var(--accent-blue)";
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
    
    auditBtn.innerText = "⚖️ جاري تدقيق اللوائح ومطابقة البصمة...";
    auditBtn.disabled = true;
    resultBox.innerText = "⏳ يستدعي 'سند' لوائح العمل ويطابق توقيت البصمات مع كشوف التأمينات والخصومات...";
    resultBox.classList.add("active");
    badge.innerText = "جاري التدقيق المالي...";
    
    try {
        const response = await fetch("/api/payroll/audit", { method: "POST" });
        const result = await response.json();
        
        if (response.ok && result.status === "success") {
            resultBox.innerText = result.audit_report;
            badge.innerText = "معتمد ومطابق";
            setStep(3);
        } else {
            resultBox.innerText = "فشل التدقيق: " + (result.audit_report || "خطأ مجهول");
            badge.innerText = "مرفوض للمراجعة";
        }
    } catch (e) {
        resultBox.innerText = "خطأ في الاتصال بالخادم المالي: " + e.message;
        badge.innerText = "مرفوض للمراجعة";
    } finally {
        auditBtn.innerText = "⚖️ تشغيل المدقق المالي المستقل \"سند\"";
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
