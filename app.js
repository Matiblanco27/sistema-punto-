// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyCZAL4MBchsXwzfzd0KXV9EFHdGyuKNOkA",
    authDomain: "sistema-punto-padel.firebaseapp.com",
    projectId: "sistema-punto-padel",
    storageBucket: "sistema-punto-padel.firebasestorage.app",
    messagingSenderId: "970161047740",
    appId: "1:970161047740:web:ef92e40ab60128f4f928b9",
    measurementId: "G-KGN7GHZQNT",
    databaseURL: "https://academia-padel-87d76-default-rtdb.firebaseio.com/"
};

let db;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    console.log("Firebase initialized");
} catch (e) {
    console.error("Firebase init error", e);
}

// --- State Management ---
const defaultStock = [
    { id: 'agua', name: 'Agua', qty: 20, price: 1000 },
    { id: 'aguachica', name: 'Agua Chica', qty: 20, price: 800 },
    { id: 'coca', name: 'Coca Cola', qty: 15, price: 1500 },
    { id: 'levite', name: 'Levite', qty: 15, price: 1200 },
    { id: 'heineken', name: 'Heineken', qty: 24, price: 2500 },
    { id: 'gatorade', name: 'Gatorade', qty: 10, price: 2000 },
    { id: 'alfajor', name: 'Alfajor', qty: 30, price: 1000 },
    { id: 'grips', name: 'Grips', qty: 10, price: 3000 },
    { id: 'pelotas', name: 'Pelotas (Tubo)', qty: 8, price: 8000 }
];

const timeSlots = ['12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
const courts = ['Cancha 1', 'Cancha 2'];
const COURT_PRICE = 50000;

let state = {
    reservations: JSON.parse(localStorage.getItem('padel_reservations')) || [],
    clients: JSON.parse(localStorage.getItem('padel_clients')) || [],
    stock: JSON.parse(localStorage.getItem('padel_stock')) || defaultStock,
    transactions: JSON.parse(localStorage.getItem('padel_transactions')) || [],
    ventas: JSON.parse(localStorage.getItem('padel_ventas')) || [],
    turnosFijos: JSON.parse(localStorage.getItem('padel_turnos_fijos')) || [],
    currentDate: new Date().toISOString().split('T')[0] // YYYY-MM-DD
};

if (localStorage.getItem('padel_stock')) {
    defaultStock.forEach(def => {
        if (!state.stock.find(s => s.id === def.id)) state.stock.push(def);
    });
}

function saveState() {
    localStorage.setItem('padel_reservations', JSON.stringify(state.reservations));
    localStorage.setItem('padel_clients', JSON.stringify(state.clients));
    localStorage.setItem('padel_stock', JSON.stringify(state.stock));
    localStorage.setItem('padel_transactions', JSON.stringify(state.transactions));
    localStorage.setItem('padel_ventas', JSON.stringify(state.ventas));
    localStorage.setItem('padel_turnos_fijos', JSON.stringify(state.turnosFijos));
    
    if (db) {
        const cleanState = JSON.parse(JSON.stringify({
            reservations: state.reservations,
            clients: state.clients,
            stock: state.stock,
            transactions: state.transactions,
            ventas: state.ventas,
            turnosFijos: state.turnosFijos
        }));
        db.ref("padelData/state").set(cleanState).catch(err => {
            console.error("Error saving to Firebase:", err);
            alert("Error al guardar en la nube: " + err.message);
        });
    }
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// --- DOM Elements ---
const loginScreen = document.getElementById('login-screen');
const appLayout = document.getElementById('app-layout');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');

const navLinks = document.querySelectorAll('.nav-links a');
const views = document.querySelectorAll('.view');
const dateInput = document.getElementById('current-date');

// Modals
const modalReservation = document.getElementById('modal-reservation');
const modalFinalize = document.getElementById('modal-finalize');
const modalClient = document.getElementById('modal-client');
const closeButtons = document.querySelectorAll('.close-modal');

// --- Initialization ---
function renderAll() {
    renderDashboard();
    renderClients();
    renderStock();
    renderCaja();
    if (document.getElementById('ventas-rapidas').classList.contains('active')) renderVentasRapidas();
    if (document.getElementById('reportes').classList.contains('active')) renderReportes();
}

function init() {
    // Basic Auth Check
    if (localStorage.getItem('padel_logged_in') === 'true') {
        showApp();
    }

    // Set today's date
    dateInput.value = state.currentDate;

    setupEventListeners();

    if (db) {
        // Escuchar cambios en tiempo real
        db.ref("padelData/state").on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                state.reservations = data.reservations || [];
                state.clients = data.clients || [];
                state.stock = data.stock || defaultStock;
                state.transactions = data.transactions || [];
                state.ventas = data.ventas || [];
                state.turnosFijos = data.turnosFijos || [];
                renderAll();
            } else {
                // Si la BD está vacía (primera vez), subimos lo que haya en memoria local
                saveState();
                renderAll();
            }
        }, (error) => {
            console.error("Firebase DB error:", error);
            alert("Error de conexión a la Nube. ¿Activaste Realtime Database en 'Modo Prueba'? Detalles: " + error.message);
        });
    } else {
        renderAll();
    }
}

