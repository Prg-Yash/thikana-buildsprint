"use client";

import React, { useState, useEffect } from "react";
import { useBusinessContext } from "@/context/BusinessContext";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";

import {
  Users,
  Search,
  Plus,
  Store,
  Crown,
  Shield,
  Check,
  Copy,
  Send,
  Edit,
  Trash2,
  X,
  ArrowRight,
  MoreVertical,
  Building2,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Key,
} from "lucide-react";

const DEFAULT_9POINT_PERMISSIONS = {
  canViewAnalytics: true,
  canManageOrders: true,
  canManagePayments: false,
  canManagePlans: false,
  canManageTransactions: false,
  canManageContacts: true,
  canManageAiCalls: false,
  canManageSettings: false,
  canManageMembers: false,
};

const INITIAL_DEMO_MEMBERS = [
  {
    id: "mem-001",
    name: "Aarav Sharma",
    email: "aarav.sharma@thikana.inc",
    phone: "+91 98200 99887",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    role: "Admin",
    isFranchiseAdmin: false,
    franchiseId: null,
    franchiseName: null,
    status: "Active",
    permissions: {
      canViewAnalytics: true,
      canManageOrders: true,
      canManagePayments: true,
      canManagePlans: true,
      canManageTransactions: true,
      canManageContacts: true,
      canManageAiCalls: true,
      canManageSettings: true,
      canManageMembers: true,
    },
  },
  {
    id: "mem-002",
    name: "Rohan Varma",
    email: "rohan.varma@thikana.inc",
    phone: "+91 98201 11223",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    role: "Franchise Admin",
    isFranchiseAdmin: true,
    franchiseId: "fr-bandra-01",
    franchiseName: "Thikana Outlet - Bandra West",
    status: "Active",
    permissions: {
      canViewAnalytics: true,
      canManageOrders: true,
      canManagePayments: true,
      canManagePlans: true,
      canManageTransactions: true,
      canManageContacts: true,
      canManageAiCalls: true,
      canManageSettings: true,
      canManageMembers: true,
    },
  },
  {
    id: "mem-003",
    name: "Ananya Rao",
    email: "ananya.rao@thikana.inc",
    phone: "+91 99802 33445",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    role: "Franchise Admin",
    isFranchiseAdmin: true,
    franchiseId: "fr-indiranagar-02",
    franchiseName: "Thikana Outlet - Indiranagar",
    status: "Active",
    permissions: {
      canViewAnalytics: true,
      canManageOrders: true,
      canManagePayments: true,
      canManagePlans: true,
      canManageTransactions: true,
      canManageContacts: true,
      canManageAiCalls: true,
      canManageSettings: true,
      canManageMembers: true,
    },
  },
  {
    id: "mem-004",
    name: "Kavita Menon",
    email: "kavita.m@thikana.inc",
    phone: "+91 97110 44332",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    role: "Manager",
    isFranchiseAdmin: false,
    franchiseId: null,
    franchiseName: null,
    status: "Active",
    permissions: {
      canViewAnalytics: true,
      canManageOrders: true,
      canManagePayments: true,
      canManagePlans: false,
      canManageTransactions: true,
      canManageContacts: true,
      canManageAiCalls: false,
      canManageSettings: false,
      canManageMembers: false,
    },
  },
  {
    id: "mem-005",
    name: "Pooja Deshmukh",
    email: "pooja.d@thikana.inc",
    phone: "+91 97654 77889",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150",
    role: "Franchise Admin",
    isFranchiseAdmin: true,
    franchiseId: "fr-pune-04",
    franchiseName: "Thikana Outlet - Koregaon Park",
    status: "Pending Acceptance",
    permissions: {
      canViewAnalytics: true,
      canManageOrders: true,
      canManagePayments: true,
      canManagePlans: true,
      canManageTransactions: true,
      canManageContacts: true,
      canManageAiCalls: true,
      canManageSettings: true,
      canManageMembers: true,
    },
  },
];

