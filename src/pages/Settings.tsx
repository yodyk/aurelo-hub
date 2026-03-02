import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import {
  Sun,
  Moon,
  Monitor,
  Upload,
  Mail,
  ChevronRight,
  Plus,
  Trash2,
  User,
  Building2,
  DollarSign,
  Users,
  BellRing,
  Puzzle,
  Database,
  Globe,
  Clock,
  CalendarDays,
  CreditCard,
  FileText,
  Zap,
  RefreshCw,
  Link2,
  Shield,
  Download,
  AlertTriangle,
  Check,
  Copy,
  X,
  Eye,
  EyeOff,
  Loader2,
  Image as ImageIcon,
  Palette,
  Code2,
  Megaphone,
  Sparkles,
  MessageCircle,
  Box,
  Building,
  Pencil,
  GripVertical,
  Lock,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  workspace as defaultWorkspace,
  financialSettings as defaultFinancial,
  teamMembers as defaultTeam,
  notificationPreferences as defaultNotifPrefs,
  integrations as defaultIntegrations,
  invoiceDefaults as defaultInvoice,
  rateCard as defaultRateCard,
} from "../data/mockData";
import * as api from "../data/settingsApi";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "../data/ThemeContext";
import { useAuth } from "../data/AuthContext";
import { useData } from "../data/DataContext";
import {
  type IdentityType,
  type WorkCategory,
  IDENTITY_OPTIONS,
  getCategoriesForIdentity,
  mergeCategories,
} from "../data/identityPresets";
import BillingTab from "../components/BillingTab";
import EmailActivityLog from "../components/EmailActivityLog";
import { usePlan } from "../data/PlanContext";
import { FeatureGate } from "../components/FeatureGate";
import { STARTER_NOTIFICATION_TYPES, PLANS } from "../data/plans";

// ── Animation variants ──────────────────────────────────────────────
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

// ── Tab definitions ────────────────────────────────────────────────
type TabId = "profile" | "security" | "workspace" | "financial" | "billing" | "team" | "notifications" | "integrations" | "data";

const tabs: { id: TabId; label: string; icon: typeof User; description: string }[] = [
  { id: "profile", label: "Profile", icon: User, description: "Your account details" },
  { id: "security", label: "Account & Security", icon: Shield, description: "Email, password, sessions" },
  { id: "workspace", label: "Workspace", icon: Building2, description: "Branding and identity" },
  { id: "financial", label: "Financial", icon: DollarSign, description: "Rates, taxes, invoicing" },
  { id: "billing", label: "Billing & Plan", icon: CreditCard, description: "Plan, usage, and invoices" },
  { id: "team", label: "Team", icon: Users, description: "Members and roles" },
  { id: "notifications", label: "Notifications", icon: BellRing, description: "Alerts and digests" },
  { id: "integrations", label: "Integrations", icon: Puzzle, description: "Connected services" },
  { id: "data", label: "Data & export", icon: Database, description: "Backups and danger zone" },
];

// ── Shared components ───────────────────────────────────────────────
function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={item}
      className={`bg-card border border-border rounded-xl p-6 ${className}`}
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <div className="text-[15px] mb-1" style={{ fontWeight: 600 }}>
        {title}
      </div>
      {description && <div className="text-[13px] text-muted-foreground">{description}</div>}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[13px] text-muted-foreground mb-1.5" style={{ fontWeight: 500 }}>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={onChange}
      className={`w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all ${className}`}
      {...props}
    />
  );
}

function SaveButton({
  onClick,
  label = "Save changes",
  saving = false,
}: {
  onClick: () => void;
  label?: string;
  saving?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="px-4 py-2 bg-primary text-primary-foreground text-[13px] rounded-lg hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
      style={{ fontWeight: 500, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
    >
      {label}
    </button>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${checked ? "bg-primary" : "bg-zinc-300"}`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"}`}
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}
      />
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      <span className="ml-2 text-[13px] text-muted-foreground">Loading...</span>
    </div>
  );
}

