import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { login } from "@/features/auth/services/authService";
import RoleHomeRedirect from "@/components/auth/RoleHomeRedirect";
import { toast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import logo from "@/assets/logo_asm.png";

const loginSchema = z.object({
  nik: z.string().regex(/^[0-9]{9}$/, 'Nomor Induk Kepegawaian harus 9 digit angka'),
  password: z.string().min(1, "Kata sandi wajib diisi"),
  remember: z.boolean(),
});

type LoginForm = {
  nik: string;
  password: string;
  remember: boolean;
};

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Pesan dari interceptor 401 (mis. "Sesi Anda telah berakhir..."), sekali pakai.
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const notice = sessionStorage.getItem("asm-hris-auth-notice");
      if (notice) {
        setSessionNotice(notice);
        sessionStorage.removeItem("asm-hris-auth-notice");
      }
    } catch {
      // abaikan: sessionStorage tidak tersedia
    }
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      nik: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await login(data.nik, data.password, data.remember);
      // Buang sisa cache sesi lama sebelum menyimpan kredensial user baru.
      queryClient.clear();
      setAuth(response.data.user, response.data.token);
      toast({
        title: "Berhasil",
        description: response.message,
        variant: "default",
        duration: 2500,
        // Ikon digambar inline (bukan lucide) supaya tiap path bisa dianimasikan gores.
        icon: (
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 text-success" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" className="animate-check-circle" />
            <path d="m9 12 2 2 4-4" stroke="currentColor" className="animate-check-mark" />
          </svg>
        ),
      });
      const role = response.data.user.roles[0];
      const roleRoutes: Record<string, string> = {
        HRD: "/dashboard/hrd",
        DIREKTUR: "/dashboard/direktur",
        PD_I: "/dashboard/pd-1",
        PD_II: "/dashboard/pd-2",
        PD_III: "/dashboard/pd-3",
        KABAG: "/dashboard/kabag",
        DOSEN: "/dashboard/dosen",
        PEGAWAI: "/dashboard/pegawai",
      };
      navigate(roleRoutes[role] || "/dashboard/pegawai");
    } catch (error: any) {
      const message = error.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.";
      toast({ title: "Gagal", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Sesi yang masih aktif tidak perlu melihat form login lagi.
  // Kalau pemantulan gagal, form tetap tampil agar pengguna tidak terkunci.
  if (isAuthenticated) return <RoleHomeRedirect />;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgb(211_0_0/0.06),transparent_65%)]" />
      </div>
      <Card className="relative w-full max-w-md border-border/60 shadow-[var(--shadow-pop)] animate-page-in">
        <CardHeader className="text-center pb-2">
          <img src={logo} alt="ASM HRIS Logo" className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-accent object-contain p-2 shadow-xs" />
          <CardTitle className="text-2xl font-bold tracking-tight">Masuk</CardTitle>
          <CardDescription>Masukkan Nomor Induk Kepegawaian dan kata sandi Anda</CardDescription>
        </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {sessionNotice && (
                <p className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {sessionNotice}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="nik">Nomor Induk Kepegawaian</Label>
                <Input
                  id="nik"
                  type="text"
                  placeholder="mis. 447199054"
                  maxLength={9}
                  {...register("nik")}
                  className={errors.nik ? "border-destructive" : ""}
                  disabled={isLoading}
                />
                {errors.nik && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.nik.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Kata Sandi</Label>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Lupa kata sandi?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Kata sandi"
                    {...register("password")}
                    className={errors.password ? "border-destructive pr-10" : "pr-10"}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={!!watch("remember")} onCheckedChange={(v) => setValue("remember", v === true)} />
                  <span className="text-sm">Ingat saya</span>
                </Label>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Masuk...
                  </>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>
          </CardContent>
          </Card>
        </div>
  );
}