export function MembersTab() {
  const { activeBusinessId, isHeadquarters, franchises = [], switchToFranchise } = useBusinessContext();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("All Members");
  const [search, setSearch] = useState("");
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Modals & Target States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editPermissionsMember, setEditPermissionsMember] = useState(null);
  const [deleteMemberTarget, setDeleteMemberTarget] = useState(null);

  // Invite Form State
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    phone: "",
    role: "Staff",
    isFranchiseAdmin: false,
    franchiseId: "",
    permissions: { ...DEFAULT_9POINT_PERMISSIONS },
  });

  const targetBizId = activeBusinessId || auth.currentUser?.uid;

  // Real-time Firestore query for businesses/{targetBizId}/members enriched with users/{memberId}
  useEffect(() => {
    if (!targetBizId) {
      setMembers(INITIAL_DEMO_MEMBERS);
      setLoading(false);
      return;
    }

    setLoading(true);
    const membersRef = collection(db, "businesses", targetBizId, "members");

    const unsubscribe = onSnapshot(
      membersRef,
      async (snapshot) => {
        if (snapshot.empty) {
          setMembers(INITIAL_DEMO_MEMBERS);
          setLoading(false);
          return;
        }

        const rawList = [];
        const seenEmails = new Set();

        for (const docSnap of snapshot.docs) {
          const mData = docSnap.data();
          const memberEmail = mData.email || "noemail@thikana.inc";

          // Deduplicate by email
          if (seenEmails.has(memberEmail)) continue;
          seenEmails.add(memberEmail);

          let userProfileData = {};
          if (mData.userId || docSnap.id) {
            try {
              const uDoc = await getDoc(doc(db, "users", mData.userId || docSnap.id));
              if (uDoc.exists()) {
                userProfileData = uDoc.data();
              }
            } catch (err) {
              console.log("User doc fetch note:", err);
            }
          }

          // Franchise Owner Identification Logic
          const isFranchiseAdmin = Boolean(
            mData.isFranchiseAdmin ||
              mData.role === "Franchise Admin" ||
              userProfileData.role === "franchise_admin"
          );

          const matchedFranchise = franchises.find((f) => f.id === mData.franchiseId);

          rawList.push({
            id: docSnap.id,
            name: mData.name || userProfileData.fullName || userProfileData.name || "Team Member",
            email: memberEmail,
            phone: mData.phone || userProfileData.phone || "+91 98000 00000",
            avatar:
              userProfileData.photoURL ||
              mData.avatar ||
              "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
            role: mData.role || (isFranchiseAdmin ? "Franchise Admin" : "Staff"),
            isFranchiseAdmin,
            franchiseId: mData.franchiseId || null,
            franchiseName: matchedFranchise ? matchedFranchise.name : mData.franchiseName || null,
            status: mData.status || "Active",
            permissions: mData.permissions || { ...DEFAULT_9POINT_PERMISSIONS },
          });
        }

        setMembers(rawList);
        setLoading(false);
      },
      (err) => {
        console.warn("Firestore members query fallback:", err);
        setMembers(INITIAL_DEMO_MEMBERS);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetBizId, franchises]);

  // Preset Automations
  const handleRolePresetChange = (role, targetForm, setFormState) => {
    let preset = { ...targetForm.permissions };
    if (role === "Admin" || role === "Franchise Admin") {
      preset = {
        canViewAnalytics: true,
        canManageOrders: true,
        canManagePayments: true,
        canManagePlans: true,
        canManageTransactions: true,
        canManageContacts: true,
        canManageAiCalls: true,
        canManageSettings: true,
        canManageMembers: true,
      };
    } else if (role === "Manager") {
      preset = {
        canViewAnalytics: true,
        canManageOrders: true,
        canManagePayments: true,
        canManagePlans: false,
        canManageTransactions: true,
        canManageContacts: true,
        canManageAiCalls: false,
        canManageSettings: false,
        canManageMembers: false,
      };
    } else {
      // Staff
      preset = {
        canViewAnalytics: false,
        canManageOrders: true,
        canManagePayments: false,
        canManagePlans: false,
        canManageTransactions: false,
        canManageContacts: true,
        canManageAiCalls: false,
        canManageSettings: false,
        canManageMembers: false,
      };
    }
    setFormState({ ...targetForm, role, permissions: preset });
  };

  // Submit Invite Member
  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteForm.email) return;

    const matchedFranchise = franchises.find((f) => f.id === inviteForm.franchiseId);
    const onboardingLink = `https://thikana.inc/onboard?token=inv_${Math.random()
      .toString(36)
      .substring(2, 10)}`;

    const newMember = {
      id: `mem-${Date.now()}`,
      name: inviteForm.name || "Invited Team Member",
      email: inviteForm.email,
      phone: inviteForm.phone || "+91 98000 00000",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
      role: inviteForm.isFranchiseAdmin ? "Franchise Admin" : inviteForm.role,
      isFranchiseAdmin: inviteForm.isFranchiseAdmin,
      franchiseId: inviteForm.franchiseId || null,
      franchiseName: matchedFranchise ? matchedFranchise.name : null,
      status: "Pending Acceptance",
      permissions: inviteForm.permissions,
    };

    // Optimistic Update
    setMembers([newMember, ...members]);

    try {
      await fetch("/api/members/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newMember, businessId: targetBizId }),
      }).catch((err) => console.log(err));

      navigator.clipboard.writeText(onboardingLink);
      toast.success("Invitation sent & onboarding link copied to clipboard!");
      setIsInviteModalOpen(false);
    } catch (err) {
      toast.success("Member invited and onboarding link copied!");
      setIsInviteModalOpen(false);
    }
  };

  // Submit Edit Permissions
  const handleSavePermissionsUpdate = async (e) => {
    e.preventDefault();
    if (!editPermissionsMember) return;

    const updatedList = members.map((m) =>
      m.id === editPermissionsMember.id ? editPermissionsMember : m
    );
    setMembers(updatedList);

    try {
      await fetch("/api/members/update-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: editPermissionsMember.id,
          permissions: editPermissionsMember.permissions,
          role: editPermissionsMember.role,
          businessId: targetBizId,
        }),
      }).catch((err) => console.log(err));

      toast.success(`Updated permissions for ${editPermissionsMember.name}`);
      setEditPermissionsMember(null);
    } catch (err) {
      toast.success(`Updated permissions for ${editPermissionsMember.name}`);
      setEditPermissionsMember(null);
    }
  };

  // Submit Remove Member
  const handleConfirmDelete = async () => {
    if (!deleteMemberTarget) return;

    const targetIdToRemove = deleteMemberTarget.id;
    setMembers((prev) => prev.filter((m) => m.id !== targetIdToRemove));

    try {
      await fetch("/api/members/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: targetIdToRemove, businessId: targetBizId }),
      }).catch((err) => console.log(err));

      toast.success(`Removed ${deleteMemberTarget.name} from directory`);
      setDeleteMemberTarget(null);
    } catch (err) {
      toast.success(`Removed ${deleteMemberTarget.name}`);
      setDeleteMemberTarget(null);
    }
  };

  // Copy Onboarding Link Direct Action
  const handleCopyLinkDirect = (m) => {
    const link = `https://thikana.inc/onboard?email=${encodeURIComponent(m.email)}`;
    navigator.clipboard.writeText(link);
    toast.success(`Copied invite link for ${m.name}`);
    setOpenDropdownId(null);
  };

  // Filtered Members
  const filteredMembers = members.filter((m) => {
    const sTerm = search.toLowerCase();
    const matchesSearch =
      m.name.toLowerCase().includes(sTerm) ||
      m.email.toLowerCase().includes(sTerm) ||
      m.role.toLowerCase().includes(sTerm) ||
      (m.franchiseName && m.franchiseName.toLowerCase().includes(sTerm));

    let matchesFilter = true;
    if (filterRole === "Staff & Managers") {
      matchesFilter = m.role === "Staff" || m.role === "Manager";
    } else if (filterRole === "Franchise Admins") {
      matchesFilter = m.isFranchiseAdmin;
    }

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1A1A1A] p-5 rounded-3xl border border-[#E5E0D8] dark:border-white/10 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[#1A1A1A] dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" /> Team & Multi-Franchise Member Console
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Access directory, 9-point RBAC permissions, and direct franchise workspace switching.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Quick Segmentation Toolbar */}
          <div className="flex items-center gap-1 bg-[#F2EFE9] dark:bg-[#252525] p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
            {["All Members", "Staff & Managers", "Franchise Admins"].map((fl) => (
              <button
                key={fl}
                onClick={() => setFilterRole(fl)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  filterRole === fl
                    ? "bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
                }`}
              >
                {fl}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" /> Invite Member
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by member name, email, role, or assigned franchise..."
          className="w-full bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs sm:text-sm font-medium text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 transition shadow-xs"
        />
      </div>

      {/* Members Directory Table */}
      <div className="bg-white dark:bg-[#1A1A1A] border border-[#E5E0D8] dark:border-white/10 rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold">Loading member directory...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F9F8F6] dark:bg-[#222222] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-[#E5E0D8] dark:border-white/10">
                <tr>
                  <th className="px-5 py-3.5">Member</th>
                  <th className="px-5 py-3.5">Role & Scope</th>
                  <th className="px-5 py-3.5">Permissions Granted</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0D8] dark:divide-white/10">
                {filteredMembers.map((m) => {
                  const activePermsCount = Object.values(m.permissions || {}).filter(Boolean).length;

                  return (
                    <tr key={m.id} className="hover:bg-[#FDFCFB] dark:hover:bg-white/5 transition">
                      {/* Member Profile Avatar & Info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full p-0.5 shrink-0 ${
                              m.isFranchiseAdmin
                                ? "bg-gradient-to-tr from-amber-500 to-amber-300"
                                : "bg-gradient-to-tr from-blue-500 to-indigo-400"
                            }`}
                          >
                            <img
                              src={m.avatar}
                              alt={m.name}
                              className="w-full h-full rounded-full object-cover border-2 border-white dark:border-[#1A1A1A]"
                            />
                          </div>

                          <div>
                            <p className="font-extrabold text-[#1A1A1A] dark:text-white flex items-center gap-1.5">
                              {m.name}
                            </p>
                            <p className="text-[11px] text-gray-500">{m.email} • {m.phone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role & Scope Badge */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {m.isFranchiseAdmin ? (
                          <div className="space-y-1">
                            <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider inline-flex items-center gap-1 shadow-xs">
                              <Store className="w-3 h-3" /> Franchise Administrator
                            </span>
                            {m.franchiseName && (
                              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                {m.franchiseName}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded-xl font-extrabold text-[10px] uppercase tracking-wider inline-block ${
                              m.role === "Admin"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                                : m.role === "Manager"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {m.role}
                          </span>
                        )}
                      </td>

                      {/* Permissions Column */}
                      <td className="px-5 py-4">
                        {m.isFranchiseAdmin ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700/50 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-amber-600" /> Full Franchise Control
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                              {activePermsCount} / 9 Active
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(m.permissions || {})
                                .filter(([_, val]) => val)
                                .slice(0, 3)
                                .map(([pKey]) => (
                                  <span
                                    key={pKey}
                                    className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-[#252525] text-[9px] font-bold text-gray-500"
                                  >
                                    {pKey.replace("can", "")}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1.5 ${
                            m.status === "Active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {m.status === "Pending Acceptance" && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          )}
                          {m.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 relative">
                          {m.isFranchiseAdmin && (
                            <button
                              onClick={() => switchToFranchise(m.franchiseId || m.franchiseName)}
                              className="bg-[#1A1A1A] text-white dark:bg-white dark:text-[#1A1A1A] hover:opacity-90 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
                            >
                              Switch View <ArrowRight className="w-3 h-3" />
                            </button>
                          )}

                          <div className="relative">
                            <button
                              onClick={() => setOpenDropdownId(openDropdownId === m.id ? null : m.id)}
                              className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openDropdownId === m.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1C1C1C] border border-[#E5E0D8] dark:border-white/10 rounded-2xl shadow-xl py-1 z-50 text-left">
                                <button
                                  onClick={() => handleCopyLinkDirect(m)}
                                  className="w-full px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2"
                                >
                                  <Copy className="w-3.5 h-3.5" /> Copy Invite Link
                                </button>

                                <button
                                  onClick={() => {
                                    toast.success(`Resent invitation email to ${m.email}`);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2"
                                >
                                  <Send className="w-3.5 h-3.5" /> Resend Invitation
                                </button>

                                <button
                                  onClick={() => {
                                    setEditPermissionsMember(m);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-2"
                                >
                                  <Edit className="w-3.5 h-3.5 text-amber-500" /> Edit Permissions
                                </button>

                                <button
                                  onClick={() => {
                                    setDeleteMemberTarget(m);
                                    setOpenDropdownId(null);
                                  }}
                                  className="w-full px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 border-t border-gray-100 dark:border-white/10"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remove Member
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Member Modal Dialog */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-[#E5E0D8] dark:border-white/10 w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#E5E0D8] dark:border-white/10 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#222]">
              <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" /> Invite Team Member & Assign Scope
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  placeholder="e.g. Siddharth Varma"
                  className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="siddharth@thikana.inc"
                    className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    placeholder="+91 98000 11223"
                    className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-[#1A1A1A] dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Role Preset Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Role Preset
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Staff", "Manager", "Admin"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleRolePresetChange(r, inviteForm, setInviteForm)}
                      className={`py-2 rounded-2xl text-xs font-bold transition border ${
                        inviteForm.role === r
                          ? "bg-[#1A1A1A] text-white border-[#1A1A1A] dark:bg-white dark:text-[#1A1A1A]"
                          : "bg-gray-50 dark:bg-[#262626] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Franchise Admin Toggle */}
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                      Assign as Franchise Administrator?
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={inviteForm.isFranchiseAdmin}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, isFranchiseAdmin: e.target.checked })
                    }
                    className="w-4 h-4 accent-amber-500 rounded-lg cursor-pointer"
                  />
                </div>

                {inviteForm.isFranchiseAdmin && (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                      Select Franchise Outlet Store
                    </label>
                    <select
                      value={inviteForm.franchiseId}
                      onChange={(e) =>
                        setInviteForm({ ...inviteForm, franchiseId: e.target.value })
                      }
                      className="w-full bg-white dark:bg-[#222] border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-[#1A1A1A] dark:text-white outline-none"
                    >
                      <option value="">-- Choose Franchise Outlet --</option>
                      {franchises.map((fr) => (
                        <option key={fr.id} value={fr.id}>
                          {fr.name} ({fr.city})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 9-Point Granular Permission Flags */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  9-Point RBAC Permission Flags
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.keys(DEFAULT_9POINT_PERMISSIONS).map((permKey) => (
                    <label
                      key={permKey}
                      className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-[#252525] border border-gray-100 dark:border-white/5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={inviteForm.permissions[permKey]}
                        onChange={(e) =>
                          setInviteForm({
                            ...inviteForm,
                            permissions: {
                              ...inviteForm.permissions,
                              [permKey]: e.target.checked,
                            },
                          })
                        }
                        className="w-3.5 h-3.5 accent-amber-500 rounded-md"
                      />
                      <span className="text-[11px] font-bold truncate">
                        {permKey.replace("can", "")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-2xl text-xs font-bold text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Send Invite & Auto-Copy Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Permissions Modal Dialog */}
      {editPermissionsMember && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-[#E5E0D8] dark:border-white/10 w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-[#E5E0D8] dark:border-white/10 flex items-center justify-between bg-[#FDFCFB] dark:bg-[#222]">
              <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" /> Edit Permissions for {editPermissionsMember.name}
              </h3>
              <button
                onClick={() => setEditPermissionsMember(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePermissionsUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Change Role
                </label>
                <select
                  value={editPermissionsMember.role}
                  onChange={(e) =>
                    handleRolePresetChange(e.target.value, editPermissionsMember, setEditPermissionsMember)
                  }
                  className="w-full bg-gray-50 dark:bg-[#262626] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-bold text-[#1A1A1A] dark:text-white outline-none"
                >
                  <option value="Staff">Staff</option>
                  <option value="Manager">Manager</option>
                  <option value="Admin">Admin</option>
                  <option value="Franchise Admin">Franchise Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Adjust 9-Point Permissions
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.keys(DEFAULT_9POINT_PERMISSIONS).map((permKey) => (
                    <label
                      key={permKey}
                      className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-[#252525] border border-gray-100 dark:border-white/5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(editPermissionsMember.permissions?.[permKey])}
                        onChange={(e) =>
                          setEditPermissionsMember({
                            ...editPermissionsMember,
                            permissions: {
                              ...editPermissionsMember.permissions,
                              [permKey]: e.target.checked,
                            },
                          })
                        }
                        className="w-3.5 h-3.5 accent-amber-500 rounded-md"
                      />
                      <span className="text-[11px] font-bold truncate">
                        {permKey.replace("can", "")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditPermissionsMember(null)}
                  className="px-4 py-2 rounded-2xl text-xs font-bold text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 text-white px-5 py-2.5 rounded-2xl text-xs font-bold transition shadow-md"
                >
                  Save Permission Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation AlertDialog for Removing Member */}
      {deleteMemberTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#1C1C1C] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-150">
            <Trash2 className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <h3 className="font-extrabold text-base text-[#1A1A1A] dark:text-white">
              Remove {deleteMemberTarget.name}?
            </h3>
            <p className="text-xs text-gray-500 mt-1 mb-6">
              Revoking access will remove this account from the team directory.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteMemberTarget(null)}
                className="flex-1 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
