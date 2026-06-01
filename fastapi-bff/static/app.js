// --- Constants and State Management ---
const API_BASE = "/api/v1/bff";

const state = {
    metrics: {},
    clients: [],
    cards: [],
    transactions: [],
    bugs: [
        { id: "BC-004", summary: "Límite de transacción en tarjetas de débito no retorna error explicativo en UI", priority: "HIGH", status: "SOLVED", desc: "" },
        { id: "BC-003", summary: "Holograma visual de tarjeta de crédito parpadea en Safari Móvil", priority: "MEDIUM", status: "SOLVED", desc: "" },
        { id: "BC-002", summary: "Transacciones duplicadas registradas en concurrencia alta (Race Condition)", priority: "CRITICAL", status: "SOLVED", desc: "Corregido aplicando bloqueo pesimista en base de datos Java." },
        { id: "BC-001", summary: "Inconsistencia de formato en fecha de expiración de tarjetas emitidas", priority: "LOW", status: "SOLVED", desc: "" }
    ],
    activeTab: "tab-client",
    
    // Interactive filter states
    selectedClientId: null,
    selectedCardId: null
};

// --- DOM Elements ---
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    // Tab switching listener
    const tabBtns = document.querySelectorAll(".tab-btn");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const tabId = btn.getAttribute("data-tab");
            document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
            document.getElementById(tabId).classList.add("active");
            state.activeTab = tabId;
        });
    });

    // Form Event Listeners
    document.getElementById("form-client").addEventListener("submit", handleClientSubmit);
    document.getElementById("form-card").addEventListener("submit", handleCardSubmit);
    document.getElementById("form-transaction").addEventListener("submit", handleTransactionSubmit);
    document.getElementById("form-bug").addEventListener("submit", handleBugSubmit);

    // Limit Input toggle for Credit Cards
    document.getElementById("card-type-select").addEventListener("change", (e) => {
        const limitGroup = document.getElementById("group-credit-limit");
        if (e.target.value === "CREDIT") {
            limitGroup.style.display = "block";
        } else {
            limitGroup.style.display = "none";
        }
    });

    // Operation Type change inside Transaction form (Shows/Hides transfer destinations)
    document.getElementById("tx-type-select").addEventListener("change", (e) => {
        const destGroup = document.getElementById("group-tx-destination");
        if (e.target.value === "TRANSFER") {
            destGroup.style.display = "block";
            populateDestinationCards();
        } else {
            destGroup.style.display = "none";
        }
    });

    // Source Card change inside Transaction form (Excludes selected card from transfer destination options)
    document.getElementById("tx-card-select").addEventListener("change", () => {
        if (document.getElementById("tx-type-select").value === "TRANSFER") {
            populateDestinationCards();
        }
    });

    // Save original mermaid code before it is rendered
    const mermaidEl = document.getElementById("process-mermaid");
    const originalMermaidCode = mermaidEl ? mermaidEl.textContent : "";

    async function renderMermaid() {
        if (!window.mermaid || !mermaidEl) return;
        mermaidEl.removeAttribute("data-processed");
        mermaidEl.textContent = originalMermaidCode;
        mermaid.initialize({
            startOnLoad: false,
            theme: document.body.classList.contains("dark-mode") ? "dark" : "default",
            securityLevel: "loose"
        });
        await mermaid.run({
            nodes: [mermaidEl]
        });
    }

    // Dark/Light Mode Toggle
    document.getElementById("theme-toggle").addEventListener("click", () => {
        const body = document.body;
        const icon = document.querySelector("#theme-toggle i");
        if (body.classList.contains("dark-mode")) {
            body.classList.remove("dark-mode");
            body.classList.add("light-mode");
            icon.className = "fa-solid fa-sun";
            
            // Re-render mermaid with light theme
            renderMermaid();
        } else {
            body.classList.remove("light-mode");
            body.classList.add("dark-mode");
            icon.className = "fa-solid fa-moon";
            
            // Re-render mermaid with dark theme
            renderMermaid();
        }
    });

    // Modal Listeners
    const bugModal = document.getElementById("bug-modal");
    document.getElementById("btn-report-bug").addEventListener("click", () => {
        bugModal.classList.remove("hidden");
        bugModal.classList.add("visible");
    });
    
    document.getElementById("btn-close-modal").addEventListener("click", () => {
        bugModal.classList.remove("visible");
        setTimeout(() => bugModal.classList.add("hidden"), 300);
    });

    // Initialize Mermaid.js
    renderMermaid();

    // Main top-level Navigation Tabs switching
    const navTabBtns = document.querySelectorAll(".nav-tab-btn");
    navTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            navTabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            
            const tabId = btn.getAttribute("data-tab");
            document.querySelectorAll(".main-tab-content").forEach(mtc => mtc.classList.remove("active"));
            document.getElementById(tabId).classList.add("active");
            
            // Trigger redrawing if necessary when tabs are loaded
            if (tabId === "tab-process-diagram" && window.mermaid) {
                // Mermaid renders fine on display block
            }
            if (tabId === "tab-uml-architecture" && window.GraphViewer) {
                window.GraphViewer.processElements();
            }
        });
    });

    // Global Search Filter
    const searchInput = document.getElementById("global-search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            state.searchQuery = e.target.value.toLowerCase().trim();
            renderCards();
            renderClientsTable();
            renderTransactions();
        });
    }

    // Zoom control logic for Mermaid Process diagram
    let currentZoom = 100; // in percent
    const zoomStep = 20;
    const minZoom = 60;
    const maxZoom = 250;

    const zoomInBtn = document.getElementById("btn-zoom-in");
    const zoomOutBtn = document.getElementById("btn-zoom-out");
    const zoomResetBtn = document.getElementById("btn-zoom-reset");
    const processMermaidEl = document.getElementById("process-mermaid");

    function updateZoom() {
        if (processMermaidEl) {
            processMermaidEl.style.width = `${currentZoom}%`;
        }
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener("click", () => {
            if (currentZoom < maxZoom) {
                currentZoom += zoomStep;
                updateZoom();
            }
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener("click", () => {
            if (currentZoom > minZoom) {
                currentZoom -= zoomStep;
                updateZoom();
            }
        });
    }

    if (zoomResetBtn) {
        zoomResetBtn.addEventListener("click", () => {
            currentZoom = 100;
            updateZoom();
        });
    }

    // UML Zoom and Grid toggle controls
    let umlZoom = 100;
    const umlZoomStep = 15;
    const umlMinZoom = 50;
    const umlMaxZoom = 250;
    
    const containerEl = document.querySelector(".blueprint-container");
    if (containerEl) {
        containerEl.classList.add("grid-active");
        const gridBtn = document.getElementById("uml-grid-toggle");
        if (gridBtn) gridBtn.classList.add("active");
    }

    function updateUmlZoom() {
        const mxgraphEl = document.querySelector("#uml-viewport .mxgraph");
        if (mxgraphEl) {
            mxgraphEl.style.width = `${umlZoom}%`;
        }
    }

    const umlZoomReset = document.getElementById("uml-zoom-reset");
    const umlGridToggle = document.getElementById("uml-grid-toggle");

    if (umlZoomReset) {
        umlZoomReset.addEventListener("click", () => {
            umlZoom = 100;
            updateUmlZoom();
        });
    }

    if (umlGridToggle) {
        umlGridToggle.addEventListener("click", () => {
            if (containerEl) {
                containerEl.classList.toggle("grid-active");
                umlGridToggle.classList.toggle("active");
            }
        });
    }

    // Initial Dashboard Load
    loadDashboard();
    renderBugs();
}

// --- API Calls & Data Loaders ---

async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/dashboard`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Error obteniendo datos del dashboard");
        }
        
        const data = await response.json();
        
        state.metrics = data.metrics;
        state.clients = data.clients;
        state.cards = data.cards;
        state.transactions = data.recentTransactions;
        
        // Update Core Java Status Indicator
        updateStatusIndicator("status-core", true);
        updateStatusIndicator("status-bff", true);

        // Update UI components
        updateMetricsUI();
        renderCards();
        renderClientsTable();
        populateSelects();
        renderTransactions();

    } catch (error) {
        console.error("Dashboard Loading Error:", error);
        showToast(error.message, "error");
        updateStatusIndicator("status-core", false);
    }
}

function updateStatusIndicator(id, isActive) {
    const indicator = document.getElementById(id);
    if (!indicator) return;
    
    if (isActive) {
        indicator.className = "status-indicator active";
        indicator.innerHTML = `<span class="dot"></span> ${id === 'status-bff' ? 'BFF Layer (FastAPI)' : 'Core Services (Java)'}`;
    } else {
        indicator.className = "status-indicator inactive";
        indicator.innerHTML = `<span class="dot"></span> ${id === 'status-bff' ? 'BFF Layer (FastAPI)' : 'Core Services Offline'}`;
    }
}

// --- UI Renderers ---

function updateMetricsUI() {
    // If a client is selected, compute metrics locally for that client. Otherwise, use global metrics.
    if (state.selectedClientId) {
        const clientCards = state.cards.filter(c => c.client.id === state.selectedClientId);
        const totalCards = clientCards.length;
        const activeCards = clientCards.filter(c => c.status === "ACTIVE").length;
        const blockedCards = totalCards - activeCards;
        
        const totalDebitBalance = clientCards.filter(c => c.cardType === "DEBIT").reduce((acc, c) => acc + parseFloat(c.balance), 0);
        const totalCreditUsed = clientCards.filter(c => c.cardType === "CREDIT").reduce((acc, c) => acc + parseFloat(c.balance), 0);
        const totalCreditLimit = clientCards.filter(c => c.cardType === "CREDIT").reduce((acc, c) => acc + parseFloat(c.creditLimit), 0);
        const totalCreditAvailable = totalCreditLimit - totalCreditUsed;

        document.getElementById("val-clients").textContent = "1";
        document.getElementById("val-cards").innerHTML = `${activeCards} <span class="sub-val" style="color:${blockedCards > 0 ? '#ef4444' : 'var(--text-muted)'}">/ ${blockedCards} Bloqueadas</span>`;
        document.getElementById("val-debit-balance").textContent = formatCOP(totalDebitBalance);
        document.getElementById("val-credit-available").textContent = formatCOP(totalCreditAvailable);

        const bar = document.getElementById("credit-progress");
        if (totalCreditLimit > 0) {
            const pct = Math.round((totalCreditAvailable / totalCreditLimit) * 100);
            bar.style.width = `${pct}%`;
            if (pct < 20) bar.style.backgroundColor = "var(--color-error)";
            else if (pct < 50) bar.style.backgroundColor = "var(--color-warning)";
            else bar.style.backgroundColor = "var(--color-success)";
        } else {
            bar.style.width = "0%";
        }
    } else {
        const m = state.metrics;
        if (!m) return;

        document.getElementById("val-clients").textContent = m.totalClients;
        document.getElementById("val-cards").innerHTML = `${m.activeCards} <span class="sub-val" style="color:${m.blockedCards > 0 ? '#ef4444' : 'var(--text-muted)'}">/ ${m.blockedCards} Bloqueadas</span>`;
        document.getElementById("val-debit-balance").textContent = formatCOP(m.totalDebitBalance);
        document.getElementById("val-credit-available").textContent = formatCOP(m.totalCreditAvailable);

        const limit = m.totalCreditAvailable + m.totalCreditUsed;
        const bar = document.getElementById("credit-progress");
        if (limit > 0) {
            const pct = Math.round((m.totalCreditAvailable / limit) * 100);
            bar.style.width = `${pct}%`;
            if (pct < 20) bar.style.backgroundColor = "var(--color-error)";
            else if (pct < 50) bar.style.backgroundColor = "var(--color-warning)";
            else bar.style.backgroundColor = "var(--color-success)";
        } else {
            bar.style.width = "0%";
        }
    }
}

function renderCards() {
    const container = document.getElementById("cards-container");
    container.innerHTML = "";

    // Filter cards if a client is selected
    let filteredCards = [...state.cards];
    if (state.selectedClientId) {
        filteredCards = filteredCards.filter(c => c.client.id === state.selectedClientId);
        container.classList.add("stacked");
    } else {
        container.classList.remove("stacked");
    }

    if (state.searchQuery) {
        filteredCards = filteredCards.filter(c => 
            c.cardHolder.toLowerCase().includes(state.searchQuery) ||
            c.cardNumber.toLowerCase().includes(state.searchQuery) ||
            c.cardType.toLowerCase().includes(state.searchQuery)
        );
    }

    document.getElementById("cards-count").textContent = `${filteredCards.length} filtradas`;

    if (filteredCards.length === 0) {
        container.innerHTML = `
            <div class="no-data-msg">
                <i class="fa-solid fa-credit-card fa-3x mb-3 opacity-50"></i>
                <p>No se encontraron tarjetas.</p>
            </div>`;
        return;
    }

    // Stack sorting logic: bring active card to the front of the array (index 0)
    let sortedCards = [...filteredCards];
    if (state.selectedCardId) {
        const activeIndex = sortedCards.findIndex(c => c.id === state.selectedCardId);
        if (activeIndex > -1) {
            const [activeCard] = sortedCards.splice(activeIndex, 1);
            sortedCards.unshift(activeCard);
        }
    }

    filteredCards.forEach(card => {
        // Find depth index of card in sorted stack
        const stackIndex = sortedCards.findIndex(c => c.id === card.id);

        const cardDiv = document.createElement("div");
        cardDiv.className = `bank-card ${card.cardType}`;
        if (card.id === state.selectedCardId) {
            cardDiv.classList.add("active-focus");
        }

        // Apply CSS variables for the 3D Stack depth translation
        cardDiv.style.setProperty("--index", stackIndex);
        
        // Formatted Card Number
        const numStr = card.cardNumber.replace(/(.{4})/g, '$1 ').trim();
        
        // Status overlay
        let statusOverlay = "";
        let actionBtnText = "Bloquear";
        let nextStatus = "BLOCKED";
        
        if (card.status === "BLOCKED") {
            statusOverlay = `
                <div class="card-status-overlay">
                    <i class="fa-solid fa-ban"></i>
                    <span>BLOQUEADA</span>
                </div>`;
            actionBtnText = "Activar";
            nextStatus = "ACTIVE";
        }

        const balanceLabel = card.cardType === "DEBIT" ? "Saldo Disp" : "Deuda Util";

        // Layout with details grid to avoid overlap and block action in header
        cardDiv.innerHTML = `
            ${statusOverlay}
            <div class="card-top">
                <span class="card-brand">${card.cardType === "CREDIT" ? 'CREDIT CARD' : 'DEBIT CARD'}</span>
                <div class="card-top-right">
                    <span class="card-type-tag">${card.cardType}</span>
                    <button class="card-btn-action" onclick="event.stopPropagation(); toggleCardStatus(${card.id}, '${nextStatus}')">
                        <i class="fa-solid ${card.status === 'BLOCKED' ? 'fa-lock-open' : 'fa-lock'}"></i> ${actionBtnText}
                    </button>
                </div>
            </div>
            <div class="card-chip"></div>
            <div class="card-number">${numStr}</div>
            <div class="card-details-row">
                <div class="card-detail-col">
                    <span class="card-detail-lbl">Titular</span>
                    <span class="card-detail-val" title="${card.cardHolder}">${card.cardHolder}</span>
                </div>
                <div class="card-detail-col">
                    <span class="card-detail-lbl">Vence</span>
                    <span class="card-detail-val font-mono">${card.expirationDate}</span>
                </div>
                <div class="card-detail-col text-right">
                    <span class="card-detail-lbl">${balanceLabel}</span>
                    <span class="card-detail-val">${formatCOP(card.balance)}</span>
                </div>
            </div>
        `;

        // Card select click listener
        cardDiv.addEventListener("click", () => {
            selectCard(card.id);
        });

        container.appendChild(cardDiv);
    });
}

function renderClientsTable() {
    const tbody = document.getElementById("clients-table-body");
    tbody.innerHTML = "";

    let filteredClients = [...state.clients];
    if (state.searchQuery) {
        filteredClients = filteredClients.filter(c => 
            c.name.toLowerCase().includes(state.searchQuery) ||
            c.documentNumber.toLowerCase().includes(state.searchQuery) ||
            c.email.toLowerCase().includes(state.searchQuery)
        );
    }

    if (filteredClients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">No se encontraron clientes que coincidan con la búsqueda.</td>
            </tr>`;
        return;
    }

    filteredClients.forEach(client => {
        const tr = document.createElement("tr");
        // Highlight active client row
        if (client.id === state.selectedClientId) {
            tr.style.background = "rgba(253, 203, 4, 0.05)";
            tr.style.borderColor = "var(--bancolombia-yellow)";
        }
        
        tr.innerHTML = `
            <td style="font-weight:600;">${client.name}</td>
            <td class="font-mono">${client.documentNumber}</td>
            <td>${client.email}</td>
            <td>${client.phone || 'N/A'}</td>
            <td>
                <button class="btn btn-outline" style="padding: 4px 8px; font-size: 11px;" onclick="loadClientCards(${client.id}, '${client.name}')">
                    Ver Tarjetas
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function populateSelects() {
    // Client Select inside Emit Card form
    const cardSelect = document.getElementById("card-client-select");
    cardSelect.innerHTML = '<option value="" disabled selected>Seleccione un cliente...</option>';
    
    state.clients.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.documentNumber})`;
        cardSelect.appendChild(opt);
    });

    // Cards Select inside Transaction form (Origin Cards list)
    const txSelect = document.getElementById("tx-card-select");
    txSelect.innerHTML = '<option value="" disabled selected>Seleccione una tarjeta...</option>';
    
    // Filter source cards by selected client if set
    let sourceCards = [...state.cards];
    if (state.selectedClientId) {
        sourceCards = sourceCards.filter(c => c.client.id === state.selectedClientId);
    }

    sourceCards.forEach(card => {
        const maskedNum = "**** **** **** " + card.cardNumber.slice(-4);
        const opt = document.createElement("option");
        opt.value = card.id;
        opt.textContent = `${card.client.name} - ${card.cardType} (${maskedNum}) - Saldo: ${formatCOP(card.balance)}`;
        
        if (card.status === "BLOCKED") {
            opt.disabled = true;
            opt.textContent += " [BLOQUEADA]";
        }
        
        txSelect.appendChild(opt);
    });

    // Destination Cards selector will populate dynamically on type select
}

