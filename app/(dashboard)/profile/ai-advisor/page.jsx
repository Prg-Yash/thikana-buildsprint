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
  updateDoc,
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
  PlusCircle,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Layers,
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

  // Live Inventory State for Ops Manager
  const [liveInventory, setLiveInventory] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Input & Action Processing State
  const [inputQuery, setInputQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingActionIdx, setProcessingActionIdx] = useState(null);

  // Edit Post Modal State for CMO
  const [editingModalOpen, setEditingModalOpen] = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [editCategory, setEditCategory] = useState("Promotions");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [isPublishingPost, setIsPublishingPost] = useState(false);

  const currentPersona = PERSONAS[selectedPersona] || PERSONAS.cfo;
  const ActiveIcon = PERSONA_ICONS[selectedPersona] || Landmark;

  // 1. Real-time Subscription to Active Persona Locks
  useEffect(() => {
    if (!businessId) return;
    const unsubscribe = subscribePersonaLocks(businessId, (locksMap) => {
      setActiveLocks(locksMap);
    });
    return () => unsubscribe();
  }, [businessId]);

  // 2. Lock Acquisition & Heartbeat Management
  useEffect(() => {
    if (!businessId || !user?.uid) return;

    let isMounted = true;

    async function handleLock() {
      const lockData = activeLocks[selectedPersona];
      if (lockData && lockData.uid !== user.uid) {
        if (isMounted) {
          setIsLockedByOther(true);
          setLockOwner(lockData);
        }
        return;
      }

      const lockRes = await acquirePersonaLock(businessId, selectedPersona, user);
      if (!isMounted) return;

      if (lockRes.success) {
        setIsLockedByOther(false);
        setLockOwner(null);

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
      releasePersonaLock(businessId, selectedPersona, user.uid);
    };
  }, [businessId, selectedPersona, user, activeLocks]);

  // Handle BeforeUnload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (businessId && selectedPersona && user?.uid) {
        releasePersonaLock(businessId, selectedPersona, user.uid);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [businessId, selectedPersona, user?.uid]);

  // 3. Fetch Live Inventory for Ops Manager
  const fetchInventoryData = useCallback(async () => {
    if (!businessId) return;
    setLoadingInventory(true);
    try {
      const prodSnap = await getDocs(collection(db, "users", businessId, "products"));
      const list = prodSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLiveInventory(list);
    } catch (e) {
      console.warn("Could not fetch inventory:", e);
    } finally {
      setLoadingInventory(false);
    }
  }, [businessId]);

  useEffect(() => {
    if (selectedPersona === "ops") {
      fetchInventoryData();
    }
  }, [selectedPersona, fetchInventoryData]);

  // 4. Load Initial 10 Messages
  const loadInitialChatHistory = useCallback(async () => {
    if (!businessId || !selectedPersona) return;

    setLoadingInitialChats(true);
    setHasMoreChats(true);

    try {
      const messagesRef = collection(db, "users", businessId, "ai_chats", selectedPersona, "messages");
      const q = query(messagesRef, orderBy("timestamp", "desc"), limit(10));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
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
        fetchedMessages.reverse();

        setChatMessages(fetchedMessages);
        setOldestDocSnap(docs[docs.length - 1]);
        if (docs.length < 10) {
          setHasMoreChats(false);
        }
      }
    } catch (err) {
      console.error("Error loading initial chat history:", err);
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

  // 5. Load Next 5 Messages on Top Scroll
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
        olderMessages.reverse();

        setChatMessages((prev) => [...olderMessages, ...prev]);
        setOldestDocSnap(docs[docs.length - 1]);

        if (docs.length < 5) {
          setHasMoreChats(false);
        }

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

  const handleScroll = (e) => {
    const target = e.target;
    if (target.scrollTop <= 10 && hasMoreChats && !loadingMoreChats && !loadingInitialChats) {
      loadMoreMessages();
    }
  };

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

  // Helper parsers for Structured Consent Proposals
  const parseTransactionProposal = (text) => {
    if (!text) return null;
    const match = text.match(/\[PROPOSE_TRANSACTION\]:\s*(\{[\s\S]*?\})/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        return null;
      }
    }
    // Fallback keyword parsing for finance intent
    if (/add|record|update|expense|income|spent|earned|revenue/i.test(text)) {
      const isIncome = /income|earned|received|sales|revenue/i.test(text);
      const amtMatch = text.match(/₹?\s*([\d,]+)/);
      const amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, "")) : 1000;
      return {
        type: isIncome ? "income" : "expense",
        title: isIncome ? "Sales Revenue Entry" : "Store Expense Item",
        amount,
        category: isIncome ? "Sales" : "Supplies",
      };
    }
    return null;
  };

  const parseInventoryProposal = (text) => {
    if (!text) return null;
    const match = text.match(/\[PROPOSE_INVENTORY_UPDATE\]:\s*(\{[\s\S]*?\})/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        return null;
      }
    }
    if (/add product|update stock|update inventory|set quantity|restock|units/i.test(text)) {
      const qtyMatch = text.match(/(\d+)\s*(?:units|qty|stock|items)/i);
      const priceMatch = text.match(/₹?\s*([\d,]+)/);
      return {
        name: "Inventory Product Item",
        quantity: qtyMatch ? parseInt(qtyMatch[1], 10) : 20,
        price: priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : 499,
        category: "General Stock",
      };
    }
    return null;
  };

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
    let cleaned = text.replace(/\[PROPOSE_POST\][\s\S]*/, "").replace(/```[\s\S]*?```/g, "").trim();
    const match = cleaned.match(/(?:[C|c]aption|[D|d]raft|[P|p]ost):\s*([\s\S]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return cleaned;
  };

  // Firestore Message Persistence Helper
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

  // -------------------------------------------------------------
  // CONSENT ACTION EXECUTION HANDLERS (STRICTLY FOR CURRENT BUSINESS)
  // -------------------------------------------------------------

  // 1. CFO: Approve & Add/Update Financial Expense/Income Record
  const handleApproveTransaction = async (proposal, msgIdx) => {
    if (!businessId) return;
    setProcessingActionIdx(msgIdx);
    const toastId = toast.loading(`Committing ${proposal.type} record to finance ledger...`);

    try {
      const isExpense = proposal.type === "expense";
      const txPayload = {
        name: proposal.title || (isExpense ? "Store Expense" : "Sales Revenue"),
        title: proposal.title || (isExpense ? "Store Expense" : "Sales Revenue"),
        amount: parseFloat(proposal.amount || 0),
        category: proposal.category || (isExpense ? "Supplies" : "Sales"),
        type: isExpense ? "expense" : "income",
        date: new Date().toISOString().split("T")[0],
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        createdBy: user?.displayName || "AI CFO Advisor",
      };

      const colRef = collection(db, "transactions", businessId, "user_transactions");
      await addDoc(colRef, txPayload);

      setChatMessages((prev) => {
        const list = [...prev];
        if (list[msgIdx]) {
          list[msgIdx] = { ...list[msgIdx], isTransactionApproved: true };
          saveMessageToFirestore(list[msgIdx]);
        }
        return list;
      });

      toast.success(`Successfully recorded ₹${proposal.amount} ${proposal.type} in finance ledger!`, { id: toastId });
    } catch (err) {
      console.error("Error committing transaction:", err);
      toast.error(`Failed to record transaction: ${err.message}`, { id: toastId });
    } finally {
      setProcessingActionIdx(null);
    }
  };

  // 2. Ops Manager: Approve & Add/Update Inventory Record
  const handleApproveInventoryUpdate = async (proposal, msgIdx) => {
    if (!businessId) return;
    setProcessingActionIdx(msgIdx);
    const toastId = toast.loading("Updating inventory record in catalog...");

    try {
      const prodPayload = {
        name: proposal.name || "Product Stock Item",
        price: parseFloat(proposal.price || 0),
        quantity: parseInt(proposal.quantity || 0, 10),
        category: proposal.category || "General",
        updatedAt: new Date().toISOString(),
        updatedBy: user?.displayName || "AI Ops Manager",
      };

      // Check if product with same name exists
      const prodsRef = collection(db, "users", businessId, "products");
      const snap = await getDocs(prodsRef);
      const existingDoc = snap.docs.find((d) => d.data().name?.toLowerCase() === proposal.name?.toLowerCase());

      if (existingDoc) {
        await updateDoc(doc(db, "users", businessId, "products", existingDoc.id), prodPayload);
      } else {
        await addDoc(prodsRef, { ...prodPayload, createdAt: new Date().toISOString() });
      }

      setChatMessages((prev) => {
        const list = [...prev];
        if (list[msgIdx]) {
          list[msgIdx] = { ...list[msgIdx], isInventoryApproved: true };
          saveMessageToFirestore(list[msgIdx]);
        }
        return list;
      });

      fetchInventoryData(); // Refresh live inventory widget
      toast.success(`Inventory updated for '${proposal.name}' (${proposal.quantity} units)!`, { id: toastId });
    } catch (err) {
      console.error("Error updating inventory:", err);
      toast.error(`Failed to update inventory: ${err.message}`, { id: toastId });
    } finally {
      setProcessingActionIdx(null);
    }
  };

  // 3. CMO: Direct Post Now
  const handleDirectPostNow = async (msgText, msgIdx) => {
    if (!user?.uid) {
      toast.error("Please sign in to publish posts to your business profile.");
      return;
    }

    setProcessingActionIdx(msgIdx);
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
      setProcessingActionIdx(null);
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

  // Send Message & Stream Response
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

      saveMessageToFirestore({
        ...initialAssistantMsg,
        text: accumulatedText,
      });
    } catch (err) {
      if (err.name === "AbortError") return;
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

          {/* PRESENCE LOCK WARNING BANNER */}
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
                // Parse Consent Action Proposals
                const txProposal = selectedPersona === "cfo" && msg.role === "assistant" ? parseTransactionProposal(msg.text) : null;
                const invProposal = selectedPersona === "ops" && msg.role === "assistant" ? parseInventoryProposal(msg.text) : null;
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
                              <ReactMarkdown>{msg.text.replace(/\[PROPOSE_[\s\S]*?\]/g, "")}</ReactMarkdown>
                            </div>

                            {/* 1. CFO CONSENT ACTION CARD: ADD/UPDATE FINANCE RECORD */}
                            {txProposal && (
                              <div className="mt-4 p-4 rounded-2xl bg-[#4A7C6F]/10 border border-[#4A7C6F]/30 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase text-[#4A7C6F] dark:text-emerald-400 tracking-wider flex items-center gap-1.5">
                                    <DollarSign className="w-3.5 h-3.5" /> Finance Record Proposal
                                  </span>
                                  {msg.isTransactionApproved && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Recorded in Ledger
                                    </span>
                                  )}
                                </div>

                                <div className="p-3 rounded-xl bg-white/60 dark:bg-black/20 text-xs space-y-1">
                                  <div className="flex justify-between font-bold">
                                    <span>Type:</span>
                                    <span className={`capitalize ${txProposal.type === "expense" ? "text-rose-600" : "text-emerald-600"}`}>
                                      {txProposal.type}
                                    </span>
                                  </div>
                                  <div className="flex justify-between font-bold">
                                    <span>Title:</span>
                                    <span>{txProposal.title}</span>
                                  </div>
                                  <div className="flex justify-between font-extrabold text-sm">
                                    <span>Amount:</span>
                                    <span className="text-[#1A1A1A] dark:text-white">₹{txProposal.amount.toLocaleString("en-IN")}</span>
                                  </div>
                                </div>

                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveTransaction(txProposal, idx)}
                                    disabled={processingActionIdx === idx || msg.isTransactionApproved || isLockedByOther}
                                    className="w-full py-2.5 rounded-xl bg-[#4A7C6F] hover:bg-[#3D685C] text-white font-black text-xs transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                                  >
                                    {processingActionIdx === idx ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                    <span>{msg.isTransactionApproved ? "Saved to Ledger" : "Approve & Save Record"}</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* 2. OPS MANAGER CONSENT ACTION CARD: INVENTORY RECORD UPDATE */}
                            {invProposal && (
                              <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5" /> Inventory Update Proposal
                                  </span>
                                  {msg.isInventoryApproved && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Catalog Updated
                                    </span>
                                  )}
                                </div>

                                <div className="p-3 rounded-xl bg-white/60 dark:bg-black/20 text-xs space-y-1">
                                  <div className="flex justify-between font-bold">
                                    <span>Product:</span>
                                    <span>{invProposal.name}</span>
                                  </div>
                                  <div className="flex justify-between font-bold">
                                    <span>Stock Quantity:</span>
                                    <span className="text-amber-600 dark:text-amber-400">{invProposal.quantity} units</span>
                                  </div>
                                  <div className="flex justify-between font-bold">
                                    <span>Price:</span>
                                    <span>₹{invProposal.price}</span>
                                  </div>
                                </div>

                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveInventoryUpdate(invProposal, idx)}
                                    disabled={processingActionIdx === idx || msg.isInventoryApproved || isLockedByOther}
                                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                                  >
                                    {processingActionIdx === idx ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                    <span>{msg.isInventoryApproved ? "Catalog Updated" : "Confirm & Update Inventory"}</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* 3. CMO CONSENT ACTION CARD: POST NOW & EDIT POST */}
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
                                    disabled={processingActionIdx === idx || msg.isPosted || isLockedByOther}
                                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    {processingActionIdx === idx ? (
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

        {/* Right Column: Persona Selection Sidebar & Live Inventory Widget (4 cols) */}
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

          {/* OPS MANAGER SMART INVENTORY WIDGET */}
          {selectedPersona === "ops" && (
            <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E0D8] dark:border-white/10">
                <span className="text-xs font-black uppercase text-[#1A1A1A] dark:text-white flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-amber-500" /> Live Inventory Catalog ({liveInventory.length})
                </span>
                <button
                  type="button"
                  onClick={fetchInventoryData}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition"
                  title="Refresh Inventory"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingInventory ? "animate-spin" : ""}`} />
                </button>
              </div>

              {loadingInventory ? (
                <div className="py-4 text-center text-xs text-gray-400">Loading catalog...</div>
              ) : liveInventory.length === 0 ? (
                <div className="py-4 text-center text-xs text-gray-400 space-y-1">
                  <p>No products in inventory yet.</p>
                  <p className="text-[10px]">Ask Ops Manager to add items!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {liveInventory.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-[#F7F6F3] dark:bg-[#252525] border border-gray-200 dark:border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="font-bold truncate text-[#1A1A1A] dark:text-white">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">₹{item.price}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                          parseInt(item.quantity || 0, 10) <= 5
                            ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        }`}
                      >
                        {item.quantity} units
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
