 function logout() {
      localStorage.removeItem('isLoggedIn');
      window.location.href = 'index.html';
    }

    let employees = JSON.parse(localStorage.getItem('employees')) || [];
    let attendance = JSON.parse(localStorage.getItem('attendance')) || {};
    let extraHours = JSON.parse(localStorage.getItem('extraHours')) || {};
    let lateHours = JSON.parse(localStorage.getItem('lateHours')) || {};
    let hoursHistory = JSON.parse(localStorage.getItem('hoursHistory')) || [];

    // Validate and clean employee data
    employees = employees.filter(emp => emp && typeof emp === 'object' && emp.name);
    localStorage.setItem('employees', JSON.stringify(employees));

    function getDaysInMonth(year, month) {
      return new Date(year, month, 0).getDate();
    }

    function formatHoursDisplay(totalHours) {
      const days = Math.floor(Math.abs(totalHours) / 12);
      const remainingHours = totalHours % 12;
      const sign = totalHours >= 0 ? '' : '-';
      if (days === 0) {
        return `${sign}${Math.abs(totalHours).toFixed(1)}h`;
      }
      return `${sign}${days}d ${Math.abs(remainingHours).toFixed(1)}h`;
    }

    function loadAttendanceGrid() {
      const monthInput = document.getElementById('attendanceMonth').value;
      const dateInput = document.getElementById('attendanceDate').value;
      const saveButton = document.getElementById('saveButton');
      const resetButton = document.getElementById('resetButton');
      const dateHeader = document.getElementById('dateHeader');
      const attendanceBody = document.getElementById('attendanceBody');
      const hoursSummaryBody = document.getElementById('hoursSummaryBody');
      const showPresentOnly = document.getElementById('show-present-only').checked;
      const selectedDate = document.getElementById('selectedDate');
      const employeeSelect = document.getElementById('employeeSelect');

      if (!monthInput || !dateInput) {
        saveButton.disabled = true;
        resetButton.disabled = true;
        dateHeader.innerHTML = '';
        attendanceBody.innerHTML = '';
        hoursSummaryBody.innerHTML = '';
        selectedDate.textContent = '';
        employeeSelect.innerHTML = '<option value="">Select Employee</option>';
        document.getElementById('attendance-info').textContent = '';
        return;
      }

      const [year, month] = monthInput.split('-').map(Number);
      const daysInMonth = getDaysInMonth(year, month);
      const dates = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      });

      // Validate date against selected month
      const selectedDateObj = new Date(dateInput);
      if (selectedDateObj.getFullYear() !== year || selectedDateObj.getMonth() + 1 !== month) {
        alert('Selected date must be within the selected month.');
        document.getElementById('attendanceDate').value = '';
        return;
      }

      // Set table header
      dateHeader.innerHTML = '<th>Employee</th>' + dates.map(date => `<th>${date.split('-')[2]}</th>`).join('');

      // Update selected date display
      selectedDate.textContent = formatDate(dateInput);

      // Populate employee dropdown
      employeeSelect.innerHTML = '<option value="">Select Employee</option>' +
        employees.map(emp => `<option value="${emp.name}">${emp.name}</option>`).join('');

      attendanceBody.innerHTML = '';
      hoursSummaryBody.innerHTML = '';

      if (employees.length === 0) {
        attendanceBody.innerHTML = '<tr><td colspan="' + (daysInMonth + 1) + '" class="no-data">No employees found. Add employees first.</td></tr>';
        document.getElementById('attendance-info').textContent = '';
        return;
      }

      let totalPresent = 0;
      employees.forEach(emp => {
        if (!emp || !emp.name) return;

        let presentCount = 0;
        const row = document.createElement('tr');
        const totalHours = (extraHours[dateInput]?.[emp.name] || 0) - (lateHours[dateInput]?.[emp.name] || 0);
        const hoursDisplay = formatHoursDisplay(totalHours);
        const hoursClass = totalHours >= 0 ? 'positive' : 'negative';
        row.innerHTML = `<td class="employee-name">${emp.name} <span class="total-hours ${hoursClass}">${hoursDisplay}</span></td>`;

        dates.forEach(date => {
          const isPresent = attendance[date]?.[emp.name] !== undefined ? attendance[date][emp.name] : true;
          if (isPresent) presentCount++;

          if (showPresentOnly && !isPresent) return;

          const cell = document.createElement('td');
          const button = document.createElement('button');
          button.className = `attendance-btn ${isPresent ? 'present' : 'absent'}`;
          button.textContent = isPresent ? 'P' : 'A';
          button.onclick = () => updateAttendanceStatus(emp.name, date);
          cell.appendChild(button);
          row.appendChild(cell);
        });

        if (!showPresentOnly || presentCount > 0) {
          attendanceBody.appendChild(row);
          totalPresent += presentCount;
        }
      });

      // Populate hours summary
      if (!document.getElementById('hide-summary').checked) {
        hoursHistory
          .filter(record => record.date.startsWith(`${year}-${month.toString().padStart(2, '0')}`))
          .forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${record.employee}</td>
              <td>${formatDate(record.date)}</td>
              <td>${record.type === 'extra' ? 'Overtime' : 'Undertime'}</td>
              <td>${record.hours.toFixed(1)}h</td>
              <td><button class="remove-btn" onclick="removeHour('${record.employee}', '${record.date}', '${record.type}')">Remove</button></td>
            `;
            hoursSummaryBody.appendChild(row);
          });
      }

      saveButton.disabled = false;
      resetButton.disabled = false;
      document.getElementById('attendance-info').textContent = `Total Present: ${totalPresent} / ${employees.length * daysInMonth}`;
    }

    function submitHours() {
      const employee = document.getElementById('employeeSelect').value;
      const extraHoursInput = parseFloat(document.getElementById('extraHoursInput').value) || 0;
      const lateHoursInput = parseFloat(document.getElementById('lateHoursInput').value) || 0;
      const date = document.getElementById('attendanceDate').value;

      if (!employee || !date || (extraHoursInput <= 0 && lateHoursInput <= 0)) {
        showToast('Please select an employee, enter valid hours, and select a date.');
        return;
      }

      const dateObj = new Date(date);
      if (dateObj > new Date()) {
        showToast('Cannot add hours for future dates.');
        return;
      }

      extraHours[date] = extraHours[date] || {};
      lateHours[date] = lateHours[date] || {};
      const prevExtra = extraHours[date][employee] || 0;
      const prevLate = lateHours[date][employee] || 0;

      if (extraHoursInput > 0) {
        extraHours[date][employee] = prevExtra + extraHoursInput;
        hoursHistory.push({ employee, date, type: 'extra', hours: extraHoursInput });
      }
      if (lateHoursInput > 0) {
        lateHours[date][employee] = prevLate + lateHoursInput;
        hoursHistory.push({ employee, date, type: 'late', hours: lateHoursInput });
      }

      localStorage.setItem('extraHours', JSON.stringify(extraHours));
      localStorage.setItem('lateHours', JSON.stringify(lateHours));
      localStorage.setItem('hoursHistory', JSON.stringify(hoursHistory));
      adjustDayCount(employee, date);
      document.getElementById('extraHoursInput').value = '';
      document.getElementById('lateHoursInput').value = '';
      showToast('Hours updated for ' + employee);
    }

    function updateAttendanceStatus(empName, date) {
      attendance[date] = attendance[date] || {};
      attendance[date][empName] = !attendance[date][empName]; // Toggle true/false
      localStorage.setItem('attendance', JSON.stringify(attendance));
      loadAttendanceGrid();
      showToast(`Attendance updated for ${empName} on ${formatDate(date)}`);
    }

    function adjustDayCount(empName, date) {
      extraHours[date] = extraHours[date] || {};
      lateHours[date] = lateHours[date] || {};
      let extra = extraHours[date][empName] || 0;
      let late = lateHours[date][empName] || 0;
      const totalHours = extra - late;

      attendance[date] = attendance[date] || {};
      let currentStatus = attendance[date][empName] !== undefined ? attendance[date][empName] : true;

      localStorage.setItem('attendance', JSON.stringify(attendance));
      localStorage.setItem('extraHours', JSON.stringify(extraHours));
      localStorage.setItem('lateHours', JSON.stringify(lateHours));
      loadAttendanceGrid();
    }

    function saveAttendance() {
      const monthInput = document.getElementById('attendanceMonth').value;
      const dateInput = document.getElementById('attendanceDate').value;
      if (!monthInput || !dateInput) {
        alert('Please select a month and date.');
        return;
      }

      const [year, month] = monthInput.split('-').map(Number);
      const daysInMonth = getDaysInMonth(year, month);
      const dates = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      });

      dates.forEach(date => {
        attendance[date] = attendance[date] || {};
        employees.forEach(emp => {
          if (!emp || !emp.name) return;
          attendance[date][emp.name] = attendance[date][emp.name] !== undefined ? attendance[date][emp.name] : true;
        });
      });

      localStorage.setItem('attendance', JSON.stringify(attendance));
      loadAttendanceGrid();
      showToast('Attendance saved successfully!');
    }

    function resetAttendance() {
      const monthInput = document.getElementById('attendanceMonth').value;
      if (!monthInput) {
        alert('Please select a month.');
        return;
      }
      if (!confirm('Reset all attendance to absent for this month?')) return;

      const [year, month] = monthInput.split('-').map(Number);
      const daysInMonth = getDaysInMonth(year, month);
      const dates = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      });

      dates.forEach(date => {
        attendance[date] = attendance[date] || {};
        employees.forEach(emp => {
          if (!emp || !emp.name) return;
          attendance[date][emp.name] = false;
        });
      });
      localStorage.setItem('attendance', JSON.stringify(attendance));
      loadAttendanceGrid();
      showToast('Attendance reset successfully!');
    }

    function formatDate(dateString) {
      const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('en-US', options);
    }

    function showToast(message) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => {
            document.body.removeChild(toast);
          }, 300);
        }, 2000);
      }, 10);
    }

    function toggleSummary() {
      const summaryCard = document.getElementById('hoursSummaryCard');
      const hideSummary = document.getElementById('hide-summary').checked;
      summaryCard.classList.toggle('hidden', hideSummary);
      if (!hideSummary) {
        loadAttendanceGrid(); // Reload to show summary if unhidden
      }
    }

    function removeHour(employee, date, type) {
      const index = hoursHistory.findIndex(record => 
        record.employee === employee && record.date === date && record.type === type
      );
      if (index !== -1) {
        const record = hoursHistory[index];
        hoursHistory.splice(index, 1);

        extraHours[date] = extraHours[date] || {};
        lateHours[date] = lateHours[date] || {};
        if (type === 'extra') {
          extraHours[date][employee] = Math.max(0, (extraHours[date][employee] || 0) - record.hours);
        } else {
          lateHours[date][employee] = Math.max(0, (lateHours[date][employee] || 0) - record.hours);
        }

        localStorage.setItem('hoursHistory', JSON.stringify(hoursHistory));
        localStorage.setItem('extraHours', JSON.stringify(extraHours));
        localStorage.setItem('lateHours', JSON.stringify(lateHours));
        loadAttendanceGrid();
        showToast(`Removed ${type} hours for ${employee} on ${date}`);
      }
    }

    window.onload = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      document.getElementById('attendanceMonth').value = `${year}-${month}`;
      document.getElementById('attendanceDate').value = `${year}-${month}-${day}`;
      document.getElementById('attendanceMonth').addEventListener('change', loadAttendanceGrid);
      document.getElementById('attendanceDate').addEventListener('change', loadAttendanceGrid);
      loadAttendanceGrid();
    };