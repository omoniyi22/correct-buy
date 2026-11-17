import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/login")({
  head: () => ({"meta": [{"title": "Staff sign in \u2014 CorrectBuy"}, {"name": "description", "content": "Sign in to the CorrectBuy back office."}, {"property": "og:title", "content": "Staff sign in \u2014 CorrectBuy"}, {"property": "og:description", "content": "Sign in to the CorrectBuy back office."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex, nofollow"}]}),
  component: AdminLogin,
});

function AdminLogin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && user) navigate({ to: "/admin" });
  }, [user, loading, navigate]);
  return <AdminLoginForm />;
}
