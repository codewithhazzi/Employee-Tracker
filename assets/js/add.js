import { getEmployeesFromDB, saveEmployeesToDB } from './firebase.js';
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

let employees = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await requireAuth('../auth/login.html');
        setupLogout('../auth/login.html');
    } catch (e) {
        return;
    }

    // Initialize date to today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('date').value = `${yyyy}-${mm}-${dd}`;

    // Show loading state
    document.getElementById('employeeTable').innerHTML = `<tr><td colspan="3" class="px-6 py-12 text-center text-slate-500">
        <svg class="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="font-bold tracking-tight text-slate-400">Loading data...</p>
        </td></tr>`;

    employees = await getEmployeesFromDB();
    renderTable();
});

function renderTable() {
    const tbody = document.getElementById('employeeTable');

    if (employees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-12 text-center">
            <p class="text-slate-400 font-bold">No employees yet. Add them from the Employees page.</p>
        </td></tr>`;
        return;
    }

    tbody.innerHTML = employees.map(emp => {
        return `
        <tr class="hover:bg-slate-50/80 transition-all group bg-transparent">
            <td class="px-6 py-5 font-bold text-slate-800 flex items-center gap-3">
                <div class="w-10 h-10 bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-black uppercase shrink-0 shadow-sm">
                    ${escapeHTML(emp.name).charAt(0)}
                </div>
                <span>${escapeHTML(emp.name)}</span>
            </td>
            <td class="px-6 py-5 text-center">
                <div class="inline-flex items-center gap-2">
                    <button type="button" onclick="stepValue('hs-${emp.id}', -1)" class="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-lg transition-colors shadow-sm">−</button>
                    <input type="number" id="hs-${emp.id}" value="0" min="0"
                        class="w-16 py-2 text-center border-2 border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-black text-xl text-slate-700 transition-all">
                    <button type="button" onclick="stepValue('hs-${emp.id}', 1)" class="w-9 h-9 flex items-center justify-center bg-indigo-100 hover:bg-indigo-200 text-indigo-600 font-black text-lg transition-colors shadow-sm">+</button>
                </div>
            </td>
            <td class="px-6 py-5 text-center">
                <div class="inline-flex items-center gap-2">
                    <button type="button" onclick="stepValue('ld-${emp.id}', -1)" class="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-lg transition-colors shadow-sm">−</button>
                    <input type="number" id="ld-${emp.id}" value="0" min="0"
                        class="w-16 py-2 text-center border-2 border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 font-black text-xl text-slate-700 transition-all">
                    <button type="button" onclick="stepValue('ld-${emp.id}', 1)" class="w-9 h-9 flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 text-emerald-600 font-black text-lg transition-colors shadow-sm">+</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

window.stepValue = function(inputId, delta) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const newVal = Math.max(0, (parseInt(input.value) || 0) + delta);
    input.value = newVal;
    // Quick pop animation
    input.classList.add('scale-110');
    setTimeout(() => input.classList.remove('scale-110'), 120);
}

window.saveData = async function() {
    const btn = document.querySelector('button[onclick="saveData()"]');
    if (!btn) return;
    const originalHTML = btn.innerHTML;

    const dateStr = document.getElementById('date').value;
    if (!dateStr) {
        alert("Please select a valid date.");
        return;
    }

    btn.innerHTML = `<svg class="animate-spin h-5 w-5 text-white inline-block mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...`;
    btn.disabled = true;

    // ADD new values on top of existing records for the selected date
    employees.forEach(emp => {
        const newHs = parseInt(document.getElementById(`hs-${emp.id}`)?.value) || 0;
        const newLd = parseInt(document.getElementById(`ld-${emp.id}`)?.value) || 0;

        if (newHs === 0 && newLd === 0) return;

        if (!emp.records) emp.records = {};
        if (!emp.records[dateStr]) emp.records[dateStr] = { headsets: 0, leads: 0 };

        emp.records[dateStr].headsets += newHs;
        emp.records[dateStr].leads += newLd;

        let tHs = 0, tLd = 0;
        for (const d in emp.records) {
            tHs += emp.records[d].headsets || 0;
            tLd += emp.records[d].leads || 0;
        }
        emp.headsets = tHs;
        emp.leads = tLd;
    });

    try {
        await saveEmployeesToDB(employees);

        btn.innerHTML = `<svg class="w-5 h-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Saved!`;
        btn.classList.remove('bg-emerald-500', 'hover:bg-emerald-600');
        btn.classList.add('bg-slate-800');

        // Re-render to show updated amber "editing" indicators
        renderTable();

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('bg-slate-800');
            btn.classList.add('bg-emerald-500', 'hover:bg-emerald-600');
            btn.disabled = false;
        }, 2000);
    } catch (e) {
        console.error('Save failed:', e);
        btn.innerHTML = `<svg class="w-5 h-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg> Save Failed`;
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }, 2000);
    }
}
