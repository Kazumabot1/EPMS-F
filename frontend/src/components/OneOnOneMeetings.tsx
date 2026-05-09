import React, { useEffect, useMemo, useRef, useState } from 'react';
import './one-on-one.css';

import { fetchDepartments } from '../services/departmentService';
import type { Department } from '../services/departmentService';

import {
  createMeeting,
  getActiveEmployeesByDepartment,
} from '../services/oneOnOneService';
import type { EmployeeOption } from '../services/oneOnOneService';

const pad = (n: number) => String(n).padStart(2, '0');

const OneOnOneMeetings: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingEmps, setLoadingEmps] = useState(false);

  const [selectedDept, setSelectedDept] = useState('');
  const [selectedEmp, setSelectedEmp] = useState('');

  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [ampm, setAmPm] = useState<'AM' | 'PM'>('AM');

  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const hiddenDateRef = useRef<HTMLInputElement>(null);

  const selectedEmployee = useMemo(() => {
    return employees.find((emp) => Number(emp.id) === Number(selectedEmp)) ?? null;
  }, [employees, selectedEmp]);

  useEffect(() => {
    let mounted = true;

    const loadDepartments = async () => {
      setLoadingDepts(true);
      setError('');

      try {
        const data = await fetchDepartments();

        if (mounted) {
          setDepartments(Array.isArray(data) ? data : []);
        }
      } catch (err: any) {
        if (mounted) {
          setDepartments([]);
          setError(
            err?.response?.data?.message ||
              'Failed to load departments.',
          );
        }
      } finally {
        if (mounted) {
          setLoadingDepts(false);
        }
      }
    };

    void loadDepartments();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadEmployees = async () => {
      if (!selectedDept) {
        setEmployees([]);
        setSelectedEmp('');
        return;
      }

      setLoadingEmps(true);
      setError('');
      setSuccess('');
      setEmployees([]);
      setSelectedEmp('');

      try {
        const data = await getActiveEmployeesByDepartment(Number(selectedDept));

        if (mounted) {
          setEmployees(Array.isArray(data) ? data : []);
        }
      } catch (err: any) {
        if (mounted) {
          setEmployees([]);
          setError(
            err?.response?.data?.message ||
              'Failed to load employees.',
          );
        }
      } finally {
        if (mounted) {
          setLoadingEmps(false);
        }
      }
    };

    void loadEmployees();

    return () => {
      mounted = false;
    };
  }, [selectedDept]);

  const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (!val) return;

    const [y, m, d] = val.split('-');

    setYear(y);
    setMonth(m);
    setDay(d);
  };

  const openCalendar = () => {
    hiddenDateRef.current?.showPicker?.();
  };

  const buildDate = (): Date | null => {
    const d = Number.parseInt(day, 10);
    const m = Number.parseInt(month, 10);
    const y = Number.parseInt(year, 10);
    let h = Number.parseInt(hour, 10);
    const min = Number.parseInt(minute, 10);

    if (
      Number.isNaN(d) ||
      Number.isNaN(m) ||
      Number.isNaN(y) ||
      Number.isNaN(h) ||
      Number.isNaN(min)
    ) {
      return null;
    }

    if (d < 1 || d > 31) return null;
    if (m < 1 || m > 12) return null;
    if (y < 2024 || y > 2099) return null;
    if (h < 1 || h > 12) return null;
    if (min < 0 || min > 59) return null;

    if (ampm === 'PM' && h < 12) {
      h += 12;
    }

    if (ampm === 'AM' && h === 12) {
      h = 0;
    }

    const date = new Date(y, m - 1, d, h, min, 0);

    if (
      date.getFullYear() !== y ||
      date.getMonth() !== m - 1 ||
      date.getDate() !== d
    ) {
      return null;
    }

    return date;
  };

  const buildIso = (scheduled: Date) => {
    return `${scheduled.getFullYear()}-${pad(scheduled.getMonth() + 1)}-${pad(
      scheduled.getDate(),
    )}T${pad(scheduled.getHours())}:${pad(scheduled.getMinutes())}:00`;
  };

  const resetForm = () => {
    setSelectedDept('');
    setSelectedEmp('');
    setEmployees([]);
    setDay('');
    setMonth('');
    setYear('');
    setHour('');
    setMinute('');
    setAmPm('AM');
    setLocation('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!selectedDept) {
      setError('Please select a department.');
      return;
    }

    if (!selectedEmp) {
      setError('Please select an employee.');
      return;
    }

    const scheduled = buildDate();

    if (!scheduled) {
      setError('Please fill in all date and time fields correctly.');
      return;
    }

    if (scheduled <= new Date()) {
      setError('Cannot create a meeting for a past time.');
      return;
    }

    if (location.length > 500) {
      setError('Location cannot exceed 500 letters.');
      return;
    }

    if (notes.length > 1000) {
      setError('Notes cannot exceed 1000 letters.');
      return;
    }

    setSubmitting(true);

    try {
      await createMeeting({
        employeeId: Number(selectedEmp),
        scheduledDate: buildIso(scheduled),
        location: location.trim(),
        notes: notes.trim(),
      });

      setSuccess(
        selectedEmployee
          ? `1:1 Meeting scheduled successfully for ${selectedEmployee.firstName} ${selectedEmployee.lastName}! 🎉`
          : '1:1 Meeting scheduled successfully! 🎉',
      );

      resetForm();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Failed to create meeting. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="oom-page">
      <div className="oom-header">
        <h1>📅 Schedule 1:1 Meeting</h1>
        <p>Create a new one-on-one meeting with an employee.</p>
      </div>

      <div className="oom-card">
        <form className="oom-form" onSubmit={handleSubmit}>
          <div className="oom-field">
            <label className="oom-label">Department</label>

            <select
              className="oom-select"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              required
              disabled={loadingDepts}
            >
              <option value="">
                {loadingDepts ? 'Loading departments…' : '— Select Department —'}
              </option>

              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.departmentName}
                </option>
              ))}
            </select>
          </div>

          <div className="oom-field">
            <label className="oom-label">Employee</label>

            <select
              className="oom-select"
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(e.target.value)}
              required
              disabled={!selectedDept || loadingEmps}
            >
              <option value="">
                {!selectedDept
                  ? '— Select a department first —'
                  : loadingEmps
                    ? 'Loading employees…'
                    : employees.length === 0
                      ? 'No active employees in this department'
                      : '— Select Employee —'}
              </option>

              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="oom-field">
            <label className="oom-label">Meeting Date</label>

            <div className="oom-date-row">
              <div className="oom-date-part oom-date-part--dd">
                <label>Day</label>

                <input
                  type="number"
                  min={1}
                  max={31}
                  placeholder="DD"
                  value={day}
                  onChange={(e) => setDay(e.target.value.slice(0, 2))}
                  required
                />
              </div>

              <span className="oom-date-sep">/</span>

              <div className="oom-date-part oom-date-part--mm">
                <label>Month</label>

                <input
                  type="number"
                  min={1}
                  max={12}
                  placeholder="MM"
                  value={month}
                  onChange={(e) => setMonth(e.target.value.slice(0, 2))}
                  required
                />
              </div>

              <span className="oom-date-sep">/</span>

              <div className="oom-date-part oom-date-part--yy">
                <label>Year</label>

                <input
                  type="number"
                  min={2024}
                  max={2099}
                  placeholder="YYYY"
                  value={year}
                  onChange={(e) => setYear(e.target.value.slice(0, 4))}
                  required
                />
              </div>

              <button
                type="button"
                className="oom-cal-btn"
                onClick={openCalendar}
                title="Pick from calendar"
              >
                🗓️
              </button>

              <input
                ref={hiddenDateRef}
                type="date"
                min={today}
                className="oom-hidden-date"
                onChange={handleCalendarChange}
              />
            </div>
          </div>

          <div className="oom-field">
            <label className="oom-label">Meeting Time</label>

            <div className="oom-time-row">
              <div className="oom-date-part oom-date-part--dd">
                <label>Hour</label>

                <input
                  type="number"
                  min={1}
                  max={12}
                  placeholder="HH"
                  value={hour}
                  onChange={(e) => setHour(e.target.value.slice(0, 2))}
                  required
                />
              </div>

              <span className="oom-date-sep">:</span>

              <div className="oom-date-part oom-date-part--dd">
                <label>Minute</label>

                <input
                  type="number"
                  min={0}
                  max={59}
                  placeholder="MM"
                  value={minute}
                  onChange={(e) => setMinute(e.target.value.slice(0, 2))}
                  required
                />
              </div>

              <div className="oom-ampm-toggle">
                <button
                  type="button"
                  className={ampm === 'AM' ? 'active' : ''}
                  onClick={() => setAmPm('AM')}
                >
                  AM
                </button>

                <button
                  type="button"
                  className={ampm === 'PM' ? 'active' : ''}
                  onClick={() => setAmPm('PM')}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          <div className="oom-field">
            <label className="oom-label">Location</label>

            <input
              className="oom-input"
              type="text"
              placeholder="Example: ACE 3rd Building, 4th floor"
              value={location}
              maxLength={500}
              onChange={(e) => setLocation(e.target.value)}
            />

            <small>Optional. Cannot input more than 500 letters.</small>
          </div>

          <div className="oom-field">
            <label className="oom-label">Notes</label>

            <textarea
              className="oom-textarea"
              placeholder="Add agenda or notes for this meeting…"
              value={notes}
              maxLength={1000}
              onChange={(e) => setNotes(e.target.value)}
            />

            <small>Cannot input more than 1000 letters.</small>
          </div>

          {error && <div className="oom-error">⚠ {error}</div>}
          {success && <div className="oom-success">{success}</div>}

          <div>
            <button type="submit" className="oom-btn-primary" disabled={submitting}>
              {submitting ? 'Scheduling…' : '✦ Schedule Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OneOnOneMeetings;