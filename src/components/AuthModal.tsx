import { useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { LoginForm, RegisterForm } from "@/components/AuthForms";

/** Sign in / sign up without leaving the page the shopper is on. */
export function AuthModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const here = useRouterState({ select: (s) => s.location.href });
  const swap = (to: "login" | "register", text: string, cta: string) => (
    <p className="-mt-2 mb-5 text-sm text-muted-foreground">{text} <button type="button" onClick={() => setMode(to)} className="font-semibold text-primary">{cta}</button></p>
  );
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setMode("login"); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogTitle className="font-display text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</DialogTitle>
        <DialogDescription className="sr-only">{mode === "login" ? "Sign in to your account" : "Sign up for an account"}</DialogDescription>
        {mode === "login" ? (
          <LoginForm redirect={here} onDone={() => onOpenChange(false)} switchLink={swap("register", "New here?", "Create an account")} />
        ) : (
          <RegisterForm redirect={here} switchLink={swap("login", "Already have one?", "Sign in")} />
        )}
      </DialogContent>
    </Dialog>
  );
}
