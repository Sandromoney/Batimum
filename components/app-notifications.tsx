"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { cn, formatDateTimeFR, formatTime24h, generateId } from "@/lib/utils";
import { useStore } from "@/lib/store";
import type { EvenementPlanning, NotificationApp } from "@/lib/types";
import { processPendingDevisRelanceEmails, processPendingFactureRelanceEmails } from "@/lib/relances";

function planningDateTime(event: EvenementPlanning) {
  return new Date(`${event.date}T${event.heureDebut}:00`);
}

function notificationMessage(event: EvenementPlanning, minutes: 10 | 30) {
  const label =
    event.type === "intervention"
      ? "Intervention"
      : event.type === "reunion"
        ? "Réunion"
        : "Livraison";

  return `${label} ${event.titre} à ${formatTime24h(event.heureDebut)} dans ${minutes} minutes`;
}

function notificationKey(
  notification: Pick<
    NotificationApp,
    "id" | "planningId" | "rappelMinutes" | "relanceId"
  >,
) {
  if (notification.planningId && notification.rappelMinutes) {
    return `planning:${notification.planningId}:${notification.rappelMinutes}`;
  }

  if (notification.relanceId) {
    return `relance:${notification.relanceId}`;
  }

  return `notification:${notification.id}`;
}

export function AppNotifications() {
  const { data, setData, hydrated } = useStore();
  const processingFactureRelances = useRef(false);
  const processingDevisRelances = useRef(false);
  const notificationsRef = useRef<HTMLSpanElement>(null);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [toast, setToast] = useState<NotificationApp | null>(null);
  const [deletingNotificationIds, setDeletingNotificationIds] = useState<
    string[]
  >([]);

  const unreadCount = useMemo(
    () => data.notifications.filter((notification) => !notification.lue).length,
    [data.notifications],
  );

  const notifications = useMemo(
    () =>
      [...data.notifications].sort((a, b) =>
        b.dateCreation.localeCompare(a.dateCreation),
      ),
    [data.notifications],
  );

  useEffect(() => {
    if (!hydrated) return;

    function checkPlanningNotifications() {
      const now = new Date();
      const dueNotifications = data.planning.flatMap((event) => {
        const startAt = planningDateTime(event);
        const diffMs = startAt.getTime() - now.getTime();
        if (diffMs <= 0) return [];

        return ([30, 10] as const)
          .filter((minutes) => diffMs <= minutes * 60 * 1000)
          .filter(
            (minutes) =>
              !data.notifications.some(
                (notification) =>
                  notification.planningId === event.id &&
                  notification.rappelMinutes === minutes,
              ) &&
              !data.deletedNotificationKeys.includes(
                `planning:${event.id}:${minutes}`,
              ),
          )
          .map<NotificationApp>((minutes) => ({
            id: generateId(),
            planningId: event.id,
            titre: "Rappel planning",
            message: notificationMessage(event, minutes),
            dateCreation: now.toISOString(),
            lue: false,
            rappelMinutes: minutes,
          }));
      });

      if (dueNotifications.length === 0) return;

      setData((previous) => ({
        ...previous,
        notifications: [...previous.notifications, ...dueNotifications],
      }));
      setToast(dueNotifications[0]);
    }

    checkPlanningNotifications();
    const interval = window.setInterval(checkPlanningNotifications, 30_000);
    return () => window.clearInterval(interval);
  }, [
    data.deletedNotificationKeys,
    data.notifications,
    data.planning,
    hydrated,
    setData,
  ]);

  useEffect(() => {
    if (!hydrated || processingFactureRelances.current) return;

    const hasPending = data.relances.some(
      (relance) =>
        relance.documentType === "facture" &&
        relance.statut === "preparee" &&
        relance.typeRelance === "automatique",
    );
    if (!hasPending) return;

    processingFactureRelances.current = true;

    void processPendingFactureRelanceEmails(data).then(
      ({ data: updated, sentCount }) => {
        processingFactureRelances.current = false;
        if (sentCount > 0) setData(updated);
      },
    );
  }, [data.relances, hydrated, setData, data]);

  useEffect(() => {
    if (!hydrated || processingDevisRelances.current) return;

    const hasPending = data.relances.some(
      (relance) =>
        relance.documentType === "devis" &&
        relance.statut === "preparee" &&
        relance.typeRelance === "automatique",
    );
    if (!hasPending) return;

    processingDevisRelances.current = true;

    void processPendingDevisRelanceEmails(data).then(
      ({ data: updated, sentCount }) => {
        processingDevisRelances.current = false;
        if (sentCount > 0) setData(updated);
      },
    );
  }, [data.relances, hydrated, setData, data]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 10_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!openNotifications) return;

    function handlePointerDown(event: MouseEvent) {
      if (notificationsRef.current?.contains(event.target as Node)) return;
      setOpenNotifications(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openNotifications]);

  function markNotificationAsRead(id: string) {
    setData((previous) => ({
      ...previous,
      notifications: previous.notifications.map((notification) =>
        notification.id === id ? { ...notification, lue: true } : notification,
      ),
    }));
  }

  function markAllAsRead() {
    setData((previous) => ({
      ...previous,
      notifications: previous.notifications.map((notification) => ({
        ...notification,
        lue: true,
      })),
    }));
  }

  function toggleNotifications() {
    if (openNotifications) {
      setOpenNotifications(false);
      return;
    }
    markAllAsRead();
    setOpenNotifications(true);
  }

  function deleteNotification(notification: NotificationApp) {
    const key = notificationKey(notification);
    setDeletingNotificationIds((ids) => [...ids, notification.id]);
    setData((previous) => ({
      ...previous,
      notifications: previous.notifications.map((item) =>
        item.id === notification.id ? { ...item, lue: true } : item,
      ),
      deletedNotificationKeys: previous.deletedNotificationKeys.includes(key)
        ? previous.deletedNotificationKeys
        : [...previous.deletedNotificationKeys, key],
    }));

    window.setTimeout(() => {
      setData((previous) => ({
        ...previous,
        notifications: previous.notifications.filter(
          (item) => item.id !== notification.id,
        ),
      }));
      setDeletingNotificationIds((ids) =>
        ids.filter((id) => id !== notification.id),
      );
    }, 180);
  }

  return (
    <>
      <span className="relative" ref={notificationsRef}>
        <button
          type="button"
          onClick={toggleNotifications}
          className="btp-shadow-sm relative inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border/80 bg-card/70 text-muted transition-all duration-200 hover:border-border hover:bg-card-hover hover:text-primary"
          aria-label="Notifications"
          aria-expanded={openNotifications}
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-sidebar">
              {unreadCount}
            </span>
          )}
        </button>

        {openNotifications && (
          <section className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-80 rounded-2xl border border-border bg-card p-3 shadow-card">
            <header className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">
                Notifications
              </p>
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-medium text-primary transition-colors hover:text-primary-hover"
              >
                Tout marquer comme lu
              </button>
            </header>

            <div className="max-h-80 space-y-2 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="rounded-xl border border-border bg-card-elevated px-3 py-3 text-sm text-muted-foreground">
                  Aucune notification.
                </p>
              ) : (
                notifications.map((notification) => (
                  <article
                    key={notification.id}
                    className={cn(
                      "relative rounded-xl border pr-9 transition-all duration-200 ease-out",
                      deletingNotificationIds.includes(notification.id) &&
                        "scale-95 opacity-0",
                      notification.lue
                        ? "border-border bg-card-elevated/60 text-muted-foreground"
                        : "border-primary/30 bg-primary/10 text-foreground",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => markNotificationAsRead(notification.id)}
                      className="block w-full px-3 py-3 text-left"
                    >
                      <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                        {notification.titre}
                      </span>
                      <span className="mt-1 block text-sm leading-5">
                        {notification.message}
                      </span>
                      <span className="mt-2 block text-xs text-muted-foreground">
                        {formatDateTimeFR(notification.dateCreation)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNotification(notification)}
                      className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
                      aria-label="Supprimer la notification"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        )}
      </span>

      {toast && (
        <section className="fixed bottom-5 right-5 z-50 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-primary/30 bg-card p-4 text-sm text-foreground shadow-glow">
          <button
            type="button"
            onClick={() => setToast(null)}
            className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-card-hover hover:text-foreground"
            aria-label="Fermer la notification"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="pr-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {toast.titre}
          </p>
          <p className="mt-2 pr-8 leading-6 text-muted-foreground">
            {toast.message}
          </p>
          <p className="mt-2 pr-8 text-xs text-muted-foreground">
            {formatDateTimeFR(toast.dateCreation)}
          </p>
        </section>
      )}
    </>
  );
}
