'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Select, type SelectOption } from '@/components/ui/Select';
import { AsyncSelect } from '@/components/ui/AsyncSelect';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  Save,
  Settings,
  Users,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Mail,
  Globe,
  Server,
  Send,
  Eye,
  EyeOff,
  Database,
  Cloud,
  BookOpen,
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Sparkles,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import apiClient from '@/lib/axios';
import { feederService } from '@/services/feeder.service';
import { notifySystemLogoUpdated } from '@/components/layout/SystemLogo';

const SCHEME_OPTIONS: SelectOption[] = [
  { value: 'smtps', label: 'SSL / SMTPS (Port 465)' },
  { value: 'tls', label: 'TLS / STARTTLS (Port 587)' },
  { value: 'none', label: 'Tanpa Enkripsi (Port 25)' },
];

const DISK_OPTIONS: SelectOption[] = [
  { value: 'local', label: 'Local (Server Storage Lokal)' },
  { value: 'r2', label: 'Cloudflare R2 (Cloud Object Storage)' },
];

const TOKEN_ABSENSI_OPTIONS: SelectOption[] = [
  { value: 'true', label: 'Diizinkan (Dosen dapat membuat Token 6-Digit)' },
  { value: 'false', label: 'Dinonaktifkan (Hanya Input Absensi Manual Dosen)' },
];

const PUBLIC_DISK_OPTIONS: SelectOption[] = [
  { value: 'public', label: 'Local Public (storage/app/public)' },
  { value: 'r2', label: 'Cloudflare R2 Public (Bucket Publik)' },
];

const PRIVATE_DISK_OPTIONS: SelectOption[] = [
  { value: 'public', label: 'Local Public (storage/app/public)' },
  { value: 'local', label: 'Local Private (storage/app/private)' },
  { value: 'r2-private', label: 'Cloudflare R2 Private (Bucket Privat / Presigned)' },
];

const PATH_STYLE_OPTIONS: SelectOption[] = [
  { value: 'true', label: 'True (Rekomendasi R2 Cloudflare: endpoint/bucket/key)' },
  { value: 'false', label: 'False (Virtual-Hosted Style: bucket.endpoint/key)' },
];