function showApp() {
    const role = localStorage.getItem('padel_role') || 'admin';
    document.body.className = `role-${role}`;
    loginScreen.classList.remove('active');
    appLayout.classList.add('active');
}

// --- Event Listeners ---
function setupEventListeners() {
    // Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value.toLowerCase();
        const pass = document.getElementById('password').value;
        
        if (user === 'admin' && pass === 'puntopadel2026') {
            localStorage.setItem('padel_logged_in', 'true');
            localStorage.setItem('padel_role', 'admin');
            showApp();
        } else if (user === 'empleado' && pass === 'padel123') {
            localStorage.setItem('padel_logged_in', 'true');
            localStorage.setItem('padel_role', 'empleado');
            showApp();
        } else {
            alert('Usuario o contraseña incorrectos.');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('padel_logged_in');
        localStorage.removeItem('padel_role');
        appLayout.classList.remove('active');
        loginScreen.classList.add('active');
    });

    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('padel_logged_in');
            localStorage.removeItem('padel_role');
            appLayout.classList.remove('active');
            loginScreen.classList.add('active');
        });
    }

    // Hamburger Menu
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navLinksContainer = document.getElementById('nav-links');
    
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            navLinksContainer.classList.toggle('show');
        });
    }

    // Navigation
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Cerrar menú en móvil al clickear
            navLinksContainer.classList.remove('show');
            const targetId = link.getAttribute('data-target');
            
            document.querySelectorAll('.nav-links a').forEach(n => n.classList.remove('active'));
            link.classList.add('active');
            
            views.forEach(v => v.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            if (targetId === 'dashboard') renderDashboard();
            if (targetId === 'ventas-rapidas') renderVentasRapidas();
            if (targetId === 'clientes') renderClients();
            if (targetId === 'stock') renderStock();
            if (targetId === 'caja') renderCaja();
            if (targetId === 'reportes') renderReportes();
        });
    });

    // Dashboard Date Change
    dateInput.addEventListener('change', (e) => {
        state.currentDate = e.target.value;
        renderDashboard();
    });

    // Report Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
        });
    });

    // Modals Close
    const modalVrSale = document.getElementById('modal-vr-sale');
    const modalTurnosFijos = document.getElementById('modal-turnos-fijos');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modalReservation.classList.remove('active');
            modalFinalize.classList.remove('active');
            modalClient.classList.remove('active');
            modalVrSale.classList.remove('active');
            modalTurnosFijos.classList.remove('active');
            const modalConsumosRapidos = document.getElementById('modal-consumos-rapidos');
            if (modalConsumosRapidos) modalConsumosRapidos.classList.remove('active');
        });
    });

    // Turnos Fijos Modal
    document.getElementById('btn-turnos-fijos').addEventListener('click', () => {
        const courtSelect = document.getElementById('tf-court');
        const timeSelect = document.getElementById('tf-time');
        courtSelect.innerHTML = courts.map(c => `<option value="${c}">${c}</option>`).join('');
        timeSelect.innerHTML = timeSlots.map(t => `<option value="${t}">${t}</option>`).join('');
        renderTurnosFijos();
        modalTurnosFijos.classList.add('active');
    });

    document.getElementById('tf-form').addEventListener('submit', handleTurnoFijoSubmit);

    // New Reservation Button
    document.getElementById('new-reservation-btn').addEventListener('click', () => {
        openReservationModal();
    });

    // Reservation Form Submit
    document.getElementById('reservation-form').addEventListener('submit', handleReservationSubmit);

    // Client search autocomplete in Reservation
    const clientNameInput = document.getElementById('res-client-name');
    const suggestionsBox = document.getElementById('client-suggestions');
    const clientPhoneInput = document.getElementById('res-client-phone');

    clientNameInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        suggestionsBox.innerHTML = '';
        if (val.length < 2) {
            suggestionsBox.style.display = 'none';
            return;
        }
        
        const matches = state.clients.filter(c => c.name.toLowerCase().includes(val));
        if (matches.length > 0) {
            suggestionsBox.style.display = 'block';
            matches.forEach(match => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = `${match.name} (${match.phone})`;
                div.addEventListener('click', () => {
                    clientNameInput.value = match.name;
                    clientPhoneInput.value = match.phone;
                    suggestionsBox.style.display = 'none';
                });
                suggestionsBox.appendChild(div);
            });
        } else {
            suggestionsBox.style.display = 'none';
        }
    });

    // Finalize Button in Reservation Modal
    document.getElementById('btn-finalize-res').addEventListener('click', () => {
        const resId = document.getElementById('res-id').value;
        modalReservation.classList.remove('active');
        openFinalizeModal(resId);
    });

    // Confirm Finalize Payment
    document.getElementById('btn-confirm-finalize').addEventListener('click', handleFinalizeConfirm);

    document.getElementById('fin-delete-btn').addEventListener('click', () => {
        if(currentFinalizeResId && confirm('¿Estás seguro de que deseas eliminar (dar de baja) esta reserva?')) {
            state.reservations = state.reservations.filter(r => r.id !== currentFinalizeResId);
            saveState();
            document.getElementById('modal-finalize').classList.remove('active');
            renderDashboard();
        }
    });

    // Clients
    document.getElementById('new-client-btn').addEventListener('click', () => {
        document.getElementById('client-form').reset();
        document.getElementById('client-id').value = '';
        document.getElementById('client-modal-title').textContent = 'Nuevo Cliente';
        modalClient.classList.add('active');
    });

    document.getElementById('client-form').addEventListener('submit', handleClientSubmit);
    
    document.getElementById('search-client').addEventListener('input', (e) => {
        renderClients(e.target.value);
    });

    // VR Sale Form Submit
    document.getElementById('vr-sale-form').addEventListener('submit', handleVrSaleSubmit);
}

