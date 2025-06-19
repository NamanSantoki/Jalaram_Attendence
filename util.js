// util.js

// Firebase Imports (ensure these are present if not already)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import { getDatabase, ref, set, get, remove } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-database.js";

// Your Firebase Configuration (copy from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyBpWA8BuNZ8-Yh6eBtyCMsu9GkQO7v0kn4", // YOUR API KEY
  authDomain: "jalaram-7bbac.firebaseapp.com",
  projectId: "jalaram-7bbac",
  storageBucket: "jalaram-7bbac.firebasestorage.app",
  messagingSenderId: "865915981684",
  appId: "1:865915981684:web:2d7156ee1ee725773f6621"
};

// Initialize Firebase App and Database globally for your project
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Make db globally accessible if your files are not using modules properly
// window.db = db; // Consider if necessary based on your import/export strategy

// --- Existing util.js functions continue below ---
function formatHoursDisplay(totalHours) {
  // ... rest of your util.js ...
}



function formatHoursDisplay(totalHours) {
  const days = Math.floor(Math.abs(totalHours) / 12);
  const remainingHours = totalHours - (days * 12 * Math.sign(totalHours));
  const sign = totalHours >= 0 ? '' : '-';
  if (days === 0) {
    return totalHours === 0 ? '0h' : `${sign}${Math.abs(totalHours).toFixed(1)}h`;
  }
  return `${sign}${days}d ${Math.abs(remainingHours).toFixed(1)}h`;
}

function calculateDaysAndHours(totalHours) {
  const fullDays = Math.floor(totalHours / 12);
  const remainingHours = totalHours % 12;
  return { daysAdjustment: fullDays, remainingHours: remainingHours };
}

