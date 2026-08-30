"use client";

import React, { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import {
  Building2,
  Calendar,
  FileText,
  Clock,
  Globe,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ExternalLink,
  ShieldCheck,
  CalendarCheck,
  Tag,
} from "lucide-react";

// Predefined Business Sectors
const BUSINESS_SECTORS = [
  "Retail",
  "Restaurant",
  "Salon",
  "Grocery",
  "Healthcare",
  "Technology",
  "Professional Services",
  "Other",
];

const DEFAULT_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// GSTIN Official Indian Regex
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Comprehensive Zod Validation Schema with superRefine
export const businessInfoSchema = z
  .object({
    businessType: z.string().min(1, "Please select a business type"),
    customCategory: z.string().optional(),
    registrationDate: z.string().optional(),
    gstin: z.string().optional(),
    businessLicense: z.string().optional(),
    operationalHours: z.array(
      z.object({
        day: z.string(),
        enabled: z.boolean(),
        openTime: z.string().optional(),
        closeTime: z.string().optional(),
      })
    ),
    socialLinks: z.array(
      z.object({
        platform: z.string().min(1, "Platform name required"),
        url: z.string().url("Must be a valid URL (e.g. https://instagram.com/...)"),
      })
    ),
    acceptAppointments: z.boolean(),
    appointmentSlotMinutes: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Custom category validation if businessType === "Other"
    if (data.businessType === "Other" && (!data.customCategory || !data.customCategory.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customCategory"],
        message: "Custom business category is required when selecting 'Other'",
      });
    }

    // 2. GSTIN format check
    if (data.gstin && data.gstin.trim().length > 0) {
      const formattedGstin = data.gstin.trim().toUpperCase();
      if (!GSTIN_REGEX.test(formattedGstin)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gstin"],
          message: "Invalid GSTIN format (15-character official Indian GSTIN required)",
        });
      }
    }

    // 3. Operational Hours check for enabled days
    data.operationalHours.forEach((item, index) => {
      if (item.enabled) {
        if (!item.openTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["operationalHours", index, "openTime"],
            message: "Opening time required when store is open",
          });
        }
        if (!item.closeTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["operationalHours", index, "closeTime"],
            message: "Closing time required when store is open",
          });
        }
        if (item.openTime && item.closeTime && item.openTime >= item.closeTime) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["operationalHours", index, "closeTime"],
            message: "Closing time must be after opening time",
          });
        }
      }
    });

    // 4. Appointment duration bounded between 5 and 240 mins
    if (data.acceptAppointments) {
      const minutes = data.appointmentSlotMinutes ?? 30;
      if (minutes < 5 || minutes > 240) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["appointmentSlotMinutes"],
          message: "Appointment slot duration must be between 5 and 240 minutes",
        });
      }
    }
  });

