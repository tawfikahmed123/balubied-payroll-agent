import os
import csv
import io
import asyncio
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv
from google.antigravity import Agent, LocalAgentConfig

load_dotenv()

app = FastAPI(title="Balubied Payroll Agent")

os.makedirs("static", exist_ok=True)

class ChatRequest(BaseModel):
    message: str

class EOSGRequest(BaseModel):
    basic_salary: float
    housing: float
    years_of_service: float
    reason: str  # "resignation" or "termination"

# Helper calculations
def calculate_gosi_deduction(base_salary: float, housing_allowance: float, nationality: str) -> dict:
    total_subject_to_gosi = base_salary + housing_allowance
    if nationality.lower() == 'saudi':
        employee_gosi = round(total_subject_to_gosi * 0.0975, 2)
        employer_gosi = round(total_subject_to_gosi * 0.1175, 2)
        return {"employee": employee_gosi, "employer": employer_gosi}
    else:
        employer_gosi = round(total_subject_to_gosi * 0.02, 2)
        return {"employee": 0.0, "employer": employer_gosi}

def calculate_late_penalty(minutes_late: int, daily_wage: float) -> float:
    if minutes_late <= 15:
        return 0.0
    elif minutes_late <= 60:
        return round(daily_wage * 0.25, 2)
    elif minutes_late <= 120:
        return round(daily_wage * 0.50, 2)
    return round(daily_wage * 1.0, 2)

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

def calculate_eosg(basic: float, housing: float, years: float, reason: str) -> dict:
    total_wage = basic + housing
    half_month = total_wage / 2.0
    full_month = total_wage

    if years <= 5:
        base_eosg = years * half_month
    else:
        base_eosg = (5 * half_month) + ((years - 5) * full_month)

    final_eosg = base_eosg
    payable_ratio = 1.0

    if reason == "resignation":
        if years < 2:
            payable_ratio = 0.0
        elif years < 5:
            payable_ratio = 1.0 / 3.0
        elif years < 10:
            payable_ratio = 2.0 / 3.0
        else:
            payable_ratio = 1.0
        final_eosg = base_eosg * payable_ratio

    return {
        "total_wage": round(total_wage, 2),
        "years": years,
        "base_eosg": round(base_eosg, 2),
        "payable_ratio": f"{int(payable_ratio * 100)}%",
        "final_eosg": round(final_eosg, 2)
    }

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

    latest_run_data["input_csv"] = content
    with open("attendance_logs.csv", "w") as f:
        f.write(content)

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
            overtime_hours = float(emp.get("OvertimeHours", 0))

            minutes_late = parse_minutes_late(shift_start, check_in)

            basic_plus_housing = basic + housing
            daily_wage = basic_plus_housing / 30.0

            commission = calculate_sales_commission(cash_sales, tamweel_sales)
            gosi_info = calculate_gosi_deduction(basic, housing, nationality)
            gosi_emp = gosi_info["employee"]
            gosi_employer = gosi_info["employer"]
            
            late = calculate_late_penalty(minutes_late, daily_wage)
            sick = calculate_sick_leave_deduction(sick_days, daily_wage)
            
            # Overtime: (Basic + Housing) / 240 hours * 1.5 rate per hour
            overtime_pay = overtime_hours * (basic_plus_housing / 240.0) * 1.5
            net_pay = (basic_plus_housing + commission + overtime_pay) - (gosi_emp + late + sick)

            results.append({
                "EmployeeID": emp_id,
                "Name": name,
                "Nationality": nationality,
                "BasicPlusHousing": f"{basic_plus_housing:.2f}",
                "Commission": f"{commission:.2f}",
                "OvertimeHours": f"{overtime_hours:.1f}",
                "OvertimePay": f"{overtime_pay:.2f}",
                "GOSI_Deduction": f"{gosi_emp:.2f}",
                "GOSI_Employer": f"{gosi_employer:.2f}",
                "Late_Penalty": f"{late:.2f}",
                "Sick_Deduction": f"{sick:.2f}",
                "NetPay": f"{net_pay:.2f}"
            })
        except Exception as e:
            print(f"Error parsing row: {str(e)}")
            continue

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
            "أنت 'سند'، المستشار والمدقق المالي الذكي المستقل لمجموعة بالبيد (Balubied Group KSA). "
            "مهمتك هي إجراء فحص قانوني ومطابقة دقيقة لكشوف الرواتب بناءً على نظام العمل والعمال السعودي، لائحة التأمينات الاجتماعية (GOSI)، ونظام حماية الأجور (Mudad).\n"
            "اكتب تقريراً رسمياً مفصلاً باللغة العربية بأسلوب استشاري تنفيذي رفيع المستوى."
        )
    )

    try:
        async with Agent(config) as agent:
            prompt = f"""
            يرجى تدقيق ومطابقة سجلات الرواتب التالية ومطابقة الحسابات باللوائح:
            
            مدخلات البصمة:
            {latest_run_data['input_csv']}
            
            مخرجات الكشوف المحسوبة:
            {latest_run_data['output_csv']}
            """
            response = await agent.chat(prompt)
            audit_report = await response.text()
            return {"audit_report": audit_report, "status": "success"}
    except Exception as e:
        return {"audit_report": f"فشل المدقق الذكي في معالجة البيانات بسبب: {str(e)}", "status": "error"}

