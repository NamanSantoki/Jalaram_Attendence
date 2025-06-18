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
  const carryForwardData = JSON.parse(localStorage.getItem(`carryForward_${month}`)) || [];

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

    let { daysAdjustment, remainingHours } = calculateDaysAndHours(totalHours);
    const carryForEmp = carryForwardData.find(e => e.empName === emp.name);
    if (carryForEmp) {
      if (!isNaN(carryForEmp.carryForward.days)) daysAdjustment += carryForEmp.carryForward.days;
      if (!isNaN(carryForEmp.carryForward.hours)) remainingHours += carryForEmp.carryForward.hours;
    }

    // Adjust remainingHours to 0 if it equals 12 to avoid double counting
    if (remainingHours === 12) {
      daysAdjustment += 1;
      remainingHours = 0;
    }

    const daysDisplay = daysAdjustment !== 0 ? `${daysAdjustment}d` : '0d';
    const hoursDisplay = remainingHours !== 0 ? `${remainingHours.toFixed(1)}h` : '0h';
    const hourlyRate = dailySalary / 12;

    // Calculate initial salary including days adjustment
    const daysAdjustmentAmount = daysAdjustment * dailySalary;
    const initialSalary = totalSalary - totalLoanEMI - totalAdvance + daysAdjustmentAmount;

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
      <td class="checkbox-cell"><input type="checkbox" data-emp="${emp.name}" data-type="hours" onchange="updateNetSalary(this)"> ${hoursDisplay}</td>
      <td class="net-salary" data-emp="${emp.name}">₹${initialSalary.toFixed(2)}</td>`;
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
  const hoursChecked = checkbox.checked;

  if (hoursChecked && remainingHours !== 0) {
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

  const allRows = document.querySelectorAll(`tr[data-emp="${empName}"]`);
  allRows.forEach(row => {
    if (row !== tr) {
      const rowNetSalaryCell = row.querySelector('.net-salary');
      rowNetSalaryCell.textContent = `₹${netSalary}`;
      row.dataset.currentAdjustment = newAdjustment;
    }
  });
}

function downloadExcel() {
  const table = document.getElementById("reportTable");
  if (!table || table.rows.length <= 1) return alert("Please generate the report first.");
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(table);
  XLSX.utils.book_append_sheet(wb, ws, "Monthly Report");
  const month = document.getElementById("reportMonth").value;
  const filename = month ? `Monthly_Report_${month}.xlsx` : `Monthly_Report.xlsx`;
  XLSX.writeFile(wb, filename);
}

function saveMonthlyReport() {
  const month = document.getElementById('reportMonth').value;
  if (!month) return alert('Please select a month before saving.');
  const reportData = [];
  const rows = document.querySelectorAll('#reportTable tbody tr');
  rows.forEach(row => {
    const empName = row.cells[0].textContent;
    const hourCheckbox = row.querySelector('input[data-type="hours"]');
    const carryForward = {
      days: 0, // Days are always applied, so carry forward 0
      hours: !hourCheckbox.checked ? parseFloat(row.dataset.remainingHours || 0) : 0
    };
    reportData.push({ empName, month, carryForward });
  });
  localStorage.setItem(`carryForward_${month}`, JSON.stringify(reportData));
  alert(`Monthly Report for ${month} saved successfully!`);
}

window.onload = () => {
  const today = new Date();
  document.getElementById('reportMonth').value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  generateReport();
};