export function BusinessInfoForm({ readOnly = false, businessId }) {
  const { user } = useAuth();
  const targetId = businessId || user?.uid;

  const [loadingDoc, setLoadingDoc] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default Operational Hours Schedule
  const defaultHours = DEFAULT_DAYS.map((d) => ({
    day: d,
    enabled: d !== "Sunday",
    openTime: "09:00",
    closeTime: "20:00",
  }));

  const form = useForm({
    resolver: zodResolver(businessInfoSchema),
    defaultValues: {
      businessType: "Retail",
      customCategory: "",
      registrationDate: new Date().toISOString().split("T")[0],
      gstin: "",
      businessLicense: "",
      operationalHours: defaultHours,
      socialLinks: [{ platform: "Instagram", url: "https://instagram.com/mybusiness" }],
      acceptAppointments: false,
      appointmentSlotMinutes: 30,
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = form;

  const { fields: socialFields, append: appendSocial, remove: removeSocial } = useFieldArray({
    control,
    name: "socialLinks",
  });

  const watchBusinessType = watch("businessType");
  const watchAcceptAppointments = watch("acceptAppointments");
  const watchOperationalHours = watch("operationalHours");

  // 1. Fetch & Normalize Business Metadata from Firestore
  useEffect(() => {
    async function loadBusinessInfo() {
      if (!targetId) {
        setLoadingDoc(false);
        return;
      }

      setLoadingDoc(true);
      try {
        let bData = null;

        // Query primary businesses/{targetId} document
        const bizSnap = await getDoc(doc(db, "businesses", targetId));
        if (bizSnap.exists()) {
          bData = bizSnap.data();
        } else {
          // Fallback query to users/{targetId}
          const userSnap = await getDoc(doc(db, "users", targetId));
          if (userSnap.exists()) {
            bData = userSnap.data();
          }
        }

        if (bData) {
          const rawType = bData.business_type || bData.businessType || "Retail";
          const isPredefined = BUSINESS_SECTORS.includes(rawType);

          const hoursList = Array.isArray(bData.operationalHours) && bData.operationalHours.length > 0
            ? bData.operationalHours
            : defaultHours;

          reset({
            businessType: isPredefined ? rawType : "Other",
            customCategory: isPredefined ? "" : rawType,
            registrationDate: bData.registrationDate || bData.officialRegistrationDate || new Date().toISOString().split("T")[0],
            gstin: bData.gstin || bData.gstNumber || "",
            businessLicense: bData.businessLicense || bData.licenseNumber || "",
            operationalHours: hoursList,
            socialLinks: Array.isArray(bData.socialLinks) ? bData.socialLinks : [],
            acceptAppointments: Boolean(bData.acceptAppointments),
            appointmentSlotMinutes: Number(bData.appointmentSlotMinutes || 30),
          });
        }
      } catch (err) {
        console.error("Error loading business information:", err);
        toast.error("Failed to load business details.");
      } finally {
        setLoadingDoc(false);
      }
    }

    loadBusinessInfo();
  }, [targetId, reset]);

  // 2. Form Submission & Dual Document Mirroring
  const onSubmit = async (values) => {
    if (!targetId) {
      toast.error("Invalid business ID session.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Saving business information...");

    try {
      // Sanitize operational hours: clear times for disabled days
      const sanitizedHours = values.operationalHours.map((item) => ({
        day: item.day,
        enabled: item.enabled,
        openTime: item.enabled ? item.openTime || "09:00" : "",
        closeTime: item.enabled ? item.closeTime || "20:00" : "",
      }));

      const finalBusinessType =
        values.businessType === "Other"
          ? values.customCategory.trim()
          : values.businessType;

      const payload = {
        businessType: finalBusinessType,
        business_type: finalBusinessType,
        customCategory: values.businessType === "Other" ? values.customCategory.trim() : "",
        registrationDate: values.registrationDate || "",
        officialRegistrationDate: values.registrationDate || "",
        gstin: values.gstin ? values.gstin.trim().toUpperCase() : "",
        businessLicense: values.businessLicense ? values.businessLicense.trim() : "",
        operationalHours: sanitizedHours,
        socialLinks: values.socialLinks || [],
        acceptAppointments: values.acceptAppointments,
        appointmentSlotMinutes: values.acceptAppointments ? values.appointmentSlotMinutes || 30 : 30,
        updatedAt: new Date().toISOString(),
      };

      // Primary write: businesses/{targetId}
      await setDoc(doc(db, "businesses", targetId), payload, { merge: true });

      // Mirror key public scheduling fields to users/{targetId}
      await setDoc(
        doc(db, "users", targetId),
        {
          business_type: finalBusinessType,
          operationalHours: sanitizedHours,
          acceptAppointments: values.acceptAppointments,
          appointmentSlotMinutes: values.acceptAppointments ? values.appointmentSlotMinutes || 30 : 30,
          socialLinks: values.socialLinks || [],
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      toast.success("Business information updated successfully!", { id: toastId });
    } catch (err) {
      console.error("Error saving business info:", err);
      toast.error(`Failed to save details: ${err.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingDoc) {
    return (
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-12 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
        <p className="text-xs font-bold text-gray-500">Loading business information...</p>
      </div>
    );
  }

  const formData = watch();

  // -------------------------------------------------------------
  // READ-ONLY SUMMARY VIEW FOR DELEGATED TEAM MEMBERS
  // -------------------------------------------------------------
  if (readOnly) {
    return (
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E0D8] dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1A1A1A] dark:text-white">
                Business Information Summary
              </h3>
              <p className="text-xs text-gray-500">
                Read-only view for delegated team members
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase flex items-center gap-1">
            <Lock className="w-3 h-3" /> Read Only
          </span>
        </div>

        {/* Business Sector & License */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Business Category</span>
            <p className="text-sm font-black text-[#1A1A1A] dark:text-white">
              {formData.businessType === "Other" ? formData.customCategory : formData.businessType}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Registration Date</span>
            <p className="text-sm font-extrabold text-[#1A1A1A] dark:text-white">
              {formData.registrationDate || "Not Specified"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">GSTIN Number</span>
            <p className="text-sm font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
              {formData.gstin || "N/A (Exempt)"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Business License</span>
            <p className="text-sm font-extrabold text-[#1A1A1A] dark:text-white">
              {formData.businessLicense || "N/A"}
            </p>
          </div>
        </div>

        {/* Operational Hours Badges */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Operational Hours Schedule
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {formData.operationalHours?.map((item) => (
              <div
                key={item.day}
                className="p-3 rounded-2xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 flex items-center justify-between text-xs"
              >
                <span className="font-bold text-[#1A1A1A] dark:text-white">{item.day}</span>
                {item.enabled ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-[10px]">
                    {item.openTime} - {item.closeTime}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-400 font-extrabold text-[10px]">
                    Closed
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Social Links Summary */}
        {formData.socialLinks?.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" /> Social Media Links
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              {formData.socialLinks.map((s, idx) => (
                <a
                  key={idx}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-2xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 hover:border-gray-400 font-bold text-xs text-[#1A1A1A] dark:text-white transition inline-flex items-center gap-1.5"
                >
                  <span>{s.platform}:</span>
                  <span className="text-blue-600 dark:text-blue-400 underline truncate max-w-[150px]">{s.url}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Appointment Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
            <CalendarCheck className="w-4 h-4 text-amber-500" />
            <span>Accept Customer Service Appointments:</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${formData.acceptAppointments ? "bg-emerald-500 text-white" : "bg-gray-300 text-gray-700"}`}>
            {formData.acceptAppointments ? `Active (${formData.appointmentSlotMinutes || 30} mins/slot)` : "Disabled"}
          </span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // WRITE MODE FOR BUSINESS OWNERS
  // -------------------------------------------------------------
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto">
      {/* 1. General Business Metadata Card */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5E0D8] dark:border-white/10">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#1A1A1A] dark:text-white">
              Business Registration & Legal Details
            </h3>
            <p className="text-xs text-gray-500">
              Configure sector classification, GSTIN, and registration licenses
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Business Type Dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
              Business Category / Sector
            </label>
            <select
              {...register("businessType")}
              className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 font-bold"
            >
              {BUSINESS_SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors.businessType && (
              <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.businessType.message}</p>
            )}
          </div>

          {/* Dynamic Custom Category Input */}
          {watchBusinessType === "Other" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-amber-500" /> Custom Business Category
              </label>
              <input
                type="text"
                {...register("customCategory")}
                placeholder="e.g. Artisanal Bakery & Cafe"
                className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500"
              />
              {errors.customCategory && (
                <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.customCategory.message}</p>
              )}
            </div>
          )}

          {/* Official Registration Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-500" /> Official Registration Date
            </label>
            <input
              type="date"
              {...register("registrationDate")}
              className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 font-medium"
            />
          </div>

          {/* GSTIN Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> GSTIN Number (Optional)
            </label>
            <input
              type="text"
              {...register("gstin")}
              placeholder="e.g. 27AAAAA0000A1Z5"
              className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-[#1A1A1A] dark:text-white font-mono uppercase outline-none focus:border-amber-500"
            />
            {errors.gstin && (
              <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.gstin.message}</p>
            )}
          </div>

          {/* Business License */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-purple-500" /> Business License / Registration #
            </label>
            <input
              type="text"
              {...register("businessLicense")}
              placeholder="e.g. FSSAI-1234567890"
              className="w-full bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* 2. Operational Hours Schedule Card */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5E0D8] dark:border-white/10">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#1A1A1A] dark:text-white">
              7-Day Operational Hours Schedule
            </h3>
            <p className="text-xs text-gray-500">
              Set opening & closing times for each day of the week
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {DEFAULT_DAYS.map((dayName, idx) => {
            const isEnabled = watchOperationalHours?.[idx]?.enabled;

            return (
              <div
                key={dayName}
                className="p-4 rounded-2xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      {...register(`operationalHours.${idx}.enabled`)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setValue(`operationalHours.${idx}.enabled`, checked);
                        if (!checked) {
                          setValue(`operationalHours.${idx}.openTime`, "");
                          setValue(`operationalHours.${idx}.closeTime`, "");
                        } else {
                          setValue(`operationalHours.${idx}.openTime`, "09:00");
                          setValue(`operationalHours.${idx}.closeTime`, "20:00");
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                  <span className="font-extrabold text-xs text-[#1A1A1A] dark:text-white w-24">
                    {dayName}
                  </span>
                </div>

                {isEnabled ? (
                  <div className="flex items-center gap-2 flex-1 max-w-sm">
                    <div className="flex-1">
                      <input
                        type="time"
                        {...register(`operationalHours.${idx}.openTime`)}
                        className="w-full bg-white dark:bg-[#1C1C1C] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-extrabold text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500"
                      />
                      {errors.operationalHours?.[idx]?.openTime && (
                        <p className="text-[9px] text-rose-500 mt-0.5">{errors.operationalHours[idx].openTime.message}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 font-bold">to</span>
                    <div className="flex-1">
                      <input
                        type="time"
                        {...register(`operationalHours.${idx}.closeTime`)}
                        className="w-full bg-white dark:bg-[#1C1C1C] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-extrabold text-[#1A1A1A] dark:text-white outline-none focus:border-amber-500"
                      />
                      {errors.operationalHours?.[idx]?.closeTime && (
                        <p className="text-[9px] text-rose-500 mt-0.5">{errors.operationalHours[idx].closeTime.message}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs font-extrabold text-gray-400 italic">
                    Closed
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Dynamic Social Media Links Card */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8] dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1A1A1A] dark:text-white">
                Social Media Links & Handles
              </h3>
              <p className="text-xs text-gray-500">
                Display social profiles on your public store page
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => appendSocial({ platform: "Instagram", url: "https://" })}
            className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Social Link</span>
          </button>
        </div>

        <div className="space-y-3">
          {socialFields.map((field, idx) => (
            <div
              key={field.id}
              className="p-3.5 rounded-2xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#DDD8CF] dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <input
                type="text"
                {...register(`socialLinks.${idx}.platform`)}
                placeholder="Platform (e.g. Instagram, Facebook)"
                className="sm:w-1/3 bg-white dark:bg-[#1C1C1C] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-[#1A1A1A] dark:text-white outline-none focus:border-blue-500"
              />
              <input
                type="url"
                {...register(`socialLinks.${idx}.url`)}
                placeholder="URL (https://...)"
                className="flex-1 bg-white dark:bg-[#1C1C1C] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-[#1A1A1A] dark:text-white outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => removeSocial(idx)}
                className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
                title="Remove social link"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {errors.socialLinks && (
            <p className="text-[10px] font-bold text-rose-500">{errors.socialLinks.message}</p>
          )}
        </div>
      </div>

      {/* 4. Appointments & Booking Configuration Card */}
      <div className="bg-white dark:bg-[#1A1A1A] rounded-3xl border border-[#E5E0D8] dark:border-white/10 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D8] dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#1A1A1A] dark:text-white">
                Customer Service Appointments
              </h3>
              <p className="text-xs text-gray-500">
                Allow customers to book service time slots directly from your storefront
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              {...register("acceptAppointments")}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
          </label>
        </div>

        {watchAcceptAppointments && (
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-200">
              Appointment Slot Duration (Minutes)
            </label>
            <input
              type="number"
              min={5}
              max={240}
              {...register("appointmentSlotMinutes", { valueAsNumber: true })}
              className="w-full sm:w-48 bg-white dark:bg-[#1C1C1C] border border-[#DDD8CF] dark:border-white/10 rounded-xl px-4 py-2.5 text-xs font-extrabold text-[#1A1A1A] dark:text-white outline-none focus:border-purple-500"
            />
            <p className="text-[10px] text-gray-500">
              Standard slot buffer time between 5 and 240 minutes (Default: 30 mins)
            </p>
            {errors.appointmentSlotMinutes && (
              <p className="text-[10px] font-bold text-rose-500 mt-1">{errors.appointmentSlotMinutes.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Form Submission Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 rounded-2xl bg-[#1A1A1A] hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#1A1A1A] font-extrabold text-sm transition shadow-md flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Saving Business Information...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" /> Save Business Information
          </>
        )}
      </button>
    </form>
  );
}

export default BusinessInfoForm;