function generateReport() {
  const month = document.getElementById('reportMonth').value;
  if (!month) return alert('Please select a month.');

  const employees = JSON.parse(localStorage.getItem('employees')) || [];
  const attendance = JSON.parse(localStorage.getItem('attendance')) || {};
  const shifts = JSON.parse(localStorage.getItem('shifts')) || {};
  const advances = JSON.parse(localStorage.getItem('advances')) || {};
  const loans = JSON.parse(localStorage.getItem('loans')) || {};
  const extraHours = JSON.parse(localStorage.getItem('extraHours')) || {};
  const lateHours = JSON.parse(localStorage.getItem('lateHours')) || {};

  // Load hours carried forward *to* this month from previous month
  const carriedHoursFromPreviousMonth = JSON.parse(localStorage.getItem(`carriedHours_${month}`)) || [];
  // Load the last saved decision for this specific month (for checkbox state)
  const monthlyDecisionData = JSON.parse(localStorage.getItem(`monthlyDecision_${month}`)) || [];

  const tbody = document.getElementById('reportTable').querySelector('tbody');
  tbody.innerHTML = '';

  const [year, monthNum] = month.split('-');
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  let totalPresent = 0, totalAbsent = 0;

  employees.forEach((emp, index) => {
    if (!emp || !emp.name) return;

    let presentDays = 0, absentDays = 0, morningShifts = 0, nightShifts = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${monthNum.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isPresent = attendance[date]?.[emp.name] || false;
      const shift = shifts[date]?.[emp.name] || 'morning';
      if (isPresent) {
        presentDays++;
        totalPresent++;
        if (shift === 'morning') morningShifts++;
        else nightShifts++;
      } else {
        absentDays++;
        totalAbsent++;
      }
    }

    const payableBasic = emp.basic || 0;
    const payableHra = emp.hra || 0;
    const payableConveyance = emp.conveyance || 0;
    const payableOthers = emp.others || 0;
    const totalSalary = emp.totalSalary || (payableBasic + payableHra + payableConveyance + payableOthers);
    const dailySalary = totalSalary / daysInMonth;

    const loanList = loans[emp.name] || [];
    let totalLoan = 0, totalRepaid = 0, totalRemaining = 0, totalLoanEMI = 0;
    loanList.forEach(l => {
      if (l.amount) totalLoan += l.amount;
      if (l.amount && l.remaining !== undefined) totalRepaid += (l.amount - l.remaining);
      if (l.remaining) totalRemaining += l.remaining;
      if (l.emi && l.remaining > 0) {
        totalLoanEMI += l.emi;
        l.remaining = Math.max(0, l.remaining - l.emi);
      }
    });

    const advanceList = advances[emp.name] || [];
    const totalAdvance = advanceList.reduce((sum, adv) => sum + (adv.amount || 0), 0);

    let totalExtraHours = 0, totalLateHours = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${monthNum.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      totalExtraHours += extraHours[date]?.[emp.name] || 0;
      totalLateHours += lateHours[date]?.[emp.name] || 0;
    }
    let totalHours = totalExtraHours - totalLateHours;

    // Add hours carried forward from the previous month *to* this month
    const carriedFromPrev = carriedHoursFromPreviousMonth.find(e => e.empName === emp.name);
    if (carriedFromPrev) {
        totalHours += carriedFromPrev.hours;
    }

    let { daysAdjustment, remainingHours } = calculateDaysAndHours(totalHours);
    
    // Adjust remainingHours to 0 if it equals 12 to avoid double counting
    if (remainingHours === 12) {
      daysAdjustment += 1;
      remainingHours = 0;
    }

    const daysDisplay = daysAdjustment !== 0 ? `${daysAdjustment}d` : '0d';
    const hoursDisplay = remainingHours !== 0 ? `${remainingHours.toFixed(1)}h` : '0h';
    const hourlyRate = dailySalary / 12;

    // Calculate salary based on present days
    const presentDaysSalary = presentDays * dailySalary;
    const daysAdjustmentAmount = daysAdjustment * dailySalary;
    const initialSalary = presentDaysSalary - totalLoanEMI - totalAdvance + daysAdjustmentAmount;

    // Determine initial state of the checkbox based on the last saved decision for this month
    const savedDecisionForCurrentMonth = monthlyDecisionData.find(d => d.empName === emp.name);
    // Default to true (checked) if no prior decision, assuming hours are included by default
    // Or default to false if hours are only included explicitly. Let's make it true for now as a default if no decision.
    const initialIncludeHours = savedDecisionForCurrentMonth ? savedDecisionForCurrentMonth.included : true; 

    // Calculate netSalary based on whether hours are initially included
    const netSalary = initialSalary + (remainingHours * hourlyRate * (initialIncludeHours ? 1 : 0));

    const tr = document.createElement('tr');
    tr.className = index % 2 === 0 ? 'even-row' : 'odd-row';
    tr.innerHTML = `
      <td>${emp.name}</td>
      <td>₹${payableBasic}</td>
      <td>₹${payableHra}</td>
      <td>₹${payableConveyance}</td>
      <td>₹${payableOthers}</td>
      <td>₹${totalSalary}</td>
      <td>${presentDays}</td>
      <td>${absentDays}</td>
      <td>₹${totalAdvance}</td>
      <td>₹${totalLoan.toFixed(2)}</td>
      <td>₹${totalRepaid.toFixed(2)}</td>
      <td>₹${totalRemaining.toFixed(2)}</td>
      <td>₹${totalLoanEMI}</td>
      <td>${daysDisplay}</td>
      <td class="checkbox-cell">
          <input type="checkbox" data-emp="${emp.name}" data-type="hours" onchange="updateNetSalary(this)" ${initialIncludeHours ? 'checked' : ''}> Include
          ${hoursDisplay}
      </td>
      <td class="net-salary" data-emp="${emp.name}">₹${netSalary.toFixed(2)}</td>
      <td><button class="btn btn-info btn-sm" onclick="generateSalarySlip('${emp.name}', '${month}')">Generate Slip</button></td>`;
    tbody.appendChild(tr);

    tr.dataset.initialSalary = initialSalary.toFixed(2);
    tr.dataset.dailySalary = dailySalary;
    tr.dataset.hourlyRate = hourlyRate;
    tr.dataset.daysAdjustment = daysAdjustment;
    tr.dataset.remainingHours = remainingHours;
    tr.dataset.currentAdjustment = daysAdjustmentAmount;

    localStorage.setItem('loans', JSON.stringify(loans));
    document.getElementById('monthInfo').textContent = `Total Present: ${totalPresent}, Total Absent: ${totalAbsent}`;
  });
}

