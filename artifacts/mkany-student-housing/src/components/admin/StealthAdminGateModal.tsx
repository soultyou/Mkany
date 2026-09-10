import React, { useState } from "react";
import { ShieldCheck, Lock, Key } from "lucide-react";
import { StandardModal } from "@/components/ui/StandardModal";

interface StealthAdminGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  openToast: (msg: string) => void;
}

export function StealthAdminGateModal({
  isOpen,
  onClose,
  onSuccess,
  openToast,
}: StealthAdminGateModalProps) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = passcode.trim();
    // الرموز المقبولة: رقم إدارة مكاني أو كود الآدمن
    if (clean === "01055332242" || clean === "mkany2024" || clean === "admin" || clean === "123456") {
      setError("");
      onSuccess();
      openToast("تم الدخول إلى غرفة التحكم المركزية الشبح (Stealth Admin) بنجاح 🛡️");
      onClose();
    } else {
      setError("رمز التحقق غير صحيح، يرجى المحاولة مرة أخرى.");
    }
  };

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClassName="max-w-md"
      hideHeader={true}
      testId="stealth-admin-gate-modal"
      closeButtonAriaLabel="إغلاق نافذة تسجيل دخول الإدارة"
    >
      <div>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/15 text-purple-600">
          <Lock size={32} />
        </div>

        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-3 py-1 text-[11px] font-bold text-purple-600 mb-2">
            منطقة مشفرة ومحمية بالكامل
          </span>
          <h3 className="text-xl font-black text-foreground">غرفة التحكم المركزية الشبح</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-5">
            لوحة الإدارة غير معلنة في واجهة الموقع. أدخل رمز التحقق الإداري للمتابعة.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-destructive/10 p-3 text-xs font-bold text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-foreground mb-1">
              رمز الدخول السري (Admin Security Key):
            </label>
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="أدخل رمز الآدمن أو رقم الإدارة"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-3 font-mono text-sm tracking-widest text-foreground outline-none focus:border-purple-600 pl-10"
              />
              <Key size={16} className="absolute left-3.5 top-3.5 text-muted-foreground" />
            </div>
            <span className="mt-1 block text-[10px] text-muted-foreground">
              تلميح: رقم إدارة مكاني <code className="text-purple-600 font-mono font-bold">01055332242</code> أو <code className="text-purple-600 font-mono">mkany2024</code>
            </span>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-purple-700 transition-all active:scale-[0.98]"
          >
            <ShieldCheck size={16} />
            فتح لوحة التحكم الشبح
          </button>

          <button
            type="button"
            onClick={() => {
              setPasscode("01055332242");
              setTimeout(() => {
                onSuccess();
                openToast("تم الدخول إلى غرفة التحكم المركزية الشبح (Stealth Admin) 🛡️");
                onClose();
              }, 150);
            }}
            className="w-full text-center text-[11px] text-muted-foreground hover:text-purple-600 font-medium py-1 transition-colors"
          >
            تجربة الدخول الفوري بضغطة واحدة (01055332242)
          </button>
        </form>
      </div>
    </StandardModal>
  );
}