function populateDestinationCards() {
    const destSelect = document.getElementById("tx-dest-card-select");
    destSelect.innerHTML = '<option value="" disabled selected>Seleccione tarjeta destino...</option>';
    
    const sourceCardIdVal = document.getElementById("tx-card-select").value;
    const sourceCardId = parseInt(sourceCardIdVal);

    state.cards.forEach(card => {
        // Exclude the source card from the transfer destinations list
        if (card.id === sourceCardId) return;

        const maskedNum = "**** **** **** " + card.cardNumber.slice(-4);
        const opt = document.createElement("option");
        opt.value = card.id;
        opt.textContent = `${card.client.name} - ${card.cardType} (${maskedNum}) - Titular: ${card.cardHolder}`;
        
        if (card.status === "BLOCKED") {
            opt.disabled = true;
            opt.textContent += " [BLOQUEADA]";
        }

        destSelect.appendChild(opt);
    });
}

function renderTransactions() {
    const container = document.getElementById("transactions-container");
    container.innerHTML = "";

    // Filter transactions: by card, or by client, or show recent
    let filteredTxs = [...state.transactions];
    if (state.selectedCardId) {
        filteredTxs = filteredTxs.filter(tx => tx.card.id === state.selectedCardId);
    } else if (state.selectedClientId) {
        filteredTxs = filteredTxs.filter(tx => tx.card.client.id === state.selectedClientId);
    }

    if (state.searchQuery) {
        filteredTxs = filteredTxs.filter(tx => 
            tx.description.toLowerCase().includes(state.searchQuery) ||
            tx.transactionType.toLowerCase().includes(state.searchQuery) ||
            (tx.card && tx.card.cardNumber.toLowerCase().includes(state.searchQuery))
        );
    }

    if (filteredTxs.length === 0) {
        container.innerHTML = `
            <div class="no-data-msg">
                <i class="fa-solid fa-receipt fa-2x mb-2 opacity-50"></i>
                <p>No se encontraron transacciones.</p>
            </div>`;
        return;
    }

    filteredTxs.forEach(tx => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "tx-item";
        
        const isDeposit = tx.transactionType === "DEPOSIT";
        const sign = isDeposit ? "+" : "-";
        const amtClass = isDeposit ? "deposit" : "payment";
        
        // Readable date
        const date = new Date(tx.timestamp);
        const formattedDate = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Icon logic
        let iconHtml = '<i class="fa-solid fa-arrow-down-long"></i>'; 
        if (tx.transactionType === "PAYMENT") {
            iconHtml = '<i class="fa-solid fa-cart-shopping"></i>';
        } else if (tx.transactionType === "WITHDRAWAL") {
            iconHtml = '<i class="fa-solid fa-money-bill-wave"></i>';
        }

        const maskedCard = "**** **** **** " + tx.card.cardNumber.slice(-4);

        itemDiv.innerHTML = `
            <div class="tx-info">
                <div class="tx-icon-box ${tx.status}">
                    ${tx.status === 'DECLINED' ? '<i class="fa-solid fa-circle-xmark"></i>' : iconHtml}
                </div>
                <div class="tx-details">
                    <div class="tx-title">${tx.description}</div>
                    <div class="tx-meta">${maskedCard} • ${formattedDate}</div>
                </div>
            </div>
            <div class="tx-amount-box">
                <div class="tx-amount-val ${amtClass}">${sign} ${formatCOP(tx.amount)}</div>
                <div class="tx-status-badge ${tx.status}">${tx.status === 'APPROVED' ? 'APROBADA' : 'RECHAZADA'}</div>
            </div>
        `;
        container.appendChild(itemDiv);
    });
}

