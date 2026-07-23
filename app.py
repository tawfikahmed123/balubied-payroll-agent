import os
import csv
import io
import asyncio
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from google.antigravity import Agent, LocalAgentConfig

load_dotenv()

app = FastAPI(title="Balubied Payroll Agent")

os.makedirs("static", exist_ok=True)

# Helper calculations
def calculate_gosi_deduction(base_salary: float, housing_allowance: float, nationality: str) -> float:
    total_subject_to_gosi = base_salary + housing_allowance
    if nationality.lower() == 'saudi':
        return round(total_subject_to_gosi * 0.0975, 2)
    return 0.0

def calculate_late_penalty(minutes_late: int, daily_wage: float) -> float:
    if minutes_late <= 15:
        return 0.0
    elif minutes_late <= 60:
        return round(daily_wage * 0.25, 2)
    return round(daily_wage * 0.50, 2)

def calculate_sick_leave_deduction(sick_days: int, daily_wage: float) -> float:
    deduction = 0.0
    if sick_days > 30:
        days_at_75_percent = min(sick_days - 30, 60)
        deduction += days_at_75_percent * (daily_wage * 0.25)
    if sick_days > 90:
        days_unpaid = min(sick_days - 90, 30)
        deduction += days_unpaid * daily_wage
    return round(deduction, 2)

def calculate_sales_commission(cash_sales: int, tamweel_sales: int) -> float:
    return float(cash_sales * 500 + tamweel_sales * 1000)

def parse_minutes_late(shift_start: str, check_in: str) -> int:
    try:
        fmt = "%H:%M"
        t_start = datetime.strptime(shift_start.strip(), fmt)
        t_checkin = datetime.strptime(check_in.strip(), fmt)
        delta = t_checkin - t_start
        minutes = int(delta.total_seconds() / 60)
        return max(0, minutes)
    except Exception:
        return 0

# Shared state to hold latest run data for the Auditor
latest_run_data = {
    "input_csv": "",
    "output_csv": "",
    "output_json": []
}

@app.post("/api/payroll/process")
async def process_payroll(
    file: UploadFile = File(None),
    raw_data: str = Form(None)
):
    content = ""
    if file:
        content_bytes = await file.read()
        content = content_bytes.decode("utf-8")
    elif raw_data:
        content = raw_data
    else:
        raise HTTPException(status_code=400, detail="لا توجد بيانات بصمة مدخلة.")

    # Save input for audit tracking
    latest_run_data["input_csv"] = content
    with open("attendance_logs.csv", "w") as f:
        f.write(content)

    # Parse and compute
    try:
        reader = csv.DictReader(io.StringIO(content.strip()))
        employees = list(reader)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"بنية ملف CSV غير صالحة: {str(e)}")

    if not employees:
        raise HTTPException(status_code=400, detail="سجل البصمة فارغ.")

    results = []
    for emp in employees:
        try:
            emp_id = emp.get("EmployeeID")
            name = emp.get("Name")
            nationality = emp.get("Nationality", "Saudi")
            basic = float(emp.get("BasicSalary", 0))
            housing = float(emp.get("Housing", 0))
            shift_start = emp.get("ShiftStart", "08:00")
            check_in = emp.get("CheckIn", "08:00")
            sick_days = int(emp.get("SickDays", 0))
            cash_sales = int(emp.get("CashSales", 0))
            tamweel_sales = int(emp.get("TamweelSales", 0))

            # Auto calculate late minutes from fingerprint times
            minutes_late = parse_minutes_late(shift_start, check_in)

            basic_plus_housing = basic + housing
            daily_wage = basic_plus_housing / 30.0

            commission = calculate_sales_commission(cash_sales, tamweel_sales)
            gosi = calculate_gosi_deduction(basic, housing, nationality)
            late = calculate_late_penalty(minutes_late, daily_wage)
            sick = calculate_sick_leave_deduction(sick_days, daily_wage)
            net_pay = (basic_plus_housing + commission) - (gosi + late + sick)

            results.append({
                "EmployeeID": emp_id,
                "Name": name,
                "Nationality": nationality,
                "BasicPlusHousing": f"{basic_plus_housing:.2f}",
                "Commission": f"{commission:.2f}",
                "GOSI_Deduction": f"{gosi:.2f}",
                "Late_Penalty": f"{late:.2f}",
                "Sick_Deduction": f"{sick:.2f}",
                "NetPay": f"{net_pay:.2f}"
            })
        except Exception as e:
            print(f"Error parsing row: {str(e)}")
            continue

    # Write output to wps_mudad_report_with_commission.csv
    if results:
        latest_run_data["output_json"] = results
        output_buffer = io.StringIO()
        writer = csv.DictWriter(output_buffer, fieldnames=results[0].keys())
        writer.writeheader()
        writer.writerows(results)
        
        output_str = output_buffer.getvalue()
        latest_run_data["output_csv"] = output_str
        
        with open("wps_mudad_report_with_commission.csv", "w", newline="") as f:
            f.write(output_str)

    return {"status": "success", "data": results}

