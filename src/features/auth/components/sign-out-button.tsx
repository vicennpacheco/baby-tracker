"use client";

import { LogOut } from "lucide-react";
import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { callAction } from "@/lib/call-action";

export function SignOutButton(): ReactNode {
  const [isPending, startTransition] = useTransition();

  function handleSignOut(): void {
    startTransition(async () => {
      // On success the action redirects to /login (callAction rethrows it),
      // so only failures come back.
      const result = await callAction(() => signOut());
      if (!result.ok) toast.error(result.error.message);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={isPending}
      onClick={handleSignOut}
      className="h-14 w-full text-base"
    >
      <LogOut aria-hidden className="size-5" />
      {isPending ? "Cerrando sesión…" : "Cerrar sesión"}
    </Button>
  );
}