function renderBugs() {
    const container = document.getElementById("bugs-container");
    container.innerHTML = "";

    state.bugs.forEach(bug => {
        const li = document.createElement("li");
        li.className = "bug-item";
        
        const priorityClass = `priority-${bug.priority.toLowerCase()}`;
        const statusClass = bug.status === 'SOLVED' ? 'status-solved' : 'status-open';
        const statusText = bug.status === 'SOLVED' ? 'Solucionado' : 'Abierto';
        const statusIcon = bug.status === 'SOLVED' ? 'fa-check-circle' : 'fa-circle-dot';

        li.innerHTML = `
            <div class="bug-meta">
                <span class="bug-id font-mono">${bug.id}</span>
                <span class="bug-priority ${priorityClass}">${bug.priority}</span>
            </div>
            <div class="bug-details">
                <p class="bug-summary">${bug.summary}</p>
                <span class="bug-status ${statusClass}"><i class="fa-solid ${statusIcon}"></i> ${statusText}</span>
            </div>
        `;
        container.appendChild(li);
    });
}

// --- Interactive Filters & Event Helpers ---

window.loadClientCards = function(clientId, clientName) {
    state.selectedClientId = clientId;
    state.selectedCardId = null; // reset card select on client toggle

    // Render filter banner in placeholder
    const bannerContainer = document.getElementById("client-filter-banner-placeholder");
    bannerContainer.innerHTML = `
        <div class="selected-client-banner">
            <span class="banner-text">Mostrando tarjetas de: <strong>${clientName}</strong></span>
            <button class="btn-clear-filter" onclick="clearClientFilter()">
                <i class="fa-solid fa-circle-xmark"></i> Quitar Filtro
            </button>
        </div>
    `;

    // Re-render components with client filter context
    updateMetricsUI();
    renderCards();
    renderClientsTable();
    populateSelects();
    renderTransactions();
    showToast(`Mostrando tarjetas de ${clientName}`, "info");
};

