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
  let daysAdjustment = 0;
  let remainingHours = 0;
  if (totalHours !== 0) {
    daysAdjustment = Math.floor(totalHours / 12);
    remainingHours = totalHours - (daysAdjustment * 12);
    if (remainingHours === 0 && totalHours !== 0) remainingHours = 12 * Math.sign(totalHours);
  }
  return { daysAdjustment, remainingHours };
}

// Utility for showing toast notifications
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
  }, 10);
}

// Calculate total salary based on components
function calculateTotalSalary(basic, hra, conveyance, others) {
  return (basic || 0) + (hra || 0) + (conveyance || 0) + (others || 0);
}

// Generate table row for employee data
function generateEmployeeRow(emp, index, dailySalary, hourlyRate, daysAdjustment, remainingHours) {
  const tr = document.createElement('tr');
  tr.className = index % 2 === 0 ? 'even-row' : 'odd-row';
  const daysDisplay = daysAdjustment !== 0 ? `${daysAdjustment}d` : '';
  const hoursDisplay = remainingHours !== 0 ? `${remainingHours.toFixed(1)}h` : '';
  tr.innerHTML = `
    <td>${emp.name}</td>
    <td>₹${emp.basic || 0}</td>
    <td>₹${emp.hra || 0}</td>
    <td>₹${emp.conveyance || 0}</td>
    <td>₹${emp.others || 0}</td>
    <td>₹${emp.totalSalary || 0}</td>
    <td>${emp.presentDays || 0}</td>
    <td>${emp.absentDays || 0}</td>
    <td>${emp.morningShifts || 0}</td>
    <td>${emp.nightShifts || 0}</td>
    <td>₹${emp.totalAdvance || 0}</td>
    <td>₹${emp.totalLoan?.toFixed(2) || 0}</td>
    <td>₹${emp.totalRepaid?.toFixed(2) || 0}</td>
    <td>₹${emp.totalRemaining?.toFixed(2) || 0}</td>
    <td>₹${emp.totalLoanEMI || 0}</td>
    <td>${daysDisplay}</td>
    <td class="checkbox-cell"><input type="checkbox" data-emp="${emp.name}" data-type="hours" onchange="updateNetSalary(this)"> ${hoursDisplay}</td>
    <td class="net-salary" data-emp="${emp.name}">₹${calculateNetSalary(emp, dailySalary, hourlyRate, daysAdjustment, 0).toFixed(2)}</td>`;
  return tr;
}

// Calculate net salary with automatic days adjustment and optional hours
function calculateNetSalary(emp, dailySalary, hourlyRate, daysAdjustment, remainingHoursAdjustment) {
  const totalSalary = emp.totalSalary || 0;
  const totalLoanEMI = emp.totalLoanEMI || 0;
  const totalAdvance = emp.totalAdvance || 0;
  let salaryAdjustment = 0;
  if (Math.abs(daysAdjustment) >= 1) {
    salaryAdjustment += daysAdjustment * dailySalary;
  }
  salaryAdjustment += remainingHoursAdjustment * hourlyRate;
  return totalSalary - totalLoanEMI - totalAdvance + salaryAdjustment;
}

// Update net salary based on checkbox state
function updateNetSalary(checkbox) {
  const tr = checkbox.closest('tr');
  const empName = checkbox.getAttribute('data-emp');
  const type = checkbox.getAttribute('data-type');
  const initialSalary = parseFloat(tr.dataset.initialSalary);
  const dailySalary = parseFloat(tr.dataset.dailySalary);
  const hourlyRate = parseFloat(tr.dataset.hourlyRate);
  const daysAdjustment = parseFloat(tr.dataset.daysAdjustment);
  const remainingHours = parseFloat(tr.dataset.remainingHours);

  let salaryAdjustment = 0;
  if (Math.abs(daysAdjustment) >= 1) {
    salaryAdjustment += daysAdjustment * dailySalary;
  }
  if (type === 'hours' && checkbox.checked && remainingHours !== 0) {
    salaryAdjustment += remainingHours * hourlyRate;
  }

  const netSalaryCell = tr.querySelector('.net-salary');
  const netSalary = (initialSalary - salaryAdjustment).toFixed(2);
  netSalaryCell.textContent = `₹${netSalary}`;

  showToast(`New Net Salary for ${empName}: ₹${netSalary}`);

  const allRows = document.querySelectorAll(`tr[data-emp="${empName}"]`);
  allRows.forEach(row => {
    if (row !== tr) {
      const rowNetSalaryCell = row.querySelector('.net-salary');
      rowNetSalaryCell.textContent = `₹${netSalary}`;
    }
  });
}

