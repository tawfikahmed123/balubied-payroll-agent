import asyncio
import os
from dotenv import load_dotenv
from google.antigravity import Agent, LocalAgentConfig

# Load the API key
load_dotenv()

# ==========================================
# HR EMPLOYEE ASSISTANT
# ==========================================
async def main():
    print("🟢 AutoZone HR Employee Self-Service Assistant is Online...\n")
    
    # Read the data files for context
    try:
        with open('monthly_input.csv', 'r') as file:
            input_csv = file.read()
        with open('wps_mudad_report_with_commission.csv', 'r') as file:
            report_csv = file.read()
    except FileNotFoundError:
        print("❌ Error: Missing monthly_input.csv or wps_mudad_report_with_commission.csv. Run autozone_payroll.py first.")
        return

    config = LocalAgentConfig(
        api_key=os.getenv("GEMINI_API_KEY"),
        model="gemini-2.5-flash",
        system_instructions=(
            "You are Faisal, a supportive and clear HR Executive at AutoZone KSA. "
            "Your job is to answer employee queries regarding their salaries, deductions, and payroll details. "
            "You have access to the monthly raw input data and the finalized WPS report. "
            "Explain calculations (GOSI, Late Penalties, and Sick Deductions) clearly and transparently. "
            "Be extremely polite, speak in Saudi Arabic (or English if the user asks in English), and help them understand the rules. "
            "Use formatting such as bullet points to make breakdowns easy to read."
        )
    )

    async with Agent(config) as agent:
        # Give the agent context about the payroll files
        context_msg = f"""
        Here is the reference data for this month's payroll.
        
        Raw Inputs (monthly_input.csv):
        {input_csv}
        
        WPS Final Payroll Report (wps_mudad_report_with_commission.csv):
        {report_csv}
        
        Acknowledge that you have loaded this data. Do not output this acknowledgement to the user yet, just be ready.
        """
        await agent.chat(context_msg)
        
        print("💬 فیصل (HR): مرحبًا! أنا فيصل من الموارد البشرية. كيف أقدر أساعدك بخصوص تفاصيل راتبك اليوم؟")
        print("-" * 60)
        
        # Interactive Chat Loop
        while True:
            user_msg = input("👤 Employee: ")
            if user_msg.lower() in ['quit', 'exit']:
                print("Ending chat...")
                break
                
            print("⏳ فيصل is typing...")
            response = await agent.chat(user_msg)
            print(f"🤖 فيصل (HR): {await response.text()}\n")

if __name__ == "__main__":
    asyncio.run(main())
