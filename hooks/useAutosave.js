import { useEffect, useRef, useState } from "react";
import { saveWebsiteSchema } from "@/lib/website-operations";
import { useBuilderStore } from "@/lib/stores/builderStore";

export function useAutosave(optionsOrBusinessId, websiteId, layoutInput, themeInput, delay = 2000) {
  let businessId, siteId, pageId;
  
  if (typeof optionsOrBusinessId === "object" && optionsOrBusinessId !== null) {
    businessId = optionsOrBusinessId.businessId;
    siteId = optionsOrBusinessId.siteId || optionsOrBusinessId.websiteId;
    pageId = optionsOrBusinessId.pageId;
  } else {
    businessId = optionsOrBusinessId;
    siteId = websiteId;
  }

  const storeLayout = useBuilderStore((state) => state.layout);
  const storeTheme = useBuilderStore((state) => state.theme);

  const activeLayout = layoutInput || storeLayout;
  const activeTheme = themeInput || storeTheme;

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Saved"); // 'Saving...' | 'Saved' | 'Error'
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!businessId || !siteId) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setSaving(true);
    setSaveStatus("Saving...");

    const handler = setTimeout(async () => {
      try {
        await saveWebsiteSchema(businessId, siteId, { layout: activeLayout, theme: activeTheme, status: "draft" });
        setSaving(false);
        setSaveStatus("Saved");
        setLastSavedAt(new Date());
      } catch (err) {
        console.error("Autosave error:", err);
        setSaving(false);
        setSaveStatus("Error");
      }
    }, delay);

    return () => clearTimeout(handler);
  }, [businessId, siteId, activeLayout, activeTheme, delay]);

  return { saving, saveStatus, lastSavedAt, lastSaved: lastSavedAt, error: null };
}
