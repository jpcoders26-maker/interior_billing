"use client";
import React from "react";
import { CreditCard, Check, Sparkles, CalendarClock, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card, Btn, PageHead, Eyebrow } from "../ui.jsx";
import { inr } from "../../lib/format.js";
import { PLANS, planByName, daysLeft, fmtDate, subStatus } from "../../lib/plans.js";

export default function SubscriptionView({ ctx }) {
  const { subscription, setSubscription, record, role } = ctx;
  const isAdmin = role === "admin";
  const left = daysLeft(subscription.expiresAt);
  const plan = planByName(subscription.plan);
  const total = plan.days || 1;
  const used = Math.min(100, Math.max(0, Math.round(((total - left) / total) * 100)));
  const { expired } = subStatus(subscription);

  const choose = (p) => {
    if (!isAdmin) return;
    const now = Date.now();
    setSubscription({ plan: p.id, status: "active", startedAt: now, expiresAt: now + p.days * 86400000 });
    record("Subscription changed to " + p.id + " plan");
  };

  return (
    <div>
      <PageHead title="Subscription &amp; Billing" sub="This workspace runs on a paid subscription. (Demo billing — no real payment is processed.)" />

      {isAdmin ? (
        <p className="flex items-start gap-2 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 mb-4">
          <ShieldCheck size={15} className="mt-0.5 shrink-0" /> You're signed in as admin — you always have full, unrestricted access to the workspace regardless of plan status. Other users are locked out of the workspace once the plan below expires, until you renew it here.
        </p>
      ) : expired ? (
        <p className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 mb-4">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> Your company's subscription has expired, so the rest of the workspace is locked for your account. Ask an admin to renew a plan below to restore access — only an admin can change the plan.
        </p>
      ) : (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-4">Only admins can change the subscription plan.</p>
      )}

      <Card className="p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><CreditCard size={20} /></div>
            <div>
              <Eyebrow>Current plan</Eyebrow>
              <p className="text-lg font-bold text-slate-900">{subscription.plan}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={"text-sm font-medium " + (expired ? "text-rose-600" : "text-emerald-600")}>{expired ? "Expired" : "Active"}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1 justify-end mt-0.5"><CalendarClock size={13} /> {expired ? "Renew to continue" : left + " days left"}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>{fmtDate(subscription.startedAt)}</span><span>{fmtDate(subscription.expiresAt)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className={"h-full " + (expired ? "bg-rose-400" : "bg-gradient-to-r from-indigo-500 to-violet-500")} style={{ width: used + "%" }} />
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {PLANS.map((p) => {
          const isCurrent = subscription.plan === p.id && !expired;
          const isTrial = p.id === "Free Trial";
          return (
            <Card key={p.id} className={"p-4 flex flex-col " + (isCurrent ? "ring-2 ring-indigo-500" : "")} hover>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{p.id}</p>
                {isTrial && <Sparkles size={15} className="text-violet-500" />}
              </div>
              <p className="mt-2">
                <span className="text-2xl font-bold font-mono text-slate-900">{p.price === 0 ? "Free" : inr(p.price)}</span>
                {p.price !== 0 && <span className="text-xs text-slate-400"> /term</span>}
              </p>
              <p className="text-xs text-slate-500 mt-1 flex-1">{p.blurb}</p>
              <Btn variant={isCurrent ? "subtle" : "primary"} className="mt-3 w-full" disabled={!isAdmin || isCurrent} onClick={() => choose(p)}>
                {isCurrent ? <><Check size={15} /> Current</> : "Choose"}
              </Btn>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
