import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { forgotPassword } from "../services/authService";

const forgotSchema = z.object({
  nik: z.string().length(16, "NIK harus 16 digit"),
});

type ForgotForm = { nik: string };

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { nik: "" },
  });

  const onSubmit = async (data: ForgotForm) => {
    setIsLoading(true);
    try {
      await forgotPassword(data.nik);
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Cek Email Anda</CardTitle>
            <CardDescription>
              Jika NIK terdaftar, link reset sudah dikirim ke email Anda. Cek inbox atau spam.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Tidak menerima email? Hubungi HRD untuk bantuan.
            </p>
            <Link to="/login">
              <Button variant="outline" className="w-full">
                Kembali ke Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Lupa Kata Sandi</CardTitle>
          <CardDescription>
            Masukkan NIK Anda. Kami akan kirim link reset ke email yang terdaftar.
          </CardDescription>
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

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                "Kirim Link Reset"
              )}
            </Button>

            <p className="text-center text-sm">
              <Link to="/login" className="text-primary hover:underline">
                Kembali ke Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}