"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import RequireAuth from "@/components/RequireAuth";

export default function StartSeite() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        setUserEmail(user.email);

        const { data, error } = await supabase
          .from("admin_users")
          .select("email")
          .eq("email", user.email)
          .single();

        if (data && !error) {
          setIsAdmin(true);
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Lade Benutzerinformationen…</div>;
  }

  return (
    <RequireAuth>
      <div className="p-6 max-w-xl mx-auto text-center space-y-6">
        <h1 className="text-2xl font-bold">Willkommen, {userEmail}</h1>

        <div className="grid gap-4">
          <Button onClick={() => router.push("/trainer")}>📝 Abrechnung einreichen</Button>
          <Button onClick={() => router.push("/meine-abrechnungen")}>📄 Meine Abrechnungen</Button>
          {isAdmin && (
            <Button onClick={() => router.push("/admin")} variant="secondary">
              🧑‍💼 Admin-Dashboard
            </Button>
          )}
          <Button onClick={handleLogout} variant="outline">🚪 Logout</Button>
        </div>
      </div>
    </RequireAuth>
  );
}
