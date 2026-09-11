import React, { useState } from "react";
import { useAuth, EGYPTIAN_UNIVERSITIES } from "./clerk-auth";
import { StandardModal } from "@/components/ui/StandardModal";
import { GraduationCap, Building2, User, Phone, CreditCard, School, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

interface OnboardingModalProps {
  isOpen: boolean;
  onToast?: (msg: string) => void;
}

export function OnboardingModal({ isOpen, onToast }: OnboardingModalProps) {
  const { user, completeUserOnboarding } = useAuth();
  const [accountType, setAccountType] = useState<"student" | "owner">("student");
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [nationalId, setNationalId] = useState(user?.nationalId && user.nationalId !== "00000000000000" ? user.nationalId : "");
  const [university, setUniversity] = useState(user?.university || EGYPTIAN_UNIVERSITIES[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName || fullName.trim().length < 3) {
      setErrorMsg("الاسم الثلاثي أو الرباعي مطلوب (3 أحرف على الأقل)");
      return;
    }

    const cleanPhone = phoneNumber.trim();
    if (!/^(01[0125]\d{8}|\+201[0125]\d{8})$/.test(cleanPhone)) {
      setErrorMsg("رقم الهاتف يجب أن يكون رقم مصري صحيح (مثال: 01012345678)");
      return;
    }

    if (accountType === "student") {
      const cleanNationalId = nationalId.trim();
      if (!/^\d{14}$/.test(cleanNationalId)) {
        setErrorMsg("الرقم القومي يجب أن يتكون من 14 رقماً بالضبط");
        return;
      }
      if (!university) {
        setErrorMsg("يرجى اختيار الجامعة المقيد بها");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await completeUserOnboarding({
        accountType,
        fullName: fullName.trim(),
        phoneNumber: cleanPhone,
        nationalId: accountType === "student" ? nationalId.trim() : undefined,
        university: accountType === "student" ? university : undefined,
      });
      onToast?.("تم إكمال توثيق الحساب والدخول بنجاح!");
    } catch (err: any) {
      setErrorMsg(err?.message || "حدث خطأ أثناء حفظ بيانات الحساب.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={() => {}} // Cannot dismiss onboarding without completing
      maxWidthClassName="max-w-2xl"
      hideHeader={true}
      testId="onboarding-modal"
    >
      <div className="p-6 sm:p-8 text-right font-sans" dir="rtl">
        {/* Header */}
        <div className="mb-6 border-b border-border pb-5 text-center sm:text-right">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-2">
            مرحباً بك في منصة مكاني 👋
          </span>
          <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">إكمال بيانات الحساب والتأكيد</h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            يرجى تحديد نوع حسابك وإدخال بيانات التوثيق الرسمية للبدء في استخدام المنصة
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 flex items-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs font-bold text-rose-600 dark:text-rose-400">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Choose Account Type */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-3">اختر نوع الحساب في منصة مكاني:</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setAccountType("student")}
                className={`flex items-center gap-3.5 rounded-2xl border p-4 text-right transition-all ${
                  accountType === "student"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border bg-card hover:bg-muted/50"
                }`}
                data-testid="onboarding-select-student"
              >
                <div className={`rounded-xl p-3 shrink-0 ${accountType === "student" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <GraduationCap size={24} />
                </div>
                <div>
                  <strong className="block text-sm font-bold text-foreground">أنا طالب جامعي 🎓</strong>
                  <span className="text-[11px] text-muted-foreground leading-relaxed block mt-0.5">
                    أبحث عن سكن، حجوزات شقق، وعقود موثقة مع الملاك
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAccountType("owner")}
                className={`flex items-center gap-3.5 rounded-2xl border p-4 text-right transition-all ${
                  accountType === "owner"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border bg-card hover:bg-muted/50"
                }`}
                data-testid="onboarding-select-owner"
              >
                <div className={`rounded-xl p-3 shrink-0 ${accountType === "owner" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <Building2 size={24} />
                </div>
                <div>
                  <strong className="block text-sm font-bold text-foreground">أنا مالك عقار / مكتب 🏢</strong>
                  <span className="text-[11px] text-muted-foreground leading-relaxed block mt-0.5">
                    أعرض وحدات سكنية للطلاب، إدارات إيجار، وتوثيق عقود
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Form Fields */}
          <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/20 p-5">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                الاسم الرباعي الكامل <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: أحمد محمد محمود علي"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pr-10 text-xs font-semibold text-foreground outline-none focus:border-primary"
                  required
                  data-testid="onboarding-input-fullname"
                />
                <User size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">
                رقم الموبايل / واتساب التواصل <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="مثال: 01012345678"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pr-10 text-xs font-semibold text-foreground outline-none focus:border-primary font-mono"
                  required
                  data-testid="onboarding-input-phone"
                />
                <Phone size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
              </div>
            </div>

            {accountType === "student" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    الرقم القومي (14 رقماً) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={14}
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
                      placeholder="أدخل 14 رقماً من البطاقة الشخصية"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 pr-10 text-xs font-semibold text-foreground outline-none focus:border-primary font-mono"
                      required
                      data-testid="onboarding-input-nationalid"
                    />
                    <CreditCard size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
                  </div>
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    مطلوب لضمان وثوقية عقود السكن والضمانات القانونية.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    الجامعة المقيد بها <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-border bg-background px-3.5 py-2.5 pr-10 text-xs font-semibold text-foreground outline-none focus:border-primary"
                      required
                      data-testid="onboarding-select-university"
                    >
                      {EGYPTIAN_UNIVERSITIES.map((uni) => (
                        <option key={uni} value={uni}>{uni}</option>
                      ))}
                    </select>
                    <School size={16} className="pointer-events-none absolute right-3 top-3 text-muted-foreground" />
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-extrabold text-primary-foreground shadow-lg hover:-translate-y-0.5 disabled:opacity-50 transition-all"
            data-testid="onboarding-submit-btn"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جاري الحفظ والتوثيق...
              </span>
            ) : (
              <>
                <CheckCircle2 size={18} />
                حفظ بيانات الحساب ومتابعة الدخول
              </>
            )}
          </button>
        </form>
      </div>
    </StandardModal>
  );
}
