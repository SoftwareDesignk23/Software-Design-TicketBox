import { useCallback, useState } from "react";
import { AlertCircle, CheckCircle2, HelpCircle, X } from "lucide-react";

const variantStyles = {
  info: {
    icon: CheckCircle2,
    iconClass: "bg-[#e8f8ee] text-[#0aa24f]",
    actionClass: "bg-[#ff7118] text-white hover:bg-[#ff5d0a]",
  },
  error: {
    icon: AlertCircle,
    iconClass: "bg-[#fff0f1] text-[#ef2534]",
    actionClass: "bg-[#ef2534] text-white hover:bg-[#d91f2d]",
  },
  confirm: {
    icon: HelpCircle,
    iconClass: "bg-[#fff0e7] text-[#ff7118]",
    actionClass: "bg-[#ff7118] text-white hover:bg-[#ff5d0a]",
  },
};

export function useAdminDialog() {
  const [dialog, setDialog] = useState(null);

  const closeDialog = useCallback(() => {
    setDialog((current) => {
      if (current?.resolve) current.resolve(false);
      return null;
    });
  }, []);

  const showAlert = useCallback((message, options = {}) => {
    setDialog({
      type: "alert",
      variant: options.variant || "error",
      title: options.title || "Có lỗi xảy ra",
      message,
      actionLabel: options.actionLabel || "Đã hiểu",
    });
  }, []);

  const showConfirm = useCallback(
    ({ title = "Xác nhận thao tác", message, confirmLabel = "Xác nhận", cancelLabel = "Hủy" }) =>
      new Promise((resolve) => {
        setDialog({
          type: "confirm",
          variant: "confirm",
          title,
          message,
          confirmLabel,
          cancelLabel,
          resolve,
        });
      }),
    [],
  );

  const handleConfirm = useCallback(() => {
    setDialog((current) => {
      if (current?.resolve) current.resolve(true);
      return null;
    });
  }, []);

  const handleCancel = useCallback(() => {
    setDialog((current) => {
      if (current?.resolve) current.resolve(false);
      return null;
    });
  }, []);

  const DialogHost = useCallback(() => {
    if (!dialog) return null;

    const styles = variantStyles[dialog.variant] || variantStyles.info;
    const Icon = styles.icon;

    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#061527]/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-[#d8e0ea] bg-white p-6 shadow-[0_24px_80px_rgba(6,21,39,0.24)]">
          <div className="flex items-start justify-between gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${styles.iconClass}`}>
              <Icon className="h-6 w-6" />
            </div>
            <button
              type="button"
              onClick={dialog.type === "confirm" ? handleCancel : closeDialog}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d8e0ea] bg-white text-[#061527] transition hover:border-[#ff7118] hover:text-[#ff7118]"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <h2 className="mt-5 text-2xl font-black tracking-[-0.025em] text-[#061527]">
            {dialog.title}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#52637a]">
            {dialog.message}
          </p>

          <div className="mt-6 flex justify-end gap-3">
            {dialog.type === "confirm" ? (
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-[#d8e0ea] bg-white px-4 py-2 text-sm font-black text-[#061527] transition hover:bg-[#f8fafc]"
              >
                {dialog.cancelLabel}
              </button>
            ) : null}
            <button
              type="button"
              onClick={dialog.type === "confirm" ? handleConfirm : closeDialog}
              className={`rounded-xl px-4 py-2 text-sm font-black transition ${styles.actionClass}`}
            >
              {dialog.type === "confirm" ? dialog.confirmLabel : dialog.actionLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }, [closeDialog, dialog, handleCancel, handleConfirm]);

  return { showAlert, showConfirm, DialogHost };
}
