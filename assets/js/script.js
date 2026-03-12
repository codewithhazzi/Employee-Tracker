import { getEmployeesFromDB, saveSingleEmployeeToDB } from './firebase.js';
import { requireAuth, setupLogout } from './auth_guard.js';

let employees = [];
let currentViewData = [];
let editingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await requireAuth('auth/login.html');
        setupLogout('auth/login.html');
    } catch (e) {
        return;
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('fromDate').value = todayStr;
    document.getElementById('toDate').value = todayStr;
    
    // Show loading state
    document.getElementById('dashboardTable').innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-500">
        <svg class="animate-spin h-6 w-6 text-indigo-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading data from Firebase...</td></tr>`;
        
    employees = await getEmployeesFromDB();
    currentViewData = employees;
    
    initUI();
    
    // Auto-refresh when filters change
    document.getElementById('fromDate').addEventListener('change', window.loadRangeData);
    document.getElementById('toDate').addEventListener('change', window.loadRangeData);
    document.getElementById('employeeFilter').addEventListener('change', window.loadRangeData);
    
    // Update active nav state for dashboard
    const navLinks = document.querySelectorAll('aside nav a');
    if(navLinks.length > 0) {
        navLinks[0].classList.add('bg-indigo-600/20', 'text-indigo-300', 'border-indigo-500/20');
        navLinks[0].classList.remove('text-slate-400', 'hover:bg-slate-800/50', 'hover:text-slate-200', 'border-transparent');
    }
});

function initUI() {
    updateEmployeeFilter();
    updateStats();
    updateTable();
}

// Actions
window.loadRangeData = async function() {
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    const employeeFilter = document.getElementById('employeeFilter').value;
    
    // Refresh employees from Firebase
    employees = await getEmployeesFromDB();
    
    let filteredData = employees.map(emp => ({...emp, computedHeadsets: 0, computedLeads: 0}));
    if (employeeFilter !== 'all') {
        filteredData = filteredData.filter(emp => emp.id === employeeFilter);
    }
    
    // Compute stats for range
    filteredData.forEach(emp => {
        let hs = 0, ld = 0;
        for (const dateStr in emp.records) {
            if ((!fromDate || dateStr >= fromDate) && (!toDate || dateStr <= toDate)) {
                hs += emp.records[dateStr].headsets || 0;
                ld += emp.records[dateStr].leads || 0;
            }
        }
        emp.computedHeadsets = hs;
        emp.computedLeads = ld;
    });
    
    currentViewData = filteredData;
    
    // Briefly animate the table out and in
    const tbody = document.getElementById('dashboardTable');
    tbody.classList.add('opacity-50');
    
    setTimeout(() => {
        updateTable(filteredData);
        updateStats(filteredData);
        tbody.classList.remove('opacity-50');
    }, 200);
}

// Updaters
function updateEmployeeFilter() {
    const select = document.getElementById('employeeFilter');
    // Keep 'All Employees' option
    const currentValue = select.value;
    
    select.innerHTML = '<option value="all">All Employees</option>' + 
        employees.map(emp => `<option value="${emp.id}">${escapeHTML(emp.name)}</option>`).join('');
        
    // Try to restore previous value if it still exists
    if(select.querySelector(`option[value="${currentValue}"]`)) {
        select.value = currentValue;
    }
}

function updateStats(data = currentViewData) {
    document.getElementById('totalEmployees').textContent = employees.length; 
    
    // For dashboard, we use the computed stats that respect formulas
    const headsets = data.reduce((sum, emp) => sum + (emp.computedHeadsets !== undefined ? emp.computedHeadsets : emp.headsets), 0);
    const leads = data.reduce((sum, emp) => sum + (emp.computedLeads !== undefined ? emp.computedLeads : emp.leads), 0);
    
    // Animate numbers
    animateValue('totalHeadsets', parseInt(document.getElementById('totalHeadsets').textContent) || 0, headsets, 500);
    animateValue('totalLeads', parseInt(document.getElementById('totalLeads').textContent) || 0, leads, 500);
}

