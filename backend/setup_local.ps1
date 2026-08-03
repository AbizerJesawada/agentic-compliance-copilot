$ErrorActionPreference = "Stop"

if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
    throw "Python launcher not found. Install Python 3.11 or later, then run this script again."
}

& py -3.11 --version
if ($LASTEXITCODE -ne 0) {
    throw "Python 3.11 was not found. Install it, then run this script again."
}

& py -3.11 -m venv .venv
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt

Write-Host "Local backend environment is ready."
