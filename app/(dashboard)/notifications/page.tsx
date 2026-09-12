"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { Bell, RefreshCw, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

interface NotificationItem {
  id: string;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  type?: string | null;
  isRead?: boolean | null;
  createdAt?: string | null;
}

export default function NotificationsPage() {
  const t = useTranslations();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Request failed (" + res.status + ")");
      const d = await res.json();
      setItems(Array.isArray(d) ? d : d.notifications ?? []);
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <LoadingScreen message={t("common.loading")} />;

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center" role="alert">
        <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden="true" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <Button variant="secondary" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 me-2" aria-hidden="true" />
          {t("common.tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t("notifications.title")}
        </h1>
        <Button variant="secondary" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 me-2" aria-hidden="true" />
          {t("common.tryAgain")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("notifications.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!items || items.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t("notifications.noNotifications")}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t("notifications.noNotificationsDesc")}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((n) => (
                <li key={n.id} className="flex items-start gap-3 p-4">
                  <div
                    className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500"
                    aria-hidden="true"
                    data-read={n.isRead ? "true" : "false"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {n.title ?? n.type ?? t("notifications.info")}
                    </p>
                    {(n.message ?? n.body) ? (
                      <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                        {n.message ?? n.body}
                      </p>
                    ) : null}
                    {n.createdAt ? (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {new Date(n.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
