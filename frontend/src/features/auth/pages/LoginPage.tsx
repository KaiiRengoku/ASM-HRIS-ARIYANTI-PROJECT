import { useState } from "react";
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
import { toast } from "@/components/ui/use-toast";
import logo from "@/assets/logo_asm.png";

const loginSchema = z.object({
  nik: z.string().length(16, "NIK harus 16 digit").regex(/^[0-9]{16}$/, "NIK harus 16 digit numerik"),
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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
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
      setAuth(response.data.user, response.data.token);
      toast({ title: "Berhasil", description: response.message, variant: "default" });
      const role = response.data.user.roles[0];
      const roleRoutes: Record<string, string> = {
        HRD: "/dashboard/hrd",
        DIREKTUR: "/dashboard/direktur",
        PD_I: "/dashboard/pd-1",
        PD_II: "/dashboard/pd-2",
        PD_III: "/dashboard/pd-3",
        KABAG: "/dashboard/kabag",
        PEG: "/dashboard/pegawai",
      };
      navigate(roleRoutes[role] || "/dashboard/pegawai");
    } catch (error: any) {
      const message = error.response?.data?.message || "Terjadi kesalahan. Silakan coba lagi.";
      toast({ title: "Gagal", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logo} alt="ASM HRIS Logo" className="h-16 w-auto mx-auto mb-4" />
          <CardTitle className="text-2xl">Masuk</CardTitle>
          <CardDescription>Masukkan NIK dan kata sandi Anda</CardDescription>
        </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nik">NIK</Label>
                <Input
                  id="nik"
                  type="text"
                  placeholder="1234567890123456"
                  maxLength={16}
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                  <Checkbox {...register("remember")} />
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