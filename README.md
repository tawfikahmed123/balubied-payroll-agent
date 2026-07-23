# Balubied Payroll Agent

وكيل بالبيد لإدارة الرواتب والتدقيق — Balubied Payroll Agent

An AI-powered payroll processing and auditing platform for Balubied Group (KSA), built with FastAPI and Google Antigravity SDK.

## Features

- **Fingerprint Attendance Processing** — Import raw attendance CSV logs and auto-calculate lateness penalties
- **Saudi Labor Law Compliance** — GOSI deductions (9.75% for Saudis), sick leave per Article 117, late penalties
- **Sales Commission Calculation** — Cash and Tamweel commission tracking
- **WPS/Mudad Export** — Generate payroll reports ready for WPS submission
- **AI Auditor ("Sanad")** — Independent financial audit agent that cross-references inputs vs outputs for compliance

## Tech Stack

- **Backend**: Python / FastAPI
- **AI Agent**: Google Antigravity SDK (Gemini)
- **Frontend**: Vanilla HTML/CSS/JS (Arabic RTL)

## Getting Started

```bash
# Install dependencies
pip install fastapi uvicorn python-dotenv google-antigravity

# Set up environment
echo "GEMINI_API_KEY=your_key_here" > .env

# Run the server
uvicorn app:app --reload --port 8000
```

## License

Private — Balubied Group © 2026
