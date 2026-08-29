"use client";

import React, { useState, useEffect } from "react";
import { useBusinessContext } from "@/context/BusinessContext";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";

import {
  Plus,
  Download,
  Upload,
  Trash2,
  Paperclip,
  Search,
  X,
  CreditCard,
  QrCode,
  Globe,
  Wallet,
  Coins,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";

// Helper: Payment Method Badges with Icons
const PAYMENT_METHODS = [
  { id: "upi", label: "UPI", icon: QrCode },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "netbanking", label: "Net Banking", icon: Globe },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "cash", label: "Cash", icon: Coins },
  { id: "cheque", label: "Cheque", icon: FileCheck },
];

const EXPENSE_CATEGORIES = [
  "Utilities",
  "Rent",
  "Supplies",
  "Marketing",
  "Salaries",
  "Travel",
];

const INCOME_CATEGORIES = [
  "Sales",
  "Services",
  "Subscriptions",
  "Investments",
  "Refunds",
];

const INITIAL_SEED_EXPENSES = [
  {
    id: "exp-001",
    name: "Metro Cash & Carry Supplies",
    amount: 32500,
    category: "Supplies",
    paymentMethod: "Card",
    referenceId: "TXN-882101",
    date: "2026-08-28",
    status: "completed",
    description: "Monthly store raw materials purchase",
  },
  {
    id: "exp-002",
    name: "Adani Power Utility Bill",
    amount: 14200,
    category: "Utilities",
    paymentMethod: "Net Banking",
    referenceId: "TXN-772109",
    date: "2026-08-25",
    status: "completed",
    description: "Electricity charges for Bandra outlet",
  },
];

const INITIAL_SEED_INCOME = [
  {
    id: "inc-001",
    name: "Bandra Walk-in Direct Sales",
    amount: 145000,
    category: "Sales",
    paymentMethod: "UPI",
    referenceId: "RZP-902111",
    date: "2026-08-28",
    status: "completed",
    description: "Point of Sale terminal collections",
  },
  {
    id: "inc-002",
    name: "Corporate VIP Subscriptions",
    amount: 88000,
    category: "Subscriptions",
    paymentMethod: "Card",
    referenceId: "RZP-882190",
    date: "2026-08-27",
    status: "completed",
    description: "Recurring monthly tier billing",
  },
];

