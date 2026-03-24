"use client";
import { useEffect, useState, useCallback } from "react";
import { Trash2, Plus, Pencil, Download, KeyRound, ClipboardList, Eye, LayoutTemplate, GripVertical, X, Users } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { parseTemplate, DEFAULT_TEMPLATE, type TemplateRow } from "@/lib/drawerTemplate";

interface Branch {
  id: number; name: string; branchNum: string;
  users: { id: number; username: string }[];
}

interface AuditEntry {
  id: number; username: string; action: string; details: string; createdAt: string;
}

interface Viewer { id: number; username: string; createdAt: string; }
interface Employee { id: number; name: string; isActive: boolean; createdAt: string; }
type Tab = "branches" | "viewers" | "audit" | "template" | "employees";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("branches");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", branchNum: "", username: "", password: "", role: "branch" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  // Viewers
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [showAddViewer, setShowAddViewer] = useState(false);
  const [viewerForm, setViewerForm] = useState({ username: "", password: "" });
  const [viewerError, setViewerError] = useState("");

  // Audit
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPages, setAuditPages] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);

  // Template
  const [template, setTemplate] = useState<TemplateRow[]>(DEFAULT_TEMPLATE);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [newRowForm, setNewRowForm] = useState({ label: "", sign: "+" as "+" | "-" });
  const [showNewRow, setShowNewRow] = useState(false);

  // Employees
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empBranchId, setEmpBranchId] = useState<number | "">("");
  const [empLoading, setEmpLoading] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [empSaving, setEmpSaving] = useState(false);
  const [editEmpId, setEditEmpId] = useState<number | null>(null);
  const [editEmpName, setEditEmpName] = useState("");

  const fetchBranches = useCallback(async () => {
    const res = await fetch("/api/branches");
    setBranches(await res.json());
    setLoading(false);
  }, []);

  const fetchViewers = useCallback(async () => {
    const res = await fetch("/api/viewers");
    if (res.ok) setViewers(await res.json());
  }, []);

  const fetchAudit = useCallback(async (page = 1) => {
    setAuditLoading(true);
    const res = await fetch(`/api/audit?page=${page}&limit=30`);
    if (res.ok) {
      const data = await res.json();
      setAuditLogs(data.logs);
      setAuditPages(data.pages);
      setAuditTotal(data.total);
      setAuditPage(page);
    }
    setAuditLoading(false);
  }, []);

  const fetchTemplate = useCallback(async () => {
    const res = await fetch("/api/settings?key=drawerTemplate");
    if (res.ok) {
      const data = await res.json();
      setTemplate(parseTemplate(data.value));
    }
  }, []);

  const fetchEmployees = useCallback(async (branchId: number) => {
    setEmpLoading(true);
    const res = await fetch(`/api/branches/${branchId}/employees`);
    if (res.ok) setEmployees(await res.json());
    else setEmployees([]);
    setEmpLoading(false);
  }, []);

  const saveTemplate = async () => {
    setTemplateSaving(true);
    await fetch("/api/settings", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "drawerTemplate", value: JSON.stringify(template) }),
    });
    setTemplateSaving(false); setTemplateSaved(true);
    setTimeout(() => setTemplateSaved(false), 2500);
  };

  const toggleRow = (key: string) => {
    setTemplate(prev => prev.map(r => r.key === key ? { ...r, enabled: !r.enabled } : r));
  };

  const removeRow = (key: string) => {
    setTemplate(prev => prev.filter(r => r.key !== key));
  };

  const addCustomRow = () => {
    if (!newRowForm.label.trim()) return;
    const key = `custom_${Date.now()}`;
    setTemplate(prev => [...prev, { key, label: newRowForm.label.trim(), sign: newRowForm.sign, enabled: true, custom: true }]);
    setNewRowForm({ label: "", sign: "+" });
    setShowNewRow(false);
  };

  useEffect(() => { fetchBranches(); }, [fetchBranches]);
  useEffect(() => { if (tab === "viewers") fetchViewers(); }, [tab, fetchViewers]);
  useEffect(() => { if (tab === "audit") fetchAudit(1); }, [tab, fetchAudit]);
  useEffect(() => { if (tab === "template") fetchTemplate(); }, [tab, fetchTemplate]);
  useEffect(() => {
    if (tab === "employees" && empBranchId !== "") fetchEmployees(empBranchId as number);
  }, [tab, empBranchId, fetchEmployees]);

  const openAdd = () => { setForm({ name: "", branchNum: "", username: "", password: "", role: "branch" }); setError(""); setShowAdd(true); };
  const openEdit = (branch: Branch) => { setForm({ name: branch.name, branchNum: branch.branchNum, username: branch.users[0]?.username ?? "", password: "", role: "branch" }); setError(""); setEditBranch(branch); };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError("");
    const res = await fetch("/api/branches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { setError((await res.json()).error || "حدث خطأ"); setSaving(false); return; }
    setShowAdd(false); setSaving(false); fetchBranches();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editBranch) return; setSaving(true); setError("");
    const res = await fetch(`/api/branches/${editBranch.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { setError("حدث خطأ"); setSaving(false); return; }
    setEditBranch(null); setSaving(false); fetchBranches();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`هل تريد حذف فرع "${name}" وجميع بياناته؟`)) return;
    await fetch(`/api/branches/${id}`, { method: "DELETE" });
    fetchBranches();
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault(); setPwError(""); setPwSuccess(false);
    if (pwForm.newPassword !== pwForm.confirm) { setPwError("كلمة المرور الجديدة غير متطابقة"); return; }
    setSaving(true);
    const res = await fetch("/api/auth/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }) });
    if (!res.ok) { setPwError((await res.json()).error || "حدث خطأ"); setSaving(false); return; }
    setPwSuccess(true); setSaving(false); setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
  };

  const handleBackup = () => { window.location.href = "/api/backup"; };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || empBranchId === "") return;
    setEmpSaving(true);
    const res = await fetch(`/api/branches/${empBranchId}/employees`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newEmpName.trim() }),
    });
    if (res.ok) { setNewEmpName(""); setShowAddEmp(false); fetchEmployees(empBranchId as number); }
    setEmpSaving(false);
  };

  const handleToggleEmployee = async (emp: Employee) => {
    await fetch(`/api/branches/${empBranchId}/employees/${emp.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !emp.isActive }),
    });
    if (empBranchId !== "") fetchEmployees(empBranchId as number);
  };

  const handleRenameEmployee = async (id: number, name: string) => {
    await fetch(`/api/branches/${empBranchId}/employees/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setEditEmpId(null); setEditEmpName("");
    if (empBranchId !== "") fetchEmployees(empBranchId as number);
  };

  const handleAddViewer = async (e: React.FormEvent) => {
    e.preventDefault(); setViewerError(""); setSaving(true);
    const res = await fetch("/api/viewers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(viewerForm) });
    if (!res.ok) { setViewerError((await res.json()).error || "حدث خطأ"); setSaving(false); return; }
    setShowAddViewer(false); setViewerForm({ username: "", password: "" }); setSaving(false); fetchViewers();
  };

  const handleDeleteViewer = async (id: number, username: string) => {
    if (!confirm(`حذف حساب المراقب "${username}"؟`)) return;
    await fetch(`/api/viewers/${id}`, { method: "DELETE" });
    fetchViewers();
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-black text-gray-800">إدارة النظام</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPassword(true)} className="flex items-center gap-1.5 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition">
            <KeyRound size={14} /> تغيير كلمة المرور
          </button>
          <button onClick={handleBackup} className="flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl transition border border-emerald-200">
            <Download size={14} /> نسخة احتياطية
          </button>
          {tab === "branches" && (
            <button onClick={openAdd} className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-xl hover:bg-blue-800 transition text-sm">
              <Plus size={16} /> فرع جديد
            </button>
          )}
          {tab === "viewers" && (
            <button onClick={() => { setViewerForm({ username: "", password: "" }); setViewerError(""); setShowAddViewer(true); }}
              className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl hover:bg-violet-700 transition text-sm">
              <Plus size={16} /> مراقب جديد
            </button>
          )}
          {tab === "employees" && empBranchId !== "" && (
            <button onClick={() => { setShowAddEmp(true); setNewEmpName(""); }}
              className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-xl hover:bg-teal-700 transition text-sm">
              <Plus size={16} /> موظف جديد
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        <button onClick={() => setTab("branches")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "branches" ? "bg-white shadow-sm text-blue-700" : "text-slate-500 hover:text-slate-700"}`}>
          الفروع والحسابات
        </button>
        <button onClick={() => setTab("viewers")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "viewers" ? "bg-white shadow-sm text-violet-700" : "text-slate-500 hover:text-slate-700"}`}>
          <Eye size={14} /> المراقبون
        </button>
        <button onClick={() => setTab("audit")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "audit" ? "bg-white shadow-sm text-blue-700" : "text-slate-500 hover:text-slate-700"}`}>
          <ClipboardList size={14} /> سجل التغييرات
        </button>
        <button onClick={() => setTab("template")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "template" ? "bg-white shadow-sm text-orange-700" : "text-slate-500 hover:text-slate-700"}`}>
          <LayoutTemplate size={14} /> قالب اليومية
        </button>
        <button onClick={() => setTab("employees")} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === "employees" ? "bg-white shadow-sm text-teal-700" : "text-slate-500 hover:text-slate-700"}`}>
          <Users size={14} /> الموظفون
        </button>
      </div>

      {/* Branches Tab */}
      {tab === "branches" && (
        loading ? (
          <div className="text-center py-16 text-gray-400">جاري التحميل...</div>
        ) : branches.length === 0 ? (
          <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200">
            <p className="mb-3">لا توجد فروع بعد</p>
            <button onClick={openAdd} className="text-blue-600 hover:underline text-sm">أضف أول فرع</button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">اسم الفرع</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">رقم الفرع</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-600">اسم المستخدم</th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr key={branch.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-800">{branch.name}</td>
                    <td className="px-4 py-3 text-gray-500">{branch.branchNum || "—"}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{branch.users[0]?.username ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(branch)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(branch.id, branch.name)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Viewers Tab */}
      {tab === "viewers" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {viewers.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              <Eye size={36} className="mx-auto mb-3 text-slate-200" />
              <p>لا يوجد مراقبون بعد</p>
              <button onClick={() => { setViewerForm({ username: "", password: "" }); setViewerError(""); setShowAddViewer(true); }}
                className="mt-3 text-violet-600 hover:underline text-sm">أضف أول مراقب</button>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 bg-violet-50 border-b border-violet-100">
                <p className="text-xs text-violet-600 font-medium">المراقبون يستطيعون رؤية جميع الفروع والتقارير بدون صلاحية التعديل</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">اسم المستخدم</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">تاريخ الإنشاء</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {viewers.map((v) => (
                    <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-violet-700 font-bold">{v.username}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(v.createdAt).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDeleteViewer(v.id, v.username)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Audit Tab */}
      {tab === "audit" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {auditLoading ? (
            <div className="text-center py-16 text-slate-400 animate-pulse text-sm">جاري التحميل...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">لا توجد سجلات بعد</div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">{auditTotal} إجمالي السجلات</span>
                <div className="flex gap-1">
                  <button disabled={auditPage <= 1} onClick={() => fetchAudit(auditPage - 1)} className="px-2 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition">السابق</button>
                  <span className="px-2 py-1 text-xs text-slate-500">{auditPage} / {auditPages}</span>
                  <button disabled={auditPage >= auditPages} onClick={() => fetchAudit(auditPage + 1)} className="px-2 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition">التالي</button>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <div key={log.id} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{log.action}</span>
                        <span className="text-xs text-slate-500 font-mono">{log.username}</span>
                      </div>
                      {log.details && <p className="text-xs text-slate-500 mt-1">{log.details}</p>}
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit" })}
                      {" "}
                      {new Date(log.createdAt).toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Template Tab */}
      {tab === "template" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">صفوف حساب الرصيد</p>
                <p className="text-xs text-slate-400 mt-0.5">فعّل أو أوقف أي صف، أو أضف صفوفاً مخصصة جديدة</p>
              </div>
              <div className="flex items-center gap-2">
                {templateSaved && <span className="text-xs text-emerald-600 font-medium">✓ تم الحفظ</span>}
                <button onClick={saveTemplate} disabled={templateSaving}
                  className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium px-4 py-2 rounded-xl transition disabled:opacity-60">
                  {templateSaving ? "جاري الحفظ..." : "حفظ القالب"}
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {template.map((row) => (
                <div key={row.key} className={`flex items-center gap-3 px-4 py-3 ${!row.enabled ? "opacity-50 bg-slate-50" : "hover:bg-slate-50"} transition`}>
                  <GripVertical size={14} className="text-slate-300 shrink-0" />
                  <span className={`text-xs font-black w-5 text-center shrink-0 ${row.sign === "+" ? "text-blue-500" : "text-rose-400"}`}>
                    {row.sign === "+" ? "+" : "−"}
                  </span>
                  <span className="text-sm text-slate-700 flex-1">{row.label}</span>
                  {row.custom && (
                    <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">مخصص</span>
                  )}
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={row.enabled} onChange={() => toggleRow(row.key)}
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                    <span className="text-xs text-slate-500">{row.enabled ? "مفعّل" : "موقوف"}</span>
                  </label>
                  {row.custom && (
                    <button onClick={() => removeRow(row.key)}
                      className="text-slate-300 hover:text-red-500 transition p-1">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add new custom row */}
            {showNewRow ? (
              <div className="border-t border-dashed border-slate-200 p-4 bg-orange-50">
                <p className="text-xs font-semibold text-slate-600 mb-3">إضافة صف مخصص جديد</p>
                <div className="flex gap-2 items-end flex-wrap">
                  <div className="flex-1 min-w-40">
                    <label className="text-xs text-slate-500 mb-1 block">اسم الصف</label>
                    <input type="text" value={newRowForm.label}
                      onChange={(e) => setNewRowForm({ ...newRowForm, label: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") addCustomRow(); }}
                      placeholder="مثال: يخصم مصاريف توصيل"
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      autoFocus
                    />
                  </div>
                  <div className="w-32">
                    <label className="text-xs text-slate-500 mb-1 block">النوع</label>
                    <select value={newRowForm.sign} onChange={(e) => setNewRowForm({ ...newRowForm, sign: e.target.value as "+" | "-" })}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                      <option value="+">+ إضافة</option>
                      <option value="-">− خصم</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addCustomRow}
                      className="bg-orange-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-orange-700 transition font-medium">
                      إضافة
                    </button>
                    <button onClick={() => { setShowNewRow(false); setNewRowForm({ label: "", sign: "+" }); }}
                      className="bg-slate-100 text-slate-600 text-sm px-3 py-2 rounded-xl hover:bg-slate-200 transition">
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-dashed border-slate-200 p-3">
                <button onClick={() => setShowNewRow(true)}
                  className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-800 hover:bg-orange-50 px-3 py-2 rounded-xl transition w-full justify-center font-medium">
                  <Plus size={14} /> إضافة صف جديد للحساب
                </button>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            <p className="font-semibold mb-1">ملاحظة:</p>
            <p>• الصفوف الموقوفة تظل محفوظة في البيانات لكنها لا تظهر في اليومية</p>
            <p>• الصفوف المخصصة قابلة للحذف نهائياً من القالب</p>
            <p>• لا تنسَ الضغط على &quot;حفظ القالب&quot; بعد أي تغيير</p>
          </div>
        </div>
      )}

      {/* Employees Tab */}
      {tab === "employees" && (
        <div className="space-y-4">
          {/* Branch selector */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <Users size={16} className="text-teal-600 flex-shrink-0" />
            <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">اختر الفرع:</label>
            <select
              value={empBranchId}
              onChange={(e) => { setEmpBranchId(e.target.value ? parseInt(e.target.value) : ""); setShowAddEmp(false); }}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
            >
              <option value="">— اختر فرعاً —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {empBranchId !== "" && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {empLoading ? (
                <div className="text-center py-12 text-slate-400 text-sm animate-pulse">جاري التحميل...</div>
              ) : (
                <>
                  {/* Add employee inline form */}
                  {showAddEmp && (
                    <form onSubmit={handleAddEmployee} className="border-b border-teal-100 bg-teal-50 px-4 py-3 flex gap-2 items-center">
                      <input
                        type="text" autoFocus value={newEmpName}
                        onChange={(e) => setNewEmpName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") { setShowAddEmp(false); setNewEmpName(""); } }}
                        placeholder="اسم الموظف..."
                        className="flex-1 text-sm border border-teal-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                      />
                      <button type="submit" disabled={empSaving || !newEmpName.trim()}
                        className="bg-teal-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-teal-700 transition disabled:opacity-50">
                        {empSaving ? "..." : "إضافة"}
                      </button>
                      <button type="button" onClick={() => { setShowAddEmp(false); setNewEmpName(""); }}
                        className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100">
                        <X size={14} />
                      </button>
                    </form>
                  )}

                  {employees.length === 0 ? (
                    <div className="text-center py-12">
                      <Users size={36} className="mx-auto mb-3 text-slate-200" />
                      <p className="text-slate-400 text-sm">لا يوجد موظفون لهذا الفرع بعد</p>
                      <button onClick={() => setShowAddEmp(true)} className="mt-3 text-teal-600 hover:underline text-sm">أضف أول موظف</button>
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-right font-semibold text-gray-600">الاسم</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-600">الحالة</th>
                          <th className="px-4 py-3 w-28"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp) => (
                          <tr key={emp.id} className={`border-t border-gray-100 ${!emp.isActive ? "opacity-50 bg-gray-50" : "hover:bg-gray-50"}`}>
                            <td className="px-4 py-3">
                              {editEmpId === emp.id ? (
                                <div className="flex gap-2">
                                  <input autoFocus type="text" value={editEmpName}
                                    onChange={(e) => setEditEmpName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleRenameEmployee(emp.id, editEmpName);
                                      if (e.key === "Escape") { setEditEmpId(null); setEditEmpName(""); }
                                    }}
                                    className="text-sm border border-teal-300 rounded-xl px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-400"
                                  />
                                  <button onClick={() => handleRenameEmployee(emp.id, editEmpName)}
                                    className="text-xs bg-teal-600 text-white px-2 py-1 rounded-lg hover:bg-teal-700">حفظ</button>
                                  <button onClick={() => { setEditEmpId(null); setEditEmpName(""); }}
                                    className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded-lg hover:bg-slate-100">إلغاء</button>
                                </div>
                              ) : (
                                <span className="font-medium text-gray-800">{emp.name}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${emp.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                                {emp.isActive ? "نشط" : "موقوف"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1 justify-end">
                                <button onClick={() => { setEditEmpId(emp.id); setEditEmpName(emp.name); }}
                                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"><Pencil size={13} /></button>
                                <button onClick={() => handleToggleEmployee(emp)}
                                  className={`p-1.5 rounded-lg transition ${emp.isActive ? "text-red-400 hover:bg-red-50" : "text-emerald-500 hover:bg-emerald-50"}`}>
                                  {emp.isActive ? <X size={13} /> : <Plus size={13} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <Modal title="إضافة فرع جديد" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-3">
            <Field label="اسم الفرع" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="رقم الفرع" value={form.branchNum} onChange={(v) => setForm({ ...form, branchNum: v })} />
            <hr /><p className="text-xs text-gray-500 font-medium">حساب الموظف</p>
            <Field label="اسم المستخدم" value={form.username} onChange={(v) => setForm({ ...form, username: v })} required />
            <Field label="كلمة المرور" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required type="password" />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 bg-blue-700 text-white py-2 rounded-xl font-medium hover:bg-blue-800 disabled:opacity-60">{saving ? "جاري الحفظ..." : "حفظ"}</button>
              <button type="button" onClick={() => setShowAdd(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl hover:bg-gray-200">إلغاء</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editBranch && (
        <Modal title={`تعديل فرع: ${editBranch.name}`} onClose={() => setEditBranch(null)}>
          <form onSubmit={handleEdit} className="space-y-3">
            <Field label="اسم الفرع" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="رقم الفرع" value={form.branchNum} onChange={(v) => setForm({ ...form, branchNum: v })} />
            <hr /><p className="text-xs text-gray-500 font-medium">تعديل الحساب (اتركه فارغاً إذا لم تريد التغيير)</p>
            <Field label="اسم المستخدم الجديد" value={form.username} onChange={(v) => setForm({ ...form, username: v })} />
            <Field label="كلمة المرور الجديدة" value={form.password} onChange={(v) => setForm({ ...form, password: v })} type="password" placeholder="اتركه فارغاً للإبقاء على القديمة" />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 bg-blue-700 text-white py-2 rounded-xl font-medium hover:bg-blue-800 disabled:opacity-60">{saving ? "جاري الحفظ..." : "تحديث"}</button>
              <button type="button" onClick={() => setEditBranch(null)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl hover:bg-gray-200">إلغاء</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Viewer Modal */}
      {showAddViewer && (
        <Modal title="إضافة مراقب جديد" onClose={() => setShowAddViewer(false)}>
          <div className="mb-3 p-3 bg-violet-50 rounded-xl text-xs text-violet-600">
            المراقب يستطيع رؤية جميع الفروع والتقارير بدون صلاحية التعديل أو الحذف.
          </div>
          <form onSubmit={handleAddViewer} className="space-y-3">
            <Field label="اسم المستخدم" value={viewerForm.username} onChange={(v) => setViewerForm({ ...viewerForm, username: v })} required />
            <Field label="كلمة المرور" value={viewerForm.password} onChange={(v) => setViewerForm({ ...viewerForm, password: v })} required type="password" />
            {viewerError && <p className="text-red-600 text-sm">{viewerError}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 bg-violet-600 text-white py-2 rounded-xl font-medium hover:bg-violet-700 disabled:opacity-60">{saving ? "جاري الحفظ..." : "إضافة"}</button>
              <button type="button" onClick={() => setShowAddViewer(false)} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl hover:bg-gray-200">إلغاء</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change Password Modal */}
      {showPassword && (
        <Modal title="تغيير كلمة مرور المدير" onClose={() => { setShowPassword(false); setPwError(""); setPwSuccess(false); }}>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <Field label="كلمة المرور الحالية" value={pwForm.currentPassword} onChange={(v) => setPwForm({ ...pwForm, currentPassword: v })} required type="password" />
            <Field label="كلمة المرور الجديدة" value={pwForm.newPassword} onChange={(v) => setPwForm({ ...pwForm, newPassword: v })} required type="password" />
            <Field label="تأكيد كلمة المرور الجديدة" value={pwForm.confirm} onChange={(v) => setPwForm({ ...pwForm, confirm: v })} required type="password" />
            {pwError && <p className="text-red-600 text-sm">{pwError}</p>}
            {pwSuccess && <p className="text-emerald-600 text-sm font-medium">✓ تم تغيير كلمة المرور بنجاح</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving} className="flex-1 bg-blue-700 text-white py-2 rounded-xl font-medium hover:bg-blue-800 disabled:opacity-60">{saving ? "جاري الحفظ..." : "تغيير"}</button>
              <button type="button" onClick={() => { setShowPassword(false); setPwError(""); setPwSuccess(false); }} className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl hover:bg-gray-200">إلغاء</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 mr-1">*</span>}
      </label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        required={required} placeholder={placeholder}
        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
