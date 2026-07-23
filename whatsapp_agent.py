import asyncio
import os
from dotenv import load_dotenv
from google.antigravity import Agent, LocalAgentConfig

# Load the API key
load_dotenv()

# ==========================================
# CUSTOM CRM TOOL
# ==========================================
def book_showroom_visit(customer_name: str, preferred_day: str, branch_location: str) -> str:
    """Use this tool to book a test drive or showroom visit for the customer in the AutoZone CRM."""
    print(f"\n[🔧 SYSTEM ACTION: CRM API TRIGGERED - Appointment autonomously booked for {customer_name} on {preferred_day} at the {branch_location} branch!]\n")
    return f"SUCCESS: Appointment confirmed for {customer_name}."

# ==========================================
# WHATSAPP AGENT
# ==========================================
async def main():
    print("🟢 AutoZone AI WhatsApp Agent is Online...\n")
    
    config = LocalAgentConfig(
        api_key=os.getenv("GEMINI_API_KEY"),
        model="gemini-2.5-flash",
        system_instructions=(
            "You are Nawaf, a friendly, highly persuasive Saudi car sales agent for AutoZone KSA. "
            "You are chatting with a new lead on WhatsApp who just clicked a TikTok ad for the '2024 Geely Monjaro'. "
            "Your goal is to pre-qualify them and book a showroom visit. "
            "Step 1: Greet them warmly in Saudi Arabic and ask if they are looking to buy 'Cash' (كاش) or via 'Tamweel' (تمويل - Bank Financing). "
            "Step 2: If they say Tamweel, ask which bank their salary is in so you can check offers. "
            "Step 3: Offer to book a showroom visit for them. If they agree, ask for their name and preferred day, then use the 'book_showroom_visit' tool. "
            "CRITICAL: Keep your responses short, exactly like a WhatsApp text message. Use emojis. Always speak in Saudi Arabic."
        ),
        tools=[book_showroom_visit]
    )

    async with Agent(config) as agent:
        print("📱 New Lead Alert: A customer just clicked the TikTok ad!")
        print("-" * 50)
        
        initial_msg = "A new customer just clicked our ad for the Geely Monjaro. Send the very first WhatsApp outreach message to them to start the conversation."
        
        print("⏳ Nawaf is typing...")
        response = await agent.chat(initial_msg)
        print(f"🤖 Nawaf (AI): {await response.text()}\n")
        
        # Interactive Chat Loop
        while True:
            user_msg = input("👤 You (Customer): ")
            if user_msg.lower() in ['quit', 'exit']:
                print("Ending chat...")
                break
                
            print("⏳ Nawaf is typing...")
            response = await agent.chat(user_msg)
            print(f"🤖 Nawaf (AI): {await response.text()}\n")

if __name__ == "__main__":
    asyncio.run(main())