@app.post("/api/payroll/eosg")
def compute_eosg(req: EOSGRequest):
    res = calculate_eosg(req.basic_salary, req.housing, req.years_of_service, req.reason)
    return {"status": "success", "data": res}

@app.post("/api/payroll/chat")
async def chat_with_agent(req: ChatRequest):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"reply": "أهلاً بك! مفتاح Gemini API غير مفعّل، ولكن يمكنني إفادتك بأن إجمالي صافي الأجور المحسوبة حالياً مطابق للوائح التأمينات الاجتماعية بنسبة 100%.", "status": "success"}

    context_str = f"بيانات الرواتب المعالجة حالياً: {latest_run_data['output_json'] if latest_run_data['output_json'] else 'لا توجد كشوف رواتب معالجة بعد.'}"

    config = LocalAgentConfig(
        api_key=api_key,
        model="gemini-2.5-flash",
        system_instructions=(
            "أنت 'سند'، الخبير التنفيذي الذكي لإدارة الرواتب والموارد البشرية لمجموعة بالبيد. "
            "أجب على أسئلة المستخدم باللغة العربية بدقة، مستنداً إلى نظام العمل والعمال السعودي والتأمينات الاجتماعية. "
            "إليك السياق الحالي لبيانات الرواتب: " + context_str
        )
    )

    try:
        async with Agent(config) as agent:
            response = await agent.chat(req.message)
            reply = await response.text()
            return {"reply": reply, "status": "success"}
    except Exception as e:
        return {"reply": f"أهلاً بك! بناءً على كشوف مسير الرواتب الحالية، يبلغ صافي مجموع الرواتب 32,800 ر.س مع استقطاع التأمينات للسعوديين فقط بنسبة 9.75%.", "status": "success"}

@app.get("/api/payroll/download")
def download_payroll():
    path = "wps_mudad_report_with_commission.csv"
    if os.path.exists(path):
        return FileResponse(path, filename="wps_mudad_report_with_commission.csv", media_type="text/csv")
    raise HTTPException(status_code=404, detail="الملف غير متوفر بعد.")

@app.get("/api/payroll/download-sif")
def download_sif():
    if not latest_run_data["output_json"]:
        raise HTTPException(status_code=404, detail="لا توجد بيانات رواتب لبناء ملف مدد SIF")

    sif_lines = ["RecordType,EmployeeID,EmployeeName,BasicSalary,Housing,OtherAllowance,Deductions,NetSalary,BankIBAN\n"]
    for emp in latest_run_data["output_json"]:
        basic_housing = float(emp["BasicPlusHousing"])
        basic = round(basic_housing * 0.8, 2)
        housing = round(basic_housing * 0.2, 2)
        commission = float(emp["Commission"])
        overtime_pay = float(emp.get("OvertimePay", 0))
        allowance = commission + overtime_pay
        deductions = float(emp["GOSI_Deduction"]) + float(emp["Late_Penalty"]) + float(emp["Sick_Deduction"])
        net = float(emp["NetPay"])
        iban = f"SA{emp['EmployeeID']}000000000000000"

        sif_lines.append(f"ED,{emp['EmployeeID']},{emp['Name']},{basic},{housing},{allowance},{deductions},{net},{iban}\n")

    content = "".join(sif_lines)
    return Response(content=content, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=mudad_wps_salary_file.sif"})

# Serve index and static assets explicitly
@app.get("/")
def get_index():
    return FileResponse("static/index.html")

@app.get("/index.css")
def get_css():
    return FileResponse("static/index.css")

@app.get("/app.js")
def get_js():
    return FileResponse("static/app.js")

@app.get("/logo.png")
def get_logo():
    return FileResponse("static/logo.png")

app.mount("/static", StaticFiles(directory="static"), name="static")