// Generate report table
function generateReport(month, employees, attendance, shifts, advances, loans, extraHours, lateHours) {
  const tbody = document.getElementById('reportTable').querySelector('tbody');
  tbody.innerHTML = '';

  const [year, monthNum] = month.split('-');
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  let totalPresent = 0;
  let totalAbsent = 0;

  employees.forEach((emp, index) => {
    if (!emp || !emp.name) return;

    let presentDays = 0;
    let absentDays = 0;
    let morningShifts = 0;
    let nightShifts = 0;

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
    const totalSalary = calculateTotalSalary(payableBasic, payableHra, payableConveyance, payableOthers);
    const dailySalary = totalSalary / daysInMonth;

    const loanList = loans[emp.name] || [];
    let totalLoan = 0;
    let totalRepaid = 0;
    let totalRemaining = 0;
    let totalLoanEMI = 0;

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

    let totalExtraHours = 0;
    let totalLateHours = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${monthNum.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      totalExtraHours += extraHours[date]?.[emp.name] || 0;
      totalLateHours += lateHours[date]?.[emp.name] || 0;
    }
    const totalHours = totalExtraHours - totalLateHours;
    const { daysAdjustment, remainingHours } = calculateDaysAndHours(totalHours);

    emp.presentDays = presentDays;
    emp.absentDays = absentDays;
    emp.morningShifts = morningShifts;
    emp.nightShifts = nightShifts;
    emp.totalAdvance = totalAdvance;
    emp.totalLoan = totalLoan;
    emp.totalRepaid = totalRepaid;
    emp.totalRemaining = totalRemaining;
    emp.totalLoanEMI = totalLoanEMI;
    emp.totalSalary = totalSalary;

    const tr = generateEmployeeRow(emp, index, dailySalary, dailySalary / 12, daysAdjustment, remainingHours);
    tr.dataset.initialSalary = calculateNetSalary(emp, dailySalary, dailySalary / 12, daysAdjustment, 0).toFixed(2);
    tr.dataset.dailySalary = dailySalary;
    tr.dataset.hourlyRate = dailySalary / 12;
    tr.dataset.daysAdjustment = daysAdjustment;
    tr.dataset.remainingHours = remainingHours;
    tbody.appendChild(tr);
  });

  localStorage.setItem('loans', JSON.stringify(loans));
  document.getElementById('monthInfo').textContent = `Total Present: ${totalPresent}, Total Absent: ${totalAbsent}`;
}

// Download Excel function
function downloadExcel() {
  const table = document.getElementById("reportTable");
  if (!table || table.rows.length <= 1) return alert("Please generate the report first.");

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");

  const month = document.getElementById("reportMonth").value;
  const filename = month ? `Monthly_Report_${month}.xlsx` : `Monthly_Report.xlsx`;

  XLSX.writeFile(wb, filename);

  const advances = JSON.parse(localStorage.getItem("advances")) || {};
  for (const key in advances) {
    if (sessionStorage.getItem(`advanceToClear_${key}`)) {
      advances[key] = [];
      sessionStorage.removeItem(`advanceToClear_${key}`);
    }
  }
  localStorage.setItem("advances", JSON.stringify(advances));
}