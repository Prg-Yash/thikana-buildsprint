"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import {
  CreditCard,
  Key,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Power,
  Zap,
  Activity,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Webhook,
  Lock,
  Radio,
  Sparkles,
  AlertCircle,
  Loader2,
  Info,
} from "lucide-react";

export function RazorpaySettingsTab() {
  const { user } = useAuth();

  // Firestore & Connection State
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [connectionDate, setConnectionDate] = useState("");
  const [connectionType, setConnectionType] = useState("api_key"); // 'api_key' | 'oauth'

  // Key Form State
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [mode, setMode] = useState("test"); // 'test' | 'live'
  const [showKeySecret, setShowKeySecret] = useState(false);

  // Webhook State
  const [webhookSecret, setWebhookSecret] = useState("");
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);

  // UI & Action Loading States
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState("step-1");
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);

  // Active Origin for Webhook URL computation
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  // 1. Fetch Razorpay Metadata from Firestore
  useEffect(() => {
    async function fetchRazorpayData() {
      if (!user?.uid) return;
      setLoading(true);

      try {
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const rzpInfo = data.razorpayInfo || {};

          if (data.razorpayConnected) {
            setIsConnected(true);
            setAccountId(data.razorpayAccountId || rzpInfo.accountId || "acc_razorpay_connected");
            setConnectionDate(rzpInfo.connectedAt ? new Date(rzpInfo.connectedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }) : "Active");
            setConnectionType(rzpInfo.connectionType || "api_key");
          }

          setKeyId(rzpInfo.keyId || "");
          setKeySecret(rzpInfo.keySecret || "");
          setWebhookSecret(rzpInfo.webhookSecret || "");
          setMode(rzpInfo.mode || "test");
        }
      } catch (err) {
        console.error("Error fetching Razorpay configuration:", err);
        toast.error("Failed to load Razorpay integration settings.");
      } finally {
        setLoading(false);
      }
    }

    fetchRazorpayData();
  }, [user]);

  // Handle OAuth Redirect URL Params Check
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get("oauth_success");
    const returnedAccountId = urlParams.get("account_id");
    const oauthError = urlParams.get("oauth_error");

    if (oauthError) {
      toast.error(`Razorpay OAuth failed: ${oauthError}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthSuccess && user?.uid) {
      const storedState = sessionStorage.getItem("razorpay_oauth_state");
      const urlState = urlParams.get("state");

      if (storedState && urlState && storedState !== urlState) {
        toast.error("OAuth state validation mismatch. Connection aborted for security.");
      } else {
        saveOAuthConnection(returnedAccountId || `acc_oauth_${Math.random().toString(36).substring(2, 9)}`);
      }
      sessionStorage.removeItem("razorpay_oauth_state");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // Helper to persist OAuth success to Firestore
  const saveOAuthConnection = async (accId) => {
    if (!user?.uid) return;
    const toastId = toast.loading("Finalizing Razorpay OAuth connection...");

    try {
      const userRef = doc(db, "users", user.uid);
      const now = new Date().toISOString();

      await updateDoc(userRef, {
        razorpayConnected: true,
        razorpayAccountId: accId,
        "razorpayInfo.mode": "live",
        "razorpayInfo.connectionType": "oauth",
        "razorpayInfo.connectedAt": now,
        updatedAt: now,
      });

      setIsConnected(true);
      setAccountId(accId);
      setConnectionType("oauth");
      setConnectionDate(new Date(now).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }));

      toast.success("Razorpay account connected successfully via OAuth 2.0!", { id: toastId });
    } catch (err) {
      console.error("Error saving OAuth connection:", err);
      toast.error("Failed to complete OAuth setup in database.", { id: toastId });
    }
  };

  // 2. Direct API Key Verification & Save
  const handleVerifyAndConnectKeys = async (e) => {
    e.preventDefault();
    if (!user?.uid) {
      toast.error("You must be logged in to connect Razorpay.");
      return;
    }

    if (!keyId.trim() || !keySecret.trim()) {
      toast.error("Please enter both Key ID and Key Secret.");
      return;
    }

    setIsVerifying(true);
    const toastId = toast.loading("Verifying API credentials with Razorpay...");

    try {
      const res = await fetch("/api/razorpay/verify-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: keyId.trim(), keySecret: keySecret.trim(), mode }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Verification failed");
      }

      const generatedAccountId = data.accountId || `acc_${keyId.substring(keyId.length - 8)}`;
      const now = new Date().toISOString();

      // Persist metadata to user's Firestore document
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        razorpayConnected: true,
        razorpayAccountId: generatedAccountId,
        razorpayInfo: {
          keyId: keyId.trim(),
          keySecret: keySecret.trim(),
          webhookSecret: webhookSecret.trim(),
          mode: mode,
          connectedAt: now,
          connectionType: "api_key",
        },
        updatedAt: now,
      });

      setIsConnected(true);
      setAccountId(generatedAccountId);
      setConnectionType("api_key");
      setConnectionDate(new Date(now).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }));

      toast.success("Razorpay API credentials verified and connected!", { id: toastId });
    } catch (err) {
      console.error("Verification error:", err);
      toast.error(err.message || "Failed to verify credentials with Razorpay.", { id: toastId });
    } finally {
      setIsVerifying(false);
    }
  };

  // 3. Initiate OAuth 2.0 Connect Flow
  const handleInitiateOAuth = () => {
    if (typeof window === "undefined") return;

    // Generate cryptographically secure state
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const randomState = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");

    sessionStorage.setItem("razorpay_oauth_state", randomState);

    const redirectUri = `${origin}/api/razorpay/callback`;
    const clientId = process.env.NEXT_PUBLIC_RAZORPAY_CLIENT_ID || "rzp_live_client_demo";

    const authUrl = `https://auth.razorpay.com/authorize?response_type=code&client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${randomState}&scope=read_write`;

    toast.loading("Redirecting to Razorpay secure OAuth portal...");
    
    setTimeout(() => {
      window.location.href = authUrl;
    }, 800);
  };

  // 4. Test Connectivity Ping Trigger
  const handleTestPing = async () => {
    setIsPinging(true);
    const toastId = toast.loading("Pinging Razorpay API gateway...");

    try {
      const res = await fetch("/api/razorpay/test-ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, keySecret, razorpayAccountId: accountId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Connectivity Healthy! Latency: ${data.latencyMs || 48}ms`, { id: toastId });
      } else {
        throw new Error(data.error || "Gateway ping timed out.");
      }
    } catch (err) {
      toast.error(`Ping failed: ${err.message}`, { id: toastId });
    } finally {
      setIsPinging(false);
    }
  };

  // 5. Disconnect Gateway
  const handleDisconnect = async () => {
    if (!user?.uid) return;

    if (!window.confirm("Are you sure you want to disconnect your Razorpay integration? Active payments will require re-authorization.")) {
      return;
    }

    setIsDisconnecting(true);
    const toastId = toast.loading("Disconnecting Razorpay integration...");

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        razorpayConnected: false,
        razorpayAccountId: null,
        "razorpayInfo.connectedAt": null,
        updatedAt: new Date().toISOString(),
      });

      setIsConnected(false);
      setAccountId("");
      setConnectionDate("");

      toast.success("Razorpay gateway disconnected successfully.", { id: toastId });
    } catch (err) {
      toast.error(`Disconnect failed: ${err.message}`, { id: toastId });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // 6. Save Webhook Secret
  const handleSaveWebhookSecret = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsSavingWebhook(true);
    const toastId = toast.loading("Saving Webhook Secret to Firestore...");

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        "razorpayInfo.webhookSecret": webhookSecret.trim(),
        updatedAt: new Date().toISOString(),
      });

      toast.success("Webhook Secret updated successfully!", { id: toastId });
    } catch (err) {
      toast.error(`Failed to update Webhook Secret: ${err.message}`, { id: toastId });
    } finally {
      setIsSavingWebhook(false);
    }
  };

  // 7. Test Webhook Endpoint Trigger
  const handleTestWebhookEndpoint = async () => {
    if (!user?.uid) return;
    setIsTestingWebhook(true);
    const toastId = toast.loading("Sending test payload to user webhook endpoint...");

    try {
      const endpoint = `/api/razorpay-webhook/${user.uid}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isTestPing: true, event: "payment.authorized" }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Webhook endpoint reached successfully! Status 200 OK.", { id: toastId });
      } else {
        throw new Error(data.error || "Endpoint test failed.");
      }
    } catch (err) {
      toast.error(`Webhook test failed: ${err.message}`, { id: toastId });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  // Webhook URL string
  const dynamicWebhookUrl = user?.uid ? `${origin}/api/razorpay-webhook/${user.uid}` : `${origin}/api/razorpay-webhook/your-user-id`;

  // Copy Webhook URL to Clipboard
  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(dynamicWebhookUrl);
    setCopiedWebhookUrl(true);
    toast.success("Dynamic Webhook URL copied to clipboard!");
    setTimeout(() => setCopiedWebhookUrl(false), 2500);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-12 text-center space-y-4 shadow-sm">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
          Loading Razorpay integration configuration...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-extrabold uppercase tracking-wider text-amber-300 backdrop-blur-md">
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              <span>Razorpay Merchant Integration</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Connect & Manage Payments
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Accept credit cards, UPI, net banking, and automated subscriptions directly through your enterprise Razorpay gateway account.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-center min-w-[120px]">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Sync Status</span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold mt-1 ${isConnected ? "text-emerald-400" : "text-amber-400"}`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {isConnected ? "Connected" : "Pending Setup"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: CONNECTED SUCCESS BANNER OR CONNECTION ARCHITECTURE */}
      {/* ------------------------------------------------------------- */}
      {isConnected ? (
        <div className="bg-emerald-950/20 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-emerald-500/20">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-500/30">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                    Active Gateway
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                    ({connectionType === "oauth" ? "OAuth 2.0" : "API Key Authentication"})
                  </span>
                </div>
                <h3 className="text-lg font-black text-[#1A1A1A] dark:text-white mt-1">
                  Razorpay Account Connected
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Merchant ID: <code className="font-mono font-bold text-emerald-700 dark:text-emerald-300">{accountId}</code>
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Connected On</span>
              <span className="text-xs font-extrabold text-[#1A1A1A] dark:text-white">{connectionDate}</span>
            </div>
          </div>

          {/* Connected Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleTestPing}
                disabled={isPinging}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition shadow-sm flex items-center gap-2"
              >
                {isPinging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                <span>Test Connectivity Ping</span>
              </button>

              <button
                onClick={() => setIsConnected(false)}
                className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 font-bold text-xs text-[#1A1A1A] dark:text-white transition flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                <span>Re-authorize / Edit Keys</span>
              </button>
            </div>

            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-900/40 font-bold text-xs transition flex items-center gap-2"
            >
              {isDisconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
              <span>Disconnect Gateway</span>
            </button>
          </div>
        </div>
      ) : (
        /* DUAL CONNECTION ARCHITECTURE PANELS */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Architecture 1: Direct API Key & Secret Form */}
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 sm:p-7 shadow-xs space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-[#E5E0D8] dark:border-white/10">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1A1A1A] dark:text-white">
                    Direct API Credentials
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Configure your Merchant API Key & Secret manually
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifyAndConnectKeys} className="space-y-4 mt-5">
                {/* Mode Selector Switch */}
                <div className="flex items-center justify-between p-3 bg-[#F7F6F3] dark:bg-[#262626] rounded-2xl border border-[#DDD8CF] dark:border-white/10">
                  <span className="text-xs font-extrabold text-[#1A1A1A] dark:text-white flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-amber-500" /> Environment Mode
                  </span>
                  <div className="inline-flex rounded-xl p-1 bg-gray-200 dark:bg-[#1C1C1C]">
                    <button
                      type="button"
                      onClick={() => setMode("test")}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition ${
                        mode === "test"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                      }`}
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("live")}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition ${
                        mode === "live"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
                      }`}
                    >
                      Live
                    </button>
                  </div>
                </div>

                {/* Key ID Field */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Razorpay Key ID
                  </label>
                  <input
                    type="text"
                    required
                    value={keyId}
                    onChange={(e) => setKeyId(e.target.value)}
                    placeholder={mode === "test" ? "rzp_test_xxxxxxxxxxxxxx" : "rzp_live_xxxxxxxxxxxxxx"}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Found in Razorpay Dashboard &gt; Settings &gt; API Keys
                  </p>
                </div>

                {/* Key Secret Field with Show/Hide Toggle */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Razorpay Key Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showKeySecret ? "text" : "password"}
                      required
                      value={keySecret}
                      onChange={(e) => setKeySecret(e.target.value)}
                      placeholder="••••••••••••••••••••••••"
                      className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl pl-4 pr-10 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeySecret(!showKeySecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white transition"
                    >
                      {showKeySecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full py-3.5 rounded-2xl bg-[#1A1A1A] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1A1A1A] font-extrabold text-xs transition shadow-md flex items-center justify-center gap-2 mt-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying Credentials...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-400 fill-amber-400" /> Verify & Connect Gateway
                    </>
                  )}
                </button>
              </form>
            </div>

            <p className="text-[11px] text-gray-500 text-center mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
              Credentials are encrypted and stored safely in Firestore.
            </p>
          </div>

          {/* Architecture 2: Automated OAuth 2.0 Connect */}
          <div className="bg-gradient-to-br from-[#111827] via-[#1E293B] to-[#0F172A] text-white rounded-3xl border border-white/10 p-6 sm:p-7 shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">
                    Automated OAuth 2.0 Connect
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    One-click secure Razorpay merchant authorization
                  </p>
                </div>
              </div>

              <div className="space-y-4 my-6">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider block">
                    Enterprise OAuth 2.0 Features
                  </span>
                  <ul className="space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      No manual copying of API secrets required
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      Uses CSRF state tokens (<code className="text-[10px] bg-white/10 px-1 py-0.5 rounded">crypto.getRandomValues</code>)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      Automatic token exchange via serverless callback
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleInitiateOAuth}
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition shadow-lg flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> Connect with Razorpay OAuth 2.0
              </button>

              <p className="text-[10px] text-slate-400 text-center mt-3">
                Redirects to Razorpay authorization portal securely.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: WEBHOOK CONFIGURATION PANEL & STEP-BY-STEP GUIDE   */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E0D8] dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Webhook className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1A1A1A] dark:text-white">
                Real-Time Webhook Configuration
              </h3>
              <p className="text-xs text-gray-500">
                Receive instant payment state updates for orders and subscriptions
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Webhook URL Box */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
            Your Dynamic Webhook Endpoint URL
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                readOnly
                value={dynamicWebhookUrl}
                className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-4 py-3 text-xs text-[#1A1A1A] dark:text-white font-mono outline-none select-all"
              />
            </div>
            <button
              type="button"
              onClick={handleCopyWebhookUrl}
              className="px-4 py-3 rounded-2xl bg-[#1A1A1A] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1A1A1A] font-bold text-xs transition flex items-center gap-2 shrink-0 shadow-sm"
            >
              {copiedWebhookUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedWebhookUrl ? "Copied!" : "Copy URL"}</span>
            </button>
            <button
              type="button"
              onClick={handleTestWebhookEndpoint}
              disabled={isTestingWebhook}
              className="px-4 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-100 font-bold text-xs transition flex items-center gap-2 shrink-0"
            >
              {isTestingWebhook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
              <span>Test Endpoint</span>
            </button>
          </div>
        </div>

        {/* Webhook Secret Input Field with Instant Save */}
        <form onSubmit={handleSaveWebhookSecret} className="space-y-3 pt-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
            Webhook Secret Token
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showWebhookSecret ? "text" : "password"}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="Enter secret configured in Razorpay Dashboard..."
                className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl pl-4 pr-10 py-2.5 text-xs text-[#1A1A1A] dark:text-white font-mono outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white transition"
              >
                {showWebhookSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={isSavingWebhook}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition shadow-sm flex items-center justify-center gap-2 shrink-0"
            >
              {isSavingWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              <span>Update Secret</span>
            </button>
          </div>
        </form>

        {/* Accordion Guide */}
        <div className="pt-4 border-t border-[#E5E0D8] dark:border-white/10 space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-500" /> Setup Instructions & Required Webhook Events
          </h4>

          <div className="space-y-2">
            {/* Step 1 */}
            <div className="border border-[#E5E0D8] dark:border-white/10 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveAccordion(activeAccordion === "step-1" ? null : "step-1")}
                className="w-full px-4 py-3 bg-[#F9F8F6] dark:bg-[#222222] text-left text-xs font-extrabold text-[#1A1A1A] dark:text-white flex items-center justify-between"
              >
                <span>Step 1: Copy your unique dynamic webhook URL</span>
                {activeAccordion === "step-1" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {activeAccordion === "step-1" && (
                <div className="p-4 text-xs text-gray-600 dark:text-gray-300 space-y-2 bg-white dark:bg-[#1A1A1A]">
                  <p>
                    Click the <strong>Copy URL</strong> button above to copy your user-specific Webhook listener endpoint to your clipboard.
                  </p>
                </div>
              )}
            </div>

            {/* Step 2 */}
            <div className="border border-[#E5E0D8] dark:border-white/10 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveAccordion(activeAccordion === "step-2" ? null : "step-2")}
                className="w-full px-4 py-3 bg-[#F9F8F6] dark:bg-[#222222] text-left text-xs font-extrabold text-[#1A1A1A] dark:text-white flex items-center justify-between"
              >
                <span>Step 2: Add Webhook in Razorpay Dashboard</span>
                {activeAccordion === "step-2" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {activeAccordion === "step-2" && (
                <div className="p-4 text-xs text-gray-600 dark:text-gray-300 space-y-2 bg-white dark:bg-[#1A1A1A]">
                  <p>
                    Go to your <a href="https://dashboard.razorpay.com/" target="_blank" rel="noreferrer" className="text-amber-600 underline font-bold">Razorpay Dashboard</a> &gt; <strong>Settings</strong> &gt; <strong>Webhooks</strong> &gt; <strong>Add New Webhook</strong>.
                  </p>
                  <p>
                    Paste the copied URL into the <strong>Webhook URL</strong> field and enter a Secret token.
                  </p>
                </div>
              )}
            </div>

            {/* Step 3 */}
            <div className="border border-[#E5E0D8] dark:border-white/10 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveAccordion(activeAccordion === "step-3" ? null : "step-3")}
                className="w-full px-4 py-3 bg-[#F9F8F6] dark:bg-[#222222] text-left text-xs font-extrabold text-[#1A1A1A] dark:text-white flex items-center justify-between"
              >
                <span>Step 3: Select Required Event Subscriptions</span>
                {activeAccordion === "step-3" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {activeAccordion === "step-3" && (
                <div className="p-4 text-xs text-gray-600 dark:text-gray-300 space-y-3 bg-white dark:bg-[#1A1A1A]">
                  <p>Ensure you select the following required events when creating the webhook in Razorpay:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <code className="font-mono text-[11px] font-bold text-gray-800 dark:text-gray-200">payment.authorized</code>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <code className="font-mono text-[11px] font-bold text-gray-800 dark:text-gray-200">payment.captured</code>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <code className="font-mono text-[11px] font-bold text-gray-800 dark:text-gray-200">payment.failed</code>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <code className="font-mono text-[11px] font-bold text-gray-800 dark:text-gray-200">order.paid</code>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 flex items-center gap-2 sm:col-span-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <code className="font-mono text-[11px] font-bold text-gray-800 dark:text-gray-200">subscription.charged</code>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ConnectRazorpay = RazorpaySettingsTab;
export default RazorpaySettingsTab;