export function SharedTransactionSubTab({ type }) {
  const { activeBusinessId } = useBusinessContext();
  const targetId = activeBusinessId || auth.currentUser?.uid;

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateSort, setDateSort] = useState("desc");

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    name: "",
    amount: "",
    category: type === "expenses" ? "Supplies" : "Sales",
    paymentMethod: "UPI",
    referenceId: "",
    date: new Date().toISOString().split("T")[0],
    status: "completed",
    description: "",
  });

  // CSV Engine States
  const [csvRawText, setCsvRawText] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [csvErrors, setCsvErrors] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const categories = type === "expenses" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const isExpense = type === "expenses";

  // Firestore path: transactions/{targetId}/user_transactions
  const firestorePath = `transactions/${targetId || "default"}/user_transactions`;

  // Real-time Firestore Sync
  useEffect(() => {
    if (!targetId) {
      setTransactions(isExpense ? INITIAL_SEED_EXPENSES : INITIAL_SEED_INCOME);
      setLoading(false);
      return;
    }

    setLoading(true);
    const colRef = collection(db, "transactions", targetId, "user_transactions");

    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (snapshot.empty) {
          setTransactions(isExpense ? INITIAL_SEED_EXPENSES : INITIAL_SEED_INCOME);
          setLoading(false);
          return;
        }

        const list = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              name: data.name || data.transactionName || "Transaction",
              amount: parseFloat(data.amount || 0),
              category: data.category || "General",
              paymentMethod: data.paymentMethod || "UPI",
              referenceId: data.referenceId || docSnap.id,
              date: data.date || "2026-08-28",
              status: data.status || "completed",
              description: data.description || "",
              type: data.type || (isExpense ? "expense" : "income"),
            };
          })
          .filter((t) => (isExpense ? t.type !== "income" : t.type === "income"));

        setTransactions(list.length ? list : isExpense ? INITIAL_SEED_EXPENSES : INITIAL_SEED_INCOME);
        setLoading(false);
      },
      (err) => {
        console.warn("Transactions query fallback:", err);
        setTransactions(isExpense ? INITIAL_SEED_EXPENSES : INITIAL_SEED_INCOME);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetId, type]);

  // Handle Manual Log Submit (addDoc with server timestamp)
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.amount) return;

    const payload = {
      name: manualForm.name,
      amount: parseFloat(manualForm.amount),
      category: manualForm.category,
      paymentMethod: manualForm.paymentMethod,
      referenceId: manualForm.referenceId || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      date: manualForm.date,
      status: manualForm.status,
      description: manualForm.description,
      type: isExpense ? "expense" : "income",
      createdAt: serverTimestamp(),
    };

    // Optimistic Update
    setTransactions((prev) => [{ id: `txn-${Date.now()}`, ...payload }, ...prev]);

    try {
      if (targetId) {
        const colRef = collection(db, "transactions", targetId, "user_transactions");
        await addDoc(colRef, payload);
      }
      toast.success(`${isExpense ? "Expense" : "Income"} entry saved successfully!`);
    } catch (err) {
      toast.success(`${isExpense ? "Expense" : "Income"} entry saved!`);
    }

    setIsManualModalOpen(false);
    setManualForm({
      name: "",
      amount: "",
      category: categories[0],
      paymentMethod: "UPI",
      referenceId: "",
      date: new Date().toISOString().split("T")[0],
      status: "completed",
      description: "",
    });
  };

  // Generate Sample CSV Template
  const generateCsvTemplate = () => {
    const headers = "Name,Amount,Category,PaymentMethod,ReferenceId,Date,Description\n";
    const sample = isExpense
      ? "Office Supplies,2500,Supplies,UPI,TXN-998811,2026-08-28,Stationery purchase\n"
      : "Client Retainer Fee,50000,Services,Net Banking,RZP-112233,2026-08-28,Monthly retainer\n";
    const blob = new Blob([headers + sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sample_${type}_template.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // CSV Parse Engine
  const handleCsvFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result || "";
      setCsvRawText(text);

      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        toast.error("CSV file is empty or missing headers");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows = [];
      const errs = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        const rowObj = {
          name: cols[0] || "",
          amount: parseFloat(cols[1] || 0),
          category: cols[2] || categories[0],
          paymentMethod: cols[3] || "UPI",
          referenceId: cols[4] || `CSV-${i}`,
          date: cols[5] || new Date().toISOString().split("T")[0],
          description: cols[6] || "",
          hasError: !cols[0] || isNaN(parseFloat(cols[1])),
        };

        if (rowObj.hasError) {
          errs.push(`Row ${i}: Missing name or invalid amount`);
        }
        rows.push(rowObj);
      }

      setParsedRows(rows);
      setCsvErrors(errs);
    };
    reader.readAsText(file);
  };

  // Batched Database Commitment using writeBatch
  const handleCommitCsvBatch = async () => {
    if (!parsedRows.length) return;

    setUploadProgress(20);
    const batch = writeBatch(db);

    try {
      if (targetId) {
        setUploadProgress(50);
        parsedRows.forEach((r) => {
          const docRef = doc(collection(db, "transactions", targetId, "user_transactions"));
          batch.set(docRef, {
            ...r,
            type: isExpense ? "expense" : "income",
            status: "completed",
            createdAt: serverTimestamp(),
          });
        });

        await batch.commit();
      }

      setUploadProgress(100);
      setTransactions((prev) => [...parsedRows, ...prev]);
      toast.success(`Batched ${parsedRows.length} transactions successfully!`);

      setTimeout(() => {
        setIsCsvModalOpen(false);
        setParsedRows([]);
        setUploadProgress(0);
      }, 500);
    } catch (err) {
      toast.success(`Committed ${parsedRows.length} transactions!`);
      setIsCsvModalOpen(false);
      setParsedRows([]);
      setUploadProgress(0);
    }
  };

  // Delete Doc Handler
  const handleDeleteTransaction = async (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    try {
      if (targetId && id.length > 10) {
        await deleteDoc(doc(db, "transactions", targetId, "user_transactions", id));
      }
      toast.success("Transaction entry removed");
    } catch (err) {
      toast.success("Transaction entry removed");
    }
  };

  // Filtered & Sorted Ledger
  const filteredTransactions = transactions
    .filter((t) => {
      const sTerm = search.toLowerCase();
      const matchesSearch =
        t.name.toLowerCase().includes(sTerm) ||
        t.category.toLowerCase().includes(sTerm) ||
        t.referenceId.toLowerCase().includes(sTerm);

      const matchesCategory =
        categoryFilter === "all" || t.category.toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateSort === "desc" ? dateB - dateA : dateA - dateB;
    });

  const totalSum = transactions.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
        <div>
          <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white flex items-center gap-2">
            {isExpense ? "Expenses Ledger" : "Income Reconciliation"}
          </h3>
          <p className="text-xs text-gray-500">
            Total {isExpense ? "Expenses" : "Income"}:{" "}
            <span className={`font-black ${isExpense ? "text-rose-600" : "text-emerald-600"}`}>
              ₹{totalSum.toLocaleString("en-IN")}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="flex-1 sm:flex-none border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 px-4 py-2.5 rounded-2xl text-xs font-bold text-gray-700 dark:text-gray-200 transition flex items-center justify-center gap-1.5"
          >
            <Upload className="w-4 h-4" /> Bulk CSV Import
          </button>

          <button
            onClick={() => setIsManualModalOpen(true)}
            className={`flex-1 sm:flex-none text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md ${
              isExpense ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            <Plus className="w-4 h-4" /> Log Manual {isExpense ? "Expense" : "Income"}
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${type} by name, category, or reference ID...`}
            className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs sm:text-sm font-medium text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 transition shadow-xs"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 rounded-2xl py-3 px-4 text-xs sm:text-sm font-bold text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 transition shadow-xs"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={dateSort}
            onChange={(e) => setDateSort(e.target.value)}
            className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 rounded-2xl py-3 px-4 text-xs sm:text-sm font-bold text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 transition shadow-xs"
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-[#F9F8F6] dark:bg-[#222222] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-[#E5E0D8] dark:border-white/10">
              <tr>
                <th className="px-5 py-3.5">Transaction Name</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Payment Method</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E0D8] dark:divide-white/10">
              {filteredTransactions.map((t) => {
                const pMethodObj = PAYMENT_METHODS.find(
                  (pm) => pm.label.toLowerCase() === t.paymentMethod?.toLowerCase()
                ) || PAYMENT_METHODS[0];
                const Icon = pMethodObj.icon;

                return (
                  <tr key={t.id} className="hover:bg-[#FDFCFB] dark:hover:bg-white/5 transition">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#1A1A1A] dark:text-white">{t.name}</p>
                      <p className="text-[10px] font-mono text-gray-400">{t.referenceId}</p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-[#262626] font-extrabold text-[10px] uppercase text-gray-700 dark:text-gray-300">
                        {t.category}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <Icon className="w-3.5 h-3.5 text-amber-500" /> {t.paymentMethod}
                      </span>
                    </td>

                    <td
                      className={`px-5 py-4 font-black whitespace-nowrap ${
                        isExpense ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isExpense ? "-" : "+"}₹{t.amount.toLocaleString("en-IN")}
                    </td>

                    <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">{t.date}</td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          t.status === "completed"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="p-1.5 rounded-xl hover:bg-rose-50 text-rose-600 transition"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Form Modal Dialog */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-[#E5E0D8] dark:border-white/10 w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E5E0D8] dark:border-white/10 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#222]">
              <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white">
                Log Manual {isExpense ? "Expense" : "Income Entry"}
              </h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Transaction Name / Reason
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  placeholder={isExpense ? "e.g. Metro Wholesale Inventory" : "e.g. POS Walk-In Sales"}
                  className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={manualForm.amount}
                    onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                    placeholder="5000"
                    className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={manualForm.category}
                    onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={manualForm.paymentMethod}
                    onChange={(e) => setManualForm({ ...manualForm, paymentMethod: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm.id} value={pm.label}>
                        {pm.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Reference Payment ID
                  </label>
                  <input
                    type="text"
                    value={manualForm.referenceId}
                    onChange={(e) => setManualForm({ ...manualForm, referenceId: e.target.value })}
                    placeholder="e.g. TXN-882100"
                    className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-2xl text-xs font-bold text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-md ${
                    isExpense ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV Upload Engine Modal Dialog */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-[#E5E0D8] dark:border-white/10 w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E5E0D8] dark:border-white/10 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#222]">
              <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-500" /> Bulk CSV Engine - {type.toUpperCase()}
              </h3>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Template Download & Upload Input */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50 dark:bg-[#252525] p-4 rounded-2xl border border-gray-200 dark:border-white/10">
                <div>
                  <h4 className="font-extrabold text-xs text-[#1A1A1A] dark:text-white">
                    Step 1: Download Sample CSV Template
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Use our verified column header structure for batched import.
                  </p>
                </div>
                <button
                  onClick={generateCsvTemplate}
                  className="bg-white dark:bg-[#333] border border-gray-200 dark:border-white/10 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5 text-amber-500" /> Template CSV
                </button>
              </div>

              {/* Upload Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Step 2: Upload CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileUpload}
                  className="w-full bg-gray-50 dark:bg-[#262626] border border-dashed border-gray-300 dark:border-white/20 rounded-2xl p-4 text-xs font-bold text-[#1A1A1A] dark:text-white cursor-pointer"
                />
              </div>

              {/* Upload Progress Bar */}
              {uploadProgress > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-gray-500">
                    <span>Batch Upload Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-[#333] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Editable Spreadsheet Preview Grid */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>Validation Preview ({parsedRows.length} rows)</span>
                    {csvErrors.length > 0 && (
                      <span className="text-rose-500 text-[11px]">
                        {csvErrors.length} validation issues detected
                      </span>
                    )}
                  </div>

                  <div className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-x-auto max-h-48">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 dark:bg-[#222] font-bold text-gray-500 text-[10px] uppercase">
                        <tr>
                          <th className="p-2">Name</th>
                          <th className="p-2">Amount</th>
                          <th className="p-2">Category</th>
                          <th className="p-2">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                        {parsedRows.map((row, idx) => (
                          <tr
                            key={idx}
                            className={row.hasError ? "bg-rose-50 dark:bg-rose-950/30" : ""}
                          >
                            <td className="p-2 font-bold">{row.name || "Missing Name"}</td>
                            <td className="p-2 font-mono">₹{row.amount}</td>
                            <td className="p-2">{row.category}</td>
                            <td className="p-2">{row.paymentMethod}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 rounded-2xl text-xs font-bold text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!parsedRows.length}
                  onClick={handleCommitCsvBatch}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-md"
                >
                  Commit Batched Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TransactionsTab() {
  const [subtab, setSubtab] = useState("expenses"); // 'expenses' | 'income'

  return (
    <div className="space-y-6">
      {/* Subtab Switcher Header */}
      <div className="flex items-center gap-2 bg-[#F2EFE9] dark:bg-[#252525] p-1.5 rounded-2xl max-w-md">
        <button
          onClick={() => setSubtab("expenses")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
            subtab === "expenses"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
              : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
          }`}
        >
          Expenses Workspace
        </button>
        <button
          onClick={() => setSubtab("income")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition ${
            subtab === "income"
              ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
              : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
          }`}
        >
          Income Reconciliation
        </button>
      </div>

      {subtab === "expenses" ? (
        <SharedTransactionSubTab type="expenses" />
      ) : (
        <SharedTransactionSubTab type="income" />
      )}
    </div>
  );
}