// ── Hook for loading settings with fallback ─────────────────────────
function useSettingsSection<T>(section: string, fallback: T): [T, boolean, (v: T) => void] {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .loadSetting(section)
      .then((val) => {
        if (mounted && val != null) setData(val);
      })
      .catch((err) => console.error(`Failed to load ${section}:`, err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [section]);

  return [data, loading, setData];
}

// ── Role-based tab access ────────────────────────────────────────────
const TAB_ACCESS: Record<TabId, string[]> = {
  profile: ["Owner", "Admin", "Member"],
  security: ["Owner", "Admin", "Member"],
  workspace: ["Owner", "Admin"],
  financial: ["Owner", "Admin"],
  billing: ["Owner"],
  team: ["Owner", "Admin", "Member"],
  notifications: ["Owner", "Admin", "Member"],
  integrations: ["Owner", "Admin"],
  data: ["Owner"],
};

// ── Main Settings ───────────────────────────────────────────────────
export default function Settings() {
  const { workspaceRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = workspaceRole || "Member";
  const visibleTabs = tabs.filter((t) => TAB_ACCESS[t.id].includes(role));
  const initialTab = (searchParams.get("tab") as TabId) || "profile";
  const [activeTab, setActiveTab] = useState<TabId>(visibleTabs.some((t) => t.id === initialTab) ? initialTab : "profile");

  // Sync from URL → state (when navigating to /settings?tab=billing from elsewhere)
  useEffect(() => {
    const urlTab = searchParams.get("tab") as TabId;
    if (urlTab && visibleTabs.some((t) => t.id === urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams]);

  // Sync URL when tab changes via click
  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      setSearchParams(tab === "profile" ? {} : { tab }, { replace: true });
    },
    [setSearchParams],
  );

  return (
    <motion.div className="max-w-6xl mx-auto px-6 lg:px-12 py-12" variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="mb-8">
        <h1 className="text-[24px] tracking-tight mb-1" style={{ fontWeight: 600 }}>
          Settings
        </h1>
        <p className="text-[14px] text-muted-foreground">Manage your workspace, billing, team, and preferences</p>
      </motion.div>

      <div className="flex gap-8">
        {/* Vertical tab nav */}
        <motion.nav variants={item} className="w-52 flex-shrink-0">
          <div className="sticky top-[80px] space-y-0.5">
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] text-left transition-all duration-200 relative ${
                    isActive
                      ? "bg-primary/8 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="settings-tab-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <tab.icon
                    className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                  />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </motion.nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "profile" && <ProfileTab />}
              {activeTab === "security" && <AccountSecurityTab />}
              {activeTab === "workspace" && <WorkspaceTab />}
              {activeTab === "financial" && <FinancialTab />}
              {activeTab === "billing" && <BillingTab />}
              {activeTab === "team" && <TeamTab readOnly={role === "Member"} />}
              {activeTab === "notifications" && <NotificationsTab />}
              {activeTab === "integrations" && <IntegrationsTab />}
              {activeTab === "data" && <DataTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Profile Tab
// ═══════════════════════════════════════════════════════════════════
function ProfileTab() {
  const defaultProfile = {
    name: defaultWorkspace.userName,
    email: defaultWorkspace.userEmail,
    timezone: defaultWorkspace.timezone,
    theme: "light" as "light" | "dark" | "system",
  };

  const [profile, loading, setProfile] = useSettingsSection("profile", defaultProfile);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const { theme: currentTheme, setTheme: applyTheme } = useTheme();
  const { setInitAvatar } = useData();

  // Load avatar on mount
  useEffect(() => {
    api
      .loadAvatar()
      .then((data) => {
        if (data?.url) setAvatarUrl(data.url);
      })
      .catch(() => {});
  }, []);

  // Sync ThemeContext theme into profile state on load
  useEffect(() => {
    if (!loading && profile.theme !== currentTheme) {
      setProfile({ ...profile, theme: currentTheme });
    }
  }, [loading, currentTheme]);

  const update = (patch: Partial<typeof defaultProfile>) => {
    setProfile({ ...profile, ...patch });
    // If theme is changed, apply it immediately via ThemeContext
    if (patch.theme) {
      applyTheme(patch.theme);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.saveSetting("profile", profile);
      toast.success("Profile saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      <SectionCard>
        <SectionHeader title="Personal info" description="Your identity across Aurelo" />
        <div className="flex items-start gap-6 mb-6">
          <div className="relative group flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[20px] text-primary" style={{ fontWeight: 600 }}>
                  {profile.name
                    ?.split(" ")
                    .map((w: string) => w[0])
                    .join("")
                    .slice(0, 2) || "JD"}
                </span>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all cursor-pointer"
            >
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarUploading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Pencil className="w-4 h-4 text-white" />
                )}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  toast.error("Image must be under 5 MB");
                  return;
                }
                setAvatarUploading(true);
                try {
                  const result = await api.uploadAvatar(file);
                  setAvatarUrl(result.url);
                  setInitAvatar({ url: result.url, fileName: file.name });
                  toast.success("Profile picture updated");
                } catch (err: any) {
                  toast.error(err.message || "Upload failed");
                } finally {
                  setAvatarUploading(false);
                  e.target.value = "";
                }
              }}
            />
            {avatarUrl && (
              <button
                onClick={async () => {
                  try {
                    await api.deleteAvatar();
                    setAvatarUrl(null);
                    setInitAvatar(null);
                    toast.success("Profile picture removed");
                  } catch (err: any) {
                    toast.error(err.message || "Failed to remove");
                  }
                }}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors opacity-0 group-hover:opacity-100"
                title="Remove photo"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <FieldLabel>Full name</FieldLabel>
              <TextInput value={profile.name} onChange={(e) => update({ name: e.target.value })} />
            </div>
            <div>
              <FieldLabel>Email address</FieldLabel>
              <TextInput value={profile.email} onChange={(e) => update({ email: e.target.value })} type="email" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border">
          <div className="flex-1">
            <div className="text-[13px]" style={{ fontWeight: 500 }}>
              Role
            </div>
            <div className="text-[12px] text-muted-foreground">Assigned by workspace owner</div>
          </div>
          <div className="px-2.5 py-0.5 text-[11px] rounded-full bg-primary/8 text-primary" style={{ fontWeight: 500 }}>
            {defaultWorkspace.role}
          </div>
        </div>
        <div className="mb-6">
          <FieldLabel>Timezone</FieldLabel>
          <select
            value={profile.timezone}
            onChange={(e) => update({ timezone: e.target.value })}
            className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
          >
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">GMT / London</option>
            <option value="Europe/Berlin">CET / Berlin</option>
            <option value="Asia/Tokyo">JST / Tokyo</option>
          </select>
        </div>
        <SaveButton onClick={save} saving={saving} />
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Appearance" description="Visual theme preference" />
        <div className="flex gap-2">
          {[
            { value: "light" as const, icon: Sun, label: "Light" },
            { value: "dark" as const, icon: Moon, label: "Dark" },
            { value: "system" as const, icon: Monitor, label: "System" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => update({ theme: opt.value })}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] rounded-lg border transition-all duration-200 ${
                profile.theme === opt.value
                  ? "bg-primary/8 border-primary/20 text-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent/40"
              }`}
              style={{ fontWeight: 500 }}
            >
              <opt.icon className="w-4 h-4" />
              {opt.label}
            </button>
          ))}
        </div>
      </SectionCard>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Account & Security Tab
// ═══════════════════════════════════════════════════════════════════
function AccountSecurityTab() {
  const { user } = useAuth();
  const [currentEmail, setCurrentEmail] = useState(user?.email || "");
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    if (user?.email) setCurrentEmail(user.email);
  }, [user?.email]);

  // ── Change email ──────────────────────────────────────────────────
  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      toast.error("Please enter a new email address");
      return;
    }
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      toast.error("New email is the same as your current email");
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }
    setEmailSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });
      if (error) throw error;
      toast.success("Confirmation email sent to both your current and new address. Please check your inbox.");
      setNewEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update email");
    } finally {
      setEmailSaving(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error("Password must contain at least one uppercase letter");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error("Password must contain at least one number");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const passwordStrength = (() => {
    if (!newPassword) return null;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (score <= 2) return { label: "Weak", color: "bg-destructive" };
    if (score <= 3) return { label: "Fair", color: "bg-yellow-500" };
    return { label: "Strong", color: "bg-green-500" };
  })();

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      {/* Change Email */}
      <SectionCard>
        <SectionHeader title="Email address" description="Update the email associated with your account" />
        <div className="space-y-4">
          <div>
            <FieldLabel>Current email</FieldLabel>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 text-[14px] bg-muted/40 border border-border rounded-lg text-muted-foreground">
                {currentEmail}
              </div>
              <div className="px-2 py-0.5 text-[11px] rounded-full bg-green-500/10 text-green-600" style={{ fontWeight: 500 }}>
                Verified
              </div>
            </div>
          </div>
          <div>
            <FieldLabel>New email address</FieldLabel>
            <TextInput
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              type="email"
              placeholder="Enter new email address"
            />
          </div>
          <div className="flex items-center gap-3">
            <SaveButton onClick={handleChangeEmail} label="Update email" saving={emailSaving} />
            <span className="text-[12px] text-muted-foreground">
              A confirmation link will be sent to both addresses
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Change Password */}
      <SectionCard>
        <SectionHeader title="Password" description="Update your password to keep your account secure" />
        <div className="space-y-4">
          <div>
            <FieldLabel>New password</FieldLabel>
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3 py-2 pr-10 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordStrength && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: passwordStrength.label === "Weak" ? "33%" : passwordStrength.label === "Fair" ? "66%" : "100%" }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground" style={{ fontWeight: 500 }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              Min 8 characters, 1 uppercase letter, 1 number
            </p>
          </div>
          <div>
            <FieldLabel>Confirm new password</FieldLabel>
            <div className="relative">
              <input
                type={showConfirmPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 pr-10 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw(!showConfirmPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[11px] text-destructive mt-1">Passwords do not match</p>
            )}
          </div>
          <SaveButton onClick={handleChangePassword} label="Update password" saving={passwordSaving} />
        </div>
      </SectionCard>

      {/* Active Sessions Info */}
      <SectionCard>
        <SectionHeader title="Sessions" description="Manage your active sessions" />
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border">
          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px]" style={{ fontWeight: 500 }}>Current session</div>
            <div className="text-[12px] text-muted-foreground">This device · Active now</div>
          </div>
        </div>
        <button
          onClick={async () => {
            try {
              const { error } = await supabase.auth.signOut({ scope: "others" });
              if (error) throw error;
              toast.success("All other sessions have been signed out");
            } catch (err: any) {
              toast.error(err.message || "Failed to sign out other sessions");
            }
          }}
          className="mt-4 px-4 py-2 text-[13px] text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/5 transition-all"
          style={{ fontWeight: 500 }}
        >
          Sign out all other sessions
        </button>
      </SectionCard>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── Setup Checklist Toggle ──────────────────────────────────────────
function SetupChecklistToggle() {
  const [isDismissed, setIsDismissed] = useState(
    () => localStorage.getItem("aurelo_setup_dismissed") === "true"
  );

  if (!isDismissed) return null;

  const handleReshow = () => {
    localStorage.removeItem("aurelo_setup_dismissed");
    setIsDismissed(false);
    toast.success("Setup checklist restored — check your Home dashboard");
  };

  return (
    <SectionCard>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
            Setup checklist
          </div>
          <div className="text-[12px] text-muted-foreground/70">
            You dismissed the onboarding checklist from your dashboard
          </div>
        </div>
        <button
          onClick={handleReshow}
          className="px-3 py-1.5 text-[12px] border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all"
          style={{ fontWeight: 500 }}
        >
          Show again
        </button>
      </div>
    </SectionCard>
  );
}

// Workspace Tab
// ═══════════════════════════════════════════════════════════════════
function WorkspaceTab() {
  const defaultWs = {
    name: defaultWorkspace.name,
    url: defaultWorkspace.url,
    brandColor: defaultWorkspace.brandColor,
    fiscalYear: defaultWorkspace.fiscalYearStart,
  };

  const [ws, loading, setWs] = useSettingsSection("workspace", defaultWs);
  const [saving, setSaving] = useState(false);
  const [appLogo, setAppLogo] = useState<{ url: string; fileName: string } | null>(null);
  const [emailLogo, setEmailLogo] = useState<{ url: string; fileName: string } | null>(null);
  const [uploadingApp, setUploadingApp] = useState(false);
  const [uploadingEmail, setUploadingEmail] = useState(false);
  const appInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const { initLogos, setInitLogos } = useData();

  // Load existing logos
  useEffect(() => {
    api
      .loadLogos()
      .then((logos) => {
        if (logos.app) setAppLogo(logos.app);
        if (logos.email) setEmailLogo(logos.email);
      })
      .catch((err) => console.error("Failed to load logos:", err));
  }, []);

  const update = (patch: Partial<typeof defaultWs>) => setWs({ ...ws, ...patch });

  const save = async () => {
    setSaving(true);
    try {
      await api.saveSetting("workspace", ws);
      toast.success("Workspace saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save workspace");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File, type: "app" | "email") => {
    const setUploading = type === "app" ? setUploadingApp : setUploadingEmail;
    const setLogo = type === "app" ? setAppLogo : setEmailLogo;
    setUploading(true);
    try {
      const result = await api.uploadLogo(file, type);
      setLogo(result);
      setInitLogos({ ...initLogos, [type]: result });
      toast.success(`${type === "app" ? "App" : "Email"} logo uploaded`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = async (type: "app" | "email") => {
    const setLogo = type === "app" ? setAppLogo : setEmailLogo;
    try {
      await api.deleteLogo(type);
      setLogo(null);
      setInitLogos({ ...initLogos, [type]: null });
      toast.success("Logo removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove logo");
    }
  };

  if (loading) return <LoadingState />;

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      <SectionCard>
        <SectionHeader title="Workspace identity" description="Name, website, and branding visible across Aurelo" />
        <div className="space-y-4 mb-6">
          <div>
            <FieldLabel>Workspace name</FieldLabel>
            <TextInput value={ws.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Website</FieldLabel>
            <TextInput value={ws.url} onChange={(e) => update({ url: e.target.value })} />
          </div>
          <FeatureGate feature="whiteLabelPortal" hideIfLocked>
            <div>
              <FieldLabel>Brand color</FieldLabel>
              <div className="flex items-center gap-3">
                <label className="relative">
                  <div
                    className="w-9 h-9 rounded-lg border border-border cursor-pointer"
                    style={{ backgroundColor: ws.brandColor }}
                  />
                  <input
                    type="color"
                    value={ws.brandColor}
                    onChange={(e) => update({ brandColor: e.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </label>
                <TextInput
                  value={ws.brandColor}
                  onChange={(e) => update({ brandColor: e.target.value })}
                  className="!w-28 tabular-nums"
                  style={{ fontFamily: "ui-monospace, monospace" }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1.5">Used as the accent color on your client portal</div>
            </div>
          </FeatureGate>
          <div>
            <FieldLabel>Fiscal year starts</FieldLabel>
            <select
              value={ws.fiscalYear}
              onChange={(e) => update({ fiscalYear: e.target.value })}
              className="w-48 px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            >
              {[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        <SaveButton onClick={save} saving={saving} />
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Logos" description="Brand marks used in sidebar, portal, and client emails" />
        <div className="space-y-5">
          {/* App Logo */}
          <div>
            <div className="text-[13px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>
              App logo
            </div>
            <div className="text-[12px] text-muted-foreground mb-3">SVG or PNG brand mark for sidebar and portal</div>
            {appLogo ? (
              <div className="border border-border rounded-lg p-4 flex items-center gap-4">
                <img src={appLogo.url} alt="App logo" className="h-12 w-auto max-w-[200px] object-contain rounded" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] truncate" style={{ fontWeight: 500 }}>
                    App logo
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {appLogo.fileName?.split(".").pop()?.toUpperCase() || "PNG"} &middot; Uploaded
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteLogo("app")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => appInputRef.current?.click()}
                className="border border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 hover:bg-accent/30 transition-colors cursor-pointer"
              >
                {uploadingApp ? (
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
                  {uploadingApp ? "Uploading..." : "Upload logo"}
                </span>
              </div>
            )}
            <input
              ref={appInputRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleLogoUpload(e.target.files[0], "app");
              }}
            />
          </div>
          {/* Email Logo */}
          <div>
            <div className="text-[13px] text-muted-foreground mb-1" style={{ fontWeight: 500 }}>
              Email logo
            </div>
            <div className="text-[12px] text-muted-foreground mb-3">PNG, JPG, or WEBP for client-facing emails</div>
            {emailLogo ? (
              <div className="border border-border rounded-lg p-4 flex items-center gap-4">
                <img
                  src={emailLogo.url}
                  alt="Email logo"
                  className="h-12 w-auto max-w-[200px] object-contain rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] truncate" style={{ fontWeight: 500 }}>
                    Email logo
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {emailLogo.fileName?.split(".").pop()?.toUpperCase() || "PNG"} &middot; Uploaded
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteLogo("email")}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => emailInputRef.current?.click()}
                className="border border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 hover:bg-accent/30 transition-colors cursor-pointer"
              >
                {uploadingEmail ? (
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                ) : (
                  <Mail className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>
                  {uploadingEmail ? "Uploading..." : "Upload email logo"}
                </span>
              </div>
            )}
            <input
              ref={emailInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleLogoUpload(e.target.files[0], "email");
              }}
            />
          </div>
        </div>
      </SectionCard>

      {/* Portal Branding (Studio only) */}
      <FeatureGate feature="whiteLabelPortal" featureLabel="White-label client portal">
        <SectionCard>
          <SectionHeader
            title="Portal branding"
            description="Customize how your client portal looks — replace Aurelo branding with your own"
          />
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-accent/20 border border-border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-[13px]" style={{ fontWeight: 500 }}>White-label active</div>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                  Your client portals display your workspace logo, name, and brand color instead of Aurelo branding. The "Powered by Aurelo" footer is hidden.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2">
                <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>Portal logo</span>
                <span className="text-[12px]" style={{ fontWeight: 500, color: appLogo ? undefined : "#a3a3a3" }}>
                  {appLogo ? "✓ Using app logo" : "No logo uploaded — upload one above"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>Portal accent color</span>
                <span className="text-[12px] tabular-nums" style={{ fontWeight: 500, fontFamily: "ui-monospace, monospace", color: ws.brandColor }}>
                  {ws.brandColor || "#5ea1bf"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>Business name</span>
                <span className="text-[12px]" style={{ fontWeight: 500 }}>
                  {ws.name || "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <span className="text-[13px] text-muted-foreground" style={{ fontWeight: 500 }}>"Powered by Aurelo"</span>
                <span className="text-[12px]" style={{ fontWeight: 500, color: "#10b981" }}>Hidden</span>
              </div>
            </div>
          </div>
        </SectionCard>
      </FeatureGate>

      {/* Identity & Categories */}
      <IdentitySection />

      {/* Re-show setup checklist */}
      <SetupChecklistToggle />
    </motion.div>
  );
}

// ── Identity & Work Categories Section ──────────────────────────────
const IDENTITY_ICONS: Record<IdentityType, typeof Palette> = {
  designer: Palette,
  developer: Code2,
  copywriter: Pencil,
  consultant: MessageCircle,
  photographer: ImageIcon,
  videographer: Sparkles,
  marketer: Megaphone,
  other: Box,
};

function IdentitySection() {
  const { identity, workCategories, setIdentityAndCategories, updateWorkCategories } = useData();
  const { can } = usePlan();
  const navigate = useNavigate();
  const canCustomize = can("customCategories");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<IdentityType | null>(null);
  const [mergeMode, setMergeMode] = useState<"replace" | "merge" | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);

  // Normalize identity to match IdentityType casing (e.g. "designer" → "Designer")
  const normalizedIdentity = identity
    ? ((IDENTITY_OPTIONS.find((o) => o.value.toLowerCase() === identity.toLowerCase())?.value ?? identity) as IdentityType)
    : null;

  const handleSelectPreset = (preset: IdentityType) => {
    if (normalizedIdentity && workCategories.length > 0) {
      // Existing identity — ask merge or replace
      setPendingPreset(preset);
      setMergeMode(null);
    } else {
      // First time — just apply
      applyPreset(preset, "replace");
    }
  };

  const applyPreset = async (preset: IdentityType, mode: "replace" | "merge") => {
    setSaving(true);
    try {
      const presetCats = getCategoriesForIdentity(preset);
      const newCats = normalizedIdentity ? mergeCategories(workCategories, presetCats, mode) : presetCats;
      await setIdentityAndCategories(preset, newCats);
      setShowPresetPicker(false);
      setPendingPreset(null);
      setMergeMode(null);
      toast.success(`Workspace set to ${preset}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update identity");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmMerge = () => {
    if (!pendingPreset || !mergeMode) return;
    applyPreset(pendingPreset, mergeMode);
  };

  const handleRemoveCategory = async (index: number) => {
    const updated = workCategories.filter((_, i) => i !== index);
    await updateWorkCategories(updated);
    toast.success("Category removed");
  };

  const handleRenameCategory = async (index: number) => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === workCategories[index].name) {
      setEditingIndex(null);
      return;
    }
    // Check for duplicates
    if (workCategories.some((c, i) => i !== index && c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Category already exists");
      return;
    }
    const updated = workCategories.map((c, i) => (i === index ? { ...c, name: trimmed } : c));
    await updateWorkCategories(updated);
    setEditingIndex(null);
    toast.success("Category renamed");
  };

  const handleToggleBillable = async (index: number) => {
    const updated = workCategories.map((c, i) => (i === index ? { ...c, billable: !c.billable } : c));
    await updateWorkCategories(updated);
  };

  const handleAddCategory = async () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    // Check single word
    if (trimmed.includes(" ")) {
      toast.error("Categories should be single words");
      return;
    }
    // Check duplicates
    if (workCategories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Category already exists");
      return;
    }
    const updated = [...workCategories, { name: trimmed, billable: true, isDefault: false }];
    await updateWorkCategories(updated);
    setNewCategory("");
    toast.success("Category added");
  };

  const Icon = normalizedIdentity ? IDENTITY_ICONS[normalizedIdentity] : null;

  return (
    <SectionCard>
      <SectionHeader
        title="Identity & categories"
        description="Your freelancer identity seeds default work categories for time tracking"
      />

      {/* Current identity */}
      <div className="mb-6">
        <FieldLabel>Current identity</FieldLabel>
        {normalizedIdentity ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center">
                {Icon && <Icon className="w-[18px] h-[18px] text-primary" />}
              </div>
              <div>
                <div className="text-[14px]" style={{ fontWeight: 600 }}>
                  {normalizedIdentity}
                </div>
                <div className="text-[12px] text-muted-foreground">
                  {IDENTITY_OPTIONS.find((o) => o.value === normalizedIdentity)?.label}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPresetPicker(!showPresetPicker)}
              className="px-3 py-1.5 text-[12px] border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all"
              style={{ fontWeight: 500 }}
            >
              {showPresetPicker ? "Cancel" : "Change"}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-dashed border-border bg-accent/20">
            <div className="text-[13px] text-muted-foreground">
              No identity selected — pick one to get tailored categories
            </div>
            <button
              onClick={() => setShowPresetPicker(true)}
              className="px-3 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all"
              style={{ fontWeight: 500 }}
            >
              Choose identity
            </button>
          </div>
        )}
      </div>

      {/* Preset picker */}
      <AnimatePresence>
        {showPresetPicker && !pendingPreset && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-6"
          >
            <div className="grid grid-cols-2 gap-2">
              {IDENTITY_OPTIONS.map((option) => {
                const OptIcon = IDENTITY_ICONS[option.value];
                const isActive = normalizedIdentity === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => handleSelectPreset(option.value)}
                    disabled={saving}
                    className={`text-left px-4 py-3 rounded-lg border transition-all ${
                      isActive
                        ? "bg-primary/6 border-primary/20"
                        : "border-border hover:border-primary/20 hover:bg-accent/30"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <OptIcon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <div>
                        <div className="text-[13px]" style={{ fontWeight: 500 }}>
                          {option.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{option.emoji} {option.label}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Merge/Replace dialog */}
      <AnimatePresence>
        {pendingPreset && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-accent/30 rounded-lg p-5 border border-border">
              <div className="text-[14px] mb-1" style={{ fontWeight: 500 }}>
                Switch to {pendingPreset}?
              </div>
              <div className="text-[13px] text-muted-foreground mb-4">
                Choose how to handle your existing categories.
              </div>

              <div className="space-y-2 mb-4">
                <button
                  onClick={() => setMergeMode("merge")}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    mergeMode === "merge"
                      ? "bg-primary/6 border-primary/25 ring-1 ring-primary/10"
                      : "border-border hover:bg-card"
                  }`}
                >
                  <div className="text-[13px]" style={{ fontWeight: 500 }}>
                    Merge
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    Add new preset categories alongside your existing ones
                  </div>
                </button>
                <button
                  onClick={() => setMergeMode("replace")}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    mergeMode === "replace"
                      ? "bg-primary/6 border-primary/25 ring-1 ring-primary/10"
                      : "border-border hover:bg-card"
                  }`}
                >
                  <div className="text-[13px]" style={{ fontWeight: 500 }}>
                    Replace defaults
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    Replace preset categories with new ones. Custom categories are kept.
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPendingPreset(null);
                    setMergeMode(null);
                  }}
                  className="px-3 py-1.5 text-[12px] border border-border rounded-lg text-muted-foreground hover:bg-accent/40 transition-all"
                  style={{ fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmMerge}
                  disabled={!mergeMode || saving}
                  className="px-3 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                  style={{ fontWeight: 500 }}
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories list */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-3">
          <FieldLabel>Work categories</FieldLabel>
          <div className="text-[11px] text-muted-foreground">{workCategories.length} categories</div>
        </div>

        <div className="space-y-1 mb-4">
          {workCategories.map((cat, index) => (
            <div
              key={`${cat.name}-${index}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/30 group transition-colors"
            >
              {/* Billable indicator dot */}
              <button
                onClick={() => (canCustomize ? handleToggleBillable(index) : setShowUpgradeModal(true))}
                className="w-5 h-5 flex items-center justify-center flex-shrink-0"
                title={cat.billable ? "Billable — click to make non-billable" : "Non-billable — click to make billable"}
              >
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${cat.billable ? "bg-primary" : "bg-stone-400"}`}
                />
              </button>

              {/* Name */}
              {editingIndex === index ? (
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleRenameCategory(index)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRenameCategory(index);
                    if (e.key === "Escape") setEditingIndex(null);
                  }}
                  className="flex-1 text-[13px] bg-transparent border-b border-primary/30 focus:outline-none py-0.5"
                  style={{ fontWeight: 500 }}
                />
              ) : (
                <span className="flex-1 text-[13px]" style={{ fontWeight: 500 }}>
                  {cat.name}
                </span>
              )}

              {/* Meta badges */}
              {!cat.billable && (
                <span
                  className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded"
                  style={{ fontWeight: 500 }}
                >
                  non-billable
                </span>
              )}
              {cat.isDefault && (
                <span
                  className="text-[10px] text-muted-foreground bg-accent/60 px-1.5 py-0.5 rounded"
                  style={{ fontWeight: 500 }}
                >
                  default
                </span>
              )}
              {!cat.isDefault && (
                <span
                  className="text-[10px] text-primary bg-primary/6 px-1.5 py-0.5 rounded"
                  style={{ fontWeight: 500 }}
                >
                  custom
                </span>
              )}

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() =>
                    canCustomize ? (setEditingIndex(index), setEditValue(cat.name)) : setShowUpgradeModal(true)
                  }
                  className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all"
                  title="Rename"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => (canCustomize ? handleRemoveCategory(index) : setShowUpgradeModal(true))}
                  className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-[#c27272] hover:bg-[rgba(194,114,114,0.08)] transition-all"
                  title="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add custom category */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              value={canCustomize ? newCategory : ""}
              onChange={(e) => (canCustomize ? setNewCategory(e.target.value) : undefined)}
              onFocus={() => {
                if (!canCustomize) setShowUpgradeModal(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCustomize) handleAddCategory();
              }}
              placeholder="Add custom category..."
              readOnly={!canCustomize}
              className="w-full px-3 py-2 text-[13px] bg-accent/20 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/25 transition-all placeholder:text-muted-foreground/50"
            />
          </div>
          <button
            onClick={() => (canCustomize ? handleAddCategory() : setShowUpgradeModal(true))}
            disabled={canCustomize && !newCategory.trim()}
            className="px-3 py-2 text-[12px] bg-primary/8 text-primary rounded-lg hover:bg-primary/12 disabled:opacity-30 transition-all flex items-center gap-1.5"
            style={{ fontWeight: 500 }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        <div className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
          Categories are single-word labels used across time logging and insights. Use the dot to toggle billable
          status.
        </div>
      </div>

      {/* Upgrade modal for Starter users */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
            onClick={() => setShowUpgradeModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl p-7 max-w-sm w-full mx-4 text-center"
              style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-11 h-11 rounded-xl bg-[#5ea1bf]/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-5 h-5 text-[#5ea1bf]" />
              </div>
              <h3 className="text-[16px] text-foreground mb-1.5" style={{ fontWeight: 600 }}>
                Custom categories require Pro
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">
                Editing, removing, and adding work categories is available on the{" "}
                <span className="text-foreground" style={{ fontWeight: 500 }}>
                  Pro
                </span>{" "}
                plan. Starter workspaces use the preset categories for your identity type.
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    navigate("/settings?tab=billing");
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-[14px] rounded-lg bg-foreground text-background hover:opacity-90 transition-all"
                  style={{ fontWeight: 500 }}
                >
                  <Sparkles className="w-4 h-4" />
                  Upgrade to Pro — ${PLANS.pro.price}/mo
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors py-1"
                  style={{ fontWeight: 500 }}
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Financial Tab
// ═══════════════════════════════════════════════════════════════════
function FinancialTab() {
  const defaultFinData = {
    costRate: defaultFinancial.costRate.toString(),
    taxRate: (defaultFinancial.taxRate * 100).toString(),
    processingFee: (defaultFinancial.processingFeeRate * 100).toFixed(1),
    currency: defaultWorkspace.currency,
    weeklyTarget: defaultWorkspace.weeklyHoursTarget.toString(),
  };
  const defaultInvData = {
    paymentTerms: defaultInvoice.paymentTerms,
    lateFee: defaultInvoice.lateFeePercent.toString(),
    invoiceNotes: defaultInvoice.defaultNotes,
    autoReminders: defaultInvoice.autoReminders,
    reminderDays: defaultInvoice.reminderDaysBefore.toString(),
  };

  const [fin, finLoading, setFin] = useSettingsSection("financial", defaultFinData);
  const [inv, invLoading, setInv] = useSettingsSection("invoice", defaultInvData);
  const [rates, ratesLoading, setRates] = useSettingsSection("ratecard", defaultRateCard);

  const [newService, setNewService] = useState("");
  const [newRate, setNewRate] = useState("");
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savingRates, setSavingRates] = useState(false);

  const saveGlobal = async () => {
    setSavingGlobal(true);
    try {
      await api.saveSetting("financial", fin);
      toast.success("Financial defaults saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingGlobal(false);
    }
  };

  const saveInvoice = async () => {
    setSavingInvoice(true);
    try {
      await api.saveSetting("invoice", inv);
      toast.success("Invoice defaults saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingInvoice(false);
    }
  };

  const saveRates = async () => {
    setSavingRates(true);
    try {
      await api.saveSetting("ratecard", rates);
      toast.success("Rate card saved");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingRates(false);
    }
  };

  const addRate = () => {
    if (!newService || !newRate) return;
    setRates([...rates, { id: Date.now(), service: newService, rate: Number(newRate), unit: "hour" }]);
    setNewService("");
    setNewRate("");
  };

  const removeRate = (id: number) => setRates(rates.filter((r: any) => r.id !== id));

  if (finLoading || invLoading || ratesLoading) return <LoadingState />;

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      {/* Global defaults */}
      <SectionCard>
        <SectionHeader title="Global defaults" description="Applied to all Gross / Net calculations across Aurelo" />
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <FieldLabel>Internal cost rate ($/hr)</FieldLabel>
            <TextInput
              value={fin.costRate}
              onChange={(e) => setFin({ ...fin, costRate: e.target.value })}
              className="!w-full tabular-nums"
            />
          </div>
          <div>
            <FieldLabel>Tax rate (%)</FieldLabel>
            <TextInput
              value={fin.taxRate}
              onChange={(e) => setFin({ ...fin, taxRate: e.target.value })}
              className="!w-full tabular-nums"
            />
          </div>
          <div>
            <FieldLabel>Processing fee (%)</FieldLabel>
            <TextInput
              value={fin.processingFee}
              onChange={(e) => setFin({ ...fin, processingFee: e.target.value })}
              className="!w-full tabular-nums"
            />
          </div>
          <div>
            <FieldLabel>Currency</FieldLabel>
            <select
              value={fin.currency}
              onChange={(e) => setFin({ ...fin, currency: e.target.value })}
              className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (&euro;)</option>
              <option value="GBP">GBP (&pound;)</option>
              <option value="CAD">CAD ($)</option>
              <option value="AUD">AUD ($)</option>
            </select>
          </div>
        </div>
        <div className="mb-6">
          <FieldLabel>Weekly hours target</FieldLabel>
          <TextInput
            value={fin.weeklyTarget}
            onChange={(e) => setFin({ ...fin, weeklyTarget: e.target.value })}
            className="!w-28 tabular-nums"
          />
          <div className="text-[12px] text-muted-foreground mt-1.5">Used for utilization calculations on Insights</div>
        </div>
        <SaveButton onClick={saveGlobal} saving={savingGlobal} />
      </SectionCard>

      {/* Invoice defaults */}
      <SectionCard>
        <SectionHeader title="Invoice defaults" description="Pre-fill settings for new invoices" />
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Payment terms</FieldLabel>
              <select
                value={inv.paymentTerms}
                onChange={(e) => setInv({ ...inv, paymentTerms: e.target.value })}
                className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
              >
                <option>Due on receipt</option>
                <option>Net 15</option>
                <option>Net 30</option>
                <option>Net 45</option>
                <option>Net 60</option>
              </select>
            </div>
            <div>
              <FieldLabel>Late fee (%/month)</FieldLabel>
              <TextInput
                value={inv.lateFee}
                onChange={(e) => setInv({ ...inv, lateFee: e.target.value })}
                className="!w-full tabular-nums"
              />
            </div>
          </div>
          <div>
            <FieldLabel>Default invoice notes</FieldLabel>
            <textarea
              value={inv.invoiceNotes}
              onChange={(e) => setInv({ ...inv, invoiceNotes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[13px]" style={{ fontWeight: 500 }}>
                Auto-reminders
              </div>
              <div className="text-[12px] text-muted-foreground">Send reminder before invoice is due</div>
            </div>
            <div className="flex items-center gap-3">
              <Toggle checked={inv.autoReminders} onChange={(v) => setInv({ ...inv, autoReminders: v })} />
              {inv.autoReminders && (
                <div className="flex items-center gap-1.5">
                  <TextInput
                    value={inv.reminderDays}
                    onChange={(e) => setInv({ ...inv, reminderDays: e.target.value })}
                    className="!w-14 tabular-nums text-center"
                  />
                  <span className="text-[12px] text-muted-foreground">days before</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <SaveButton onClick={saveInvoice} saving={savingInvoice} />
      </SectionCard>

      {/* Invoice templates (Studio) */}
      <FeatureGate feature="customInvoiceTemplates" featureLabel="Invoice templates">
        <InvoiceTemplatesSection />
      </FeatureGate>

      {/* Rate card */}
      <SectionCard>
        <SectionHeader title="Rate card" description="Default hourly rates by service type — override per client" />
        <div className="space-y-2 mb-4">
          {rates.map((r: any) => (
            <div
              key={r.id}
              className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-accent/30 transition-colors group"
            >
              <div className="flex-1 text-[14px]" style={{ fontWeight: 500 }}>
                {r.service}
              </div>
              <div className="text-[14px] tabular-nums text-muted-foreground">
                ${r.rate}/{r.unit}
              </div>
              <button
                onClick={() => removeRate(r.id)}
                className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent/60 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-4">
          <TextInput
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            placeholder="Service name"
            className="flex-1"
          />
          <TextInput
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            placeholder="$/hr"
            className="!w-24 tabular-nums"
          />
          <button
            onClick={addRate}
            className="px-3 py-2 text-[13px] rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all"
            style={{ fontWeight: 500 }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <SaveButton onClick={saveRates} saving={savingRates} />
      </SectionCard>
    </motion.div>
  );
}

// ── Invoice Templates Section (Studio) ─────────────────────────────
function InvoiceTemplatesSection() {
  const { workspaceId } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [lineItems, setLineItems] = useState<{ description: string; quantity: number; rate: number }[]>([
    { description: '', quantity: 1, rate: 0 },
  ]);

  useEffect(() => {
    if (!workspaceId) return;
    supabase
      .from('invoice_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setTemplates(data || []); setLoading(false); });
  }, [workspaceId]);

  const resetForm = () => {
    setName(''); setPaymentTerms('Net 30'); setNotes(''); setTaxRate('0');
    setLineItems([{ description: '', quantity: 1, rate: 0 }]);
    setEditing(null);
  };

  const startEdit = (t: any) => {
    setEditing(t);
    setName(t.name);
    setPaymentTerms(t.payment_terms || 'Net 30');
    setNotes(t.notes || '');
    setTaxRate(((t.tax_rate || 0) * 100).toString());
    setLineItems(
      (t.line_items as any[])?.length > 0
        ? (t.line_items as any[])
        : [{ description: '', quantity: 1, rate: 0 }],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Template name is required'); return; }
    if (!workspaceId) return;
    setSaving(true);
    try {
      const payload = {
        workspace_id: workspaceId,
        name: name.trim(),
        payment_terms: paymentTerms,
        notes: notes.trim() || null,
        tax_rate: parseFloat(taxRate || '0') / 100,
        line_items: lineItems.filter(li => li.description.trim()),
      };
      if (editing) {
        const { data, error } = await supabase
          .from('invoice_templates')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editing.id)
          .select()
          .single();
        if (error) throw error;
        setTemplates(prev => prev.map(t => t.id === editing.id ? data : t));
        toast.success('Template updated');
      } else {
        const { data, error } = await supabase
          .from('invoice_templates')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setTemplates(prev => [data, ...prev]);
        toast.success('Template created');
      }
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('invoice_templates').delete().eq('id', id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (editing?.id === id) resetForm();
    toast.success('Template deleted');
  };

  return (
    <SectionCard>
      <SectionHeader
        title="Invoice templates"
        description="Reusable presets that auto-populate line items, terms, and notes"
      />
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Existing templates */}
          {templates.length > 0 && !editing && (
            <div className="space-y-2 mb-5">
              {templates.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-accent/30 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>{t.name}</div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">
                      {(t.line_items as any[])?.length || 0} line item{(t.line_items as any[])?.length !== 1 ? 's' : ''}
                      {t.payment_terms ? ` · ${t.payment_terms}` : ''}
                      {t.tax_rate ? ` · ${(t.tax_rate * 100).toFixed(1)}% tax` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(t)}
                      className="p-1.5 rounded-lg hover:bg-accent/60 text-muted-foreground"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/70 hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form */}
          {(editing || templates.length === 0 || true) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[13px] text-foreground" style={{ fontWeight: 500 }}>
                  {editing ? `Editing: ${editing.name}` : 'New template'}
                </div>
                {editing && (
                  <button onClick={resetForm} className="text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                    Cancel
                  </button>
                )}
              </div>
              <div>
                <FieldLabel>Template name</FieldLabel>
                <TextInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Monthly Retainer" className="!w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Payment terms</FieldLabel>
                  <select
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                  >
                    <option>Due on receipt</option>
                    <option>Net 15</option>
                    <option>Net 30</option>
                    <option>Net 45</option>
                    <option>Net 60</option>
                  </select>
                </div>
                <div>
                  <FieldLabel>Default tax rate (%)</FieldLabel>
                  <TextInput value={taxRate} onChange={e => setTaxRate(e.target.value)} className="!w-full tabular-nums" />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <FieldLabel>Line items</FieldLabel>
                  <button
                    onClick={() => setLineItems(prev => [...prev, { description: '', quantity: 1, rate: 0 }])}
                    className="inline-flex items-center gap-1 text-[12px] text-primary hover:text-primary/80"
                    style={{ fontWeight: 500 }}
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {lineItems.map((li, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_60px_70px_24px] gap-2 items-center">
                      <TextInput
                        value={li.description}
                        onChange={e => {
                          const updated = [...lineItems];
                          updated[idx] = { ...li, description: e.target.value };
                          setLineItems(updated);
                        }}
                        placeholder="Description"
                        className="!w-full"
                      />
                      <TextInput
                        value={li.quantity.toString()}
                        onChange={e => {
                          const updated = [...lineItems];
                          updated[idx] = { ...li, quantity: parseFloat(e.target.value) || 0 };
                          setLineItems(updated);
                        }}
                        placeholder="Qty"
                        className="!w-full tabular-nums text-right"
                      />
                      <TextInput
                        value={li.rate.toString()}
                        onChange={e => {
                          const updated = [...lineItems];
                          updated[idx] = { ...li, rate: parseFloat(e.target.value) || 0 };
                          setLineItems(updated);
                        }}
                        placeholder="Rate"
                        className="!w-full tabular-nums text-right"
                      />
                      {lineItems.length > 1 && (
                        <button
                          onClick={() => setLineItems(prev => prev.filter((_, i) => i !== idx))}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent/60 text-muted-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <FieldLabel>Default notes</FieldLabel>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-[14px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none"
                  placeholder="Thank you for your business..."
                />
              </div>

              <SaveButton onClick={handleSave} saving={saving} label={editing ? 'Update template' : 'Save template'} />
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Team Tab
// ═══════════════════════════════════════════════════════════════════
function TeamTab({ readOnly = false }: { readOnly?: boolean }) {
  const { workspaceId } = useAuth();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [inviteCapacity, setInviteCapacity] = useState(40);
  const [inviting, setInviting] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load real workspace_members as the source of truth
  const [members, setMembers] = useState<any[]>([]);
  useEffect(() => {
    if (!workspaceId) return;
    supabase
      .from("workspace_members")
      .select("id, user_id, name, email, role, status, weekly_capacity, joined_at, invited_at")
      .eq("workspace_id", workspaceId)
      .then(({ data }) => {
        setMembers(data || []);
        setLoading(false);
      });
  }, [workspaceId]);

  const CAPACITY_PRESETS = [
    { label: "Full-time", hours: 40, description: "40h / week" },
    { label: "Part-time", hours: 20, description: "20h / week" },
    { label: "Contractor", hours: 30, description: "30h / week" },
  ] as const;

  const capacityLabel = (hours: number) => CAPACITY_PRESETS.find((p) => p.hours === hours)?.label;

  const handleSaveCapacity = async (memberId: string, hours: number) => {
    await supabase
      .from("workspace_members")
      .update({ weekly_capacity: hours } as any)
      .eq("id", memberId);
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, weekly_capacity: hours } : m))
    );
    setEditingCapacity(null);
    toast.success("Capacity updated");
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await api.inviteTeamMember(inviteEmail, inviteRole);
      // Also create workspace_member record with capacity
      const { data: newMember } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspaceId!,
          email: inviteEmail,
          role: inviteRole,
          status: "pending",
          weekly_capacity: inviteCapacity,
          invited_at: new Date().toISOString(),
        } as any)
        .select()
        .single();
      if (newMember) setMembers((prev) => [...prev, newMember]);
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteCapacity(40);
    } catch (err: any) {
      toast.error(err.message || "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (id: string) => {
    try {
      await api.removeTeamMember(id);
      setMembers(members.filter((m: any) => m.id !== id));
      toast.success("Member removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove member");
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    const { error } = await supabase
      .from("workspace_members")
      .update({ role: newRole })
      .eq("id", memberId);
    if (error) {
      toast.error("Failed to update role");
      return;
    }
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
    toast.success(`Role updated to ${newRole}`);
  };

  const roleColors: Record<string, string> = {
    Owner: "bg-primary/8 text-primary",
    Admin: "bg-primary/8 text-primary",
    Member: "bg-accent/80 text-muted-foreground",
  };

  const getInitials = (m: any) => {
    if (m.name) {
      return m.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
    }
    return m.email.charAt(0).toUpperCase();
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    } catch { return "—"; }
  };

  if (loading) return <LoadingState />;

  const activeMembers = members.filter((m) => m.status === "active");
  const pendingMembers = members.filter((m) => m.status === "pending");

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      <SectionCard>
        <div className="flex items-center justify-between">
          <SectionHeader title="Members" description={`${members.length} people in this workspace`} />
          {readOnly && (
            <span
              className="text-[11px] font-medium tracking-wide text-muted-foreground bg-accent/60 px-2.5 py-1 rounded-md cursor-default"
              title="Members can view the team list but cannot invite or remove members"
            >
              View only
            </span>
          )}
        </div>
        <div className="space-y-1 mb-6">
          {activeMembers.map((member: any) => {
            const cap = member.weekly_capacity ?? 40;
            const presetLabel = capacityLabel(cap);
            const isEditing = editingCapacity === member.id;

            return (
              <div
                key={member.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 px-3 rounded-lg hover:bg-accent/30 transition-colors group"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-[12px] text-primary" style={{ fontWeight: 600 }}>
                    {getInitials(member)}
                  </span>
                </div>

                {/* Name & email — takes available space, min-width prevents squish */}
                <div className="flex-1 min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <div className="text-[14px]" style={{ fontWeight: 500 }}>
                      {member.name || member.email}
                    </div>
                  </div>
                  <div className="text-[12px] text-muted-foreground truncate">{member.email}</div>
                </div>

                {/* Right-side metadata: capacity · joined · role · remove — allow wrapping */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Capacity display / edit */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!readOnly && isEditing ? (
                      <div className="flex items-center gap-1.5 bg-accent/40 rounded-lg px-2 py-1">
                        {CAPACITY_PRESETS.map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => handleSaveCapacity(member.id, preset.hours)}
                            className={`px-2 py-1 text-[11px] rounded-md transition-colors ${
                              cap === preset.hours
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-accent"
                            }`}
                            style={{ fontWeight: 500 }}
                          >
                            {preset.label}
                          </button>
                        ))}
                        <button
                          onClick={() => setEditingCapacity(null)}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-accent/60 text-muted-foreground ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => !readOnly && setEditingCapacity(member.id)}
                        className={`text-[12px] tabular-nums px-2 py-1 rounded-md transition-colors ${
                          readOnly ? "cursor-default" : "hover:bg-accent/60 cursor-pointer"
                        }`}
                        style={{ fontWeight: 500 }}
                        disabled={readOnly}
                        title={readOnly ? "Capacity" : "Click to edit capacity"}
                      >
                        <span className="text-muted-foreground">{cap}h/w</span>
                        {presetLabel && (
                          <span className="text-muted-foreground/60 ml-1">· {presetLabel}</span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Join date */}
                  <div className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                    Joined {formatDate(member.joined_at || member.invited_at)}
                  </div>

                  {/* Role */}
                  {!readOnly && member.role !== "Owner" ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className={`px-2 py-0.5 text-[11px] rounded-full border-none appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary shrink-0 ${roleColors[member.role] || "bg-accent/80 text-muted-foreground"}`}
                      style={{ fontWeight: 500, paddingRight: "1.25rem", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 4px center" }}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Member">Member</option>
                    </select>
                  ) : (
                    <div
                      className={`px-2 py-0.5 text-[11px] rounded-full shrink-0 ${roleColors[member.role] || "bg-accent/80 text-muted-foreground"}`}
                      style={{ fontWeight: 500 }}
                    >
                      {member.role}
                    </div>
                  )}

                  {/* Remove button */}
                  {!readOnly && member.role !== "Owner" && (
                    <button
                      onClick={() => removeMember(member.id)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent/60 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Pending invites */}
          {pendingMembers.length > 0 && (
            <>
              <div className="pt-3 mt-3 border-t border-border">
                <span className="text-[11px] text-muted-foreground px-3" style={{ fontWeight: 600, letterSpacing: "0.04em" }}>
                  PENDING ({pendingMembers.length})
                </span>
              </div>
              {pendingMembers.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 py-3 px-3 rounded-lg opacity-60 group"
                >
                  <div className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 600 }}>
                      {member.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-muted-foreground truncate">{member.email}</div>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {(member.weekly_capacity ?? 40)}h/w
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent text-muted-foreground" style={{ fontWeight: 500 }}>
                    Pending
                  </span>
                  <div
                    className={`px-2 py-0.5 text-[11px] rounded-full ${roleColors[member.role] || "bg-accent/80 text-muted-foreground"}`}
                    style={{ fontWeight: 500 }}
                  >
                    {member.role}
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => removeMember(member.id)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-accent/60 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {!readOnly && (
          <div className="border-t border-border pt-5">
            <div className="text-[13px] text-muted-foreground mb-3" style={{ fontWeight: 500 }}>
              Invite member
            </div>
            <div className="flex gap-2 flex-wrap">
              <TextInput
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Email address"
                className="flex-1 min-w-[200px]"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="px-3 py-2 text-[13px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                style={{ fontWeight: 500 }}
              >
                <option>Member</option>
                <option>Admin</option>
              </select>
              <select
                value={inviteCapacity}
                onChange={(e) => setInviteCapacity(Number(e.target.value))}
                className="px-3 py-2 text-[13px] bg-accent/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                style={{ fontWeight: 500 }}
              >
                <option value={40}>Full-time (40h)</option>
                <option value={20}>Part-time (20h)</option>
                <option value={30}>Contractor (30h)</option>
              </select>
              <SaveButton onClick={sendInvite} label={inviting ? "Sending..." : "Send"} saving={inviting} />
            </div>
          </div>
        )}
      </SectionCard>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Notifications Tab
// ═══════════════════════════════════════════════════════════════════

const NOTIF_CATEGORIES = [
  { key: 'session', label: 'Sessions', description: 'Time sessions logged or updated', icon: Clock },
  { key: 'invoice', label: 'Invoices', description: 'Created, paid, overdue invoices', icon: FileText },
  { key: 'client', label: 'Clients', description: 'New clients, status changes', icon: Users },
  { key: 'team', label: 'Team', description: 'Members joining or role changes', icon: Users },
  { key: 'insight', label: 'Insights', description: 'Retainer warnings, analytics alerts', icon: Zap },
] as const;

function NotificationsTab() {
  const { workspaceId, user } = useAuth();
  const [prefs, setPrefs] = useState<Record<string, { in_app: boolean; email: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { can } = usePlan();
  const hasAdvanced = can("advancedNotifications");

  // Also keep retainer threshold from workspace_settings
  const [wsPrefs, wsLoading, setWsPrefs] = useSettingsSection("notifications", defaultNotifPrefs);

  useEffect(() => {
    if (!workspaceId) return;
    import('@/data/notificationsApi').then(({ loadPreferences }) => {
      loadPreferences(workspaceId).then((rows) => {
        const map: Record<string, { in_app: boolean; email: boolean }> = {};
        for (const cat of NOTIF_CATEGORIES) {
          const row = rows.find(r => r.category === cat.key);
          map[cat.key] = row ? { in_app: row.in_app, email: row.email } : { in_app: true, email: true };
        }
        setPrefs(map);
        setLoading(false);
      });
    });
  }, [workspaceId]);

  const toggle = (category: string, channel: 'in_app' | 'email') => {
    setPrefs(prev => ({
      ...prev,
      [category]: { ...prev[category], [channel]: !prev[category]?.[channel] },
    }));
  };

  const save = async () => {
    if (!workspaceId || !user) return;
    setSaving(true);
    try {
      const { upsertPreference } = await import('@/data/notificationsApi');
      await Promise.all(
        NOTIF_CATEGORIES.map(cat =>
          upsertPreference({
            workspaceId,
            userId: user.id,
            category: cat.key,
            inApp: prefs[cat.key]?.in_app ?? true,
            email: prefs[cat.key]?.email ?? true,
          })
        )
      );
      // Also save retainer threshold
      await api.saveSetting("notifications", wsPrefs);
      toast.success("Notification preferences saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading || wsLoading) return <LoadingState />;

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      <SectionCard>
        <SectionHeader title="Notification preferences" description="Choose how you're notified for each category" />
        {/* Column headers */}
        <div className="flex items-center justify-end gap-6 mb-2 pr-3">
          <span className="text-[11px] text-muted-foreground w-14 text-center" style={{ fontWeight: 600 }}>In-app</span>
          <span className="text-[11px] text-muted-foreground w-14 text-center" style={{ fontWeight: 600 }}>Email</span>
        </div>
        <div className="space-y-1">
          {NOTIF_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isProOnly = (cat.key === 'insight' || cat.key === 'team') && !hasAdvanced;
            return (
              <div
                key={cat.key}
                className={`flex items-center justify-between py-3 px-3 rounded-lg transition-colors ${isProOnly ? 'opacity-50' : 'hover:bg-accent/30'}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px]" style={{ fontWeight: 500 }}>{cat.label}</span>
                      {isProOnly && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded bg-[#5ea1bf]/10 text-[#5ea1bf]" style={{ fontWeight: 600 }}>
                          PRO
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-muted-foreground">{cat.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="w-14 flex justify-center">
                    <Toggle
                      checked={isProOnly ? false : (prefs[cat.key]?.in_app ?? true)}
                      onChange={() => !isProOnly && toggle(cat.key, 'in_app')}
                    />
                  </div>
                  <div className="w-14 flex justify-center">
                    <Toggle
                      checked={isProOnly ? false : (prefs[cat.key]?.email ?? true)}
                      onChange={() => !isProOnly && toggle(cat.key, 'email')}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {!hasAdvanced && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[12px] text-muted-foreground">
              <Sparkles className="w-3 h-3 text-[#5ea1bf] inline mr-1" />
              Upgrade to Pro for insight and team notification controls.
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Retainer threshold"
          description="Trigger a notification when retainer usage crosses this percentage"
        />
        <div className="flex items-center gap-4 mb-6">
          <input
            type="range"
            min={50}
            max={95}
            step={5}
            value={wsPrefs.retainerThreshold}
            onChange={(e) => setWsPrefs({ ...wsPrefs, retainerThreshold: Number(e.target.value) })}
            className="flex-1 h-1.5 bg-accent/60 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <div className="w-14 text-center text-[15px] tabular-nums" style={{ fontWeight: 600 }}>
            {wsPrefs.retainerThreshold}%
          </div>
        </div>
        <SaveButton onClick={save} saving={saving} />
      </SectionCard>

      {/* Email Activity Log — all clients */}
      <SectionCard>
        <SectionHeader title="Email activity log" description="All retainer warning emails sent across your workspace with delivery tracking" />
        <EmailActivityLog />
      </SectionCard>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Integrations Tab
// ═══════════════════════════════════════════════════════════════════
function IntegrationsTab() {
  const { can } = usePlan();
  if (!can("integrations")) {
    return (
      <FeatureGate feature="integrations" featureLabel="Integrations">
        <div />
      </FeatureGate>
    );
  }
  return <IntegrationsTabContent />;
}

function IntegrationsTabContent() {
  const [connections, loading, setConnections] = useSettingsSection("integrations", defaultIntegrations);
  const [apiKeyData, apiKeyLoading, setApiKeyData] = useSettingsSection("apikey", { key: "", createdAt: "" });
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiCopied, setApiCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [savingConnections, setSavingConnections] = useState(false);

  const toggleConnection = async (id: string) => {
    const updated = connections.map((c: any) =>
      c.id === id ? { ...c, connected: !c.connected, lastSync: c.connected ? null : "Just now" } : c,
    );
    const conn = connections.find((c: any) => c.id === id);
    setConnections(updated);

    setSavingConnections(true);
    try {
      await api.saveSetting("integrations", updated);
      if (conn?.connected) {
        toast.success(`${conn.name} disconnected`);
      } else {
        toast.success(`${conn?.name} connected`);
      }
    } catch (err: any) {
      // Revert on error
      setConnections(connections);
      toast.error(err.message || "Failed to update connection");
    } finally {
      setSavingConnections(false);
    }
  };

  const handleRegenerateKey = async () => {
    setRegenerating(true);
    try {
      const newKey = await api.regenerateApiKey();
      setApiKeyData({ key: newKey, createdAt: new Date().toISOString() });
      setApiKeyVisible(true);
      toast.success("API key regenerated");
    } catch (err: any) {
      toast.error(err.message || "Failed to regenerate key");
    } finally {
      setRegenerating(false);
    }
  };

  const displayKey = apiKeyData?.key || "No key generated — click regenerate";

  const copyApiKey = () => {
    if (!apiKeyData?.key) return;
    try {
      const textarea = document.createElement("textarea");
      textarea.value = apiKeyData.key;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    } catch (e) {
      console.error("Copy failed:", e);
    }
    setApiCopied(true);
    setTimeout(() => setApiCopied(false), 2000);
  };

  const integrationIcons: Record<string, React.ReactNode> = {
    stripe: <CreditCard className="w-5 h-5" />,
    quickbooks: <FileText className="w-5 h-5" />,
    gcal: <CalendarDays className="w-5 h-5" />,
    slack: <Zap className="w-5 h-5" />,
    notion: <FileText className="w-5 h-5" />,
  };

  if (loading || apiKeyLoading) return <LoadingState />;

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      <SectionCard>
        <SectionHeader title="Connected services" description="Sync data and automate workflows" />
        <div className="space-y-1">
          {connections.map((conn: any) => (
            <div
              key={conn.id}
              className="flex items-center gap-4 py-3.5 px-3 rounded-lg hover:bg-accent/30 transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${conn.connected ? "bg-primary/8 text-primary" : "bg-accent/60 text-muted-foreground"}`}
              >
                {integrationIcons[conn.icon]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px]" style={{ fontWeight: 500 }}>
                  {conn.name}
                </div>
                <div className="text-[12px] text-muted-foreground">{conn.description}</div>
              </div>
              {conn.connected && conn.lastSync && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mr-2">
                  <RefreshCw className="w-3 h-3" />
                  {conn.lastSync}
                </div>
              )}
              <button
                onClick={() => toggleConnection(conn.id)}
                disabled={savingConnections}
                className={`px-3 py-1.5 text-[12px] rounded-lg border transition-all disabled:opacity-60 ${
                  conn.connected
                    ? "border-border text-muted-foreground hover:text-foreground hover:bg-accent/40"
                    : "border-primary/20 bg-primary/8 text-primary hover:bg-primary/12"
                }`}
                style={{ fontWeight: 500 }}
              >
                {conn.connected ? "Disconnect" : "Connect"}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <FeatureGate feature="apiAccess" featureLabel="API Access">
        <SectionCard>
          <SectionHeader title="API access" description="Use your API key to connect custom integrations" />
          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex-1 px-3 py-2 bg-accent/30 border border-border rounded-lg text-[13px] tabular-nums truncate"
              style={{ fontFamily: "ui-monospace, monospace" }}
            >
              {apiKeyData?.key ? (apiKeyVisible ? apiKeyData.key : "\u2022".repeat(24)) : "No key generated"}
            </div>
            {apiKeyData?.key && (
              <>
                <button
                  onClick={() => setApiKeyVisible((v) => !v)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all"
                >
                  {apiKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={copyApiKey}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all"
                >
                  {apiCopied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </button>
              </>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-muted-foreground">
              {apiKeyData?.createdAt
                ? `Generated ${new Date(apiKeyData.createdAt).toLocaleDateString()}`
                : "Keep this key secret. Regenerate if compromised."}
            </div>
            <button
              onClick={handleRegenerateKey}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all disabled:opacity-60"
              style={{ fontWeight: 500 }}
            >
              {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {regenerating ? "Generating..." : "Regenerate"}
            </button>
          </div>
        </SectionCard>
      </FeatureGate>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Data & Export Tab
// ═══════════════════════════════════════════════════════════════════
function DataTab() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [resetTyped, setResetTyped] = useState("");
  const [deleteTyped, setDeleteTyped] = useState("");
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const { refresh, workspaceId } = useData();
  const { can, planId: currentPlanId, setPlan, plan: currentPlan } = usePlan();
  const canExport = can("pdfExport");

  const handleExport = async (type: string, label: string) => {
    setExporting(type);
    try {
      await api.exportData(type);
      toast.success(`${label} exported — check your downloads`);
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const handleResetFinancial = async () => {
    setResetting(true);
    try {
      await api.resetFinancialData();
      toast.success("Financial data reset");
      setShowResetModal(false);
      setResetTyped("");
    } catch (err: any) {
      toast.error(err.message || "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    setDeleting(true);
    try {
      // Auto-downgrade to Starter before deleting data
      if (currentPlanId !== "starter") {
        try {
          await api.updatePlan("starter");
          setPlan({ ...currentPlan, planId: "starter", isTrial: false, trialEnd: null });
        } catch {}
      }
      await api.deleteWorkspace();
      toast.success("Workspace deleted");
      setShowDeleteModal(false);
      setDeleteTyped("");
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const exports = [
    {
      type: "time-sessions",
      label: "Time sessions",
      description: "All logged sessions with client, task, duration, revenue",
      icon: Clock,
    },
    {
      type: "clients",
      label: "Client list",
      description: "Client details, rates, lifetime revenue, contact info",
      icon: Users,
    },
    {
      type: "financial",
      label: "Financial summary",
      description: "Monthly earnings, tax estimates, net calculations",
      icon: DollarSign,
    },
    {
      type: "full-backup",
      label: "Full workspace backup",
      description: "Complete JSON export of all workspace data",
      icon: Database,
    },
  ];

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">
      <SectionCard>
        <SectionHeader title="Export data" description="Download your workspace data as CSV or JSON" />
        {!canExport ? (
          <div className="py-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-[#5ea1bf]/10 flex items-center justify-center mx-auto mb-3">
              <Download className="w-4 h-4 text-[#5ea1bf]" />
            </div>
            <p className="text-[13px] text-muted-foreground mb-1">Data export is available on the Pro plan</p>
            <p className="text-[12px] text-muted-foreground/60">
              Export clients, sessions, financial summaries, and full backups
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {exports.map((exp) => (
              <div
                key={exp.type}
                className="flex items-center gap-4 py-3 px-3 rounded-lg hover:bg-accent/30 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-accent/60 flex items-center justify-center flex-shrink-0 text-muted-foreground">
                  <exp.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px]" style={{ fontWeight: 500 }}>
                    {exp.label}
                  </div>
                  <div className="text-[12px] text-muted-foreground">{exp.description}</div>
                </div>
                <button
                  onClick={() => handleExport(exp.type, exp.label)}
                  disabled={exporting === exp.type}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-100"
                  style={{ fontWeight: 500 }}
                >
                  {exporting === exp.type ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {exporting === exp.type ? "Exporting..." : "Export"}
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Demo data" description="Populate your workspace with realistic sample data for testing" />
        <div className="py-3 px-4 rounded-lg border border-[rgba(94,161,191,0.25)] bg-[rgba(94,161,191,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px]" style={{ fontWeight: 500 }}>
                Seed workspace with demo data
              </div>
              <div className="text-[12px] text-muted-foreground">
                9 clients, 200+ sessions, 20+ projects, notes, and full settings — overwrites existing data
              </div>
            </div>
            <button
              onClick={async () => {
                setSeeding(true);
                try {
                  const result = await api.seedDemoData();
                  await refresh();
                  toast.success(
                    `Seeded ${result.summary?.clients || 0} clients, ${result.summary?.sessions || 0} sessions, ${result.summary?.projects || 0} projects`,
                  );
                } catch (err: any) {
                  toast.error(err.message || "Seed failed");
                } finally {
                  setSeeding(false);
                }
              }}
              disabled={seeding}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] rounded-lg bg-[rgba(94,161,191,0.12)] border border-[rgba(94,161,191,0.35)] text-[#4a8ba8] hover:bg-[rgba(94,161,191,0.2)] transition-all disabled:opacity-60"
              style={{ fontWeight: 500 }}
            >
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {seeding ? "Seeding..." : "Seed demo data"}
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Data integrity" description="Recalculate aggregated client statistics from actual session data" />
        <div className="py-3 px-4 rounded-lg border border-border bg-accent/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[14px]" style={{ fontWeight: 500 }}>
                Recalculate all client stats
              </div>
              <div className="text-[12px] text-muted-foreground">
                Recomputes hours logged, lifetime revenue, monthly earnings, and true hourly rate for every client
              </div>
            </div>
            <button
              onClick={async () => {
                setRecalculating(true);
                try {
                  const { supabase } = await import("@/integrations/supabase/client");
                  if (!workspaceId) throw new Error("No workspace found");
                  const { error } = await supabase.rpc("recalculate_all_client_aggregates", { p_workspace_id: workspaceId });
                  if (error) throw error;
                  await refresh();
                  toast.success("All client stats recalculated");
                } catch (err: any) {
                  toast.error(err.message || "Recalculation failed");
                } finally {
                  setRecalculating(false);
                }
              }}
              disabled={recalculating}
              className="flex items-center gap-1.5 px-4 py-2 text-[12px] rounded-lg bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20 transition-all disabled:opacity-60"
              style={{ fontWeight: 500 }}
            >
              {recalculating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {recalculating ? "Recalculating..." : "Recalculate all"}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Danger Zone */}
      <div className="rounded-xl border-2 border-[#c27272]/30 overflow-hidden">
        <div className="px-6 py-4 bg-[#c27272]/[0.05] border-b border-[#c27272]/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c27272]/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#c27272]" />
            </div>
            <div>
              <h3 className="text-[15px] text-[#b05656]" style={{ fontWeight: 600 }}>
                Danger zone
              </h3>
              <p className="text-[12px] text-[#c27272]/70">These actions are permanent and cannot be undone</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4 bg-card">
          {/* Reset Financial */}
          <div className="py-3.5 px-4 rounded-lg border border-[#c27272]/15 bg-[#c27272]/[0.02] hover:bg-[#c27272]/[0.04] transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>
                  Reset all financial data
                </div>
                <div className="text-[12px] text-muted-foreground mt-0.5">
                  Clears earnings, sessions, and invoices — clients preserved
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(true)}
                className="px-3.5 py-1.5 text-[12px] rounded-lg border border-[#c27272]/30 text-[#b05656] hover:bg-[#c27272]/[0.08] transition-all"
                style={{ fontWeight: 500 }}
              >
                Reset data
              </button>
            </div>
          </div>

          {/* Delete Workspace */}
          <div className="py-3.5 px-4 rounded-lg border border-[#c27272]/15 bg-[#c27272]/[0.02] hover:bg-[#c27272]/[0.04] transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[14px] text-foreground" style={{ fontWeight: 500 }}>
                  Delete workspace
                </div>
                <div className="text-[12px] text-muted-foreground mt-0.5">
                  Permanently removes all data, members, and integrations
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3.5 py-1.5 text-[12px] rounded-lg bg-[#c27272]/10 border border-[#c27272]/30 text-[#b05656] hover:bg-[#c27272]/[0.18] transition-all"
                style={{ fontWeight: 500 }}
              >
                Delete workspace
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reset Financial Data Modal ────────────────────────────── */}
      <AnimatePresence>
        {showResetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
            onClick={() => {
              setShowResetModal(false);
              setResetTyped("");
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl p-7 max-w-md w-full mx-4"
              style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-11 h-11 rounded-xl bg-[#c27272]/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-5 h-5 text-[#c27272]" />
              </div>
              <h3 className="text-[16px] text-foreground mb-1" style={{ fontWeight: 600 }}>
                Reset all financial data?
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-1">
                This will permanently delete all earnings, time sessions, and invoices. Your clients and projects will
                be preserved.
              </p>
              <p className="text-[13px] text-[#b05656] leading-relaxed mb-5" style={{ fontWeight: 500 }}>
                This action cannot be undone.
              </p>

              <div className="mb-5">
                <label className="text-[12px] text-muted-foreground mb-1.5 block" style={{ fontWeight: 500 }}>
                  Type <span className="text-foreground font-semibold">RESET</span> to confirm
                </label>
                <input
                  value={resetTyped}
                  onChange={(e) => setResetTyped(e.target.value)}
                  placeholder="RESET"
                  className="w-full px-3 py-2 text-[13px] bg-accent/20 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c27272]/20 focus:border-[#c27272]/30 transition-all font-mono"
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetTyped("");
                  }}
                  className="px-4 py-2 text-[13px] rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all"
                  style={{ fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetFinancial}
                  disabled={resetTyped !== "RESET" || resetting}
                  className="px-4 py-2 text-[13px] rounded-lg bg-[#c27272] text-white hover:bg-[#b05656] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                  style={{ fontWeight: 500 }}
                >
                  {resetting && <Loader2 className="w-3 h-3 animate-spin" />}
                  {resetting ? "Resetting..." : "Reset financial data"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Workspace Modal ────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
            onClick={() => {
              setShowDeleteModal(false);
              setDeleteTyped("");
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl p-7 max-w-md w-full mx-4"
              style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-11 h-11 rounded-xl bg-[#c27272]/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-5 h-5 text-[#c27272]" />
              </div>
              <h3 className="text-[16px] text-foreground mb-1" style={{ fontWeight: 600 }}>
                Delete this workspace?
              </h3>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
                This will permanently remove all workspace data including clients, projects, sessions, invoices,
                members, and integrations.
              </p>

              {/* Subscription warning */}
              {currentPlanId !== "starter" && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-[#bfa044]/[0.06] border border-[#bfa044]/20 mb-4">
                  <Shield className="w-4 h-4 text-[#bfa044] mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-[12px] text-foreground" style={{ fontWeight: 600 }}>
                      Your subscription will be downgraded
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Your {PLANS[currentPlanId].name} plan will be automatically downgraded to Starter (free) upon
                      deletion. No further charges will apply.
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[13px] text-[#b05656] leading-relaxed mb-5" style={{ fontWeight: 500 }}>
                This action is permanent and cannot be undone.
              </p>

              <div className="mb-5">
                <label className="text-[12px] text-muted-foreground mb-1.5 block" style={{ fontWeight: 500 }}>
                  Type <span className="text-foreground font-semibold">DELETE</span> to confirm
                </label>
                <input
                  value={deleteTyped}
                  onChange={(e) => setDeleteTyped(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 text-[13px] bg-accent/20 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c27272]/20 focus:border-[#c27272]/30 transition-all font-mono"
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteTyped("");
                  }}
                  className="px-4 py-2 text-[13px] rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all"
                  style={{ fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteWorkspace}
                  disabled={deleteTyped !== "DELETE" || deleting}
                  className="px-4 py-2 text-[13px] rounded-lg bg-[#c27272] text-white hover:bg-[#b05656] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                  style={{ fontWeight: 500 }}
                >
                  {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                  {deleting ? "Deleting..." : "Delete workspace"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
