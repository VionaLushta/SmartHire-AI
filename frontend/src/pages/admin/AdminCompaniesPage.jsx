import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Search, ShieldCheck, Trash2 } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import StatusBadge from '../../components/admin/StatusBadge';
import EmptyState from '../../components/admin/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useNotifications } from '../../context/NotificationContext';
import { departmentService } from '../../services/departmentService';

function normalizeDepartment(department, fallbackId) {
  return {
    department_id: department.department_id ?? fallbackId,
    company_id: department.company_id ?? 1,
    name: department.name ?? 'Untitled department',
    description: department.description ?? '',
    industry: department.industry ?? department.description ?? 'Department',
    employees: department.employees ?? 0,
    status: department.status ?? 'active',
    jobs: department.jobs ?? 0,
  };
}

function buildDepartmentForm(department = null) {
  return {
    name: department?.name ?? '',
    description: department?.description ?? '',
    status: department?.status ?? 'active',
  };
}

export default function AdminCompaniesPage() {
  const [query, setQuery] = useState('');
  const [departments, setDepartments] = useState([]);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);
  const [departmentModalMode, setDepartmentModalMode] = useState('create');
  const [departmentDetailsOpen, setDepartmentDetailsOpen] = useState(false);
  const [departmentDeleteOpen, setDepartmentDeleteOpen] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState(null);
  const [savingDepartment, setSavingDepartment] = useState(false);
  const [deletingDepartment, setDeletingDepartment] = useState(false);
  const [departmentError, setDepartmentError] = useState('');
  const [departmentForm, setDepartmentForm] = useState(buildDepartmentForm());
  const { success } = useNotifications();

  const reloadDepartments = useCallback(async () => {
    const response = await departmentService.list({ page_size: 100 });
    const items = response?.data?.items ?? response?.data?.data?.items ?? response?.data?.data ?? response?.data ?? [];
    const normalizedDepartments = Array.isArray(items)
      ? items.map((department, index) => normalizeDepartment(department, department.department_id ?? index + 1))
      : [];
    setDepartments(normalizedDepartments);
    return normalizedDepartments;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDepartments = async () => {
      try {
        await reloadDepartments();
        if (!isMounted) return;
      } catch (error) {
        if (!isMounted) return;
        setDepartments([]);
        console.error('Failed to load departments:', error);
      }
    };

    loadDepartments();

    return () => {
      isMounted = false;
    };
  }, [reloadDepartments]);

  const filteredDepartments = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return departments;
    return departments.filter((department) => `${department.name} ${department.industry}`.toLowerCase().includes(term));
  }, [query, departments]);

  const openAddDepartment = () => {
    setDepartmentError('');
    setActiveDepartment(null);
    setDepartmentForm(buildDepartmentForm());
    setDepartmentModalMode('create');
    setDepartmentModalOpen(true);
  };

  const openViewDepartment = (department) => {
    setDepartmentError('');
    setActiveDepartment(department);
    setDepartmentDetailsOpen(true);
  };

  const openEditDepartment = (department) => {
    setDepartmentError('');
    setActiveDepartment(department);
    setDepartmentForm(buildDepartmentForm(department));
    setDepartmentModalMode('edit');
    setDepartmentModalOpen(true);
  };

  const openDeleteDepartment = (department) => {
    setDepartmentError('');
    setActiveDepartment(department);
    setDepartmentDeleteOpen(true);
  };

  const closeDepartmentForm = () => {
    if (savingDepartment) return;
    setDepartmentModalOpen(false);
    setDepartmentError('');
    setActiveDepartment(null);
  };

  const closeDepartmentDetails = () => {
    setDepartmentDetailsOpen(false);
    setActiveDepartment(null);
  };

  const closeDeleteDialog = () => {
    if (deletingDepartment) return;
    setDepartmentDeleteOpen(false);
    setActiveDepartment(null);
  };

  const handleDepartmentChange = (field, value) => {
    setDepartmentForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleDepartmentSubmit = async (event) => {
    event.preventDefault();
    setDepartmentError('');

    const name = departmentForm.name.trim();
    const description = departmentForm.description.trim();

    if (!name) {
      setDepartmentError('Department name is required.');
      return;
    }

    const payload = {
      company_id: activeDepartment?.company_id ?? departments[0]?.company_id ?? 1,
      name,
      description: description || null,
    };

    try {
      setSavingDepartment(true);
      if (departmentModalMode === 'edit' && activeDepartment?.department_id != null) {
        await departmentService.update(activeDepartment.department_id, payload);
      } else {
        await departmentService.create(payload);
      }

      window.dispatchEvent(new CustomEvent('departments:changed'));

      await reloadDepartments();
      setDepartmentModalOpen(false);
      setActiveDepartment(null);
    } catch (error) {
      const detail = error?.response?.data?.detail || error?.message || 'Unable to save department right now.';
      setDepartmentError(detail);
    } finally {
      setSavingDepartment(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!activeDepartment) return;

    try {
      setDeletingDepartment(true);
      if (activeDepartment.department_id != null) {
        await departmentService.remove(activeDepartment.department_id);
      }
      window.dispatchEvent(new CustomEvent('departments:changed'));
      await reloadDepartments();
      setDepartmentDeleteOpen(false);
      setActiveDepartment(null);
      success('Department deleted', `${activeDepartment.name} was removed successfully.`);
    } catch (error) {
      setDepartmentError(error?.response?.data?.detail || error?.message || 'Unable to delete department right now.');
    } finally {
      setDeletingDepartment(false);
    }
  };

  return (
    <AdminCard title="Departments management" description="Review the internal teams that support SmartHire Technologies.">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" aria-label="Search departments" placeholder="Search departments" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Button variant="primary" type="button" onClick={openAddDepartment}>Add department</Button>
      </div>

      {filteredDepartments.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDepartments.map((department) => (
            <div key={department.department_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <StatusBadge status={department.status} />
              </div>

              <div className="mt-5 space-y-2">
                <h3 className="text-lg font-semibold text-slate-950">{department.name}</h3>
                <p className="text-sm text-slate-600">{department.industry}</p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Employees</span><span className="mt-2 block font-semibold text-slate-950">{department.employees}</span></div>
                <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Jobs</span><span className="mt-2 block font-semibold text-slate-950">{department.jobs}</span></div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => openViewDepartment(department)}>
                  View
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => openEditDepartment(department)}
                  aria-label={`Edit ${department.name}`}
                  title={`Edit ${department.name}`}
                >
                  <ShieldCheck className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => openDeleteDepartment(department)}
                  aria-label={`Delete ${department.name}`}
                  title={`Delete ${department.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No departments match your search" description="Try a different department name or area." />
      )}

      <Modal
        open={departmentModalOpen}
        title={departmentModalMode === 'edit' ? 'Edit department' : 'Add department'}
        onClose={closeDepartmentForm}
      >
        <form className="space-y-4" onSubmit={handleDepartmentSubmit}>
          <Input
            label="Department Name"
            value={departmentForm.name}
            onChange={(event) => handleDepartmentChange('name', event.target.value)}
            placeholder="e.g. Product Design"
            required
          />

          <Input
            label="Description"
            value={departmentForm.description}
            onChange={(event) => handleDepartmentChange('description', event.target.value)}
            placeholder="Short department description"
          />

          <label className="flex w-full flex-col">
            <span className="field-label">Status</span>
            <select
              value={departmentForm.status}
              onChange={(event) => handleDepartmentChange('status', event.target.value)}
              className="h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition duration-150 ease-out hover:border-[rgba(15,23,42,0.12)] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          {departmentError ? (
            <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {departmentError}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeDepartmentForm} disabled={savingDepartment}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savingDepartment}>
              {departmentModalMode === 'edit' ? 'Save changes' : 'Create department'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={departmentDetailsOpen} title="Department details" onClose={closeDepartmentDetails}>
        {activeDepartment ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Department</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{activeDepartment.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{activeDepartment.industry}</p>
              </div>
              <StatusBadge status={activeDepartment.status} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[14px] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Description</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{activeDepartment.description || 'No description available.'}</p>
              </div>
              <div className="rounded-[14px] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Company ID</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{activeDepartment.company_id}</p>
              </div>
              <div className="rounded-[14px] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Employees</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{activeDepartment.employees}</p>
              </div>
              <div className="rounded-[14px] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Jobs</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{activeDepartment.jobs}</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  closeDepartmentDetails();
                  openEditDepartment(activeDepartment);
                }}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  closeDepartmentDetails();
                  openDeleteDepartment(activeDepartment);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={departmentDeleteOpen} title="Delete department" onClose={closeDeleteDialog}>
        {activeDepartment ? (
          <div className="space-y-5">
            <p className="text-base leading-7 text-slate-700">
              Are you sure you want to delete <span className="font-semibold text-slate-950">{activeDepartment.name}</span>?
            </p>
            {departmentError ? (
              <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {departmentError}
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="secondary" onClick={closeDeleteDialog} disabled={deletingDepartment}>
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={handleDeleteDepartment} loading={deletingDepartment}>
                Delete department
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminCard>
  );
}
