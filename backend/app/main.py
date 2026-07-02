from fastapi import FastAPI

app = FastAPI(title="Agentic Compliance Copilot API")


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "agentic-compliance-copilot-backend"
    }