function updateNetSalary(checkbox) {
  const tr = checkbox.closest('tr');
  const empName = checkbox.getAttribute('data-emp');
  const initialSalary = parseFloat(tr.dataset.initialSalary);
  const hourlyRate = parseFloat(tr.dataset.hourlyRate);
  const remainingHours = parseFloat(tr.dataset.remainingHours);

  let newAdjustment = 0;
  const hoursIncluded = checkbox.checked; // True if the checkbox is checked

  if (hoursIncluded && remainingHours !== 0) {
    newAdjustment += remainingHours * hourlyRate;
  }

  const netSalary = (initialSalary + newAdjustment).toFixed(2);
  const netSalaryCell = tr.querySelector('.net-salary');
  netSalaryCell.textContent = `₹${netSalary}`;

  tr.dataset.currentAdjustment = newAdjustment;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = `New Net Salary for ${empName}: ₹${netSalary}`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
  }, 10);

  // Update all rows for the same employee (if they exist, though in this report context, usually one row per employee)
  const allRows = document.querySelectorAll(`tr[data-emp="${empName}"]`);
  allRows.forEach(row => {
    if (row !== tr) { // Prevent updating the same row twice
      const rowNetSalaryCell = row.querySelector('.net-salary');
      rowNetSalaryCell.textContent = `₹${netSalary}`;
      row.dataset.currentAdjustment = newAdjustment;
      // Also update the checkbox state for other rows if applicable
      const otherCheckbox = row.querySelector('input[data-type="hours"]');
      if (otherCheckbox) {
        otherCheckbox.checked = hoursIncluded;
      }
    }
  });
}

function downloadExcel() {
  const table = document.getElementById("reportTable");
  if (!table || table.rows.length <= 1) return alert("Please generate the report first.");
  // Check if XLSX is defined, if not, provide a message
  if (typeof XLSX === 'undefined') {
    return alert("XLSX library not loaded. Please ensure the library is included for Excel download functionality.");
  }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");
  const month = document.getElementById("reportMonth").value;
  const filename = month ? `Monthly_Report_${month}.xlsx` : `Monthly_Report.xlsx`;
  XLSX.writeFile(wb, filename);
}

function saveMonthlyReport() {
  const currentMonth = document.getElementById('reportMonth').value;
  if (!currentMonth) return alert('Please select a month before saving.');

  // Calculate the next month for carry-forward
  const currentMonthDate = new Date(currentMonth + '-01');
  currentMonthDate.setMonth(currentMonthDate.getMonth() + 1);
  const nextMonth = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const monthlyDecisionData = []; // To save the decision (included/carried) for the current month
  const carryForwardForNextMonthData = []; // To save hours that will be carried to the NEXT month

  const rows = document.querySelectorAll('#reportTable tbody tr');
  rows.forEach(row => {
    const empName = row.cells[0].textContent;
    const hourCheckbox = row.querySelector('input[data-type="hours"]');
    const remainingHours = parseFloat(row.dataset.remainingHours || 0);

    // Save decision for the current month
    monthlyDecisionData.push({ empName: empName, included: hourCheckbox.checked });

    // If hours are NOT included in the current month, mark them for carry-forward to the next month
    if (!hourCheckbox.checked) {
      carryForwardForNextMonthData.push({ empName: empName, hours: remainingHours });
    }
  });

  // Save the decision for the current month's report
  localStorage.setItem(`monthlyDecision_${currentMonth}`, JSON.stringify(monthlyDecisionData));
  // Save the hours that need to be carried forward *to* the next month
  localStorage.setItem(`carriedHours_${nextMonth}`, JSON.stringify(carryForwardForNextMonthData));

  alert(`Monthly Report for ${currentMonth} saved successfully! Hours for next month updated.`);
}

