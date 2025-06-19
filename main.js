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
      const saveButton = document.getElementById('saveButton');
      const resetButton = document.getElementById('resetButton');
      const dateHeader = document.getElementById('dateHeader');
      const attendanceBody = document.getElementById('attendanceBody');
      const hoursSummaryBody = document.getElementById('hoursSummaryBody');
      const employeeSelect = document.getElementById('employeeSelect');

      if (!monthInput) {
        saveButton.disabled = true;
        resetButton.disabled = true;
        dateHeader.innerHTML = '';
        attendanceBody.innerHTML = '';
        hoursSummaryBody.innerHTML = '';
        employeeSelect.innerHTML = '<option value="">Select Employee</option>';
        return;
      }

      const [year, month] = monthInput.split('-').map(Number);
      const daysInMonth = getDaysInMonth(year, month);
      const dates = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      });

      // Set table header
      dateHeader.innerHTML = '<th>Employee</th>' + dates.map(date => `<th>${date.split('-')[2]}</th>`).join('');

      // Populate employee dropdown
      employeeSelect.innerHTML = '<option value="">Select Employee</option>' +
        employees.map(emp => `<option value="${emp.name}">${emp.name}</option>`).join('');

      attendanceBody.innerHTML = '';
      hoursSummaryBody.innerHTML = '';

      if (employees.length === 0) {
        attendanceBody.innerHTML = '<tr><td colspan="' + (daysInMonth + 1) + '" class="no-data">No employees found. Add employees first.</td></tr>';
        return;
      }

      employees.forEach(emp => {
        if (!emp || !emp.name) return;

        const row = document.createElement('tr');
        row.innerHTML = `<td class="employee-name">${emp.name}</td>`;

        dates.forEach(date => {
          const isPresent = attendance[date]?.[emp.name] !== undefined ? attendance[date][emp.name] : true;

          const cell = document.createElement('td');
          const button = document.createElement('button');
          button.className = `attendance-btn ${isPresent ? 'present' : 'absent'}`;
          button.textContent = isPresent ? 'P' : 'A';
          button.onclick = () => updateAttendanceStatus(emp.name, date);
          cell.appendChild(button);
          row.appendChild(cell);
        });
        
        attendanceBody.appendChild(row);
      });

      // Populate hours summary
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
      
      saveButton.disabled = false;
      resetButton.disabled = false;
    }

    function submitHours() {
      const employee = document.getElementById('employeeSelect').value;
      const extraHoursInput = parseFloat(document.getElementById('extraHoursInput').value) || 0;
      const lateHoursInput = parseFloat(document.getElementById('lateHoursInput').value) || 0;
      const date = document.getElementById('hoursDateInput').value;

      if (!employee || !date || (extraHoursInput <= 0 && lateHoursInput <= 0)) {
        showToast('Please select an employee, a date, and enter valid hours.');
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
      loadAttendanceGrid(); // Reload grid to show updated summary
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

    function saveAttendance() {
      const monthInput = document.getElementById('attendanceMonth').value;
      if (!monthInput) {
        alert('Please select a month.');
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
      document.getElementById('attendanceMonth').value = `${year}-${month}`;
      document.getElementById('attendanceMonth').addEventListener('change', loadAttendanceGrid);
      loadAttendanceGrid();
    };