function updateTable(data = currentViewData) {
    const tbody = document.getElementById('dashboardTable');
    
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-slate-500">No data found</td></tr>`;
        return;
    }
    
    tbody.innerHTML = data.map(emp => {
        const hs = emp.computedHeadsets !== undefined ? emp.computedHeadsets : emp.headsets;
        const ld = emp.computedLeads !== undefined ? emp.computedLeads : emp.leads;
        
        if (emp.id === editingId) {
            return `
            <tr class="hover:bg-slate-50 transition-colors bg-indigo-50/50">
                <td class="px-6 py-4 font-medium text-slate-800">${escapeHTML(emp.name)}</td>
                <td class="px-6 py-4 text-center">
                    <input type="number" id="edit-hs-${emp.id}" value="${hs}" class="w-20 px-2 py-1 text-center border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                </td>
                <td class="px-6 py-4 text-center">
                    <input type="number" id="edit-ld-${emp.id}" value="${ld}" class="w-20 px-2 py-1 text-center border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                </td>
                <td class="px-6 py-4 text-center">
                    <button onclick="saveEdit('${emp.id}')" class="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs font-semibold mr-2 transition-colors shadow-sm">Save</button>
                    <button onclick="cancelEdit()" class="px-3 py-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 text-xs font-semibold transition-colors">Cancel</button>
                </td>
            </tr>
            `;
        }
        return `
        <tr class="hover:bg-slate-50 transition-colors group">
            <td class="px-6 py-4 font-medium text-slate-800">${escapeHTML(emp.name)}</td>
            <td class="px-6 py-4 text-center font-semibold text-slate-600">${hs}</td>
            <td class="px-6 py-4 text-center font-semibold text-slate-600">${ld}</td>
            <td class="px-6 py-4 text-center">
                <button onclick="editEmployee('${emp.id}')" class="opacity-0 group-hover:opacity-100 focus:opacity-100 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 hover:text-indigo-700 text-xs font-semibold transition-all border border-indigo-200/50">Edit</button>
            </td>
        </tr>
    `}).join('');
}

window.editEmployee = function(id) {
    editingId = id;
    updateTable(currentViewData);
}

window.cancelEdit = function() {
    editingId = null;
    updateTable(currentViewData);
}

window.saveEdit = async function(id) {
    const hsInput = document.getElementById(`edit-hs-${id}`);
    const ldInput = document.getElementById(`edit-ld-${id}`);
    
    const hs = parseInt(hsInput.value) || 0;
    const ld = parseInt(ldInput.value) || 0;
    
    // Prevent negative numbers
    if(hs < 0 || ld < 0) {
        alert("Values cannot be negative.");
        return;
    }

    const emp = employees.find(e => e.id === id);
    if (!emp) return;
    
    // Determine the date to save to. If only one day is selected in the scope, use that.
    // Else, use today, since it's an aggregate view.
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    const saveDate = (fromDate && fromDate === toDate) ? fromDate : new Date().toISOString().split('T')[0];
    
    const currHeadsets = emp.records[saveDate]?.headsets || 0;
    const currLeads = emp.records[saveDate]?.leads || 0;
    
    // Calculate the delta in the inputs vs what the computed total was currently showing
    const viewItem = currentViewData.find(e => e.id === id);
    const deltaHs = hs - (viewItem.computedHeadsets || 0);
    const deltaLd = ld - (viewItem.computedLeads || 0);
    
    if (!emp.records[saveDate]) {
        emp.records[saveDate] = { headsets: 0, leads: 0 };
    }
    
    emp.records[saveDate].headsets += deltaHs;
    emp.records[saveDate].leads += deltaLd;
    
    // Recompute total cache
    let tHs = 0, tLd = 0;
    for (const d in emp.records) {
        tHs += emp.records[d].headsets;
        tLd += emp.records[d].leads;
    }
    emp.headsets = tHs;
    emp.leads = tLd;

    // Use specific edit button visual state
    const saveBtn = document.querySelector(`button[onclick="saveEdit('${id}')"]`);
    if(saveBtn) saveBtn.innerHTML = "Saving...";

    await saveSingleEmployeeToDB(emp);
    
    editingId = null;
    window.loadRangeData();
}

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

function animateValue(id, start, end, duration) {
    if (start === end) return;
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

window.exportDashboardToCSV = function() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Employee,Headsets,Leads\r\n";
    
    currentViewData.forEach(emp => {
        const hs = emp.computedHeadsets !== undefined ? emp.computedHeadsets : emp.headsets;
        const ld = emp.computedLeads !== undefined ? emp.computedLeads : emp.leads;
        csvContent += `"${emp.name.replace(/"/g, '""')}",${hs},${ld}\r\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dashboard_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
