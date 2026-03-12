import { getEmployeesFromDB } from './firebase.js';
import { requireAuth, setupLogout } from './auth_guard.js';

let currentReportData = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await requireAuth('../auth/login.html');
        setupLogout('../auth/login.html');
    } catch (e) {
        return;
    }
    
    document.getElementById('timeRange').addEventListener('change', window.generateReports);
    await window.generateReports();
});

window.generateReports = async function() {
    // Show quick loader
    document.getElementById('topPerformersTable').innerHTML = `<tr><td colspan="4" class="px-6 py-6 text-center text-slate-500">
        <svg class="animate-spin h-6 w-6 text-indigo-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Fetching Analytics...</td></tr>`;

    const employees = await getEmployeesFromDB();
    const days = document.getElementById('timeRange').value;
    
    // Calculate cutoff date
    let cutoffDate = null;
    if (days !== 'all') {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(days));
        cutoffDate = d.toISOString().split('T')[0];
    }
    
    let totalHs = 0;
    let totalLd = 0;
    let activeMembersCount = 0;
    
    // Aggregate data based on timeframe
    currentReportData = employees.map(emp => {
        let hs = 0;
        let ld = 0;
        
        if (emp.records) {
            for (const dateStr in emp.records) {
                if (!cutoffDate || dateStr >= cutoffDate) {
                    hs += emp.records[dateStr].headsets || 0;
                    ld += emp.records[dateStr].leads || 0;
                }
            }
        }
        
        if (hs > 0 || ld > 0) activeMembersCount++;
        
        totalHs += hs;
        totalLd += ld;
        
        return {
            id: emp.id,
            name: emp.name,
            headsets: hs,
            leads: ld,
            conversion: hs > 0 ? ((ld / hs) * 100) : 0
        };
    });

    // Update Top Overview Stats
    animateValue('reportActiveMembers', parseInt(document.getElementById('reportActiveMembers').textContent) || 0, activeMembersCount, 500);
    animateValue('reportTotalHeadsets', parseInt(document.getElementById('reportTotalHeadsets').textContent) || 0, totalHs, 500);
    animateValue('reportTotalLeads', parseInt(document.getElementById('reportTotalLeads').textContent) || 0, totalLd, 500);
    
    const overallConv = totalHs > 0 ? Math.round((totalLd / totalHs) * 100) : 0;
    document.getElementById('reportConversionRate').textContent = overallConv + '%';

    // Update Top Performers Table
    const topPerformers = [...currentReportData].sort((a, b) => b.leads - a.leads).slice(0, 5); // limit to top 5
    const tbody = document.getElementById('topPerformersTable');
    
    if (topPerformers.length === 0 || topPerformers[0].leads === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-6 text-center text-slate-500">No performance data found for this period.</td></tr>`;
    } else {
        tbody.innerHTML = topPerformers.map((emp, index) => {
            if(emp.leads === 0 && emp.headsets === 0) return '';
            
            let badgeColor = 'bg-slate-100 text-slate-600';
            if (index === 0) badgeColor = 'bg-amber-100 text-amber-700 font-bold';
            if (index === 1) badgeColor = 'bg-slate-200 text-slate-700 font-bold';
            if (index === 2) badgeColor = 'bg-orange-100 text-orange-700 font-bold';
            
            return `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4">
                    <span class="inline-flex items-center justify-center w-8 h-8 rounded-full ${badgeColor} text-sm">
                        #${index + 1}
                    </span>
                </td>
                <td class="px-6 py-4 font-medium text-slate-800">${escapeHTML(emp.name)}</td>
                <td class="px-6 py-4 text-center font-semibold text-slate-600">${emp.headsets}</td>
                <td class="px-6 py-4 text-center font-bold text-emerald-600">${emp.leads}</td>
            </tr>
            `;
        }).join('');
    }

    // Update Insights
    const mostHs = [...currentReportData].sort((a, b) => b.headsets - a.headsets)[0];
    const mostLd = [...currentReportData].sort((a, b) => b.leads - a.leads)[0];
    const bestConv = [...currentReportData].filter(e => e.headsets >= 5).sort((a, b) => b.conversion - a.conversion)[0]; // filter out 1 lead / 1 headset = 100% flukes
    
    document.getElementById('mostHeadsetsEmp').textContent = (mostHs && mostHs.headsets > 0) ? `${mostHs.name} (${mostHs.headsets})` : '-';
    document.getElementById('mostLeadsEmp').textContent = (mostLd && mostLd.leads > 0) ? `${mostLd.name} (${mostLd.leads})` : '-';
    document.getElementById('bestConversionEmp').textContent = (bestConv && bestConv.conversion > 0) ? `${bestConv.name} (${Math.round(bestConv.conversion)}%)` : '-';
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

window.exportReportsToCSV = function() {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Rank,Employee,Headsets,Leads,Conversion Rate\r\n";
    
    // Sort by leads for rank
    const sortedData = [...currentReportData].sort((a, b) => b.leads - a.leads);
    
    sortedData.forEach((emp, index) => {
        if(emp.leads === 0 && emp.headsets === 0) return;
        csvContent += `${index + 1},"${emp.name.replace(/"/g, '""')}",${emp.headsets},${emp.leads},${Math.round(emp.conversion)}%\r\n`;
    });
    
    const timeRange = document.getElementById('timeRange').value;
    const filename = timeRange === 'all' ? 'reports_all_time.csv' : `reports_last_${timeRange}_days.csv`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
