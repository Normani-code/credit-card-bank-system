# Script de Ejecución Local - Bancolombia Card Hub

# 1. Configuración de Directorios
$projectRoot = "c:\Maurito\Bancolombia-Proyecto"
$mvnCmd = "$projectRoot\.maven\apache-maven-3.9.6\bin\mvn.cmd"

Write-Host "==================================================" -ForegroundColor Yellow
Write-Host "   Bancolombia - Card & Transaction Manager" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Yellow

# 2. Compilar y Ejecutar Backend Java (Spring Boot)
Write-Host "`n[1/3] Compilando y ejecutando Core Java..." -ForegroundColor Cyan
if (-not (Test-Path $mvnCmd)) {
    Write-Host "Error: No se encontró el compilador de Maven en $mvnCmd" -ForegroundColor Red
    exit
}

# Iniciar Java en segundo plano en una nueva consola
Write-Host "Levantando servicio Java Spring Boot (Puerto 8080)..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit -Command & { cd '$projectRoot\java-backend'; & '$mvnCmd' spring-boot:run }" -Title "Bancolombia - Java Backend Core"

# 3. Configurar y Ejecutar BFF FastAPI
Write-Host "`n[2/3] Configurando entorno de Python para BFF..." -ForegroundColor Cyan
cd "$projectRoot\fastapi-bff"

if (-not (Test-Path ".venv")) {
    Write-Host "Creando entorno virtual de Python (.venv)..." -ForegroundColor Gray
    py -m venv .venv
}

Write-Host "Activando entorno virtual e instalando dependencias..." -ForegroundColor Gray
& ".\.venv\Scripts\pip" install -r requirements.txt --quiet

# Iniciar FastAPI en segundo plano en una nueva consola
Write-Host "Levantando servicio BFF & Servidor Web FastAPI (Puerto 8000)..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit -Command & { cd '$projectRoot\fastapi-bff'; .\.venv\Scripts\activate; py -m uvicorn main:app --port 8000 --reload }" -Title "Bancolombia - FastAPI BFF"

# 4. Finalización
Write-Host "`n[3/3] ¡Listo! El entorno se está iniciando en ventanas separadas." -ForegroundColor Green
Write-Host "--------------------------------------------------" -ForegroundColor Yellow
Write-Host "Acceso al Frontend Web:   http://localhost:8000" -ForegroundColor Green
Write-Host "Acceso a Consola H2:      http://localhost:8080/h2-console" -ForegroundColor Gray
Write-Host "--------------------------------------------------" -ForegroundColor Yellow
Write-Host "Presione Ctrl+C en las respectivas ventanas para detener los servicios." -ForegroundColor Gray
