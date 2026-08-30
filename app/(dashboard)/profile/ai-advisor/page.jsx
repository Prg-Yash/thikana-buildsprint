"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  query,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
} from "firebase/firestore";
import { PERSONAS } from "@/lib/ai/personas";
import {
  acquirePersonaLock,
  refreshPersonaLock,
  releasePersonaLock,
  subscribePersonaLocks,
} from "@/lib/personaLock";
import toast from "react-hot-toast";
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
  Share2,
  Edit3,
  X,
  Loader2,
  Image as ImageIcon,
  Tag,
  CheckCircle2,
  Lock,
  UserCheck,
  ShieldAlert,
} from "lucide-react";

const PERSONA_ICONS = {
  cfo: Landmark,
  ops: Package,
  cmo: Megaphone,
  support: Headphones,
};

export default function AIAdvisorPage() {
  const { user } = useAuth();
  const chatBottomRef = useRef(null);
  const chatContainerRef = useRef(null);
  const promptScrollRef = useRef(null);
  const activeFetchAbortController = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  // Business User Identification
  const businessId = user?.uid;
  const isBusinessUser =
    user?.accountType === "business" ||
    user?.isBusiness ||
    Boolean(user?.businessName) ||
    user?.role === "business" ||
    Boolean(user?.uid);

  // State
  const [selectedPersona, setSelectedPersona] = useState("cfo");
  const [activeLocks, setActiveLocks] = useState({});
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [lockOwner, setLockOwner] = useState(null);

  // Chat Messages & Pagination State
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingInitialChats, setLoadingInitialChats] = useState(true);
  const [loadingMoreChats, setLoadingMoreChats] = useState(false);
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [oldestDocSnap, setOldestDocSnap] = useState(null);

  // Input & Edit Modal State
  const [inputQuery, setInputQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingModalOpen, setEditingModalOpen] = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [editCategory, setEditCategory] = useState("Promotions");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [isPublishingPost, setIsPublishingPost] = useState(false);
  const [publishingMessageIdx, setPublishingMessageIdx] = useState(null);

  const currentPersona = PERSONAS[selectedPersona] || PERSONAS.cfo;
  const ActiveIcon = PERSONA_ICONS[selectedPersona] || Landmark;

  // 1. Real-time Subscription to Active Persona Locks for the Business
  useEffect(() => {
    if (!businessId) return;
    const unsubscribe = subscribePersonaLocks(businessId, (locksMap) => {
      setActiveLocks(locksMap);
    });
    return () => unsubscribe();
  }, [businessId]);

  // 2. Lock Acquisition & Heartbeat Management on Persona Selection / Unmount
  useEffect(() => {
    if (!businessId || !user?.uid) return;

    let isMounted = true;

    async function handleLock() {
      // Check if persona is occupied by another team member
      const lockData = activeLocks[selectedPersona];
      if (lockData && lockData.uid !== user.uid) {
        if (isMounted) {
          setIsLockedByOther(true);
          setLockOwner(lockData);
        }
        return;
      }

      // Try acquiring lock
      const lockRes = await acquirePersonaLock(businessId, selectedPersona, user);
      if (!isMounted) return;

      if (lockRes.success) {
        setIsLockedByOther(false);
        setLockOwner(null);

        // Start 10s Heartbeat
        if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = setInterval(() => {
          refreshPersonaLock(businessId, selectedPersona, user.uid);
        }, 10000);
      } else {
        setIsLockedByOther(true);
        setLockOwner(lockRes.occupiedBy || lockData);
      }
    }

    handleLock();

    return () => {
      isMounted = false;
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      // Release lock on unmount or persona switch
      releasePersonaLock(businessId, selectedPersona, user.uid);
    };
  }, [businessId, selectedPersona, user, activeLocks]);

  // Handle BeforeUnload window close to release lock
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (businessId && selectedPersona && user?.uid) {
        releasePersonaLock(businessId, selectedPersona, user.uid);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [businessId, selectedPersona, user?.uid]);

  // 3. Load Initial 10 Messages for Selected Persona from Firestore
  const loadInitialChatHistory = useCallback(async () => {
    if (!businessId || !selectedPersona) return;

    setLoadingInitialChats(true);
    setHasMoreChats(true);

    try {
      const messagesRef = collection(db, "users", businessId, "ai_chats", selectedPersona, "messages");
      const q = query(messagesRef, orderBy("timestamp", "desc"), limit(10));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Default Greeting Message if no previous chat history exists
        const defaultGreeting = {
          id: `greet_${selectedPersona}`,
          role: "assistant",
          text: getPersonaDefaultGreeting(selectedPersona, user?.displayName),
          timestamp: Date.now(),
        };
        setChatMessages([defaultGreeting]);
        setHasMoreChats(false);
        setOldestDocSnap(null);
      } else {
        const docs = snapshot.docs;
        const fetchedMessages = docs.map((d) => ({ id: d.id, ...d.data() }));
        // Reverse so oldest of the 10 is at top, newest at bottom
        fetchedMessages.reverse();

        setChatMessages(fetchedMessages);
        setOldestDocSnap(docs[docs.length - 1]); // Oldest doc among the 10
        if (docs.length < 10) {
          setHasMoreChats(false);
        }
      }
    } catch (err) {
      console.error("Error loading initial chat history:", err);
      // Fallback
      setChatMessages([
        {
          id: `greet_${selectedPersona}`,
          role: "assistant",
          text: getPersonaDefaultGreeting(selectedPersona, user?.displayName),
          timestamp: Date.now(),
        },
      ]);
      setHasMoreChats(false);
    } finally {
      setLoadingInitialChats(false);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [businessId, selectedPersona, user?.displayName]);

  useEffect(() => {
    loadInitialChatHistory();
  }, [selectedPersona, loadInitialChatHistory]);

  // 4. Load Next 5 Messages on Scrolling to Top (WhatsApp Style Incremental Pagination)
  const loadMoreMessages = async () => {
    if (!businessId || !selectedPersona || !oldestDocSnap || loadingMoreChats || !hasMoreChats) {
      return;
    }

    setLoadingMoreChats(true);
    const container = chatContainerRef.current;
    const oldScrollHeight = container ? container.scrollHeight : 0;

    try {
      const messagesRef = collection(db, "users", businessId, "ai_chats", selectedPersona, "messages");
      const q = query(
        messagesRef,
        orderBy("timestamp", "desc"),
        startAfter(oldestDocSnap),
        limit(5)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setHasMoreChats(false);
      } else {
        const docs = snapshot.docs;
        const olderMessages = docs.map((d) => ({ id: d.id, ...d.data() }));
        olderMessages.reverse(); // Chronological

        setChatMessages((prev) => [...olderMessages, ...prev]);
        setOldestDocSnap(docs[docs.length - 1]);

        if (docs.length < 5) {
          setHasMoreChats(false);
        }

        // Preserve scroll position so user experience stays anchored (WhatsApp style)
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - oldScrollHeight;
          }
        }, 50);
      }
    } catch (err) {
      console.error("Error loading older messages:", err);
    } finally {
      setLoadingMoreChats(false);
    }
  };

  // Scroll listener for top scroll
  const handleScroll = (e) => {
    const target = e.target;
    if (target.scrollTop <= 10 && hasMoreChats && !loadingMoreChats && !loadingInitialChats) {
      loadMoreMessages();
    }
  };

  // Switch persona tab helper
  const handlePersonaSwitch = (newPersona) => {
    if (activeFetchAbortController.current) {
      activeFetchAbortController.current.abort();
      activeFetchAbortController.current = null;
    }
    setIsSubmitting(false);
    setSelectedPersona(newPersona);
  };

  const scrollPrompts = (direction) => {
    if (promptScrollRef.current) {
      const scrollAmount = direction === "left" ? -250 : 250;
      promptScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Detect post intent strictly for Thikana CMO when user query explicitly requests post creation
  const checkIsPostIntent = (text, userQuery = "") => {
    if (!text || !userQuery) return false;
    const queryLower = userQuery.toLowerCase().trim();
    const keywords = [
      "write a post",
      "create a post",
      "draft a post",
      "generate a post",
      "make a post",
      "post caption",
      "write caption",
      "draft caption",
      "create caption",
      "make caption",
      "promo post",
      "discount post",
      "sale post",
      "caption for",
      "publish post",
      "write promo",
      "draft promo",
      "caption post",
      "instagram post",
      "feed post",
    ];
    return keywords.some((k) => queryLower.includes(k));
  };

  const extractDraftCaption = (text) => {
    if (!text) return "Check out our latest store updates and exclusive offers!";
    let cleaned = text.replace(/```[\s\S]*?```/g, "").trim();
    const match = cleaned.match(/(?:[C|c]aption|[D|d]raft|[P|p]ost):\s*([\s\S]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return cleaned;
  };

  // Save Message to Firestore Persistence Ledger
  const saveMessageToFirestore = async (msgPayload) => {
    if (!businessId || !selectedPersona) return;
    try {
      const msgId = msgPayload.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const msgRef = doc(db, "users", businessId, "ai_chats", selectedPersona, "messages", msgId);
      await setDoc(msgRef, {
        ...msgPayload,
        id: msgId,
        timestamp: msgPayload.timestamp || Date.now(),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Could not persist AI message to Firestore:", err);
    }
  };

  // Handle Direct Post Now
  const handleDirectPostNow = async (msgText, msgIdx) => {
    if (!user?.uid) {
      toast.error("Please sign in to publish posts to your business profile.");
      return;
    }

    setPublishingMessageIdx(msgIdx);
    const toastId = toast.loading("Publishing post directly to your business profile...");

    try {
      const captionText = extractDraftCaption(msgText);

      let businessName = user.displayName || "Local Merchant";
      let businessAvatar = user.photoURL || null;

      try {
        const bizSnap = await getDoc(doc(db, "businesses", user.uid));
        if (bizSnap.exists()) {
          const bData = bizSnap.data();
          businessName = bData.businessName || businessName;
          businessAvatar = bData.logoUrl || businessAvatar;
        }
      } catch (e) {
        console.warn("Could not fetch business doc:", e);
      }

      const username = user.displayName
        ? user.displayName.toLowerCase().replace(/\s+/g, "-")
        : "store";

      const postPayload = {
        userId: user.uid,
        uid: user.uid,
        businessId: user.uid,
        businessName,
        businessAvatar,
        username,
        caption: captionText,
        content: captionText,
        description: captionText,
        category: "Promotions",
        images: [],
        imageUrl: null,
        likesCount: 0,
        likeCount: 0,
        isVerified: true,
        createdAt: serverTimestamp(),
        createdAtFormatted: "Just now",
      };

      await addDoc(collection(db, "posts"), postPayload);

      setChatMessages((prev) => {
        const list = [...prev];
        if (list[msgIdx]) {
          list[msgIdx] = { ...list[msgIdx], isPosted: true };
          saveMessageToFirestore(list[msgIdx]);
        }
        return list;
      });

      toast.success("Post published successfully to your business profile feed!", { id: toastId });
    } catch (err) {
      console.error("Error publishing post:", err);
      toast.error(err.message || "Failed to publish post.", { id: toastId });
    } finally {
      setPublishingMessageIdx(null);
    }
  };

  const handleOpenEditModal = (msgText) => {
    const draftText = extractDraftCaption(msgText);
    setEditCaption(draftText);
    setEditCategory("Promotions");
    setEditImageUrl("");
    setEditingModalOpen(true);
  };

  const handlePublishEditedPost = async (e) => {
    e.preventDefault();
    if (!user?.uid) return;
    if (!editCaption.trim()) {
      toast.error("Caption text cannot be empty.");
      return;
    }

    setIsPublishingPost(true);
    const toastId = toast.loading("Publishing edited post to business profile...");

    try {
      let businessName = user.displayName || "Local Merchant";
      let businessAvatar = user.photoURL || null;

      try {
        const bizSnap = await getDoc(doc(db, "businesses", user.uid));
        if (bizSnap.exists()) {
          const bData = bizSnap.data();
          businessName = bData.businessName || businessName;
          businessAvatar = bData.logoUrl || businessAvatar;
        }
      } catch (e) {
        console.warn("Could not fetch business doc:", e);
      }

      const username = user.displayName
        ? user.displayName.toLowerCase().replace(/\s+/g, "-")
        : "store";

      const postPayload = {
        userId: user.uid,
        uid: user.uid,
        businessId: user.uid,
        businessName,
        businessAvatar,
        username,
        caption: editCaption.trim(),
        content: editCaption.trim(),
        description: editCaption.trim(),
        category: editCategory,
        images: editImageUrl.trim() ? [editImageUrl.trim()] : [],
        imageUrl: editImageUrl.trim() || null,
        likesCount: 0,
        likeCount: 0,
        isVerified: true,
        createdAt: serverTimestamp(),
        createdAtFormatted: "Just now",
      };

      await addDoc(collection(db, "posts"), postPayload);

      toast.success("Edited post published successfully!", { id: toastId });
      setEditingModalOpen(false);
    } catch (err) {
      console.error("Error publishing edited post:", err);
      toast.error(err.message || "Failed to publish post.", { id: toastId });
    } finally {
      setIsPublishingPost(false);
    }
  };

  // Send Message & Stream AI Response
  const handleSendMessage = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isSubmitting || isLockedByOther) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: "user",
      text: textToSend.trim(),
      timestamp: Date.now(),
      senderName: user?.displayName || "Team Member",
      senderUid: user?.uid,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    saveMessageToFirestore(userMsg);

    setInputQuery("");
    setIsSubmitting(true);

    const assistantMsgId = `assistant_${Date.now()}`;
    const initialAssistantMsg = {
      id: assistantMsgId,
      role: "assistant",
      text: "",
      userQuery: textToSend.trim(),
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, initialAssistantMsg]);

    const controller = new AbortController();
    activeFetchAbortController.current = controller;

    try {
      const historyForPayload = chatMessages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const response = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          userId: businessId,
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

        setChatMessages((prev) => {
          const list = [...prev];
          if (list.length > 0) {
            list[list.length - 1] = {
              ...initialAssistantMsg,
              text: accumulatedText,
            };
          }
          return list;
        });
      }

      // Persist final assistant response to Firestore
      saveMessageToFirestore({
        ...initialAssistantMsg,
        text: accumulatedText,
      });
    } catch (err) {
      if (err.name === "AbortError") {
        return;
      }
      console.error("AI Advisor streaming error:", err);
      toast.error(err.message || "Failed to stream advice from AI Advisor.");

      setChatMessages((prev) => {
        const list = [...prev];
        if (list.length > 0 && list[list.length - 1].text === "") {
          list[list.length - 1] = {
            ...initialAssistantMsg,
            text: "I encountered an issue streaming advice. Please try again.",
          };
          saveMessageToFirestore(list[list.length - 1]);
        }
        return list;
      });
    } finally {
      setIsSubmitting(false);
      activeFetchAbortController.current = null;
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
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

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Expanded Chat Interface (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 sm:p-8 shadow-sm flex flex-col h-[calc(100vh-210px)] min-h-[660px]">
          {/* Chat Persona Active Header & Presence Indicator */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E0D8] dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] flex items-center justify-center font-bold shrink-0 shadow-xs">
                <ActiveIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-black text-lg text-[#1A1A1A] dark:text-white flex items-center gap-2">
                  <span>{currentPersona.name}</span>
                  {!isLockedByOther && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold flex items-center gap-1 border border-emerald-500/20">
                      <UserCheck className="w-3 h-3" /> Active Consultation
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-500 font-medium">
                  {currentPersona.roleTitle}
                </p>
              </div>
            </div>
          </div>

          {/* PRESENCE LOCK WARNING BANNER (IF OCCUPIED BY ANOTHER TEAM MEMBER) */}
          {isLockedByOther && (
            <div className="mb-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex items-center gap-3 text-xs">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="font-black">
                  Persona Occupied by {lockOwner?.name || "another team member"}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Only 1 member in your business can consult this AI advisor at a time. The chat is locked until they switch or leave this page.
                </p>
              </div>
            </div>
          )}

          {/* Messages Scroll Area with WhatsApp-Style Paginated Infinite Scroll */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto space-y-4 pr-2 relative"
          >
            {/* Top Loading Indicator for WhatsApp-style pagination */}
            {loadingMoreChats && (
              <div className="py-2 text-center text-xs text-gray-400 font-bold flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                <span>Loading older messages...</span>
              </div>
            )}

            {!hasMoreChats && chatMessages.length > 10 && (
              <p className="text-[10px] font-bold text-center text-gray-400 uppercase tracking-wider py-1">
                Beginning of Chat History
              </p>
            )}

            {loadingInitialChats ? (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
                <p className="text-xs text-gray-400 font-bold">Loading conversation history...</p>
              </div>
            ) : (
              chatMessages.map((msg, idx) => {
                const isPostRelated =
                  selectedPersona === "cmo" &&
                  msg.role === "assistant" &&
                  isBusinessUser &&
                  msg.text &&
                  checkIsPostIntent(msg.text, msg.userQuery);

                return (
                  <div
                    key={msg.id || idx}
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
                          : "bg-[#F7F6F3] dark:bg-[#222222] text-gray-800 dark:text-gray-200 border border-[#E5E0D8] dark:border-white/5 rounded-tl-xs space-y-3 text-xs"
                      }`}
                    >
                      {msg.text ? (
                        msg.role === "user" ? (
                          <p>{msg.text}</p>
                        ) : (
                          <>
                            <div className="prose dark:prose-invert prose-xs max-w-none space-y-2 text-xs leading-relaxed">
                              <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>

                            {/* ACTION BLOCK: POST NOW & EDIT POST */}
                            {isPostRelated && (
                              <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" /> AI Drafted Social Post
                                  </span>
                                  {msg.isPosted && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Published
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-gray-600 dark:text-gray-300 italic line-clamp-2 bg-white/50 dark:bg-black/20 p-2.5 rounded-xl">
                                  &quot;{extractDraftCaption(msg.text)}&quot;
                                </p>

                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDirectPostNow(msg.text, idx)}
                                    disabled={publishingMessageIdx === idx || msg.isPosted || isLockedByOther}
                                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    {publishingMessageIdx === idx ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Share2 className="w-3.5 h-3.5" />
                                    )}
                                    <span>{msg.isPosted ? "Posted to Profile" : "Post Now"}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(msg.text)}
                                    disabled={isLockedByOther}
                                    className="px-4 py-2 rounded-xl bg-white dark:bg-[#1C1C1C] border border-[#DDD8CF] dark:border-white/10 hover:bg-gray-100 font-bold text-xs text-[#1A1A1A] dark:text-white transition flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Edit Post</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-2 text-gray-400 italic font-bold">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Analyzing store data & generating strategy advice...</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

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
                  disabled={isSubmitting || isLockedByOther}
                  className="px-3.5 py-2 rounded-xl bg-[#F7F6F3] dark:bg-[#252525] border border-[#E5E0D8] dark:border-white/10 text-left text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:border-[#1A1A1A] dark:hover:border-white transition shrink-0 flex items-center gap-1.5 group shadow-2xs whitespace-nowrap disabled:opacity-50"
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
              disabled={isLockedByOther}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder={
                isLockedByOther
                  ? `Locked: ${lockOwner?.name || "Team member"} is consulting this advisor...`
                  : `Ask ${currentPersona.name} for advice, forecasts, or strategy...`
              }
              className="flex-1 bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-4 py-3 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-[#1A1A1A] transition disabled:opacity-60 cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isSubmitting || !inputQuery.trim() || isLockedByOther}
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
                const lockData = activeLocks[key];
                const isOccupiedByOther = lockData && lockData.uid !== user?.uid;

                return (
                  <button
                    key={p.id}
                    onClick={() => handlePersonaSwitch(p.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center gap-3.5 relative overflow-hidden ${
                      isSelected
                        ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] border-[#1A1A1A] dark:border-white shadow-md scale-[1.01]"
                        : isOccupiedByOther
                        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-500/30 text-gray-700 dark:text-gray-200"
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
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-black text-sm truncate">{p.name}</p>
                        {isOccupiedByOther && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-black flex items-center gap-1 border border-amber-500/30">
                            <Lock className="w-2.5 h-2.5" /> Occupied
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs truncate mt-0.5 font-medium ${
                          isSelected ? "opacity-80" : "text-gray-400"
                        }`}
                      >
                        {isOccupiedByOther ? `Occupied by ${lockData.name}` : p.roleTitle}
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

      {/* EDIT DRAFT POST MODAL DIALOG */}
      {editingModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8] dark:border-white/10">
              <div className="flex items-center gap-2 text-sm font-black text-[#1A1A1A] dark:text-white">
                <Edit3 className="w-4 h-4 text-amber-500" />
                <span>Edit & Review Drafted Post</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingModalOpen(false)}
                className="p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePublishEditedPost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                  Post Caption & Content
                </label>
                <textarea
                  rows={5}
                  required
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="Write or refine your post caption..."
                  className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl p-3.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 resize-none font-medium leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-amber-500" /> Category Tag
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="Promotions">Promotions & Offers</option>
                    <option value="New Arrivals">New Arrivals</option>
                    <option value="Discounts">Discounts & Sales</option>
                    <option value="Services">Store Services</option>
                    <option value="Events">Events & Announcements</option>
                    <option value="General">General Store Update</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-500" /> Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E0D8] dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#DDD8CF] dark:border-white/10 font-bold text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPublishingPost}
                  className="px-6 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1A1A1A] font-extrabold text-xs transition shadow-md flex items-center gap-2"
                >
                  {isPublishingPost ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Publishing...
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-amber-400" /> Publish Post
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getPersonaDefaultGreeting(personaId, userName) {
  const name = userName || "Merchant";
  switch (personaId) {
    case "ops":
      return `Hello ${name}! I am your **Thikana Ops Manager**.\n\nI monitor low-stock risks (below 5 units), re-ordering schedules, catalog valuation, and appointment slot buffers. How can I optimize your store operations today?`;
    case "cmo":
      return `Hello ${name}! I am your **Thikana CMO**.\n\nI craft viral social feed captions, weekend footfall promotions, and Day-of-Week sales timing strategies. Ask me to write a post for your store today!`;
    case "support":
      return `Hello ${name}! I am your **Thikana Support Lead**.\n\nI specialize in customer call lead SLAs, callback response scripts, and WhatsApp follow-up templates. How can I assist you with your customer leads?`;
    case "cfo":
    default:
      return `Hello ${name}! I am your **Thikana CFO**.\n\nI monitor your store cash flow health, WMA budget predictions, Z-Score expense anomaly alerts, and budget ceiling enforcement. What financial question can I help answer?`;
  }
}