function generateSalarySlip(empName, month) {
  const employees = JSON.parse(localStorage.getItem('employees')) || [];
  const attendance = JSON.parse(localStorage.getItem('attendance')) || {};
  const advances = JSON.parse(localStorage.getItem('advances')) || {};
  const loans = JSON.parse(localStorage.getItem('loans')) || {};
  const extraHours = JSON.parse(localStorage.getItem('extraHours')) || {};
  const lateHours = JSON.parse(localStorage.getItem('lateHours')) || {};

  // Load monthly decision for this month to check if hours were included or carried
  const monthlyDecisionData = JSON.parse(localStorage.getItem(`monthlyDecision_${month}`)) || [];

  const emp = employees.find(e => e.name === empName);
  if (!emp) {
    alert('Employee not found.');
    return;
  }

  const [year, monthNum] = month.split('-');
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  let presentDays = 0, absentDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${monthNum.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (attendance[date]?.[empName]) presentDays++;
    else absentDays++;
  }

  let totalExtraHours = 0, totalLateHours = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${monthNum.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    totalExtraHours += extraHours[date]?.[empName] || 0;
    totalLateHours += lateHours[date]?.[emp.name] || 0;
  }
  let totalHours = totalExtraHours - totalLateHours;

  // Add hours carried forward from the previous month *to* this month
  const carriedHoursFromPreviousMonth = JSON.parse(localStorage.getItem(`carriedHours_${month}`)) || [];
  const carriedFromPrev = carriedHoursFromPreviousMonth.find(e => e.empName === empName);
    if (carriedFromPrev) {
        totalHours += carriedFromPrev.hours;
    }

  let { daysAdjustment, remainingHours } = calculateDaysAndHours(totalHours);
  if (remainingHours === 12) {
    daysAdjustment += 1;
    remainingHours = 0;
  }

  const payableBasic = emp.basic || 0;
  const payableHra = emp.hra || 0;
  const payableConveyance = emp.conveyance || 0;
  const payableOthers = emp.others || 0;
  const totalSalary = emp.totalSalary || (payableBasic + payableHra + payableConveyance + payableOthers);
  const dailySalary = totalSalary / daysInMonth;
  const hourlyRate = dailySalary / 12;

  const loanList = loans[empName] || [];
  let totalLoan = 0, totalRepaid = 0, totalRemaining = 0, totalLoanEMI = 0;
  loanList.forEach(l => {
    if (l.amount) totalLoan += l.amount;
    if (l.amount && l.remaining !== undefined) totalRepaid += (l.amount - l.remaining);
    if (l.remaining) totalRemaining += l.remaining;
    if (l.emi && l.remaining > 0) totalLoanEMI += l.emi;
  });

  const advanceList = advances[empName] || [];
  const totalAdvance = advanceList.reduce((sum, adv) => sum + (adv.amount || 0), 0);

  const presentDaysSalary = presentDays * dailySalary;
  const daysAdjustmentAmount = daysAdjustment * dailySalary;
  const initialSalary = presentDaysSalary - totalLoanEMI - totalAdvance + daysAdjustmentAmount;
  
  // Determine if hours were included for the slip display based on monthlyDecisionData
  const savedDecision = monthlyDecisionData.find(d => d.empName === empName);
  const includeHoursForSlip = savedDecision ? savedDecision.included : true; // Default to true if no decision found

  const netSalary = initialSalary + (remainingHours * hourlyRate * (includeHoursForSlip ? 1 : 0));

  // Prepare slip data
  const slipData = `
    <h2>Salary Slip</h2>
    <p><strong>Employee Name:</strong> ${empName}</p>
    <p><strong>Month:</strong> ${month}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
    <table>
      <tr><th>Description</th><th>Amount (₹)</th></tr>
      <tr><td>Basic Salary</td><td>${payableBasic.toFixed(2)}</td></tr>
      <tr><td>HRA</td><td>${payableHra.toFixed(2)}</td></tr>
      <tr><td>Conveyance</td><td>${payableConveyance.toFixed(2)}</td></tr>
      <tr><td>Others</td><td>${payableOthers.toFixed(2)}</td></tr>
      <tr><td><strong>Total Salary</strong></td><td><strong>${totalSalary.toFixed(2)}</strong></td></tr>
      <tr><td>Present Days</td><td>${presentDays}</td></tr>
      <tr><td>Absent Days</td><td>${absentDays}</td></tr>
      <tr><td>Days Adjustment</td><td>${daysAdjustment}</td></tr>
      <tr><td>Hours Adjustment</td><td>${remainingHours.toFixed(1)}h ${includeHoursForSlip ? '(Included)' : '(Carried Forward)'}</td></tr>
      <tr><td>Advance Deduction</td><td>${totalAdvance.toFixed(2)}</td></tr>
      <tr><td>Loan EMI</td><td>${totalLoanEMI.toFixed(2)}</td></tr>
      <tr><td><strong>Net Salary</strong></td><td><strong>${netSalary.toFixed(2)}</strong></td></tr>
    </table>
    <p><em>Note: This is a system-generated salary slip. For any discrepancies, contact HR.</em></p>
  `;

  // Format month to "May25" style
  const monthName = new Date(year, monthNum - 1).toLocaleString('default', { month: 'short' });
  const formattedMonth = `${monthName}${year.toString().slice(-2)}`;

  // Redirect to generateSalSlip.html with formatted title
  const url = `generateSalSlip.html?data=${encodeURIComponent(slipData)}&empName=${encodeURIComponent(empName)}&formattedMonth=${encodeURIComponent(formattedMonth)}`;
  window.location.href = url;
}

window.onload = () => {
  const today = new Date();
  document.getElementById('reportMonth').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  generateReport();
};