window.clearClientFilter = function() {
    state.selectedClientId = null;
    state.selectedCardId = null;
    
    document.getElementById("client-filter-banner-placeholder").innerHTML = "";

    loadDashboard();
    showToast("Filtro de cliente removido", "info");
};

window.selectCard = function(cardId) {
    if (state.selectedCardId === cardId) {
        state.selectedCardId = null; // click again to toggle deselect
        showToast("Mostrando transacciones de todas las tarjetas del cliente", "info");
    } else {
        state.selectedCardId = cardId;
        const card = state.cards.find(c => c.id === cardId);
        const maskedNum = "**** " + card.cardNumber.slice(-4);
        showToast(`Mostrando transacciones de la tarjeta ${maskedNum}`, "info");
    }
    renderCards();
    renderTransactions();
};

// --- Action Handlers & Forms ---

async function handleClientSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("client-name").value;
    const email = document.getElementById("client-email").value;
    const documentNumber = document.getElementById("client-doc").value;
    const phone = document.getElementById("client-phone").value;

    try {
        const response = await fetch(`${API_BASE}/clients`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, documentNumber, phone })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Error al crear cliente.");
        }

        showToast("Cliente registrado exitosamente en Core Java", "success");
        document.getElementById("form-client").reset();
        loadDashboard();

    } catch (error) {
        showToast(error.message, "error");
    }
}