// --- Dashboard Render ---
function renderDashboard() {
    const header = document.getElementById('courts-header');
    const body = document.getElementById('reservations-grid');
    
    // Setup Header
    header.innerHTML = '<div class="time-label">Horario</div>';
    courts.forEach(court => {
        header.innerHTML += `<div>${court}</div>`;
    });

    // Setup Grid
    body.innerHTML = '';
    const dailyReservations = state.reservations.filter(r => r.date === state.currentDate);
    
    const currentDayOfWeek = new Date(state.currentDate + "T12:00:00").getDay().toString();

    timeSlots.forEach(time => {
        const row = document.createElement('div');
        row.className = 'grid-row';
        row.innerHTML = `<div class="time-label">${time}</div>`;

        courts.forEach(court => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            // Find reservation
            const res = dailyReservations.find(r => r.time === time && r.court === court);
            
            if (res) {
                if (res.status === 'reservado') {
                    cell.classList.add('status-reservado');
                    cell.innerHTML = `
                        <div class="res-info">
                            <strong>${res.clientName}</strong>
                        </div>
                        <div class="res-actions">
                            <button class="btn-res" title="Editar" onclick="event.stopPropagation(); openReservationModal('${res.id}')">✏️</button>
                            <button class="btn-res" title="Consumos" onclick="event.stopPropagation(); openQuickConsumptionModal('${res.id}')">🛒</button>
                            <button class="btn-res" title="Finalizar" onclick="event.stopPropagation(); openFinalizeModal('${res.id}')">✔️</button>
                            <button class="btn-res" style="color:var(--danger-color)" title="Cancelar" onclick="event.stopPropagation(); cancelReservation('${res.id}')">❌</button>
                        </div>
                    `;
                    cell.addEventListener('click', () => openReservationModal(res.id));
                } else if (res.status === 'pagado') {
                    cell.classList.add('status-pagado');
                    cell.innerHTML = `<strong>${res.clientName}</strong><span style="font-size:0.8rem;">PAGADO</span>`;
                    cell.addEventListener('click', () => openReservationModal(res.id));
                }
            } else {
                const fijo = state.turnosFijos.find(tf => tf.day === currentDayOfWeek && tf.court === court && tf.time === time);
                
                if (fijo) {
                    cell.classList.add('status-reservado');
                    cell.style.opacity = '0.8';
                    cell.innerHTML = `
                        <strong>${fijo.clientName}</strong>
                        <span style="font-size:0.8rem; margin-top:4px; text-transform:uppercase;">TURNO FIJO</span>
                    `;
                    cell.addEventListener('click', () => openReservationModal(null, court, time, fijo.clientName));
                } else {
                    cell.classList.add('status-libre');
                    cell.innerHTML = '<span>Libre</span>';
                    cell.addEventListener('click', () => openReservationModal(null, court, time));
                }
            }
            
            row.appendChild(cell);
        });
        body.appendChild(row);
    });
}

// --- Reservation Logic ---
function openReservationModal(resId = null, defaultCourt = courts[0], defaultTime = timeSlots[0], defaultClient = '') {
    const form = document.getElementById('reservation-form');
    form.reset();
    document.getElementById('client-suggestions').style.display = 'none';

    // Populate Selects
    const courtSelect = document.getElementById('res-court');
    const timeSelect = document.getElementById('res-time');
    
    courtSelect.innerHTML = courts.map(c => `<option value="${c}">${c}</option>`).join('');
    timeSelect.innerHTML = timeSlots.map(t => `<option value="${t}">${t} - ${incrementTime(t)}</option>`).join('');

    const title = document.getElementById('reservation-modal-title');
    const btnFinalize = document.getElementById('btn-finalize-res');
    
    if (resId) {
        // Edit existing
        const res = state.reservations.find(r => r.id === resId);
        title.textContent = 'Editar Reserva';
        document.getElementById('res-id').value = res.id;
        document.getElementById('res-client-name').value = res.clientName;
        document.getElementById('res-client-phone').value = res.clientPhone;
        document.getElementById('res-date').value = res.date;
        document.getElementById('res-court').value = res.court;
        document.getElementById('res-time').value = res.time;
        document.getElementById('res-notes').value = res.notes || '';
        
        if (res.status === 'reservado') {
            btnFinalize.classList.remove('hidden');
        } else {
            btnFinalize.classList.add('hidden'); // Already paid
        }
    } else {
        // New
        title.textContent = 'Nueva Reserva';
        document.getElementById('res-id').value = '';
        document.getElementById('res-date').value = state.currentDate;
        document.getElementById('res-court').value = defaultCourt;
        document.getElementById('res-time').value = defaultTime;
        document.getElementById('res-client-name').value = defaultClient;
        document.getElementById('res-client-phone').value = '';
        btnFinalize.classList.add('hidden');
    }

    modalReservation.classList.add('active');
}

function handleReservationSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('res-id').value;
    const clientName = document.getElementById('res-client-name').value;
    const clientPhone = document.getElementById('res-client-phone').value;
    const date = document.getElementById('res-date').value;
    const court = document.getElementById('res-court').value;
    const time = document.getElementById('res-time').value;
    const notes = document.getElementById('res-notes').value;

    // Check availability if it's new or time/court changed
    const existing = state.reservations.find(r => r.date === date && r.court === court && r.time === time);
    if (existing && existing.id !== id) {
        alert('Este horario ya está reservado.');
        return;
    }

    // Save/Update Client silently
    let client = state.clients.find(c => c.name === clientName);
    if (!client) {
        state.clients.push({ id: generateId(), name: clientName, phone: clientPhone, notes: '' });
    } else {
        client.phone = clientPhone; // update phone
    }

    if (id) {
        // Update
        const idx = state.reservations.findIndex(r => r.id === id);
        state.reservations[idx] = { ...state.reservations[idx], clientName, clientPhone, date, court, time, notes };
    } else {
        // Create
        state.reservations.push({
            id: generateId(), clientName, clientPhone, date, court, time, notes,
            status: 'reservado', price: COURT_PRICE
        });
    }

    saveState();
    modalReservation.classList.remove('active');
    renderDashboard();
    renderClients();
}

function incrementTime(timeStr) {
    let [h, m] = timeStr.split(':');
    h = parseInt(h) + 2;
    if (h === 24) h = 0;
    return `${h.toString().padStart(2, '0')}:${m}`;
}

// --- Finalize Logic ---
let currentFinalizeResId = null;
let currentConsumptions = {};

function openFinalizeModal(resId) {
    currentFinalizeResId = resId;
    const res = state.reservations.find(r => r.id === resId);
    
    document.getElementById('fin-court').textContent = res.court;
    document.getElementById('fin-time').textContent = res.time;
    
    // Initialize consumptions from existing or default 0
    currentConsumptions = {};
    state.stock.forEach(item => {
        currentConsumptions[item.id] = (res.consumptions && res.consumptions[item.id]) ? res.consumptions[item.id] : 0;
    });

    renderFinalizeConsumptions();
    modalFinalize.classList.add('active');
}

function renderFinalizeConsumptions() {
    const list = document.getElementById('consumptions-list');
    list.innerHTML = '';
    
    let totalConsumos = 0;
    const consumosDetalle = [];
    const res = state.reservations.find(r => r.id === currentFinalizeResId);
    let hasError = false;

    state.stock.forEach(item => {
        const qty = currentConsumptions[item.id] || 0;
        if (qty > 0) {
            totalConsumos += qty * item.price;
        }
        
        const div = document.createElement('div');
        div.className = 'consumption-item';
        div.innerHTML = `
            <div>
                <strong>${item.name}</strong><br>
                <small>$${item.price}</small>
            </div>
            <div class="consumption-controls">
                <button type="button" class="btn btn-icon btn-secondary" onclick="updateConsumption('${item.id}', -1)">-</button>
                <span style="font-weight:600; min-width:20px; text-align:center;">${qty}</span>
                <button type="button" class="btn btn-icon btn-secondary" onclick="updateConsumption('${item.id}', 1)" ${item.qty <= qty ? 'disabled' : ''}>+</button>
            </div>
        `;
        list.appendChild(div);
    });

    document.getElementById('fin-consumos-total').textContent = `$${totalConsumos.toLocaleString()}`;
    document.getElementById('fin-grand-total').textContent = `$${(COURT_PRICE + totalConsumos).toLocaleString()}`;
}

// Attach to window so onclick works
window.updateConsumption = function(itemId, change) {
    const stockItem = state.stock.find(i => i.id === itemId);
    if (!stockItem) return;

    let newQty = currentConsumptions[itemId] + change;
    if (newQty < 0) newQty = 0;
    if (newQty > stockItem.qty) newQty = stockItem.qty; // Can't consume more than stock

    currentConsumptions[itemId] = newQty;
    renderFinalizeConsumptions();
};

