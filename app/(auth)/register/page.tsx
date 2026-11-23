'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff, Loader2, Gift, CheckCircle2, XCircle, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { spmbService } from '@/services/spmb.service';
import { TurnstileWidget, type TurnstileHandle } from '@/components/ui/TurnstileWidget';
import toast from 'react-hot-toast';

// Skema validasi: kode referral opsional, format REF-XXXXXX bila diisi.
const registerSchema = z
  .object({
    username: z.string().min(3, 'Username minimal 3 karakter'),
    email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Password minimal 8 karakter'),
    password_confirmation: z.string().min(1, 'Konfirmasi password wajib diisi'),
    referral_code: z
      .string()
      .optional()
      .refine((val) => !val || /^REF-[A-Z0-9]{6}$/i.test(val.trim()), {
        message: 'Format kode referral tidak valid (contoh: REF-A1B2C3)',
      }),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: 'Konfirmasi password tidak cocok',
    path: ['password_confirmation'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

type ReferralCheckState = {
  status: 'idle' | 'checking' | 'valid' | 'invalid';
  name?: string;
  message?: string;
};

export default function RegisterPage() {
  const { registerAndLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [referralCheck, setReferralCheck] = useState<ReferralCheckState>({ status: 'idle' });
  const [captchaToken, setCaptchaToken] = useState('');
  const [mounted, setMounted] = useState(false);
  const captchaRef = useRef<TurnstileHandle>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      phone: '',
      password: '',
      password_confirmation: '',
      referral_code: '',
    },
  });

  const passwordValue = watch('password') || '';
  const referralValue = watch('referral_code') || '';

  // Prefill kode referral dari query string (?ref=REF-XXXXXX).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral_code');
    if (ref) {
      setValue('referral_code', ref.trim().toUpperCase());
    }
  }, [setValue]);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length >= 8) strength += 33;
    if (pass.match(/[a-z]/) && pass.match(/[A-Z]/)) strength += 33;
    if (pass.match(/[0-9]/) && pass.match(/[^a-zA-Z0-9]/)) strength += 34;
    return strength;
  };

  const strength = getPasswordStrength(passwordValue);

  const checkReferral = async () => {
    const code = (getValues('referral_code') || '').trim().toUpperCase();
    if (!code) {
      setReferralCheck({ status: 'idle' });
      return;
    }
    if (!/^REF-[A-Z0-9]{6}$/i.test(code)) {
      setReferralCheck({ status: 'invalid', message: 'Format kode tidak valid.' });
      return;
    }

    setReferralCheck({ status: 'checking' });
    try {
      const res = await spmbService.validateReferral(code);
      setReferralCheck({
        status: 'valid',
        name: res?.data?.referrer_name,
        message: 'Kode referral valid.',
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
      const message =
        e?.response?.data?.errors?.referral_code?.[0] ||
        e?.response?.data?.message ||
        'Kode referral tidak valid.';
      setReferralCheck({ status: 'invalid', message });
    }
  };

  useEffect(() => {
    // Normalisasi uppercase & reset hasil verifikasi ketika kode berubah.
    const code = getValues('referral_code');
    if (code && code !== code.toUpperCase()) {
      setValue('referral_code', code.toUpperCase());
    }
    setReferralCheck((prev) => (prev.status === 'idle' ? prev : { status: 'idle' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referralValue]);

  const onSubmit = async (data: RegisterFormValues) => {
    if (siteKey && !captchaToken) {
      toast.error('Silakan selesaikan verifikasi keamanan.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: Record<string, unknown> = {
        username: data.username,
        email: data.email,
        phone: data.phone,
        password: data.password,
        password_confirmation: data.password_confirmation,
      };
      const code = (data.referral_code || '').trim().toUpperCase();
      if (code) payload.referral_code = code;
      if (captchaToken) payload.captcha_token = captchaToken;

      await registerAndLogin(payload, '/dashboard');
    } catch {
      // registerAndLogin sudah menangani toast error.
    } finally {
      setIsLoading(false);
      captchaRef.current?.reset();
    }
  };

  return (
    <div className="w-full animate-fade-in-up">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-[32px] sm:text-[36px] font-[800] text-slate-900 tracking-tight leading-[1.15] mb-3">
          Pendaftaran Mahasiswa Baru
        </h1>
        <p className="text-[15px] text-slate-500 font-medium leading-relaxed">
          Buat akun untuk memulai proses pendaftaran SPMB Anda.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          label="Username"
          type="text"
          required
          placeholder="contoh: budi_2026"
          error={errors.username?.message}
          className="h-12 bg-transparent border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 rounded-[10px] transition-all text-[15px] text-slate-800 placeholder:text-slate-400"
          {...register('username')}
        />

        <Input
          label="Email"
          type="email"
          required
          placeholder="nama@email.com"
          error={errors.email?.message}
          className="h-12 bg-transparent border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 rounded-[10px] transition-all text-[15px] text-slate-800 placeholder:text-slate-400"
          {...register('email')}
        />

        <Input
          label="Nomor WhatsApp"
          type="tel"
          placeholder="081234567890"
          hint="Gunakan nomor WhatsApp yang aktif."
          error={errors.phone?.message}
          className="h-12 bg-transparent border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 rounded-[10px] transition-all text-[15px] text-slate-800 placeholder:text-slate-400"
          {...register('phone')}
        />

        {/* Kode Referral (Opsional) */}
        <div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Kode Referral (Opsional)"
                type="text"
                placeholder="REF-A1B2C3"
                prefixIcon={<Gift size={16} />}
                error={errors.referral_code?.message}
                className="h-12 bg-transparent border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 rounded-[10px] transition-all text-[15px] text-slate-800 placeholder:text-slate-400 font-mono tracking-wider uppercase"
                {...register('referral_code')}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="shrink-0 h-12"
              icon={referralCheck.status === 'checking' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              onClick={checkReferral}
              disabled={referralCheck.status === 'checking' || !referralValue}
            >
              Cek
            </Button>
          </div>
          {referralCheck.status === 'valid' && (
            <p className="mt-4 text-xs text-emerald-600 font-semibold flex items-center gap-2">
              <CheckCircle2 size={16} /> Kode valid — direferensikan oleh {referralCheck.name}.
            </p>
          )}
          {referralCheck.status === 'invalid' && (
            <p className="mt-4 text-xs text-rose-600 font-semibold flex items-center gap-2">
              <XCircle size={16} /> {referralCheck.message}
            </p>
          )}
        </div>

        <div className="pt-2">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            required
            placeholder="Minimal 8 karakter"
            error={errors.password?.message}
            suffixIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
            className="h-12 bg-transparent border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 rounded-[10px] transition-all text-[15px] text-slate-800 placeholder:text-slate-400 pr-10"
            {...register('password')}
          />

          {/* Password Strength Indicator */}
          {passwordValue.length > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-2">
                <div className={`h-full transition-all duration-300 ${strength >= 33 ? 'bg-rose-500 w-1/3' : 'w-0'}`} />
                <div className={`h-full transition-all duration-300 ${strength >= 66 ? 'bg-amber-500 w-1/3' : 'w-0'}`} />
                <div className={`h-full transition-all duration-300 ${strength >= 100 ? 'bg-emerald-500 w-1/3' : 'w-0'}`} />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 w-14 text-right">
                {strength < 33 ? 'Lemah' : strength < 100 ? 'Sedang' : 'Kuat'}
              </span>
            </div>
          )}
        </div>

        <Input
          label="Konfirmasi Password"
          type={showConfirmPassword ? 'text' : 'password'}
          required
          placeholder="Ulangi password"
          error={errors.password_confirmation?.message}
          suffixIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-200 transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
          className="h-12 bg-transparent border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 rounded-[10px] transition-all text-[15px] text-slate-800 placeholder:text-slate-400 pr-10"
          {...register('password_confirmation')}
        />

        <div>
          <TurnstileWidget ref={captchaRef} action="register" onVerify={setCaptchaToken} />
        </div>

        <div className="pt-6">
          <Button
            type="submit"
            disabled={isLoading || (mounted && Boolean(siteKey) && !captchaToken)}
            className="w-full h-12 text-[15px] font-semibold bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-[10px] transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>Daftar Akun</span>
            )}
          </Button>
        </div>
      </form>

      {/* Footer Link */}
      <div className="mt-8 text-[14px] text-slate-500 text-center sm:text-left">
        Sudah punya akun?{' '}
        <Link
          href="/login"
          className="text-[#2563EB] font-medium hover:text-[#1D4ED8] hover:underline underline-offset-4 transition-colors"
        >
          Login di sini
        </Link>
      </div>
    </div>
  );
}