async function handleCardSubmit(e) {
    e.preventDefault();
    const clientId = document.getElementById("card-client-select").value;
    const cardType = document.getElementById("card-type-select").value;
    const creditLimitVal = document.getElementById("card-credit-limit").value;
    
    const creditLimit = cardType === "CREDIT" ? parseFloat(creditLimitVal) : 0;

    try {
        const response = await fetch(`${API_BASE}/cards`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId: parseInt(clientId), cardType, creditLimit })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Error al emitir tarjeta.");
        }

        showToast("Tarjeta emitida y registrada exitosamente", "success");
        document.getElementById("form-card").reset();
        document.getElementById("group-credit-limit").style.display = "none";
        loadDashboard();

    } catch (error) {
        showToast(error.message, "error");
    }
}

async function handleTransactionSubmit(e) {
    e.preventDefault();
    const cardId = document.getElementById("tx-card-select").value;
    const transactionType = document.getElementById("tx-type-select").value;
    const amount = document.getElementById("tx-amount").value;
    const description = document.getElementById("tx-desc").value;

    try {
        // Branch logic: standard transaction vs card transfer
        if (transactionType === "TRANSFER") {
            const destCardId = document.getElementById("tx-dest-card-select").value;
            if (!destCardId) {
                throw new Error("Debe seleccionar una tarjeta de destino para realizar la transferencia.");
            }

            const response = await fetch(`${API_BASE}/transactions/transfer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceCardId: parseInt(cardId),
                    destinationCardId: parseInt(destCardId),
                    amount: parseFloat(amount),
                    description: description
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Transferencia rechazada por el Core.");
            }

            showToast("Transferencia procesada correctamente entre tarjetas", "success");
        } else {
            // Standard transaction
            const response = await fetch(`${API_BASE}/transactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cardId: parseInt(cardId),
                    amount: parseFloat(amount),
                    transactionType,
                    description
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "Transacción rechazada por el Core.");
            }

            showToast("Transacción procesada correctamente", "success");
        }

        document.getElementById("form-transaction").reset();
        document.getElementById("group-tx-destination").style.display = "none";
        loadDashboard();

    } catch (error) {
        showToast(error.message, "error");
        loadDashboard(); 
    }
}

