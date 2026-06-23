import { useEffect, useState, useMemo } from "react";
import { request, loadStoredTokens } from "../auth";
import {
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
} from "lucide-react";
import { useAdminDialog } from "../components/feedback/useAdminDialog";

export function StaffPage() {
  const { showAlert, showConfirm, DialogHost } = useAdminDialog();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    displayName: "",
    eventId: "",
    assignedGateId: "",
  });
  const [events, setEvents] = useState([]);

  const fetchStaff = async () => {
    try {
      const tokens = loadStoredTokens();
      const [staffData, eventsData] = await Promise.all([
        request("/admin/users/staff", { headers: { Authorization: `Bearer ${tokens.accessToken}` } }),
        request("/checkin/events", { headers: { Authorization: `Bearer ${tokens.accessToken}` } }).catch(() => ({ events: [] }))
      ]);
      setStaff(staffData);
      setEvents(eventsData.events || []);
    } catch (e) {
      console.error("Failed to load staff", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const stats = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((s) => s.isActive).length;
    const inactive = total - active;

    return { total, active, inactive };
  }, [staff]);

  const handleUpdateStatus = async (id, currentActive) => {
    try {
      const tokens = loadStoredTokens();
      await request(`/admin/users/staff/${id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: !currentActive }),
      });
      fetchStaff();
    } catch (e) {
      showAlert("Không thể cập nhật trạng thái nhân viên. Vui lòng thử lại.");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: "Xóa nhân viên?",
      message: "Tài khoản nhân viên sẽ bị xóa khỏi hệ thống. Thao tác này không thể hoàn tác.",
      confirmLabel: "Xóa",
    });
    if (!confirmed) return;
    try {
      const tokens = loadStoredTokens();
      await request(`/admin/users/staff/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      fetchStaff();
    } catch (e) {
      showAlert("Không thể xóa nhân viên. Vui lòng thử lại.");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const tokens = loadStoredTokens();
      await request("/auth/staff", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: formData.displayName,
          password: formData.password,
          assignedGateId: formData.assignedGateId
        }),
      });
      setShowCreateModal(false);
      setFormData({ password: "", displayName: "", eventId: "", assignedGateId: "" });
      fetchStaff();
    } catch (err) {
      showAlert(err.message || "Không thể tạo tài khoản nhân viên. Vui lòng thử lại.");
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#edf2f7] px-8 py-7">
        <div className="h-24 animate-pulse rounded-2xl bg-white" />
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Tổng nhân viên", value: stats.total, icon: Users },
    { label: "Đang hoạt động", value: stats.active, icon: CheckCircle },
    { label: "Bị khóa", value: stats.inactive, icon: XCircle },
  ];

  return (
    <div className="min-h-full bg-[#edf2f7] px-8 py-7 text-[#061527]">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-[-0.035em] text-[#061527]">
            Quản lý Nhân Viên
          </h1>
          <p className="mt-2 text-lg font-semibold text-[#4f6075]">
            Tạo, chỉnh sửa và quản lý tài khoản nhân viên của hệ thống.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#cbd6e2] bg-white px-5 text-sm font-black text-[#061527] shadow-[0_10px_24px_rgba(15,35,58,0.06)] transition hover:border-[#ff7118] hover:text-[#ff7118]"
        >
          <Plus className="h-4 w-4" />
          Tạo Nhân Viên
        </button>
      </header>

      <section className="mt-7 grid gap-4 lg:grid-cols-3">
        {statCards.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-[#cbd6e2] bg-white p-5 shadow-[0_10px_24px_rgba(15,35,58,0.08)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-[#061527]">
                  {item.label}
                </p>
                <p className="mt-3 text-4xl font-black tracking-[-0.05em] text-[#061527]">
                  {String(item.value).padStart(2, "0")}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0e7] text-[#ff7118]">
                <item.icon className="h-5 w-5" />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-5">
        <div className="rounded-2xl border border-[#cbd6e2] bg-white shadow-[0_10px_24px_rgba(15,35,58,0.07)]">
          <div className="border-b border-[#d8e0ea] px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.04em] text-[#42536a]">
                Danh sách
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#061527]">
                Nhân viên
              </h2>
            </div>
            <button
              onClick={fetchStaff}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#cbd6e2] bg-white px-4 py-2 text-sm font-black text-[#061527] transition hover:border-[#ff7118] hover:text-[#ff7118] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Làm mới
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#d8e0ea] bg-[#f8fafc]">
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-[0.04em] text-[#42536a]">
                    Nhân Viên
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-[0.04em] text-[#42536a]">
                    Email
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-black uppercase tracking-[0.04em] text-[#42536a]">
                    Trạng Thái
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-black uppercase tracking-[0.04em] text-[#42536a]">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-5 py-12 text-center">
                      <p className="text-sm font-semibold text-[#52637a]">
                        Chưa có nhân viên nào.
                      </p>
                    </td>
                  </tr>
                ) : (
                  staff.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[#e5eaf2] transition hover:bg-[#f8fafc]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#fff0e7] text-lg font-black text-[#ff7118]">
                            {user.displayName?.charAt(0) || "S"}
                          </div>
                          <div>
                            <p className="text-sm font-black text-[#061527]">
                              {user.displayName || "Chưa cập nhật"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-[#52637a]">
                          {user.email}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() =>
                            handleUpdateStatus(user.id, user.isActive)
                          }
                          className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-black transition ${
                            user.isActive
                              ? "bg-[#d0f0e0] text-[#0b7e4b]"
                              : "bg-[#fde1e1] text-[#c9302c]"
                          }`}
                        >
                          {user.isActive ? (
                            <>
                              <CheckCircle className="h-3.5 w-3.5" />
                              Hoạt động
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5" />
                              Bị khóa
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="inline-flex items-center justify-center rounded-lg border border-[#fde1e1] p-2 text-[#c9302c] transition hover:bg-[#fde1e1]"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#cbd6e2] bg-white p-6 shadow-[0_20px_40px_rgba(15,35,58,0.12)]">
            <h2 className="text-2xl font-black text-[#061527]">
              Tạo tài khoản Staff
            </h2>
            <p className="mt-1 text-sm font-semibold text-[#52637a]">
              Nhập thông tin để tạo nhân viên mới
            </p>

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-black text-[#061527] mb-1.5">
                  Họ và Tên
                </label>
                <input
                  required
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  className="h-10 w-full rounded-xl border border-[#cbd6e2] bg-white px-4 text-[#061527] outline-none transition focus:border-[#ff7118]"
                  placeholder="Nhập họ và tên..."
                />
              </div>

              <div>
                <label className="block text-sm font-black text-[#061527] mb-1.5">
                  Chọn Sự Kiện
                </label>
                <select
                  required
                  value={formData.eventId}
                  onChange={(e) =>
                    setFormData({ ...formData, eventId: e.target.value, assignedGateId: "" })
                  }
                  className="h-10 w-full rounded-xl border border-[#cbd6e2] bg-white px-4 text-[#061527] outline-none transition focus:border-[#ff7118]"
                >
                  <option value="" disabled>-- Chọn sự kiện --</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-black text-[#061527] mb-1.5">
                  Phân công Cổng
                </label>
                <select
                  required
                  disabled={!formData.eventId}
                  value={formData.assignedGateId}
                  onChange={(e) =>
                    setFormData({ ...formData, assignedGateId: e.target.value })
                  }
                  className="h-10 w-full rounded-xl border border-[#cbd6e2] bg-white px-4 text-[#061527] outline-none transition focus:border-[#ff7118] disabled:bg-[#f8fafc] disabled:text-[#8a98aa]"
                >
                  <option value="" disabled>-- Chọn cổng --</option>
                  {events.find(e => e.id === formData.eventId)?.gates?.map((gate) => (
                    <option key={gate.id} value={gate.id}>{gate.name} ({gate.type === 'VIP' ? 'VIP' : 'Thường'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-black text-[#061527] mb-1.5">
                  Mật khẩu
                </label>
                <input
                  required
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="h-10 w-full rounded-xl border border-[#cbd6e2] bg-white px-4 text-[#061527] outline-none transition focus:border-[#ff7118]"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-[#cbd6e2] bg-white px-4 py-2.5 text-sm font-black text-[#061527] transition hover:bg-[#f8fafc]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 rounded-xl border border-[#ff7118] bg-[#ff7118] px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#ff8c3a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreating ? "Đang tạo..." : "Tạo Nhân Viên"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <DialogHost />
    </div>
  );
}
