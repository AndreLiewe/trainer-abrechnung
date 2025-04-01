"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Login fehlgeschlagen. Bitte überprüfe deine Daten.");
    } else {
      router.push("/trainer");
    }
  };

  return (
    <div className="p-6 max-w-sm mx-auto grid gap-4">
      <h1 className="text-2xl font-bold text-center">Login</h1>

      <Input
        type="email"
        placeholder="E-Mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <Input
        type="password"
        placeholder="Passwort"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <Button onClick={handleLogin}>Einloggen</Button>
    </div>
  );
}