async function toggleCardStatus(cardId, status) {
    try {
        const response = await fetch(`${API_BASE}/cards/${cardId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || "Error al actualizar estado.");
        }

        const msg = status === "BLOCKED" ? "Tarjeta bloqueada por seguridad" : "Tarjeta activada correctamente";
        showToast(msg, "success");
        loadDashboard();

    } catch (error) {
        showToast(error.message, "error");
    }
}

function handleBugSubmit(e) {
    e.preventDefault();
    const title = document.getElementById("bug-title").value;
    const priority = document.getElementById("bug-priority").value;
    const desc = document.getElementById("bug-desc").value;
    
    // Generate new mock bug
    const bugIdNum = state.bugs.length + 1;
    const bugId = `BC-${String(bugIdNum).padStart(3, '0')}`;

    const newBug = {
        id: bugId,
        summary: title,
        priority: priority,
        status: "OPEN",
        desc: desc
    };

    state.bugs.unshift(newBug);
    renderBugs();

    // Close Modal
    const bugModal = document.getElementById("bug-modal");
    bugModal.classList.remove("visible");
    setTimeout(() => bugModal.classList.add("hidden"), 300);
    
    document.getElementById("form-bug").reset();
    showToast(`Defecto ${bugId} registrado. Asignado a Soporte Técnico.`, "info");
}

// --- Helper Functions ---

function formatCOP(value) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0
    }).format(value);
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const msgEl = document.getElementById("toast-message");
    const iconEl = document.getElementById("toast-icon");
    
    msgEl.textContent = message;
    toast.className = `toast visible ${type}`;
    
    if (type === "success") {
        iconEl.innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--color-success)"></i>';
    } else if (type === "error") {
        iconEl.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color:var(--color-error)"></i>';
    } else if (type === "info") {
        iconEl.innerHTML = '<i class="fa-solid fa-circle-info" style="color:var(--color-info)"></i>';
    }
    
    setTimeout(() => {
        toast.classList.remove("visible");
    }, 4000);
}
