"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { PERSONAS } from "@/lib/ai/personas";
import {
  Send,
  Sparkles,
  Package,
  PlusSquare,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  Landmark,
  Megaphone,
  Headphones,
  Check,
  ChevronRight,
  Bot,
  ChevronLeft,
} from "lucide-react";
import toast from "react-hot-toast";

const PERSONA_ICONS = {
  cfo: Landmark,
  ops: Package,
  cmo: Megaphone,
  support: Headphones,
};

export default function AIAdvisorPage() {
  const { user } = useAuth();
  const chatBottomRef = useRef(null);
  const promptScrollRef = useRef(null);
  const activeFetchAbortController = useRef(null);

  const scrollPrompts = (direction) => {
    if (promptScrollRef.current) {
      const scrollAmount = direction === "left" ? -250 : 250;
      promptScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const [selectedPersona, setSelectedPersona] = useState("cfo");

  const [personaHistories, setPersonaHistories] = useState({
    cfo: [
      {
        role: "assistant",
        text: `Hello ${user?.displayName || "Merchant"}! I am your **Thikana CFO**.\n\nI monitor your store cash flow health, WMA budget predictions, Z-Score expense anomaly alerts, and budget ceiling enforcement. What financial question can I help answer?`,
      },
    ],
    ops: [
      {
        role: "assistant",
        text: `Hello ${user?.displayName || "Merchant"}! I am your **Thikana Ops Manager**.\n\nI monitor low-stock risks (below 5 units), re-ordering schedules, catalog valuation, and appointment slot buffers. How can I optimize your store operations today?`,
      },
    ],
    cmo: [
      {
        role: "assistant",
        text: `Hello ${user?.displayName || "Merchant"}! I am your **Thikana CMO**.\n\nI craft viral social feed captions, weekend footfall promotions, and Day-of-Week sales timing strategies. What marketing campaign shall we plan today?`,
      },
    ],
    support: [
      {
        role: "assistant",
        text: `Hello ${user?.displayName || "Merchant"}! I am your **Thikana Support Lead**.\n\nI specialize in customer call lead SLAs, callback response scripts, and WhatsApp follow-up templates. How can I assist you with your customer leads?`,
      },
    ],
  });

  const [inputQuery, setInputQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentPersona = PERSONAS[selectedPersona] || PERSONAS.cfo;
  const currentMessages = personaHistories[selectedPersona] || [];
  const ActiveIcon = PERSONA_ICONS[selectedPersona] || Landmark;

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [personaHistories, selectedPersona]);

  const handlePersonaSwitch = (newPersona) => {
    if (activeFetchAbortController.current) {
      activeFetchAbortController.current.abort();
      activeFetchAbortController.current = null;
    }
    setIsSubmitting(false);
    setSelectedPersona(newPersona);
  };

  const handleSendMessage = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isSubmitting) return;

    const userMsg = { role: "user", text: textToSend.trim() };

    setPersonaHistories((prev) => ({
      ...prev,
      [selectedPersona]: [...(prev[selectedPersona] || []), userMsg],
    }));

    setInputQuery("");
    setIsSubmitting(true);

    setPersonaHistories((prev) => ({
      ...prev,
      [selectedPersona]: [
        ...(prev[selectedPersona] || []),
        { role: "assistant", text: "" },
      ],
    }));

    const controller = new AbortController();
    activeFetchAbortController.current = controller;

    try {
      const historyForPayload = (personaHistories[selectedPersona] || []).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const response = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          userId: user?.uid,
          personaId: selectedPersona,
          query: textToSend.trim(),
          chatHistory: historyForPayload,
        }),
      });

      if (!response.ok || !response.body) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        setPersonaHistories((prev) => {
          const list = [...(prev[selectedPersona] || [])];
          if (list.length > 0) {
            list[list.length - 1] = {
              role: "assistant",
              text: accumulatedText,
            };
          }
          return { ...prev, [selectedPersona]: list };
        });
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Fetch aborted due to persona tab switch.");
        return;
      }
      console.error("AI Advisor streaming error:", err);
      toast.error(err.message || "Failed to stream advice from AI Advisor.");

      setPersonaHistories((prev) => {
        const list = [...(prev[selectedPersona] || [])];
        if (list.length > 0 && list[list.length - 1].text === "") {
          list[list.length - 1] = {
            role: "assistant",
            text: "I encountered an issue streaming advice. Please try again.",
          };
        }
        return { ...prev, [selectedPersona]: list };
      });
    } finally {
      setIsSubmitting(false);
      activeFetchAbortController.current = null;
    }
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-black text-[#1A1A1A] dark:text-white tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Thikana Store Advisory Hub
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Data-backed strategic advisor trained on your live store inventory, customer leads, and retail playbooks.
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex items-center gap-2">
          <Link
            href="/posts/create"
            className="px-4 py-2.5 rounded-2xl bg-[#1A1A1A] dark:bg-white text-white dark:text-[#1A1A1A] text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <PlusSquare className="w-4 h-4" />
            <span>Create Promo Post</span>
          </Link>
          <Link
            href="/profile/inventory"
            className="px-4 py-2.5 rounded-2xl border border-[#E5E0D8] dark:border-white/10 hover:bg-[#F4F1EA] dark:hover:bg-white/5 text-xs font-bold text-[#1A1A1A] dark:text-white transition flex items-center gap-1.5"
          >
            <Package className="w-4 h-4 text-[#4A7C6F]" />
            <span>Inventory</span>
          </Link>
        </div>
      </div>

      {/* Main 2-Column Layout: Chat Window Left (8 cols) + Persona Selection Right (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Expanded Chat Interface (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 sm:p-8 shadow-sm flex flex-col h-[calc(100vh-210px)] min-h-[660px]">
          {/* Chat Persona Active Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E0D8] dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] flex items-center justify-center font-bold shrink-0 shadow-xs">
                <ActiveIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-black text-lg text-[#1A1A1A] dark:text-white">
                  {currentPersona.name}
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  {currentPersona.roleTitle}
                </p>
              </div>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {currentMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 text-xs leading-relaxed ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] flex items-center justify-center shrink-0 font-bold">
                    <ActiveIcon className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] p-4 sm:p-5 rounded-2xl ${
                    msg.role === "user"
                      ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] font-bold rounded-tr-xs"
                      : "bg-[#F7F6F3] dark:bg-[#222222] text-gray-800 dark:text-gray-200 border border-[#E5E0D8] dark:border-white/5 rounded-tl-xs space-y-2 text-xs"
                  }`}
                >
                  {msg.text ? (
                    msg.role === "user" ? (
                      <p>{msg.text}</p>
                    ) : (
                      <div className="prose dark:prose-invert prose-xs max-w-none space-y-2 text-xs leading-relaxed">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-2 text-gray-400 italic font-bold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing store data & generating strategy advice...</span>
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div ref={chatBottomRef} />
          </div>

          {/* Horizontal Scrollable Suggested Strategy Prompts Bar */}
          <div className="pt-3 border-t border-[#E5E0D8] dark:border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" /> Suggested Strategy Prompts
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollPrompts("left")}
                  className="p-1 rounded-lg bg-[#F7F6F3] dark:bg-[#252525] text-gray-500 hover:text-[#1A1A1A] dark:hover:text-white transition"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollPrompts("right")}
                  className="p-1 rounded-lg bg-[#F7F6F3] dark:bg-[#252525] text-gray-500 hover:text-[#1A1A1A] dark:hover:text-white transition"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div
              ref={promptScrollRef}
              className="flex items-center gap-2 overflow-x-auto overflow-y-hidden max-w-full pb-1 scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {currentPersona.suggestedPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 rounded-xl bg-[#F7F6F3] dark:bg-[#252525] border border-[#E5E0D8] dark:border-white/10 text-left text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:border-[#1A1A1A] dark:hover:border-white transition shrink-0 flex items-center gap-1.5 group shadow-2xs whitespace-nowrap"
                >
                  <span>{prompt}</span>
                  <ChevronRight className="w-3 h-3 text-gray-400 group-hover:translate-x-0.5 transition shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="pt-2 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={`Ask ${currentPersona.name} for advice, forecasts, or strategy...`}
              className="flex-1 bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-4 py-3 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] transition"
            />
            <button
              type="submit"
              disabled={isSubmitting || !inputQuery.trim()}
              className="px-5 py-3 rounded-2xl bg-[#1A1A1A] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1A1A1A] text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>

        {/* Right Column: Persona Selection Sidebar (4 cols) */}
        <aside className="lg:col-span-4 space-y-4 sticky top-20">
          <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-base text-[#1A1A1A] dark:text-white" style={{ fontFamily: "var(--font-heading)" }}>
                Select AI Advisor Persona
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Switch advisor context to consult specific department specialists.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {Object.keys(PERSONAS).map((key) => {
                const p = PERSONAS[key];
                const IconComp = PERSONA_ICONS[key] || Landmark;
                const isSelected = selectedPersona === key;

                return (
                  <button
                    key={p.id}
                    onClick={() => handlePersonaSwitch(p.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center gap-3.5 ${
                      isSelected
                        ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] border-[#1A1A1A] dark:border-white shadow-md scale-[1.01]"
                        : "bg-[#F7F6F3] dark:bg-[#252525] border-transparent hover:border-gray-300 text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                        isSelected
                          ? "bg-white/10 text-white dark:bg-black/10 dark:text-[#1A1A1A]"
                          : "bg-white dark:bg-[#1A1A1A] text-[#1A1A1A] dark:text-white border border-gray-200 dark:border-white/10"
                      }`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-sm truncate">{p.name}</p>
                      <p
                        className={`text-xs truncate mt-0.5 font-medium ${
                          isSelected ? "opacity-80" : "text-gray-400"
                        }`}
                      >
                        {p.roleTitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guarantee Card */}
          <div className="p-5 rounded-3xl bg-[#EEEAE4] dark:bg-[#222222] border border-[#E5E0D8] dark:border-white/10 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#1A1A1A] dark:text-white">
              <Sparkles className="w-4 h-4 text-[#4A7C6F]" />
              <span>Real-Time Context Sync</span>
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
              Your AI Co-Pilot reads your live catalog inventory, pending lead calls, and store posts to give data-backed advice.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
