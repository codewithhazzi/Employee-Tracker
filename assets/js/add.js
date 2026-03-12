import { getEmployeesFromDB, saveEmployeesToDB, generateId } from './firebase.js';
import { requireAuth, setupLogout } from './auth_guard.js';

// Utilities
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// add.js specific logic
let employees = [];
let dailyStats = {}; // To track specific adjustments for the selected date

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await requireAuth('../auth/login.html');
        setupLogout('../auth/login.html');
    } catch (e) {
        return;
    }
    
    // Initialize date to today
    document.getElementById('date').valueAsDate = new Date();
    
    // Show loading state
    document.getElementById('employeeTable').innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-slate-500">
        <svg class="animate-spin h-6 w-6 text-indigo-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading data from Firebase...</td></tr>`;

    employees = await getEmployeesFromDB();
    renderTable();
});

function renderTable() {
    const tbody = document.getElementById('employeeTable');
    
    if (employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-slate-500">No employees available. Add them in the Dashboard.</td></tr>`;
        return;
    }
    
    tbody.innerHTML = employees.map(emp => {
        // Init daily stats if not exists
        if (!dailyStats[emp.id]) {
            dailyStats[emp.id] = { headsets: 0, leads: 0 };
        }
        
        return `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="px-6 py-4 text-left font-medium text-slate-800">${escapeHTML(emp.name)}</td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-3">
                    <button onclick="updateStat('${emp.id}', 'headsets', -1)" class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 focus:outline-none flex items-center justify-center font-bold text-lg transition-colors shadow-sm">-</button>
                    <span id="headsets-${emp.id}" class="w-10 text-center font-bold text-lg text-indigo-600">${dailyStats[emp.id].headsets}</span>
                    <button onclick="updateStat('${emp.id}', 'headsets', 1)" class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 hover:bg-indigo-200 hover:text-indigo-800 focus:outline-none flex items-center justify-center font-bold text-lg transition-colors shadow-sm">+</button>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-3">
                    <button onclick="updateStat('${emp.id}', 'leads', -1)" class="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 focus:outline-none flex items-center justify-center font-bold text-lg transition-colors shadow-sm">-</button>
                    <span id="leads-${emp.id}" class="w-10 text-center font-bold text-lg text-emerald-600">${dailyStats[emp.id].leads}</span>
                    <button onclick="updateStat('${emp.id}', 'leads', 1)" class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:text-emerald-800 focus:outline-none flex items-center justify-center font-bold text-lg transition-colors shadow-sm">+</button>
                </div>
            </td>
        </tr>
    `}).join('');
}

window.updateStat = function(id, type, amount) {
    if (dailyStats[id][type] + amount < 0) return; // Prevent negative
    dailyStats[id][type] += amount;
    
    // Update DOM
    document.getElementById(`${type}-${id}`).textContent = dailyStats[id][type];
    
    // Quick pop animation
    const el = document.getElementById(`${type}-${id}`);
    el.classList.add('scale-125');
    setTimeout(() => el.classList.remove('scale-125'), 150);
}

window.saveData = async function() {
    const btn = document.querySelector('button[onclick="saveData()"]');
    if (!btn) return;
    const originalText = btn.innerHTML;
    
    btn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg> Saving...
    `;
    btn.classList.add('opacity-90', 'cursor-not-allowed');
    
    const dateStr = document.getElementById('date').value;
    if (!dateStr) {
        alert("Please select a valid date.");
        return;
    }

    // Commit to employees global state inside their specific date record
    let updated = false;
    employees.forEach(emp => {
        if (dailyStats[emp.id].headsets > 0 || dailyStats[emp.id].leads > 0) {
            
            if (!emp.records) emp.records = {};
            if (!emp.records[dateStr]) emp.records[dateStr] = { headsets: 0, leads: 0 };
            
            emp.records[dateStr].headsets += dailyStats[emp.id].headsets;
            emp.records[dateStr].leads += dailyStats[emp.id].leads;
            
            // Recompute global totals
            let tHs = 0, tLd = 0;
            for (const d in emp.records) {
                tHs += emp.records[d].headsets;
                tLd += emp.records[d].leads;
            }
            emp.headsets = tHs;
            emp.leads = tLd;
            
            updated = true;
        }
    });

    if (updated) {
        await saveEmployeesToDB(employees);
    }
    
    setTimeout(() => {
        // Reset daily stats after saving
        employees.forEach(emp => {
            dailyStats[emp.id] = { headsets: 0, leads: 0 };
        });
        renderTable();

        btn.innerHTML = `<span class="mr-2 text-lg">✅</span> Saved Successfully!`;
        btn.classList.remove('opacity-90', 'cursor-not-allowed', 'bg-emerald-600', 'hover:bg-emerald-700');
        btn.classList.add('bg-slate-800', 'hover:bg-slate-900');
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('bg-slate-800', 'hover:bg-slate-900');
            btn.classList.add('bg-emerald-600', 'hover:bg-emerald-700');
        }, 2000);
    }, 600);
}