@app.post("/api/payroll/audit")
async def audit_payroll():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"audit_report": "مفتاح API الخاص بـ Gemini غير متوفر. يرجى إعداده في ملف .env أولاً.", "status": "error"}

    if not latest_run_data["input_csv"] or not latest_run_data["output_csv"]:
        return {"audit_report": "الرجاء رفع ومعالجة سجل البصمة أولاً قبل تشغيل التدقيق والمطابقة.", "status": "error"}

    config = LocalAgentConfig(
        api_key=api_key,
        model="gemini-2.5-flash",
        system_instructions=(
            "أنت 'سند'، رئيس لجنة التدقيق والمطابقة المالية المستقل لشركة أوتوزون السعودية (AutoZone KSA). "
            "مهمتك هي التحقق النهائي من كشوفات الرواتب ومطابقتها قانونياً للتأكد من تطبيق نظام العمل والعمال والتأمينات الاجتماعية بنسبة 100% وبدون أي أخطاء. "
            "أنت تقوم بمطابقة سجل البصمة الخام والحضور الفردي مع المخرجات المستخلصة. "
            "تأكد من مطابقة القواعد التالية وصحتها الحسابية لكل موظف:\n"
            "- استقطاع التأمينات (GOSI) بنسبة 9.75% للسعوديين فقط على (الأساسي + السكن) واستبعاد العمولات.\n"
            "- احتساب التأخيرات بدقة من أوقات البصمة (ساعة البصمة مقارنة بالبصمة الرسمية).\n"
            "- احتساب خصومات الإجازات المرضية طبقاً للمادة 117.\n"
            "اكتب تقريراً رسمياً باللغة العربية يتضمن:\n"
            "1. حالة التدقيق الكلية (معتمد ومطابق / مرفوض لوجود أخطاء).\n"
            "2. مراجعة تفصيلية بالأسماء تشرح للوزير أو المدير التنفيذي دقة حسابات كل موظف بناءً على بصمته ومبيعاته."
        )
    )

    try:
        async with Agent(config) as agent:
            prompt = f"""
            الرجاء مراجعة البيانات التالية ومطابقتها وإصدار صك الاعتماد النهائي.
            
            سجل البصمة والحضور الفعلي (المدخلات):
            {latest_run_data['input_csv']}
            
            مسير الرواتب المحسوب (المخرجات):
            {latest_run_data['output_csv']}
            
            قم بإجراء التدقيق وكتابة التقرير النهائي باللغة العربية وبصيغة رسمية واضحة.
            """
            response = await agent.chat(prompt)
            audit_report = await response.text()
            return {"audit_report": audit_report, "status": "success"}
    except Exception as e:
        return {"audit_report": f"فشل المدقق الذكي في معالجة البيانات بسبب: {str(e)}", "status": "error"}

@app.get("/api/payroll/download")
def download_payroll():
    path = "wps_mudad_report_with_commission.csv"
    if os.path.exists(path):
        return FileResponse(path, filename="wps_mudad_report_with_commission.csv", media_type="text/csv")
    raise HTTPException(status_code=404, detail="الملف غير متوفر بعد.")

# Serve index and static files
@app.get("/")
def get_index():
    return FileResponse("static/index.html")

app.mount("/", StaticFiles(directory="static"), name="static")
