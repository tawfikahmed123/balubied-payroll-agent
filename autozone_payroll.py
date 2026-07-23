import asyncio
import os
from dotenv import load_dotenv
from google.antigravity import Agent, LocalAgentConfig

# Load the API key
load_dotenv()

# ==========================================
# 1. KSA TOOLS (Zero-Error Math)
# ==========================================
def calculate_gosi_deduction(base_salary: float, housing_allowance: float, nationality: str) -> float:
    # GOSI STRICTLY ignores variable commission. Only taxes Basic + Housing.
    total_subject_to_gosi = base_salary + housing_allowance
    if nationality.lower() == 'saudi':
        return total_subject_to_gosi * 0.0975
    else:
        return 0.0

def calculate_late_penalty(minutes_late: int, daily_wage: float) -> float:
    if minutes_late <= 15:
        return 0.0 
    elif minutes_late <= 60:
        return daily_wage * 0.25 
    else:
        return daily_wage * 0.50 

def calculate_sick_leave_deduction(sick_days: int, daily_wage: float) -> float:
    deduction = 0.0
    if sick_days > 30:
        days_at_75_percent = min(sick_days - 30, 60)
        deduction += days_at_75_percent * (daily_wage * 0.25)
    if sick_days > 90:
        days_unpaid = min(sick_days - 90, 30)
        deduction += days_unpaid * daily_wage
    return deduction

def calculate_sales_commission(cash_sales: int, tamweel_sales: int) -> float:
    """Calculates AutoZone variable sales commission."""
    cash_bonus = cash_sales * 500.0       # 500 SAR per cash sale
    tamweel_bonus = tamweel_sales * 1000.0 # 1000 SAR per financing sale
    return cash_bonus + tamweel_bonus

# ==========================================
# 2. FILE PROCESSING AGENT
# ==========================================
async def main():
    print("📂 Reading raw AutoZone CSV data (Now with Sales Data!)...")
    
    with open('monthly_input.csv', 'r') as file:
        raw_csv_data = file.read()

    config = LocalAgentConfig(
        api_key=os.getenv("GEMINI_API_KEY"),
        model="gemini-2.5-flash",
        system_instructions=(
            "You are the internal AutoZone KSA Payroll AI Manager. "
            "You process CSV payroll data accurately according to Saudi Labor Law. "
            "You MUST use the provided tools for math. Never guess."
        ),
        tools=[calculate_gosi_deduction, calculate_late_penalty, calculate_sick_leave_deduction, calculate_sales_commission]
    )

    async with Agent(config) as agent:
        prompt = f'''
        Here is the raw monthly payroll data exported from our system:
        
        {raw_csv_data}
        
        Act autonomously to do the following for EVERY employee in the list:
        1. Calculate daily wage strictly on fixed income: ((BasicSalary + Housing) / 30).
        2. Execute your tools to find exact GOSI, late penalty, sick leave deduction, and the Sales Commission.
        3. Calculate Net Pay = (BasicSalary + Housing + Commission) - (GOSI + LatePenalty + SickDeduction).
        4. Output the final result STRICTLY as raw CSV format matching this header:
        EmployeeID,Name,Nationality,BasicPlusHousing,Commission,GOSI_Deduction,Late_Penalty,Sick_Deduction,NetPay
        
        Do not include markdown tables, code blocks like ```csv, or any conversation text. ONLY output the raw CSV data.
        '''
        
        print("🧠 Agent is calculating fixed salaries and variable commissions...")
        response = await agent.chat(prompt)
        final_csv_output = await response.text()
        
        final_csv_output = final_csv_output.replace("```csv", "").replace("```", "").strip()

        with open('wps_mudad_report_with_commission.csv', 'w') as out_file:
            out_file.write(final_csv_output)
            
        print("✅ SUCCESS! The file 'wps_mudad_report_with_commission.csv' has been generated.")
        print("Here is a preview:\n", final_csv_output)

if __name__ == "__main__":
    asyncio.run(main())
