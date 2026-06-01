import os
import logging
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fastapi-bff")

app = FastAPI(
    title="Bancolombia Card Manager BFF",
    description="Capa BFF (Backend For Frontend) para gestionar la comunicación del dashboard con el Core Java",
    version="1.0.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JAVA_BACKEND_URL = os.getenv("JAVA_BACKEND_URL", "http://localhost:8080")

# Resilience helper: async HTTP client
async def forward_request(method: str, path: str, json_data: dict = None):
    url = f"{JAVA_BACKEND_URL}{path}"
    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Forwarding {method} request to {url}")
            if method == "GET":
                response = await client.get(url, timeout=5.0)
            elif method == "POST":
                response = await client.post(url, json=json_data, timeout=5.0)
            elif method == "PUT":
                response = await client.put(url, json=json_data, timeout=5.0)
            else:
                raise HTTPException(status_code=405, detail="Method not allowed")
            
            # Check for backend errors
            if response.status_code >= 400:
                logger.warning(f"Backend returned error: {response.status_code} - {response.text}")
                try:
                    return JSONResponse(status_code=response.status_code, content=response.json())
                except Exception:
                    return JSONResponse(status_code=response.status_code, content={"message": response.text})

            return response.json()
        except httpx.ConnectError:
            logger.error(f"Failed to connect to backend service at {url}")
            raise HTTPException(
                status_code=503, 
                detail="El Core Bancario (Java Backend) se encuentra inactivo o fuera de servicio. Soporte TI ha sido notificado."
            )
        except httpx.TimeoutException:
            logger.error(f"Timeout connecting to backend service at {url}")
            raise HTTPException(
                status_code=504,
                detail="El Core Bancario tardó demasiado en responder (Timeout)."
            )
        except Exception as e:
            logger.error(f"Unexpected error in BFF: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error en capa BFF: {str(e)}")

# --- BFF Endpoints ---

@app.get("/api/v1/bff/dashboard")
async def get_dashboard_summary():
    """
    Patrón BFF: Agrega y sintetiza datos de múltiples endpoints del backend
    para optimizar la carga del frontend en una sola petición.
    """
    async with httpx.AsyncClient() as client:
        try:
            # 1. Fetch clients, cards, and recent transactions concurrently
            clients_resp = await client.get(f"{JAVA_BACKEND_URL}/api/clients", timeout=4.0)
            cards_resp = await client.get(f"{JAVA_BACKEND_URL}/api/cards", timeout=4.0)
            txs_resp = await client.get(f"{JAVA_BACKEND_URL}/api/transactions/recent", timeout=4.0)

            # Check statuses
            if any(r.status_code != 200 for r in [clients_resp, cards_resp, txs_resp]):
                raise HTTPException(status_code=500, detail="Error obteniendo datos del Core Bancario.")

            clients = clients_resp.json()
            cards = cards_resp.json()
            transactions = txs_resp.json()

            # 2. Compute aggregated metrics
            total_clients = len(clients)
            total_cards = len(cards)
            active_cards = sum(1 for c in cards if c["status"] == "ACTIVE")
            blocked_cards = total_cards - active_cards
            
            total_debit_balance = sum(float(c["balance"]) for c in cards if c["cardType"] == "DEBIT")
            total_credit_used = sum(float(c["balance"]) for c in cards if c["cardType"] == "CREDIT")
            total_credit_limit = sum(float(c["creditLimit"]) for c in cards if c["cardType"] == "CREDIT")
            total_credit_available = total_credit_limit - total_credit_used

            return {
                "metrics": {
                    "totalClients": total_clients,
                    "totalCards": total_cards,
                    "activeCards": active_cards,
                    "blockedCards": blocked_cards,
                    "totalDebitBalance": total_debit_balance,
                    "totalCreditUsed": total_credit_used,
                    "totalCreditAvailable": total_credit_available
                },
                "clients": clients,
                "cards": cards,
                "recentTransactions": transactions
            }

        except httpx.ConnectError:
            raise HTTPException(
                status_code=503, 
                detail="El Core Bancario (Java Backend) se encuentra inactivo. No se pudo construir el Dashboard."
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error agregando datos del Dashboard: {str(e)}")

# --- Proxy Endpoints ---

@app.post("/api/v1/bff/clients")
async def create_client(request: Request):
    body = await request.json()
    return await forward_request("POST", "/api/clients", body)

@app.post("/api/v1/bff/cards")
async def create_card(request: Request):
    body = await request.json()
    return await forward_request("POST", "/api/cards", body)

@app.put("/api/v1/bff/cards/{card_id}/status")
async def update_card_status(card_id: int, request: Request):
    body = await request.json()
    return await forward_request("PUT", f"/api/cards/{card_id}/status", body)

@app.post("/api/v1/bff/transactions")
async def create_transaction(request: Request):
    body = await request.json()
    return await forward_request("POST", "/api/transactions", body)

@app.post("/api/v1/bff/transactions/transfer")
async def create_transfer(request: Request):
    body = await request.json()
    return await forward_request("POST", "/api/transactions/transfer", body)

@app.get("/api/v1/bff/cards/{card_id}/transactions")
async def get_card_transactions(card_id: int):
    return await forward_request("GET", f"/api/cards/{card_id}/transactions")

# Mount Static Files for Web UI
# This will serve index.html at root "/" and static resources
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    reload = os.getenv("PORT") is None
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload)
