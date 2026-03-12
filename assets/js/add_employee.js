import { getEmployeesFromDB, saveSingleEmployeeToDB, generateId } from './firebase.js';
import { requireAuth, setupLogout } from './auth_guard.js';

let employees = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await requireAuth('../auth/login.html');
        setupLogout('../auth/login.html');
    } catch (e) {
        return;
    }
    
    document.getElementById('empList').innerHTML = `<li class="py-6 text-center text-slate-500">
        <svg class="animate-spin h-6 w-6 text-indigo-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading data from Firebase...</li>`;
        
    employees = await getEmployeesFromDB();
    updateEmployeeList();
});

window.addEmployeePage = async function() {
    const nameInput = document.getElementById('empName');
    const name = nameInput.value.trim();
    
    if (name) {
        const newEmp = {
            id: generateId(),
            name: name,
            headsets: 0,
            leads: 0,
            records: {}
        };
        employees.push(newEmp);
        
        updateEmployeeList(true); 
        await saveSingleEmployeeToDB(newEmp);
        nameInput.value = '';
    }
}

window.removeEmployeePage = function(id) {
    employees = employees.filter(emp => emp.id !== id);
    // Note: Would need a deleteDoc function inside firebase.js to remove from DB permanently
    updateEmployeeList();
}

function updateEmployeeList(isNew = false) {
    const list = document.getElementById('empList');
    document.getElementById('empCountBadge').textContent = `${employees.length} Active`;
    
    if (employees.length === 0) {
        list.innerHTML = `
        <div class="py-20 px-6 text-center text-slate-500 bg-white/50 rounded-b-3xl">
            <h3 class="text-xl font-black text-slate-400">No team members yet</h3>
            <p class="text-sm font-medium mt-2">Add your first employee to start tracking.</p>
        </div>
        `;
        return;
    }
    
    list.innerHTML = employees.map((emp, index) => {
        const isLatest = isNew && index === employees.length - 1;
        const animClass = isLatest ? 'animate-fade-in-up bg-indigo-50/30' : 'bg-white hover:bg-slate-50';
        
        return `<li class="group flex items-center justify-between px-6 sm:px-8 py-5 transition-all duration-300 ${animClass} border-b border-slate-100 last:border-0 relative">
            <div class="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            <div class="flex items-center min-w-0 gap-5 relative z-10">
                <div class="h-12 w-12 flex-shrink-0 outline outline-2 outline-offset-2 outline-transparent group-hover:outline-indigo-200 transition-all rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black uppercase text-lg shadow-lg shadow-indigo-500/30">
                    ${emp.name.charAt(0)}
                </div>
                <div class="flex flex-col">
                    <p class="text-lg font-black text-slate-800 truncate group-hover:text-indigo-600 transition-colors">${escapeHTML(emp.name)}</p>
                </div>
            </div>
            <div class="flex-shrink-0 ml-4 opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 focus-within:opacity-100 focus-within:scale-100 relative z-10">
                <button 
                    onclick="removeEmployeePage('${emp.id}')"
                    class="p-3 text-rose-400 hover:text-white hover:bg-rose-500 rounded-2xl transition-all focus:outline-none focus:ring-4 focus:ring-rose-500/30 bg-white border border-rose-100 shadow-sm hover:shadow-lg hover:shadow-rose-500/30 hover:-translate-y-0.5"
                    title="Remove Member"
                >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </li>`;
    }).join('');
}

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

document.getElementById('add-employee-form').addEventListener('submit', (e) => {
    e.preventDefault();
    window.addEmployeePage();
});
