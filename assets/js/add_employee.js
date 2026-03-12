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
        <div class="py-20 px-6 text-center text-slate-500 bg-slate-50/50">
            <h3 class="text-lg font-semibold text-slate-700">No team members yet</h3>
        </div>
        `;
        return;
    }
    
    list.innerHTML = employees.map((emp, index) => {
        const isLatest = isNew && index === employees.length - 1;
        const animClass = isLatest ? 'animate-fade-in-up bg-indigo-50/30' : 'bg-white hover:bg-slate-50';
        
        return `
        <li class="group flex items-center justify-between px-6 sm:px-8 py-4 transition-all duration-200 ${animClass}">
            <div class="flex items-center min-w-0 gap-4">
                <div class="h-11 w-11 flex-shrink-0 outline outline-2 outline-offset-2 outline-transparent group-hover:outline-indigo-100 transition-all rounded-full bg-gradient-to-br from-indigo-100 via-indigo-50 to-purple-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200/60 shadow-inner">
                    ${emp.name.charAt(0).toUpperCase()}
                </div>
                <div class="flex flex-col">
                    <p class="text-sm font-semibold text-slate-800 truncate">${escapeHTML(emp.name)}</p>
                </div>
            </div>
            <div class="flex-shrink-0 ml-4 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 focus-within:opacity-100 focus-within:scale-100">
                <button 
                    onclick="removeEmployeePage('${emp.id}')"
                    class="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 bg-white border border-slate-200 hover:border-red-200 shadow-sm hover:shadow"
                    title="Remove Member"
                >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </li>
    `}).join('');
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
