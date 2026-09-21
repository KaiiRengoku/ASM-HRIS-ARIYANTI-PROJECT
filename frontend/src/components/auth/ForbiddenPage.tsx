import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">403</h1>
      <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
      <Link to="/">
        <Button>Kembali ke Dashboard</Button>
      </Link>
    </div>
  );
}