const settingsSchema = z.object({
  // Role & Permissions
  default_register_role: z.string().min(1, 'Role pendaftaran wajib dipilih'),
  third_party_registration_role: z.string().min(1, 'Role pihak ketiga wajib dipilih'),
  superadmin_role: z.string().min(1, 'Role superadmin wajib dipilih'),
  restricted_role_ids: z.array(z.number().int().positive()),

  // Google Workspace
  google_workspace_domain: z.string().optional(),
  google_workspace_admin_email: z.string().optional(),
  google_workspace_credentials: z.string().optional(),

  // SMTP Mailer
  mail_host: z.string().min(1, 'Host SMTP wajib diisi'),
  mail_port: z.string().min(1, 'Port SMTP wajib diisi'),
  mail_scheme: z.string().min(1, 'Protokol enkripsi wajib dipilih'),
  mail_username: z.string().optional(),
  mail_password: z.string().optional(),
  mail_from_address: z
    .string()
    .min(1, 'Alamat email pengirim wajib diisi')
    .email('Format email pengirim tidak valid'),
  mail_from_name: z.string().min(1, 'Nama pengirim wajib diisi'),

  // Neo Feeder
  feeder_url: z
    .string()
    .min(1, 'URL WS Feeder wajib diisi')
    .url('Format URL WS Feeder tidak valid'),
  feeder_username: z.string().min(1, 'Username Feeder wajib diisi'),
  feeder_password: z.string().optional(),

  // Cloudflare R2 / Storage
  filesystem_disk: z.string().min(1),
  filesystem_public_disk: z.string().min(1),
  filesystem_private_disk: z.string().min(1),
  r2_endpoint: z.string().optional(),
  r2_access_key_id: z.string().optional(),
  r2_secret_access_key: z.string().optional(),
  r2_bucket: z.string().optional(),
  r2_url: z.string().optional(),
  r2_private_bucket: z.string().optional(),
  r2_private_url: z.string().optional(),
  r2_default_region: z.string().optional(),
  r2_use_path_style_endpoint: z.string().min(1),

  // LMS & Absensi Perkuliahan
  lms_storage_disk: z.string().min(1, 'Pilihan storage disk LMS wajib ditentukan'),
  lms_max_file_materi_mb: z.string().min(1, 'Batas ukuran file materi minimal 1 MB'),
  lms_max_video_mb: z.string().min(1, 'Batas ukuran video minimal 1 MB'),
  lms_max_file_tugas_mb: z.string().min(1, 'Batas ukuran file tugas minimal 1 MB'),
  lms_allow_token_absensi: z.string().min(1),
  lms_token_ttl_minutes: z.string().min(1, 'Masa berlaku token minimal 1 menit'),

  // Branding & Banner Login (SSO/IAM)
  system_logo_url: z.string().optional(),
  login_banner_url: z.string().optional(),
  login_banner_title: z.string().optional(),
  login_banner_subtitle: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const testSmtpEmailSchema = z
  .string()
  .trim()
  .min(1, 'Email penerima uji coba wajib diisi')
  .email('Format email penerima uji coba tidak valid');

const defaultValues: SettingsFormValues = {
  default_register_role: 'calon_mhs',
  third_party_registration_role: '',
  superadmin_role: 'superadmin',
  restricted_role_ids: [],
  google_workspace_domain: 'student.campus.ac.id',
  google_workspace_admin_email: '',
  google_workspace_credentials: '',
  mail_host: 'smtp.gmail.com',
  mail_port: '465',
  mail_scheme: 'smtps',
  mail_username: '',
  mail_password: '',
  mail_from_address: '',
  mail_from_name: 'Sistem Terintegrasi Kampus',
  feeder_url: 'http://localhost:8100/ws/live2.php',
  feeder_username: 'admin_siakad',
  feeder_password: '',
  filesystem_disk: 'local',
  filesystem_public_disk: 'public',
  filesystem_private_disk: 'public',
  r2_endpoint: '',
  r2_access_key_id: '',
  r2_secret_access_key: '',
  r2_bucket: '',
  r2_url: '',
  r2_private_bucket: '',
  r2_private_url: '',
  r2_default_region: 'auto',
  r2_use_path_style_endpoint: 'true',
  lms_storage_disk: 'r2',
  lms_max_file_materi_mb: '50',
  lms_max_video_mb: '500',
  lms_max_file_tugas_mb: '50',
  lms_allow_token_absensi: 'true',
  lms_token_ttl_minutes: '15',
  system_logo_url: '',
  login_banner_url: '',
  login_banner_title: 'SSO Campus',
  login_banner_subtitle: 'Enterprise Identity Platform',
};

export default function SystemSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialValues, setInitialValues] = useState<SettingsFormValues>(defaultValues);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [savedSections, setSavedSections] = useState<Record<string, boolean>>({});

  // Branding image upload state
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  // SMTP state
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testEmailError, setTestEmailError] = useState<string | undefined>(undefined);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  // Feeder state
  const [showFeederPassword, setShowFeederPassword] = useState(false);
  const [isTestingFeeder, setIsTestingFeeder] = useState(false);
  const [feederTokenInfo, setFeederTokenInfo] = useState<string | null>(null);
  // R2 state
  const [showR2Secret, setShowR2Secret] = useState(false);
  const [isTestingR2, setIsTestingR2] = useState(false);
  const [r2TestResult, setR2TestResult] = useState<{ success: boolean; message: string } | null>(null);

  const {
    register,
    control,
    reset,
    getValues,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  });

  // Watch form values to detect changes per section
  const currentValues = watch();

  const loadRolesOptions = async (query: string) => {
    try {
      const res = await apiClient.get('/admin/roles', {
        params: { search: query, limit: 50 },
      });
      const rawRoles = res.data?.data?.data || res.data?.data || [];
      return (Array.isArray(rawRoles) ? rawRoles : []).map((r: any) => ({
        value: r.slug,
        label: `${r.name} (${r.slug})`,
      }));
    } catch {
      return [];
    }
  };

  const loadRoleIdOptions = async (query: string) => {
    try {
      const res = await apiClient.get('/admin/roles', {
        params: { search: query, limit: 50 },
      });
      const rawRoles = res.data?.data?.data || res.data?.data || [];
      return (Array.isArray(rawRoles) ? rawRoles : []).map((r: any) => ({
        value: r.id,
        label: `${r.name} (${r.slug})`,
      }));
    } catch {
      return [];
    }
  };

  const parseRestrictedRoleIds = (raw: unknown): number[] => {
    try {
      const parsed = JSON.parse((raw as string) ?? '[]');
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((id) => Number.isInteger(id) && (id as number) > 0);
    } catch {
      return [];
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const settingsRes = await apiClient.get('/admin/system-settings');
      const settingsData = settingsRes.data?.data;

      const loadedValues: SettingsFormValues = {
        default_register_role:
          settingsData?.default_register_role?.value || defaultValues.default_register_role,
        third_party_registration_role:
          settingsData?.third_party_registration_role?.value || defaultValues.third_party_registration_role,
        superadmin_role:
          settingsData?.superadmin_role?.value || defaultValues.superadmin_role,
        restricted_role_ids: parseRestrictedRoleIds(settingsData?.restricted_role_ids?.value),

        google_workspace_domain:
          settingsData?.google_workspace_domain?.value ?? defaultValues.google_workspace_domain,
        google_workspace_admin_email:
          settingsData?.google_workspace_admin_email?.value ?? defaultValues.google_workspace_admin_email,
        google_workspace_credentials:
          settingsData?.google_workspace_credentials?.value ?? defaultValues.google_workspace_credentials,

        mail_host: settingsData?.mail_host?.value ?? defaultValues.mail_host,
        mail_port: settingsData?.mail_port?.value
          ? String(settingsData.mail_port.value)
          : defaultValues.mail_port,
        mail_scheme: settingsData?.mail_scheme?.value ?? defaultValues.mail_scheme,
        mail_username: settingsData?.mail_username?.value ?? defaultValues.mail_username,
        mail_password: settingsData?.mail_password?.value ?? defaultValues.mail_password,
        mail_from_address:
          settingsData?.mail_from_address?.value ?? defaultValues.mail_from_address,
        mail_from_name: settingsData?.mail_from_name?.value ?? defaultValues.mail_from_name,

        feeder_url: settingsData?.feeder_url?.value ?? defaultValues.feeder_url,
        feeder_username: settingsData?.feeder_username?.value ?? defaultValues.feeder_username,
        feeder_password: settingsData?.feeder_password?.value ?? defaultValues.feeder_password,

        filesystem_disk: settingsData?.filesystem_disk?.value ?? defaultValues.filesystem_disk,
        filesystem_public_disk: settingsData?.filesystem_public_disk?.value ?? defaultValues.filesystem_public_disk,
        filesystem_private_disk: settingsData?.filesystem_private_disk?.value ?? defaultValues.filesystem_private_disk,
        r2_endpoint: settingsData?.r2_endpoint?.value ?? defaultValues.r2_endpoint,
        r2_access_key_id: settingsData?.r2_access_key_id?.value ?? defaultValues.r2_access_key_id,
        r2_secret_access_key: settingsData?.r2_secret_access_key?.value ?? defaultValues.r2_secret_access_key,
        r2_bucket: settingsData?.r2_bucket?.value ?? defaultValues.r2_bucket,
        r2_url: settingsData?.r2_url?.value ?? defaultValues.r2_url,
        r2_private_bucket: settingsData?.r2_private_bucket?.value ?? defaultValues.r2_private_bucket,
        r2_private_url: settingsData?.r2_private_url?.value ?? defaultValues.r2_private_url,
        r2_default_region: settingsData?.r2_default_region?.value ?? defaultValues.r2_default_region,
        r2_use_path_style_endpoint: settingsData?.r2_use_path_style_endpoint?.value ?? defaultValues.r2_use_path_style_endpoint,

        lms_storage_disk: settingsData?.lms_storage_disk?.value ?? defaultValues.lms_storage_disk,
        lms_max_file_materi_mb: String(settingsData?.lms_max_file_materi_mb?.value ?? defaultValues.lms_max_file_materi_mb),
        lms_max_video_mb: String(settingsData?.lms_max_video_mb?.value ?? defaultValues.lms_max_video_mb),
        lms_max_file_tugas_mb: String(settingsData?.lms_max_file_tugas_mb?.value ?? defaultValues.lms_max_file_tugas_mb),
        lms_allow_token_absensi: settingsData?.lms_allow_token_absensi?.value ?? defaultValues.lms_allow_token_absensi,
        lms_token_ttl_minutes: String(settingsData?.lms_token_ttl_minutes?.value ?? defaultValues.lms_token_ttl_minutes),

        system_logo_url: settingsData?.system_logo_url?.value ?? defaultValues.system_logo_url,
        login_banner_url: settingsData?.login_banner_url?.value ?? defaultValues.login_banner_url,
        login_banner_title: settingsData?.login_banner_title?.value ?? defaultValues.login_banner_title,
        login_banner_subtitle: settingsData?.login_banner_subtitle?.value ?? defaultValues.login_banner_subtitle,
      };

      setInitialValues(loadedValues);
      reset(loadedValues);
    } catch {
      toast.error('Gagal memuat pengaturan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check if a specific section has unsaved changes
  const isSectionDirty = (section: string): boolean => {
    switch (section) {
      case 'smtp':
        return (
          currentValues.mail_host !== initialValues.mail_host ||
          currentValues.mail_port !== initialValues.mail_port ||
          currentValues.mail_scheme !== initialValues.mail_scheme ||
          currentValues.mail_username !== initialValues.mail_username ||
          currentValues.mail_password !== initialValues.mail_password ||
          currentValues.mail_from_address !== initialValues.mail_from_address ||
          currentValues.mail_from_name !== initialValues.mail_from_name
        );
      case 'r2':
        return (
          currentValues.filesystem_disk !== initialValues.filesystem_disk ||
          currentValues.filesystem_public_disk !== initialValues.filesystem_public_disk ||
          currentValues.filesystem_private_disk !== initialValues.filesystem_private_disk ||
          currentValues.r2_endpoint !== initialValues.r2_endpoint ||
          currentValues.r2_access_key_id !== initialValues.r2_access_key_id ||
          currentValues.r2_secret_access_key !== initialValues.r2_secret_access_key ||
          currentValues.r2_bucket !== initialValues.r2_bucket ||
          currentValues.r2_url !== initialValues.r2_url ||
          currentValues.r2_private_bucket !== initialValues.r2_private_bucket ||
          currentValues.r2_private_url !== initialValues.r2_private_url ||
          currentValues.r2_default_region !== initialValues.r2_default_region ||
          currentValues.r2_use_path_style_endpoint !== initialValues.r2_use_path_style_endpoint
        );
      case 'lms':
        return (
          currentValues.lms_storage_disk !== initialValues.lms_storage_disk ||
          currentValues.lms_max_file_materi_mb !== initialValues.lms_max_file_materi_mb ||
          currentValues.lms_max_video_mb !== initialValues.lms_max_video_mb ||
          currentValues.lms_max_file_tugas_mb !== initialValues.lms_max_file_tugas_mb ||
          currentValues.lms_allow_token_absensi !== initialValues.lms_allow_token_absensi ||
          currentValues.lms_token_ttl_minutes !== initialValues.lms_token_ttl_minutes
        );
      case 'feeder':
        return (
          currentValues.feeder_url !== initialValues.feeder_url ||
          currentValues.feeder_username !== initialValues.feeder_username ||
          currentValues.feeder_password !== initialValues.feeder_password
        );
      case 'registerRole':
        return currentValues.default_register_role !== initialValues.default_register_role;
      case 'thirdPartyRole':
        return currentValues.third_party_registration_role !== initialValues.third_party_registration_role;
      case 'superadminRole':
        return currentValues.superadmin_role !== initialValues.superadmin_role;
      case 'restrictedRoles':
        return JSON.stringify(currentValues.restricted_role_ids ?? []) !== JSON.stringify(initialValues.restricted_role_ids ?? []);
      case 'googleWorkspace':
        return (
          currentValues.google_workspace_domain !== initialValues.google_workspace_domain ||
          currentValues.google_workspace_admin_email !== initialValues.google_workspace_admin_email ||
          currentValues.google_workspace_credentials !== initialValues.google_workspace_credentials
        );
      case 'loginBanner':
        return (
          (currentValues.system_logo_url || '') !== (initialValues.system_logo_url || '') ||
          (currentValues.login_banner_url || '') !== (initialValues.login_banner_url || '') ||
          (currentValues.login_banner_title || '') !== (initialValues.login_banner_title || '') ||
          (currentValues.login_banner_subtitle || '') !== (initialValues.login_banner_subtitle || '')
        );
      default:
        return false;
    }
  };

  // Reset a specific section's values
  const resetSection = (section: string) => {
    switch (section) {
      case 'loginBanner':
        setValue('system_logo_url', initialValues.system_logo_url);
        setValue('login_banner_url', initialValues.login_banner_url);
        setValue('login_banner_title', initialValues.login_banner_title);
        setValue('login_banner_subtitle', initialValues.login_banner_subtitle);
        break;
      case 'smtp':
        setValue('mail_host', initialValues.mail_host);
        setValue('mail_port', initialValues.mail_port);
        setValue('mail_scheme', initialValues.mail_scheme);
        setValue('mail_username', initialValues.mail_username);
        setValue('mail_password', initialValues.mail_password);
        setValue('mail_from_address', initialValues.mail_from_address);
        setValue('mail_from_name', initialValues.mail_from_name);
        break;
      case 'r2':
        setValue('filesystem_disk', initialValues.filesystem_disk);
        setValue('filesystem_public_disk', initialValues.filesystem_public_disk);
        setValue('filesystem_private_disk', initialValues.filesystem_private_disk);
        setValue('r2_endpoint', initialValues.r2_endpoint);
        setValue('r2_access_key_id', initialValues.r2_access_key_id);
        setValue('r2_secret_access_key', initialValues.r2_secret_access_key);
        setValue('r2_bucket', initialValues.r2_bucket);
        setValue('r2_url', initialValues.r2_url);
        setValue('r2_private_bucket', initialValues.r2_private_bucket);
        setValue('r2_private_url', initialValues.r2_private_url);
        setValue('r2_default_region', initialValues.r2_default_region);
        setValue('r2_use_path_style_endpoint', initialValues.r2_use_path_style_endpoint);
        break;
      case 'lms':
        setValue('lms_storage_disk', initialValues.lms_storage_disk);
        setValue('lms_max_file_materi_mb', initialValues.lms_max_file_materi_mb);
        setValue('lms_max_video_mb', initialValues.lms_max_video_mb);
        setValue('lms_max_file_tugas_mb', initialValues.lms_max_file_tugas_mb);
        setValue('lms_allow_token_absensi', initialValues.lms_allow_token_absensi);
        setValue('lms_token_ttl_minutes', initialValues.lms_token_ttl_minutes);
        break;
      case 'feeder':
        setValue('feeder_url', initialValues.feeder_url);
        setValue('feeder_username', initialValues.feeder_username);
        setValue('feeder_password', initialValues.feeder_password);
        break;
      case 'registerRole':
        setValue('default_register_role', initialValues.default_register_role);
        break;
      case 'thirdPartyRole':
        setValue('third_party_registration_role', initialValues.third_party_registration_role);
        break;
      case 'superadminRole':
        setValue('superadmin_role', initialValues.superadmin_role);
        break;
      case 'restrictedRoles':
        setValue('restricted_role_ids', initialValues.restricted_role_ids);
        break;
      case 'googleWorkspace':
        setValue('google_workspace_domain', initialValues.google_workspace_domain);
        setValue('google_workspace_admin_email', initialValues.google_workspace_admin_email);
        setValue('google_workspace_credentials', initialValues.google_workspace_credentials);
        break;
    }
  };

  // Save specific section
  const handleSaveSection = async (section: string) => {
    let fieldsToValidate: (keyof SettingsFormValues)[] = [];
    let settingsToSave: { key: string; value: string }[] = [];
    let successMessage = 'Pengaturan berhasil disimpan.';
    const vals = getValues();

    if (section === 'smtp') {
      fieldsToValidate = ['mail_host', 'mail_port', 'mail_scheme', 'mail_from_address', 'mail_from_name'];
      settingsToSave = [
        { key: 'mail_host', value: vals.mail_host },
        { key: 'mail_port', value: String(vals.mail_port) },
        { key: 'mail_scheme', value: vals.mail_scheme },
        { key: 'mail_username', value: vals.mail_username || '' },
        { key: 'mail_password', value: vals.mail_password || '' },
        { key: 'mail_from_address', value: vals.mail_from_address },
        { key: 'mail_from_name', value: vals.mail_from_name },
      ];
      successMessage = 'Konfigurasi Server SMTP berhasil disimpan.';
    } else if (section === 'r2') {
      settingsToSave = [
        { key: 'filesystem_disk', value: vals.filesystem_disk || 'local' },
        { key: 'filesystem_public_disk', value: vals.filesystem_public_disk || 'public' },
        { key: 'filesystem_private_disk', value: vals.filesystem_private_disk || 'public' },
        { key: 'r2_endpoint', value: vals.r2_endpoint || '' },
        { key: 'r2_access_key_id', value: vals.r2_access_key_id || '' },
        { key: 'r2_secret_access_key', value: vals.r2_secret_access_key || '' },
        { key: 'r2_bucket', value: vals.r2_bucket || '' },
        { key: 'r2_url', value: vals.r2_url || '' },
        { key: 'r2_private_bucket', value: vals.r2_private_bucket || '' },
        { key: 'r2_private_url', value: vals.r2_private_url || '' },
        { key: 'r2_default_region', value: vals.r2_default_region || 'auto' },
        { key: 'r2_use_path_style_endpoint', value: vals.r2_use_path_style_endpoint || 'true' },
      ];
      successMessage = 'Pengaturan Cloudflare R2 / Storage berhasil disimpan.';
    } else if (section === 'lms') {
      fieldsToValidate = ['lms_storage_disk', 'lms_max_file_materi_mb', 'lms_max_video_mb', 'lms_max_file_tugas_mb', 'lms_token_ttl_minutes'];
      settingsToSave = [
        { key: 'lms_storage_disk', value: vals.lms_storage_disk },
        { key: 'lms_max_file_materi_mb', value: String(vals.lms_max_file_materi_mb) },
        { key: 'lms_max_video_mb', value: String(vals.lms_max_video_mb) },
        { key: 'lms_max_file_tugas_mb', value: String(vals.lms_max_file_tugas_mb) },
        { key: 'lms_allow_token_absensi', value: vals.lms_allow_token_absensi },
        { key: 'lms_token_ttl_minutes', value: String(vals.lms_token_ttl_minutes) },
      ];
      successMessage = 'Pengaturan LMS & Absensi Perkuliahan berhasil disimpan.';
    } else if (section === 'feeder') {
      fieldsToValidate = ['feeder_url', 'feeder_username'];
      settingsToSave = [
        { key: 'feeder_url', value: vals.feeder_url },
        { key: 'feeder_username', value: vals.feeder_username },
        { key: 'feeder_password', value: vals.feeder_password || '' },
      ];
      successMessage = 'Konfigurasi Neo Feeder berhasil disimpan.';
    } else if (section === 'registerRole') {
      fieldsToValidate = ['default_register_role'];
      settingsToSave = [
        { key: 'default_register_role', value: vals.default_register_role },
      ];
      successMessage = 'Role registrasi akun baru berhasil disimpan.';
    } else if (section === 'thirdPartyRole') {
      fieldsToValidate = ['third_party_registration_role'];
      settingsToSave = [
        { key: 'third_party_registration_role', value: vals.third_party_registration_role },
      ];
      successMessage = 'Role pihak ketiga berhasil disimpan.';
    } else if (section === 'superadminRole') {
      fieldsToValidate = ['superadmin_role'];
      settingsToSave = [
        { key: 'superadmin_role', value: vals.superadmin_role },
      ];
      successMessage = 'Role superadmin sistem berhasil disimpan.';
    } else if (section === 'restrictedRoles') {
      settingsToSave = [
        { key: 'restricted_role_ids', value: JSON.stringify(vals.restricted_role_ids ?? []) },
      ];
      successMessage = 'Pengaturan restriksi role berhasil disimpan.';
    } else if (section === 'googleWorkspace') {
      settingsToSave = [
        { key: 'google_workspace_domain', value: vals.google_workspace_domain || '' },
        { key: 'google_workspace_admin_email', value: vals.google_workspace_admin_email || '' },
        { key: 'google_workspace_credentials', value: vals.google_workspace_credentials || '' },
      ];
      successMessage = 'Konfigurasi Google Workspace berhasil disimpan.';
    } else if (section === 'loginBanner') {
      settingsToSave = [
        { key: 'system_logo_url', value: vals.system_logo_url || '' },
        { key: 'login_banner_url', value: vals.login_banner_url || '' },
        { key: 'login_banner_title', value: vals.login_banner_title || 'SSO Campus' },
        { key: 'login_banner_subtitle', value: vals.login_banner_subtitle || 'Enterprise Identity Platform' },
      ];
      successMessage = 'Pengaturan Banner & Branding Login berhasil disimpan.';
    }

    if (fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) {
        toast.error('Mohon periksa kembali kolom input yang bertanda merah.');
        return;
      }
    }

    setSavingSection(section);
    try {
      await apiClient.post('/admin/system-settings', {
        settings: settingsToSave,
      });

      // Update initial values for saved keys
      setInitialValues((prev) => {
        const next = { ...prev };
        settingsToSave.forEach((item) => {
          if (item.key === 'restricted_role_ids') {
            next.restricted_role_ids = vals.restricted_role_ids;
          } else {
            (next as any)[item.key] = (vals as any)[item.key];
          }
        });
        return next;
      });

      if (section === 'loginBanner') {
        notifySystemLogoUpdated(vals.system_logo_url || '');
      }

      setSavedSections((prev) => ({ ...prev, [section]: true }));
      toast.success(successMessage);
      setTimeout(() => {
        setSavedSections((prev) => ({ ...prev, [section]: false }));
      }, 3500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Gagal menyimpan pengaturan.';
      toast.error(msg);
    } finally {
      setSavingSection(null);
    }
  };

  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Format logo harus PNG, JPEG, atau WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran logo maksimal 2MB.');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);
    setIsUploadingLogo(true);

    try {
      const response = await apiClient.post('/admin/system-settings/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = response.data?.data?.url;
      if (url) {
        setValue('system_logo_url', url);
        setInitialValues((current) => ({ ...current, system_logo_url: url }));
        notifySystemLogoUpdated(url);
        toast.success('Logo sistem berhasil diperbarui.');
      }
    } catch (error: unknown) {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(message || 'Gagal mengunggah logo sistem.');
    } finally {
      setIsUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleDeleteLogo = async () => {
    setIsDeletingLogo(true);
    try {
      await apiClient.delete('/admin/system-settings/logo');
      setValue('system_logo_url', '');
      setInitialValues((current) => ({ ...current, system_logo_url: '' }));
      notifySystemLogoUpdated('');
      toast.success('Logo sistem dihapus. Logo bawaan akan digunakan.');
    } catch (error: unknown) {
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      toast.error(message || 'Gagal menghapus logo sistem.');
    } finally {
      setIsDeletingLogo(false);
    }
  };

  const handleBannerFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran berkas gambar melebihi batas maksimal 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('banner', file);

    setIsUploadingBanner(true);
    try {
      const res = await apiClient.post('/admin/system-settings/upload-banner', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url;
      if (url) {
        setValue('login_banner_url', url, { shouldDirty: true });
        toast.success('Foto banner berhasil diunggah! Jangan lupa klik Simpan Banner Login.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Gagal mengunggah foto banner.';
      toast.error(msg);
    } finally {
      setIsUploadingBanner(false);
      if (bannerFileInputRef.current) {
        bannerFileInputRef.current.value = '';
      }
    }
  };

  const handleClearBanner = () => {
    setValue('login_banner_url', '', { shouldDirty: true });
    toast.success('Foto banner dihapus (kembali ke latar gelap bawaan). Klik Simpan Banner Login untuk menerapkan.');
  };

  const handleTestSmtp = async () => {
    const parsed = testSmtpEmailSchema.safeParse(testEmail);
    if (!parsed.success) {
      const msg =
        parsed.error.issues[0]?.message || 'Masukkan alamat email tujuan uji coba yang valid.';
      setTestEmailError(msg);
      toast.error(msg);
      return;
    }
    setTestEmailError(undefined);
    setIsTestingSmtp(true);
    const formVals = getValues();
    try {
      const res = await apiClient.post('/admin/system-settings/test-smtp', {
        email: parsed.data,
        mail_host: formVals.mail_host,
        mail_port: formVals.mail_port,
        mail_scheme: formVals.mail_scheme,
        mail_username: formVals.mail_username,
        mail_password: formVals.mail_password,
        mail_from_address: formVals.mail_from_address,
        mail_from_name: formVals.mail_from_name,
      });
      toast.success(res.data?.message || 'Email uji coba berhasil dikirim!');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Gagal mengirim email uji coba. Periksa koneksi dan kredensial SMTP Anda.';
      toast.error(msg);
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleTestFeeder = async () => {
    setIsTestingFeeder(true);
    setFeederTokenInfo(null);
    try {
      const res = await feederService.getToken();
      if (res?.data?.token) {
        setFeederTokenInfo(res.data.token);
        toast.success(res?.message || 'Berhasil terhubung ke Web Service Neo Feeder (Live).');
      } else {
        toast.error(res?.message || 'Token Feeder tidak ditemukan.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal terhubung ke Web Service Neo Feeder (Offline / Port Tertutup).');
    } finally {
      setIsTestingFeeder(false);
    }
  };

  const handleTestR2 = async () => {
    setIsTestingR2(true);
    setR2TestResult(null);
    const formVals = getValues();
    try {
      const res = await apiClient.post('/admin/system-settings/test-r2', {
        r2_endpoint: formVals.r2_endpoint,
        r2_access_key_id: formVals.r2_access_key_id,
        r2_secret_access_key: formVals.r2_secret_access_key,
        r2_bucket: formVals.r2_bucket,
        r2_default_region: formVals.r2_default_region || 'auto',
        r2_use_path_style_endpoint: formVals.r2_use_path_style_endpoint || 'true',
      });
      const msg = res.data?.message || 'Koneksi ke Cloudflare R2 berhasil!';
      setR2TestResult({ success: true, message: msg });
      toast.success(msg);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal terhubung ke Cloudflare R2.';
      setR2TestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsTestingR2(false);
    }
  };

  // Reusable Section Footer component
  const renderSectionFooter = (sectionKey: string, saveButtonLabel: string) => {
    const isDirty = isSectionDirty(sectionKey);
    const isSaved = savedSections[sectionKey];
    const isSaving = savingSection === sectionKey;

    return (
      <div className="settings-section-footer">
        <div className="settings-footer-left">
          {isSaved && (
            <span className="settings-save-success">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Perubahan berhasil disimpan
            </span>
          )}
          {isDirty && !isSaved && (
            <span className="settings-unsaved-hint">
              Ada perubahan belum disimpan
            </span>
          )}
        </div>

        <div className="settings-footer-actions">
          {isDirty && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => resetSection(sectionKey)}
              disabled={isSaving}
            >
              Batalkan
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => handleSaveSection(sectionKey)}
            disabled={isSaving || isLoading || !isDirty}
            icon={isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          >
            {isSaving ? 'Menyimpan...' : saveButtonLabel}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Pengaturan Sistem"
        description="Konfigurasi terpusat untuk SMTP Email, Cloudflare R2 Storage, Neo Feeder PDDikti, dan Otoritas Role Akun"
      />

      {/* Settings Grid */}
      <div className="settings-page-grid">
        {/* ── Left: Settings Sections ── */}
        <div className="settings-sections space-y-6">

          {/* ════════ Section 0: Branding & Banner Foto Halaman Login (SSO/IAM) ════════ */}
          <div className="settings-section-card card">
            <div className="settings-section-header">
              <div className="settings-section-icon bg-violet-100 text-violet-700">
                <ImageIcon size={18} />
              </div>
              <div className="settings-section-title-group">
                <h2 className="settings-section-title">Branding & Banner Halaman Login (SSO/IAM)</h2>
                <p className="settings-section-desc">
                  Atur foto banner visual yang tampil pada panel sisi kanan halaman Login, Register, dan Autentikasi SSO Campus menggantikan area kosong gelap bawaan.
                </p>
              </div>
            </div>

            <div className="settings-section-divider" />

            <div className="settings-section-body space-y-6">
              {isLoading ? (
                <div className="settings-loading">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500">Memuat pengaturan banner login...</span>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4 transition-colors hover:bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UploadCloud size={18} className="text-violet-600" />
                        <span className="text-sm font-semibold text-slate-800">Unggah Logo Sistem</span>
                      </div>
                      <span className="text-xs text-slate-500">Maks. 2 MB</span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500">
                      Logo digunakan pada halaman autentikasi dan identitas utama aplikasi. Format yang didukung: PNG, JPEG, dan WebP.
                    </p>
                    <input
                      type="file"
                      ref={logoFileInputRef}
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoFileSelect}
                      className="hidden"
                    />
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-2">
                        {currentValues.system_logo_url ? (
                          <img src={currentValues.system_logo_url} alt="Pratinjau logo sistem" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <Layers size={28} className="text-blue-600" />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => logoFileInputRef.current?.click()}
                        loading={isUploadingLogo}
                        icon={<UploadCloud size={14} />}
                      >
                        Pilih & Unggah Logo
                      </Button>
                      {currentValues.system_logo_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleDeleteLogo}
                          loading={isDeletingLogo}
                          icon={<Trash2 size={14} className="text-rose-600" />}
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          Hapus Logo
                        </Button>
                      )}
                    </div>
                  </div>

                  <Input
                    label="Tautan / URL Gambar Logo"
                    placeholder="https://domain.com/logo.png"
                    error={errors.system_logo_url?.message}
                    hint="Terisi otomatis saat Anda mengunggah file di atas, atau masukkan tautan gambar langsung."
                    {...register('system_logo_url')}
                  />

                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={bannerFileInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    onChange={handleBannerFileSelect}
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Form Controls (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Upload Box */}
                      <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 hover:bg-slate-50 transition-colors space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UploadCloud size={18} className="text-violet-600" />
                            <span className="text-sm font-semibold text-slate-800">
                              Unggah Berkas Gambar
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">Maks. 5 MB</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Pilih foto lanskap kampus atau grafis resmi (rekomendasi resolusi: 1920×1080 atau rasio 16:9). Berkas akan otomatis disimpan ke storage sistem.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => bannerFileInputRef.current?.click()}
                            loading={isUploadingBanner}
                            icon={<UploadCloud size={14} />}
                          >
                            {isUploadingBanner ? 'Mengunggah Berkas...' : 'Pilih & Unggah Foto Banner'}
                          </Button>

                          {currentValues.login_banner_url && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleClearBanner}
                              icon={<Trash2 size={14} className="text-rose-600" />}
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              Gunakan Tema Gelap Bawaan
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Direct URL Input */}
                      <Input
                        label="Tautan / URL Gambar Banner"
                        placeholder="https://domain.com/storage/branding/banner.jpg"
                        error={errors.login_banner_url?.message}
                        hint="Terisi otomatis saat Anda mengunggah file di atas, atau masukkan tautan gambar langsung."
                        {...register('login_banner_url')}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Judul Lencana Identitas"
                          placeholder="SSO Campus"
                          error={errors.login_banner_title?.message}
                          hint="Teks nama institusi di lencana pojok kanan bawah."
                          {...register('login_banner_title')}
                        />
                        <Input
                          label="Subjudul / Slogan"
                          placeholder="Enterprise Identity Platform"
                          error={errors.login_banner_subtitle?.message}
                          hint="Slogan di bawah nama institusi."
                          {...register('login_banner_subtitle')}
                        />
                      </div>
                    </div>

                    {/* Right Live Preview Box (5 cols) */}
                    <div className="lg:col-span-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Sparkles size={13} className="text-violet-600" />
                          Pratinjau Langsung Halaman Login
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          currentValues.login_banner_url
                            ? 'bg-violet-100 text-violet-700 border border-violet-200'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {currentValues.login_banner_url ? 'Foto Kustom' : 'Tema Gelap Default'}
                        </span>
                      </div>

                      {/* Mockup Frame */}
                      <div className="rounded-xl border border-slate-200 overflow-hidden shadow-md bg-white select-none">
                        {/* Browser Top Bar Mockup */}
                        <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-rose-400" />
                          <div className="w-2 h-2 rounded-full bg-amber-400" />
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-[10px] text-slate-400 ml-2 font-mono">sso.kampus.ac.id/login</span>
                        </div>

                        {/* Split Mockup */}
                        <div className="flex h-48 sm:h-56">
                          {/* Mini Left: Form */}
                          <div className="w-[45%] bg-white p-3 flex flex-col justify-between border-r border-slate-100">
                            <div>
                              <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white mb-2">
                                <Layers size={10} />
                              </div>
                              <div className="h-2 w-16 bg-slate-800 rounded-sm mb-1" />
                              <div className="h-1.5 w-10 bg-slate-300 rounded-sm mb-3" />
                              <div className="space-y-1.5">
                                <div className="h-3 w-full bg-slate-100 rounded border border-slate-200" />
                                <div className="h-3 w-full bg-slate-100 rounded border border-slate-200" />
                                <div className="h-3.5 w-full bg-blue-600 rounded" />
                              </div>
                            </div>
                            <div className="h-1 w-12 bg-slate-200 rounded-sm" />
                          </div>

                          {/* Mini Right: Dynamic Banner Visual */}
                          <div className="w-[55%] relative bg-[#0B0F19] overflow-hidden flex items-end p-2.5">
                            {currentValues.login_banner_url ? (
                              <>
                                <div
                                  className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                                  style={{ backgroundImage: `url(${currentValues.login_banner_url})` }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/90 via-[#0B0F19]/35 to-transparent" />
                              </>
                            ) : (
                              <>
                                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-blue-600/30 blur-lg" />
                                <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-indigo-600/30 blur-lg" />
                                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:8px_8px] opacity-40" />
                              </>
                            )}

                            {/* Mini Badge Card */}
                            <div className="relative z-10 w-full bg-slate-900/70 backdrop-blur-md px-2 py-1.5 rounded-lg border border-white/20 shadow flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-white shrink-0">
                                <Layers size={8} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[9px] font-bold text-white truncate leading-none">
                                  {currentValues.login_banner_title || 'SSO Campus'}
                                </div>
                                <div className="text-[7px] text-slate-300 truncate leading-none mt-0.5">
                                  {currentValues.login_banner_subtitle || 'Enterprise Identity Platform'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 italic">
                        *Panel kanan di atas adalah representasi langsung dari tampilan halaman login publik.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {renderSectionFooter('loginBanner', 'Simpan Banner Login')}
          </div>

          {/* ════════ Section 1: Server SMTP & Email Notifikasi ════════ */}
          <div className="settings-section-card card">
            <div className="settings-section-header">
              <div className="settings-section-icon bg-amber-100 text-amber-700">
                <Server size={18} />
              </div>
              <div className="settings-section-title-group">
                <h2 className="settings-section-title">Konfigurasi Server SMTP & Email</h2>
                <p className="settings-section-desc">
                  Kredensial server surat keluar (SMTP) untuk pengiriman email verifikasi pendaftaran, tautan lupa password, dan notifikasi kampus.
                </p>
              </div>
            </div>

            <div className="settings-section-divider" />

            <div className="settings-section-body space-y-4">
              {isLoading ? (
                <div className="settings-loading">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500">Memuat pengaturan SMTP...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Host SMTP"
                      placeholder="smtp.gmail.com"
                      error={errors.mail_host?.message}
                      hint="Alamat host server SMTP mailer."
                      {...register('mail_host')}
                    />
                    <Input
                      label="Port SMTP"
                      type="number"
                      placeholder="465"
                      error={errors.mail_port?.message}
                      hint="Port SMTP (465 untuk SSL, 587 untuk TLS)."
                      {...register('mail_port')}
                    />
                    <Controller
                      name="mail_scheme"
                      control={control}
                      render={({ field }) => (
                        <Select
                          label="Protokol Enkripsi"
                          options={SCHEME_OPTIONS}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Pilih protokol..."
                          isClearable={false}
                          error={errors.mail_scheme?.message}
                          hint="Metode enkripsi koneksi mailer."
                        />
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Username SMTP / Email Akun"
                      type="text"
                      placeholder="user@kampus.ac.id"
                      error={errors.mail_username?.message}
                      hint="Username otentikasi login SMTP."
                      {...register('mail_username')}
                    />
                    <Input
                      label="Password / App Password SMTP"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••••••"
                      suffixIcon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      onSuffixClick={() => setShowPassword(!showPassword)}
                      error={errors.mail_password?.message}
                      hint="Password atau Google App Password akun email."
                      {...register('mail_password')}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Alamat Pengirim (From Address)"
                      type="email"
                      placeholder="no-reply@kampus.ac.id"
                      error={errors.mail_from_address?.message}
                      hint="Alamat email yang tertera sebagai pengirim email."
                      {...register('mail_from_address')}
                    />
                    <Input
                      label="Nama Pengirim (From Name)"
                      placeholder="Sistem Terintegrasi Kampus"
                      error={errors.mail_from_name?.message}
                      hint="Nama instansi/sistem yang tampil di inbox penerima."
                      {...register('mail_from_name')}
                    />
                  </div>

                  {/* Sub-Card: Test SMTP Connection */}
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-amber-600" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        Uji Coba Pengiriman Email (Test SMTP)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">
                      Kirim email percobaan untuk memastikan pengaturan host, port, dan kredensial di atas berfungsi dengan normal sebelum disimpan.
                    </p>
                    <div className="space-y-3">
                      <Input
                        label="Email Penerima Uji Coba"
                        type="email"
                        value={testEmail}
                        onChange={(e) => {
                          setTestEmail(e.target.value);
                          if (testEmailError) setTestEmailError(undefined);
                        }}
                        placeholder="nama-anda@domain.com"
                        error={testEmailError}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={handleTestSmtp}
                        loading={isTestingSmtp}
                        icon={<Send size={15} />}
                        className="w-full sm:w-auto"
                      >
                        {isTestingSmtp ? 'Mengirim...' : 'Kirim Email Uji Coba'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {renderSectionFooter('smtp', 'Simpan Pengaturan SMTP')}
          </div>

          {/* ════════ Section 2: Cloudflare R2 Storage (Penyimpanan Berkas) ════════ */}
          <div className="settings-section-card card">
            <div className="settings-section-header">
              <div className="settings-section-icon bg-sky-100 text-sky-700">
                <Cloud size={18} />
              </div>
              <div className="settings-section-title-group">
                <h2 className="settings-section-title">Penyimpanan Berkas Cloud (Cloudflare R2)</h2>
                <p className="settings-section-desc">
                  Konfigurasi Cloudflare R2 (S3-compatible Object Storage) untuk upload berkas dokumen pendaftaran, arsip kepegawaian, dan aset statis kampus tanpa batas ruang lokal.
                </p>
              </div>
            </div>

            <div className="settings-section-divider" />

            <div className="settings-section-body space-y-5">
              {isLoading ? (
                <div className="settings-loading">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500">Memuat pengaturan Cloudflare R2...</span>
                </div>
              ) : (
                <>
                  {/* Driver Switches */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Controller
                      name="filesystem_disk"
                      control={control}
                      render={({ field }) => (
                        <Select
                          label="Default Filesystem Disk"
                          options={DISK_OPTIONS}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Pilih disk default..."
                          isClearable={false}
                          hint="Driver penyimpanan utama sistem."
                        />
                      )}
                    />
                    <Controller
                      name="filesystem_public_disk"
                      control={control}
                      render={({ field }) => (
                        <Select
                          label="Public Upload Disk"
                          options={PUBLIC_DISK_OPTIONS}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Pilih disk publik..."
                          isClearable={false}
                          hint="Disk untuk file publik (foto profil, pengumuman)."
                        />
                      )}
                    />
                    <Controller
                      name="filesystem_private_disk"
                      control={control}
                      render={({ field }) => (
                        <Select
                          label="Private / Secure Upload Disk"
                          options={PRIVATE_DISK_OPTIONS}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Pilih disk privat..."
                          isClearable={false}
                          hint="Disk untuk dokumen sensitif (KTP, ijazah, e-file)."
                        />
                      )}
                    />
                  </div>

                  {/* S3 API Credentials */}
                  <div className="p-4 rounded-lg bg-sky-50/50 border border-sky-200 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sky-900">
                      Kredensial S3 API Cloudflare R2
                    </h3>

                    <Input
                      label="R2 S3 API Endpoint"
                      placeholder="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
                      error={errors.r2_endpoint?.message}
                      hint="Endpoint S3 API dari dasbor Cloudflare R2."
                      {...register('r2_endpoint')}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="R2 Access Key ID"
                        type="text"
                        placeholder="Contoh: 7d6c8b9a0e1f2..."
                        error={errors.r2_access_key_id?.message}
                        hint="Access Key ID yang dibuat di Cloudflare R2 API Tokens."
                        {...register('r2_access_key_id')}
                      />
                      <Input
                        label="R2 Secret Access Key"
                        type={showR2Secret ? 'text' : 'password'}
                        placeholder="••••••••••••••••"
                        suffixIcon={showR2Secret ? <EyeOff size={16} /> : <Eye size={16} />}
                        onSuffixClick={() => setShowR2Secret(!showR2Secret)}
                        error={errors.r2_secret_access_key?.message}
                        hint="Secret Access Key akun Cloudflare R2."
                        {...register('r2_secret_access_key')}
                      />
                    </div>
                  </div>

                  {/* Buckets & URLs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nama Bucket Publik (R2_BUCKET)"
                      placeholder="kampus-public-uploads"
                      error={errors.r2_bucket?.message}
                      hint="Nama bucket Cloudflare R2 untuk file publik."
                      {...register('r2_bucket')}
                    />
                    <Input
                      label="URL Domain Publik (R2_URL)"
                      placeholder="https://pub-xxx.r2.dev atau https://cdn.kampus.ac.id"
                      error={errors.r2_url?.message}
                      hint="Custom domain publik atau R2.dev domain untuk file publik."
                      {...register('r2_url')}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Nama Bucket Privat (Opsional)"
                      placeholder="kampus-private-documents"
                      error={errors.r2_private_bucket?.message}
                      hint="Biarkan kosong jika menggunakan bucket yang sama dengan publik."
                      {...register('r2_private_bucket')}
                    />
                    <Input
                      label="URL Akses Privat (Opsional)"
                      placeholder="https://priv-xxx.r2.dev"
                      error={errors.r2_private_url?.message}
                      hint="Domain untuk file privat berautentikasi (opsional)."
                      {...register('r2_private_url')}
                    />
                  </div>

                  {/* Advanced Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="R2 Default Region"
                      placeholder="auto"
                      error={errors.r2_default_region?.message}
                      hint="Region Cloudflare R2 selalu 'auto'."
                      {...register('r2_default_region')}
                    />
                    <Controller
                      name="r2_use_path_style_endpoint"
                      control={control}
                      render={({ field }) => (
                        <Select
                          label="Use Path Style Endpoint"
                          options={PATH_STYLE_OPTIONS}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Pilih mode endpoint..."
                          isClearable={false}
                          hint="Format URL bucket S3 (R2 memerlukan format path-style)."
                        />
                      )}
                    />
                  </div>

                  {/* Sub-Card: Test R2 Connection */}
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <Cloud size={16} className="text-sky-600" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        Uji Koneksi Cloudflare R2 (Test R2 Connection)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">
                      Uji koneksi secara langsung dengan mengirimkan file ping uji coba ke bucket Cloudflare R2 yang telah Anda konfigurasikan.
                    </p>
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={handleTestR2}
                        loading={isTestingR2}
                        icon={<Send size={15} />}
                        className="w-full sm:w-auto"
                      >
                        {isTestingR2 ? 'Menguji koneksi...' : 'Uji Koneksi R2'}
                      </Button>

                      {r2TestResult && (
                        <p
                          className={`text-xs font-semibold p-2.5 rounded border ${
                            r2TestResult.success
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-rose-50 border-rose-200 text-rose-800'
                          }`}
                        >
                          {r2TestResult.message}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {renderSectionFooter('r2', 'Simpan Pengaturan Storage R2')}
          </div>

          {/* ════════ Section 2b: LMS & Absensi Perkuliahan ════════ */}
          <div className="settings-section-card card">
            <div className="settings-section-header">
              <div className="settings-section-icon bg-slate-100 text-slate-700">
                <BookOpen size={18} />
              </div>
              <div className="settings-section-title-group">
                <h2 className="settings-section-title">LMS & Absensi Perkuliahan</h2>
                <p className="settings-section-desc">
                  Konfigurasi penyimpanan berkas materi perkuliahan, batas unggahan tugas mahasiswa, dan parameter absensi berbasis token.
                </p>
              </div>
            </div>

            <div className="settings-section-divider" />

            <div className="settings-section-body space-y-4">
              {isLoading ? (
                <div className="settings-loading">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500">Memuat pengaturan LMS...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      name="lms_storage_disk"
                      control={control}
                      render={({ field }) => (
                        <Select
                          label="Penyimpanan Berkas LMS (Storage Disk)"
                          value={field.value}
                          onChange={field.onChange}
                          options={DISK_OPTIONS}
                          error={errors.lms_storage_disk?.message}
                          placeholder="Pilih disk storage LMS..."
                          isClearable={false}
                          hint="Disk target default untuk materi dosen & pengumpulan tugas mahasiswa."
                        />
                      )}
                    />
                    <Controller
                      name="lms_allow_token_absensi"
                      control={control}
                      render={({ field }) => (
                        <Select
                          label="Izin Token Absensi Mahasiswa"
                          value={field.value}
                          onChange={field.onChange}
                          options={TOKEN_ABSENSI_OPTIONS}
                          error={errors.lms_allow_token_absensi?.message}
                          placeholder="Pilih status izin token..."
                          isClearable={false}
                          hint="Jika aktif, dosen dapat merilis 6-digit token absensi realtime."
                        />
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Maksimal Materi (MB)"
                      type="number"
                      placeholder="50"
                      error={errors.lms_max_file_materi_mb?.message}
                      hint="Batas upload berkas non-video dosen."
                      {...register('lms_max_file_materi_mb')}
                    />
                    <Input
                      label="Maksimal Video (MB)"
                      type="number"
                      placeholder="500"
                      error={errors.lms_max_video_mb?.message}
                      hint="Batas berkas video materi dosen."
                      {...register('lms_max_video_mb')}
                    />
                    <Input
                      label="Maksimal Tugas Mhs (MB)"
                      type="number"
                      placeholder="50"
                      error={errors.lms_max_file_tugas_mb?.message}
                      hint="Batas berkas tugas mahasiswa."
                      {...register('lms_max_file_tugas_mb')}
                    />
                    <Input
                      label="Masa Berlaku Token (Menit)"
                      type="number"
                      placeholder="15"
                      error={errors.lms_token_ttl_minutes?.message}
                      hint="Durasi aktif token absensi sebelum kedaluwarsa."
                      {...register('lms_token_ttl_minutes')}
                    />
                  </div>
                </>
              )}
            </div>

            {renderSectionFooter('lms', 'Simpan Pengaturan LMS')}
          </div>

          {/* ════════ Section 3: Koneksi Neo Feeder PDDikti ════════ */}
          <div className="settings-section-card card">
            <div className="settings-section-header">
              <div className="settings-section-icon bg-emerald-100 text-emerald-700">
                <Database size={18} />
              </div>
              <div className="settings-section-title-group">
                <h2 className="settings-section-title">Koneksi Neo Feeder PDDikti</h2>
                <p className="settings-section-desc">
                  Kredensial URL endpoint Web Service (WS) Neo Feeder untuk sinkronisasi data SIAKAD ke PDDikti.
                </p>
              </div>
            </div>

            <div className="settings-section-divider" />

            <div className="settings-section-body space-y-4">
              {isLoading ? (
                <div className="settings-loading">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500">Memuat pengaturan Feeder...</span>
                </div>
              ) : (
                <>
                  <Input
                    label="URL Web Service Feeder"
                    placeholder="http://localhost:8100/ws/live2.php"
                    error={errors.feeder_url?.message}
                    hint="Alamat endpoint ws/live2.php atau sandbox Feeder."
                    {...register('feeder_url')}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Username / Kode PT Feeder"
                      placeholder="admin_siakad"
                      error={errors.feeder_username?.message}
                      hint="Username atau kode perguruan tinggi Feeder."
                      {...register('feeder_username')}
                    />
                    <Input
                      label="Password Feeder"
                      type={showFeederPassword ? 'text' : 'password'}
                      placeholder="••••••••••••••••"
                      suffixIcon={showFeederPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      onSuffixClick={() => setShowFeederPassword(!showFeederPassword)}
                      error={errors.feeder_password?.message}
                      hint="Password akun WS Feeder kampus."
                      {...register('feeder_password')}
                    />
                  </div>

                  {/* Sub-Card: Test Koneksi Feeder */}
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <Database size={16} className="text-emerald-600" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        Uji Koneksi Neo Feeder
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">
                      Simpan konfigurasi Feeder terlebih dahulu jika ada perubahan baru, kemudian klik tombol tes koneksi di bawah.
                    </p>
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={handleTestFeeder}
                        loading={isTestingFeeder}
                        icon={<Send size={15} />}
                        className="w-full sm:w-auto"
                      >
                        {isTestingFeeder ? 'Menghubungkan...' : 'Tes Koneksi Feeder'}
                      </Button>
                      {feederTokenInfo && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-xs space-y-1">
                          <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle2 size={14} /> Terkoneksi ke Web Service Neo Feeder (Live)
                          </span>
                          <p className="font-mono text-xs font-bold text-emerald-700 break-all">
                            Token Aktif: {feederTokenInfo}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {renderSectionFooter('feeder', 'Simpan Koneksi Feeder')}
          </div>

          {/* ════════ Section 4: Registrasi Akun Baru ════════ */}
          <div className="settings-section-card card">
            <div className="settings-section-header">
              <div className="settings-section-icon bg-blue-100 text-blue-700">
                <Users size={18} />
              </div>
              <div className="settings-section-title-group">
                <h2 className="settings-section-title">Registrasi Akun Baru</h2>
                <p className="settings-section-desc">
                  Pilih Role yang akan otomatis diberikan kepada pengguna saat membuat akun baru melalui halaman Register publik.
                </p>
              </div>
            </div>

            <div className="settings-section-divider" />

            <div className="settings-section-body">
              {isLoading ? (
                <div className="settings-loading">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500">Memuat pengaturan role...</span>
                </div>
              ) : (
                <Controller
                  name="default_register_role"
                  control={control}
                  render={({ field }) => (
                    <AsyncSelect
                      label="Default Registration Role"
                      loadOptions={loadRolesOptions}
                      defaultOptions
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pilih role untuk pendaftar baru..."
                      error={errors.default_register_role?.message}
                      hint="Modul yang dapat diakses oleh pendaftar baru akan mengikuti mapping hak akses dari role ini."
                    />
                  )}
                />
              )}
            </div>

            {renderSectionFooter('registerRole', 'Simpan Role Registrasi')}
          </div>

          <div className="settings-section-card card">
            <div className="settings-section-header">
              <div className="settings-section-icon" style={{ backgroundColor: 'var(--module-primary-subtle)', color: 'var(--module-primary)' }}><Users size={18} /></div>
              <div className="settings-section-title-group">
                <h2 className="settings-section-title">Role Akun Pihak Ketiga</h2>
                <p className="settings-section-desc">Role otomatis untuk akun pihak ketiga yang dibuat melalui pendaftaran manual SPMB.</p>
              </div>
            </div>
            <div className="settings-section-divider" />
            <div className="settings-section-body">
              <Controller
                name="third_party_registration_role"
                control={control}
                render={({ field }) => (
                  <AsyncSelect
                    label="Role Pihak Ketiga"
                    loadOptions={loadRolesOptions}
                    defaultOptions
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Pilih role pihak ketiga..."
                    error={errors.third_party_registration_role?.message}
                    hint="Dropdown pihak ketiga pada formulir manual hanya menampilkan akun dengan role ini."
                  />
                )}
              />
            </div>
            {renderSectionFooter('thirdPartyRole', 'Simpan Role Pihak Ketiga')}
          </div>

          {/* ════════ Section 5: Role Superadmin Utama ════════ */}
          <div className="settings-section-card card">
            <div className="settings-section-header">
              <div className="settings-section-icon bg-indigo-50 text-indigo-600">
                <ShieldAlert size={18} />
              </div>
              <div className="settings-section-title-group">
                <h2 className="settings-section-title">Otoritas Role Superadmin (Sistem)</h2>
                <p className="settings-section-desc">
                  Tentukan Role yang bertindak sebagai Superadmin utama di sistem untuk akses penuh tanpa batas ke semua modul.
                </p>
              </div>
            </div>

            <div className="settings-section-divider" />

            <div className="settings-section-body">
              {isLoading ? (
                <div className="settings-loading">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500">Memuat pengaturan...</span>
                </div>
              ) : (
                <Controller
                  name="superadmin_role"
                  control={control}
                  render={({ field }) => (
                    <AsyncSelect
                      label="System Superadmin Role"
                      loadOptions={loadRolesOptions}
                      defaultOptions
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pilih role superadmin..."
                      error={errors.superadmin_role?.message}
                      hint="Role yang dipilih akan dikenali secara dinamis sebagai Superadmin utama tanpa tergantung nilai hardcode."
                    />
                  )}
                />
              )}
            </div>

            {renderSectionFooter('superadminRole', 'Simpan Role Superadmin')}
          </div>

          {/* ════════ Section 6: Restriksi Role Tampil ════════ */}
          <div className="settings-section-card card">
            <div className="settings-section-header">
              <div className="settings-section-icon bg-rose-100 text-rose-700">
                <EyeOff size={18} />
              </div>
              <div className="settings-section-title-group">
                <h2 className="settings-section-title">Restriksi Role Tampil</h2>
                <p className="settings-section-desc">
                  Pilih Role yang disembunyikan dari daftar roles untuk pengguna umum di luar modul IAM.
                </p>
              </div>
            </div>

            <div className="settings-section-divider" />

            <div className="settings-section-body">
              {isLoading ? (
                <div className="settings-loading">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500">Memuat pengaturan...</span>
                </div>
              ) : (
                <Controller
                  name="restricted_role_ids"
                  control={control}
                  render={({ field }) => (
                    <AsyncSelect
                      label="Restricted Roles"
                      loadOptions={loadRoleIdOptions}
                      defaultOptions
                      isMulti
                      isClearable
                      value={field.value ?? []}
                      onChange={(selected: any) =>
                        field.onChange((Array.isArray(selected) ? selected : []).map((opt: any) => opt.value))
                      }
                      placeholder="Pilih role yang disembunyikan..."
                      error={errors.restricted_role_ids?.message}
                      hint="Pengelola IAM tetap dapat melihat semua roles. Role lain yang tidak dipilih tetap tampil normal."
                    />
                  )}
                />
              )}
            </div>

            {renderSectionFooter('restrictedRoles', 'Simpan Restriksi Role')}
          </div>

          {/* ════════ Section 7: Google Workspace ════════ */}
          <div className="settings-section-card card">
            <div className="settings-section-header">
              <div className="settings-section-icon bg-green-100 text-green-700">
                <Globe size={18} />
              </div>
              <div className="settings-section-title-group">
                <h2 className="settings-section-title">Integrasi Google Workspace</h2>
                <p className="settings-section-desc">
                  Konfigurasi Domain-Wide Delegation API untuk otomatisasi pembuatan email kampus mahasiswa (G-Suite).
                </p>
              </div>
            </div>

            <div className="settings-section-divider" />

            <div className="settings-section-body space-y-4">
              {isLoading ? (
                <div className="settings-loading">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500">Memuat pengaturan...</span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Domain Kampus"
                      placeholder="Misal: student.campus.ac.id"
                      error={errors.google_workspace_domain?.message}
                      hint="Domain untuk alamat email mahasiswa (tanpa @)."
                      {...register('google_workspace_domain')}
                    />
                    <Input
                      label="Admin Email (Impersonation)"
                      placeholder="admin@campus.ac.id"
                      error={errors.google_workspace_admin_email?.message}
                      hint="Email Admin G-Suite utama dengan akses Directory API."
                      {...register('google_workspace_admin_email')}
                    />
                  </div>
                  <Textarea
                    label="Credentials JSON (Service Account)"
                    placeholder='{"type": "service_account", "project_id": "...", ...}'
                    rows={4}
                    error={errors.google_workspace_credentials?.message}
                    hint="Tempel isi file JSON Service Account dari Google Cloud Console."
                    {...register('google_workspace_credentials')}
                  />
                </>
              )}
            </div>

            {renderSectionFooter('googleWorkspace', 'Simpan Google Workspace')}
          </div>

        </div>

        {/* ── Right: Info Panel (Desktop only) ── */}
        <aside className="settings-info-panel">
          <div className="settings-info-card card card-body">
            <div className="flex items-center gap-2 mb-3">
              <Settings size={15} className="text-primary-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pusat Pengaturan Sistem
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Setiap formulir konfigurasi di halaman ini dapat disimpan secara mandiri melalui tombol <strong>Simpan</strong> di masing-masing bagian tanpa perlu menggulir ke bawah.
            </p>

            <div className="settings-info-divider" />

            <div className="space-y-3 mt-4 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-start gap-2">
                <ImageIcon size={14} className="text-violet-600 shrink-0 mt-0.5" />
                <span><strong>Banner Login:</strong> Mengatur foto banner visual di sisi kanan halaman autentikasi/login SSO & IAM.</span>
              </div>
              <div className="flex items-start gap-2">
                <Server size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <span><strong>Server SMTP:</strong> Mengontrol email keluar untuk reset password, aktivasi akun, dan notifikasi.</span>
              </div>
              <div className="flex items-start gap-2">
                <Cloud size={14} className="text-sky-600 shrink-0 mt-0.5" />
                <span><strong>Cloudflare R2:</strong> Penyimpanan berkas dokumen pendaftaran dan arsip kepegawaian berbasis Cloud S3.</span>
              </div>
              <div className="flex items-start gap-2">
                <Database size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Neo Feeder:</strong> Endpoint dan otentikasi Web Service PDDikti untuk sinkronisasi data SIAKAD.</span>
              </div>
              <div className="flex items-start gap-2">
                <Users size={14} className="text-primary-600 shrink-0 mt-0.5" />
                <span><strong>Default Register Role:</strong> Role awal bagi pengguna yang mendaftar akun baru.</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                <span><strong>Superadmin Role:</strong> Role pemilik hak akses tertinggi ke semua modul kampus.</span>
              </div>
              <div className="flex items-start gap-2">
                <Globe size={14} className="text-green-600 shrink-0 mt-0.5" />
                <span><strong>Google Workspace:</strong> Integrasi Directory API untuk otomatisasi pembuatan akun email kampus.</span>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fetchData}
              icon={<RefreshCw size={13} />}
              title="Muat ulang seluruh pengaturan dari server"
              className="mt-5 w-full justify-center"
            >
              Muat Ulang Pengaturan
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