function handleFinalizeConfirm() {
    const res = state.reservations.find(r => r.id === currentFinalizeResId);
    const method = document.getElementById('fin-payment-method').value;
    
    let consumosTotal = 0;
    let itemsDescripton = [];

    // Deduct stock and calculate total
    for (const [itemId, qty] of Object.entries(currentConsumptions)) {
        if (qty > 0) {
            const stockItem = state.stock.find(i => i.id === itemId);
            stockItem.qty -= qty;
            consumosTotal += qty * stockItem.price;
            itemsDescripton.push(`${qty}x ${stockItem.name}`);
        }
    }

    const grandTotal = COURT_PRICE + consumosTotal;
    
    // Update Reservation
    res.status = 'pagado';
    res.consumptions = currentConsumptions;
    
    // Create Transaction
    let desc = `Reserva ${res.court} ${res.time}`;
    if (itemsDescripton.length > 0) desc += ` + ${itemsDescripton.join(', ')}`;
    
    state.transactions.unshift({
        id: generateId(),
        date: state.currentDate,
        time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        description: desc,
        method: method,
        amount: grandTotal
    });

    saveState();
    modalFinalize.classList.remove('active');
    renderDashboard();
    renderStock();
    renderCaja();
}

// --- Clients Logic ---
function renderClients(searchTerm = '') {
    const tbody = document.querySelector('#clients-table tbody');
    tbody.innerHTML = '';
    
    let filtered = state.clients;
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        filtered = state.clients.filter(c => c.name.toLowerCase().includes(lower) || c.phone.includes(lower));
    }

    filtered.forEach(client => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${client.name}</td>
            <td>${client.phone}</td>
            <td>${client.notes || '-'}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editClient('${client.id}')">Editar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.editClient = function(id) {
    const client = state.clients.find(c => c.id === id);
    document.getElementById('client-id').value = client.id;
    document.getElementById('client-name').value = client.name;
    document.getElementById('client-phone').value = client.phone;
    document.getElementById('client-notes').value = client.notes || '';
    document.getElementById('client-modal-title').textContent = 'Editar Cliente';
    modalClient.classList.add('active');
}

function handleClientSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('client-id').value;
    const name = document.getElementById('client-name').value;
    const phone = document.getElementById('client-phone').value;
    const notes = document.getElementById('client-notes').value;

    if (id) {
        const idx = state.clients.findIndex(c => c.id === id);
        state.clients[idx] = { ...state.clients[idx], name, phone, notes };
    } else {
        state.clients.push({ id: generateId(), name, phone, notes });
    }

    saveState();
    modalClient.classList.remove('active');
    renderClients(document.getElementById('search-client').value);
}

// --- Stock Logic ---
function renderStock() {
    const container = document.getElementById('stock-container');
    const alertsContainer = document.getElementById('stock-alerts');
    
    container.innerHTML = '';
    alertsContainer.innerHTML = '';

    state.stock.forEach(item => {
        // Alertas
        if (item.qty < 5) {
            alertsContainer.innerHTML += `<div class="alert">⚠️ Quedan ${item.qty} unidades de <strong>${item.name}</strong></div>`;
        }

        // Icons mapping for visual appeal
        let icon = getProductIcon(item.id);

        const role = localStorage.getItem('padel_role') || 'admin';
        const adminActions = role === 'admin' ? `
            <div class="stock-actions">
                <button class="btn btn-icon btn-danger" onclick="manualStockUpdate('${item.id}', -1)">-</button>
                <button class="btn btn-icon btn-success" onclick="manualStockUpdate('${item.id}', 1)">+</button>
            </div>
        ` : '';

        const card = document.createElement('div');
        card.className = 'stock-card glass-panel';
        card.innerHTML = `
            <div class="stock-icon">${icon}</div>
            <div class="stock-name">${item.name}</div>
            <div class="stock-qty">${item.qty}</div>
            ${adminActions}
            <div style="margin-top: 1rem; color: var(--text-muted); font-size: 0.9rem;">
                Precio Venta: $${item.price}
            </div>
        `;
        container.appendChild(card);
    });
}

window.manualStockUpdate = function(itemId, change) {
    const item = state.stock.find(i => i.id === itemId);
    if (item) {
        item.qty += change;
        if (item.qty < 0) item.qty = 0;
        saveState();
        renderStock();
    }
}

