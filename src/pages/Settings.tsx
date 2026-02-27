import { motion } from "motion/react";
import { containerVariants, itemVariants } from "@/lib/motion";
import { User, Building, DollarSign, UsersRound, Bell, Plug, CreditCard, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useSearchParams } from "react-router-dom";
import BillingTabComponent from "@/components/BillingTab";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "workspace", label: "Workspace", icon: Building },
  { id: "financial", label: "Financial", icon: DollarSign },
  { id: "team", label: "Team", icon: UsersRound },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];


export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "profile";

  return (
    <div className="page-container">
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-6">
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        </motion.div>

        <motion.div variants={itemVariants} className="flex gap-8">
          {/* Tab Nav */}
          <nav className="hidden md:block w-48 shrink-0 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/8 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                } ${tab.id === "danger" ? "text-destructive hover:text-destructive" : ""}`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {activeTab === "profile" && <ProfileSettings />}
            {activeTab === "financial" && <FinancialSettings />}
            {activeTab === "billing" && <BillingTabComponent />}
            {activeTab !== "profile" && activeTab !== "financial" && activeTab !== "billing" && (
              <div className="card-surface p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {tabs.find((t) => t.id === activeTab)?.label} settings will be available when backend is connected.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function ProfileSettings() {
  return (
    <div className="space-y-6">
      <div className="card-surface p-6 space-y-6">
        <h2 className="text-base font-semibold text-foreground">Profile</h2>
        <div className="grid gap-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input id="name" defaultValue="User" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" defaultValue="user@email.com" type="email" />
          </div>
        </div>
        <Button size="sm">Save Changes</Button>
      </div>
    </div>
  );
}

function FinancialSettings() {
  return (
    <div className="card-surface p-6 space-y-6">
      <h2 className="text-base font-semibold text-foreground">Financial Defaults</h2>
      <div className="grid gap-4 max-w-md">
        <div className="space-y-2">
          <Label>Tax Rate (%)</Label>
          <Input defaultValue="25" type="number" />
        </div>
        <div className="space-y-2">
          <Label>Processing Fee (%)</Label>
          <Input defaultValue="2.9" type="number" />
        </div>
        <div className="space-y-2">
          <Label>Cost Rate ($/hr)</Label>
          <Input defaultValue="45" type="number" />
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Input defaultValue="USD" />
        </div>
        <div className="space-y-2">
          <Label>Weekly Target (hours)</Label>
          <Input defaultValue="40" type="number" />
        </div>
        <div className="flex items-center justify-between">
          <Label>Show tax on invoices</Label>
          <Switch defaultChecked />
        </div>
      </div>
      <Button size="sm">Save Changes</Button>
    </div>
  );
}

// BillingSettings removed — now using BillingTab component