// --- Caja Logic ---
function renderCaja() {
    const todayTransactions = state.transactions.filter(t => t.date === state.currentDate);
    
    let total = 0;
    let byMethod = { efectivo: 0, transferencia: 0, mercadopago: 0 };
    let totalReservations = 0;
    let totalProducts = 0; // Simple estimation or loop through consumptions if we want exact

    // Recalculate based on transactions
    todayTransactions.forEach(t => {
        total += t.amount;
        if (byMethod[t.method] !== undefined) {
            byMethod[t.method] += t.amount;
        }
    });

    // Count reservations finished today
    const finishedReservations = state.reservations.filter(r => r.date === state.currentDate && r.status === 'pagado');
    totalReservations = finishedReservations.length;

    // Count products sold
    finishedReservations.forEach(r => {
        if (r.consumptions) {
            Object.values(r.consumptions).forEach(qty => {
                totalProducts += qty;
            });
        }
    });
    
    // Add VR sales products
    state.ventas.filter(v => v.date === state.currentDate).forEach(v => {
        totalProducts += v.qty;
    });

    // Update Stats
    document.getElementById('caja-total').textContent = `$${total.toLocaleString()}`;
    document.getElementById('caja-reservas').textContent = totalReservations;
    document.getElementById('caja-productos').textContent = totalProducts;

    document.getElementById('caja-efectivo').textContent = `$${byMethod.efectivo.toLocaleString()}`;
    document.getElementById('caja-transferencias').textContent = `$${byMethod.transferencia.toLocaleString()}`;
    document.getElementById('caja-mercadopago').textContent = `$${byMethod.mercadopago.toLocaleString()}`;

    // Update Table
    const tbody = document.querySelector('#transactions-table tbody');
    tbody.innerHTML = '';
    todayTransactions.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.time}</td>
            <td>${t.description}</td>
            <td style="text-transform: capitalize;">${t.method === 'mercadopago' ? 'Mercado Pago' : t.method}</td>
            <td style="font-weight: 600;">$${t.amount.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Reportes Logic ---
function renderReportes() {
    // Top Sold calculations
    const getTop = (arr) => {
        if (!arr || arr.length === 0) return '-';
        const counts = {};
        arr.forEach(item => counts[item] = (counts[item] || 0) + 1);
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    };

    const getTopProducts = (reservationsArr, ventasArr) => {
        const prodCounts = {};
        reservationsArr.forEach(r => {
            if (r.consumptions) {
                Object.entries(r.consumptions).forEach(([id, qty]) => {
                    if (qty > 0) {
                        const prod = state.stock.find(s => s.id === id);
                        if (prod) {
                            prodCounts[prod.name] = (prodCounts[prod.name] || 0) + qty;
                        }
                    }
                });
            }
        });
        if (ventasArr) {
            ventasArr.forEach(v => {
                prodCounts[v.productName] = (prodCounts[v.productName] || 0) + v.qty;
            });
        }
        return prodCounts;
    };

    const getTopProductString = (prodCounts) => {
        const sorted = Object.entries(prodCounts).sort((a,b) => b[1] - a[1]);
        return sorted.length > 0 ? sorted[0][0] : '-';
    };

    // Hoy
    const todayTrans = state.transactions.filter(t => t.date === state.currentDate);
    const todayRes = state.reservations.filter(r => r.date === state.currentDate && r.status === 'pagado');
    const todayAllRes = state.reservations.filter(r => r.date === state.currentDate);
    const todayVentas = state.ventas.filter(v => v.date === state.currentDate);
    
    let hoyFact = 0;
    let hoyMethod = { efectivo: 0, transferencia: 0, mercadopago: 0 };
    todayTrans.forEach(t => {
        hoyFact += t.amount;
        if (hoyMethod[t.method] !== undefined) hoyMethod[t.method] += t.amount;
    });
    
    const hoyProdCounts = getTopProducts(todayRes, todayVentas);
    const hoyProdTotal = Object.values(hoyProdCounts).reduce((a,b) => a+b, 0);

    document.getElementById('rep-hoy-reservas').textContent = todayAllRes.length;
    document.getElementById('rep-hoy-facturacion').textContent = `$${hoyFact.toLocaleString()}`;
    document.getElementById('rep-hoy-productos').textContent = hoyProdTotal;
    document.getElementById('rep-hoy-efectivo').textContent = `$${hoyMethod.efectivo.toLocaleString()}`;
    document.getElementById('rep-hoy-transferencias').textContent = `$${hoyMethod.transferencia.toLocaleString()}`;
    document.getElementById('rep-hoy-mercadopago').textContent = `$${hoyMethod.mercadopago.toLocaleString()}`;
    document.getElementById('rep-hoy-top-prod').textContent = getTopProductString(hoyProdCounts);
    document.getElementById('rep-hoy-top-hora').textContent = getTop(todayAllRes.map(r => r.time));

    // Este Mes
    const currentMonth = state.currentDate.substring(0, 7); // YYYY-MM
    const monthTrans = state.transactions.filter(t => t.date.startsWith(currentMonth));
    const monthRes = state.reservations.filter(r => r.date.startsWith(currentMonth) && r.status === 'pagado');
    const monthAllRes = state.reservations.filter(r => r.date.startsWith(currentMonth));
    const monthVentas = state.ventas.filter(v => v.date.startsWith(currentMonth));

    let mesFact = 0;
    monthTrans.forEach(t => mesFact += t.amount);
    
    const mesProdCounts = getTopProducts(monthRes, monthVentas);
    const mesProdTotal = Object.values(mesProdCounts).reduce((a,b) => a+b, 0);
    
    const daysWithTrans = new Set(monthTrans.map(t => t.date)).size || 1;
    const mesPromedio = Math.round(mesFact / daysWithTrans);

    document.getElementById('rep-mes-facturacion').textContent = `$${mesFact.toLocaleString()}`;
    document.getElementById('rep-mes-reservas').textContent = monthAllRes.length;
    document.getElementById('rep-mes-productos').textContent = mesProdTotal;
    document.getElementById('rep-mes-promedio').textContent = `$${mesPromedio.toLocaleString()}`;
    document.getElementById('rep-mes-top-prod').textContent = getTopProductString(mesProdCounts);
    document.getElementById('rep-mes-top-hora').textContent = getTop(monthAllRes.map(r => r.time));
    document.getElementById('rep-mes-top-cancha').textContent = getTop(monthAllRes.map(r => r.court));

    // Stock
    const tbodyStock = document.querySelector('#rep-stock-table tbody');
    tbodyStock.innerHTML = '';
    state.stock.forEach(item => {
        const isLow = item.qty < 5;
        const statusHTML = isLow ? `<span class="status-badge alert">Bajo Stock</span>` : `<span class="status-badge ok">Suficiente</span>`;
        tbodyStock.innerHTML += `<tr><td>${item.name}</td><td style="font-weight:600;">${item.qty}</td><td>${statusHTML}</td></tr>`;
    });

    const tbodyVendidos = document.querySelector('#rep-stock-vendidos-table tbody');
    tbodyVendidos.innerHTML = '';
    const sortedMesProd = Object.entries(mesProdCounts).sort((a,b) => b[1] - a[1]);
    sortedMesProd.forEach(([name, qty]) => {
        tbodyVendidos.innerHTML += `<tr><td>${name}</td><td style="font-weight:600;">${qty}</td></tr>`;
    });
}

// --- Ventas Rápidas Logic ---
function getProductIcon(id) {
    let icon = '📦';
    if (id === 'agua' || id === 'aguachica') icon = '💧';
    if (id === 'coca' || id === 'levite') icon = '🥤';
    if (id === 'gatorade') icon = '⚡';
    if (id === 'heineken') icon = '🍺';
    if (id === 'alfajor') icon = '🍫';
    if (id === 'grips') icon = '🏸';
    if (id === 'pelotas') icon = '🎾';
    return icon;
}

function renderVentasRapidas() {
    // Top Summary
    const todayVentas = state.ventas.filter(v => v.date === state.currentDate);
    let totalFacturado = 0;
    let totalArticulos = 0;
    const prodCounts = {};

    todayVentas.forEach(v => {
        totalFacturado += v.total;
        totalArticulos += v.qty;
        prodCounts[v.productName] = (prodCounts[v.productName] || 0) + v.qty;
    });

    const getTopProductString = (counts) => {
        const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
        return sorted.length > 0 ? sorted[0][0] : '-';
    };

    document.getElementById('vr-total-ventas').textContent = todayVentas.length;
    document.getElementById('vr-total-facturado').textContent = `$${totalFacturado.toLocaleString()}`;
    document.getElementById('vr-total-articulos').textContent = totalArticulos;
    document.getElementById('vr-top-producto').textContent = getTopProductString(prodCounts);

    // Alerts
    const alertsContainer = document.getElementById('vr-alerts');
    alertsContainer.innerHTML = '';
    state.stock.forEach(item => {
        if (item.qty < 5) {
            alertsContainer.innerHTML += `<div class="alert">⚠️ <strong>${item.name}</strong>: quedan ${item.qty} unidades.</div>`;
        }
    });

    // POS Grid
    const container = document.getElementById('vr-products-container');
    container.innerHTML = '';
    state.stock.forEach(item => {
        const icon = getProductIcon(item.id);
        const card = document.createElement('div');
        card.className = 'pos-card glass-panel';
        card.onclick = () => openVrSaleModal(item.id);
        card.innerHTML = `
            <div class="pos-icon">${icon}</div>
            <div class="pos-name">${item.name}</div>
            <div class="pos-price">$${item.price}</div>
            <div class="pos-stock">Stock: ${item.qty}</div>
        `;
        container.appendChild(card);
    });

    // History Table
    const tbody = document.querySelector('#vr-history-table tbody');
    tbody.innerHTML = '';
    todayVentas.slice().reverse().forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${v.time}</td>
            <td>${v.productName}</td>
            <td>${v.qty}</td>
            <td style="font-weight: 600;">$${v.total.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

function openVrSaleModal(productId) {
    const item = state.stock.find(s => s.id === productId);
    if (!item) return;

    document.getElementById('vr-product-id').value = item.id;
    document.getElementById('vr-modal-icon').textContent = getProductIcon(item.id);
    document.getElementById('vr-modal-product-name').textContent = item.name;
    document.getElementById('vr-modal-stock').textContent = item.qty;
    
    document.getElementById('vr-qty').value = 1;
    document.getElementById('vr-modal-total').textContent = `$${item.price.toLocaleString()}`;
    document.getElementById('vr-payment-method').value = 'efectivo';

    document.getElementById('modal-vr-sale').classList.add('active');
}

window.vrAdjustQty = function(change) {
    const qtyInput = document.getElementById('vr-qty');
    const productId = document.getElementById('vr-product-id').value;
    const item = state.stock.find(s => s.id === productId);
    
    let currentQty = parseInt(qtyInput.value) || 1;
    let newQty = currentQty + change;
    
    if (newQty < 1) newQty = 1;
    if (newQty > item.qty) {
        newQty = item.qty;
    }

    qtyInput.value = newQty;
    document.getElementById('vr-modal-total').textContent = `$${(newQty * item.price).toLocaleString()}`;
}

function handleVrSaleSubmit(e) {
    e.preventDefault();
    const productId = document.getElementById('vr-product-id').value;
    const qty = parseInt(document.getElementById('vr-qty').value);
    const method = document.getElementById('vr-payment-method').value;

    const item = state.stock.find(s => s.id === productId);
    if (!item || qty <= 0 || qty > item.qty) {
        alert('Cantidad inválida o stock insuficiente.');
        return;
    }

    const total = qty * item.price;
    const time = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    // Deduct stock
    item.qty -= qty;

    // Create Venta record
    state.ventas.push({
        id: generateId(),
        date: state.currentDate,
        time: time,
        productId: item.id,
        productName: item.name,
        qty: qty,
        total: total,
        method: method
    });

    // Create Transaction for Caja
    state.transactions.unshift({
        id: generateId(),
        date: state.currentDate,
        time: time,
        description: `Venta Rápida: ${qty}x ${item.name}`,
        method: method,
        amount: total
    });

    saveState();
    document.getElementById('modal-vr-sale').classList.remove('active');
    
    renderVentasRapidas();
}

// --- Turnos Fijos Logic ---
const dayNames = { "1": "Lunes", "2": "Martes", "3": "Miércoles", "4": "Jueves", "5": "Viernes", "6": "Sábado", "0": "Domingo" };

function renderTurnosFijos() {
    const tbody = document.querySelector('#tf-table tbody');
    tbody.innerHTML = '';
    state.turnosFijos.forEach(tf => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dayNames[tf.day]}</td>
            <td>${tf.court}</td>
            <td>${tf.time}</td>
            <td>${tf.clientName}</td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteTurnoFijo('${tf.id}')">Eliminar</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function handleTurnoFijoSubmit(e) {
    e.preventDefault();
    const clientName = document.getElementById('tf-client-name').value;
    const day = document.getElementById('tf-day').value;
    const court = document.getElementById('tf-court').value;
    const time = document.getElementById('tf-time').value;

    const exists = state.turnosFijos.find(tf => tf.day === day && tf.court === court && tf.time === time);
    if (exists) {
        alert('Ya existe un turno fijo en este día y horario para esta cancha.');
        return;
    }

    state.turnosFijos.push({
        id: generateId(),
        clientName, day, court, time
    });

    saveState();
    document.getElementById('tf-form').reset();
    renderTurnosFijos();
    renderDashboard();
}

window.deleteTurnoFijo = function(id) {
    if(confirm('¿Eliminar este turno fijo?')) {
        state.turnosFijos = state.turnosFijos.filter(tf => tf.id !== id);
        saveState();
        renderTurnosFijos();
        renderDashboard();
    }
}

window.cancelReservation = function(resId) {
    if(confirm('¿Estás seguro de que deseas eliminar (dar de baja) esta reserva?')) {
        const res = state.reservations.find(r => r.id === resId);
        if (res && res.consumptions) {
            for (const [itemId, qty] of Object.entries(res.consumptions)) {
                const stockItem = state.stock.find(s => s.id === itemId);
                if (stockItem) stockItem.qty += qty;
            }
        }
        state.reservations = state.reservations.filter(r => r.id !== resId);
        saveState();
        renderDashboard();
    }
};

let currentQCResId = null;

window.openQuickConsumptionModal = function(resId) {
    currentQCResId = resId;
    const res = state.reservations.find(r => r.id === resId);
    document.getElementById('qc-client-name').textContent = res.clientName;
    
    renderQCProductsGrid();
    document.getElementById('modal-consumos-rapidos').classList.add('active');
};

function renderQCProductsGrid() {
    const grid = document.getElementById('qc-products-grid');
    grid.innerHTML = '';
    
    const res = state.reservations.find(r => r.id === currentQCResId);
    if (!res.consumptions) res.consumptions = {};
    
    state.stock.forEach(item => {
        const addedQty = res.consumptions[item.id] || 0;
        
        const card = document.createElement('div');
        card.className = 'pos-card';
        card.innerHTML = `
            <div class="pos-icon">${item.icon || '📦'}</div>
            <div class="pos-name">${item.name}</div>
            <div class="pos-price">$${item.price}</div>
            <div class="pos-stock">Stock: ${item.qty}</div>
            <div style="font-size:0.85rem; color:var(--success-color); margin-top:0.5rem; font-weight:700;">Agregados: ${addedQty}</div>
        `;
        card.onclick = () => {
            if (item.qty <= 0) {
                alert('Sin stock'); return;
            }
            if (confirm(`¿Añadir 1x ${item.name} a la cuenta de ${res.clientName}?`)) {
                res.consumptions[item.id] = addedQty + 1;
                item.qty -= 1; // Descontar inmediatamente
                saveState();
                renderQCProductsGrid();
                renderStock();
            }
        };
        grid.appendChild(card);
    });
}

// Start app
document.addEventListener('DOMContentLoaded', init);
