import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Saves or updates a website schema draft in Firestore.
 * Private Path: `businesses/{businessId}/websites/{websiteId}`
 */
export async function saveWebsiteSchema(businessId, websiteId, schemaData) {
  if (!businessId || !websiteId) {
    throw new Error("businessId and websiteId are required to save website schema");
  }

  const websiteRef = doc(db, "businesses", businessId, "websites", websiteId);
  const payload = {
    id: websiteId,
    websiteId,
    businessId,
    name: schemaData.name || schemaData.title || "My Storefront",
    title: schemaData.title || schemaData.name || "My Storefront",
    slug: schemaData.slug || "home",
    subdomain: schemaData.subdomain || `${websiteId.toLowerCase()}`,
    theme: {
      primaryColor: schemaData.theme?.primaryColor || "#1A1A1A",
      secondaryColor: schemaData.theme?.secondaryColor || "#F7F6F3",
      backgroundColor: schemaData.theme?.backgroundColor || "#FFFFFF",
      textColor: schemaData.theme?.textColor || "#1A1A1A",
      fontFamily: schemaData.theme?.fontFamily || "Inter, sans-serif",
      borderRadius: schemaData.theme?.borderRadius || "lg",
      themeMode: schemaData.theme?.themeMode || "light",
    },
    layout: schemaData.layout || [],
    updatedAt: new Date().toISOString(),
    status: schemaData.status || "draft",
    isPublished: schemaData.status === "published" || schemaData.isPublished || false,
  };

  await setDoc(websiteRef, payload, { merge: true });
  return payload;
}

/**
 * Publishes the website schema to public_websites/{websiteId} and public_subdomains/{subdomain}.
 * Single-query fast load for the public renderer.
 */
export async function publishWebsiteSchema(businessId, websiteId, schemaData) {
  if (!businessId || !websiteId) {
    throw new Error("businessId and websiteId are required to publish website");
  }

  // 1. Fetch current draft if layout isn't explicitly passed
  let draftData = schemaData;
  if (!schemaData.layout || schemaData.layout.length === 0) {
    const fetched = await fetchWebsiteSchema(businessId, websiteId);
    if (fetched) {
      draftData = { ...fetched, ...schemaData };
    }
  }

  const timestamp = new Date().toISOString();
  const subdomain = draftData.subdomain || websiteId.toLowerCase();

  const publishedPayload = {
    id: websiteId,
    websiteId,
    businessId,
    name: draftData.name || draftData.title || "My Storefront",
    title: draftData.title || draftData.name || "My Storefront",
    slug: draftData.slug || "home",
    subdomain,
    theme: {
      primaryColor: draftData.theme?.primaryColor || "#1A1A1A",
      secondaryColor: draftData.theme?.secondaryColor || "#F7F6F3",
      backgroundColor: draftData.theme?.backgroundColor || "#FFFFFF",
      textColor: draftData.theme?.textColor || "#1A1A1A",
      fontFamily: draftData.theme?.fontFamily || "Inter, sans-serif",
      borderRadius: draftData.theme?.borderRadius || "lg",
      themeMode: draftData.theme?.themeMode || "light",
    },
    layout: draftData.layout || [],
    isPublished: true,
    publishedPagesCount: 1,
    publishedAt: timestamp,
    updatedAt: timestamp,
  };

  // Write 1: Update private business subcollection
  const privateRef = doc(db, "businesses", businessId, "websites", websiteId);
  await setDoc(privateRef, publishedPayload, { merge: true });

  // Write 2: Public Snapshot (1-Query Public Load) -> public_websites/{websiteId}
  const publicWebsitesRef = doc(db, "public_websites", websiteId);
  await setDoc(publicWebsitesRef, publishedPayload, { merge: true });

  // Write 3: Legacy/Fallback mirror -> websites/{websiteId}
  const legacyRef = doc(db, "websites", websiteId);
  await setDoc(legacyRef, publishedPayload, { merge: true }).catch(() => {});

  // Write 4: Subdomain Index -> public_subdomains/{subdomain}
  const subdomainRef = doc(db, "public_subdomains", subdomain);
  await setDoc(
    subdomainRef,
    {
      websiteId,
      businessId,
      subdomain,
      updatedAt: timestamp,
    },
    { merge: true }
  ).catch(() => {});

  // Update parent business document
  const businessRef = doc(db, "businesses", businessId);
  await updateDoc(businessRef, {
    activeWebsiteId: websiteId,
    websitePublished: true,
    updatedAt: timestamp,
  }).catch(() => {});

  return publishedPayload;
}

/**
 * Fetches a website schema from Firestore.
 */
export async function fetchWebsiteSchema(businessId, websiteId) {
  if (!businessId || !websiteId) {
    throw new Error("businessId and websiteId are required to fetch website schema");
  }

  const websiteRef = doc(db, "businesses", businessId, "websites", websiteId);
  const docSnap = await getDoc(websiteRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }

  // Fallback to top-level public_websites
  const publicSnap = await getDoc(doc(db, "public_websites", websiteId));
  if (publicSnap.exists()) {
    return { id: publicSnap.id, ...publicSnap.data() };
  }

  return null;
}

/**
 * Fetches all websites for a business.
 */
export async function getWebsites(businessId) {
  if (!businessId) return [];

  const websitesRef = collection(db, "businesses", businessId, "websites");
  const snap = await getDocs(websitesRef);
  const list = [];
  snap.forEach((docSnap) => {
    list.push({ id: docSnap.id, ...docSnap.data() });
  });
  return list;
}

export async function getWebsite(businessId, websiteId) {
  return fetchWebsiteSchema(businessId, websiteId);
}

export async function createWebsite(businessId, siteData) {
  if (!businessId) throw new Error("businessId required");
  const newWebsiteId = `site-${Date.now()}`;
  const payload = {
    id: newWebsiteId,
    websiteId: newWebsiteId,
    businessId,
    name: siteData.name || "New Website",
    title: siteData.name || "New Website",
    slug: siteData.slug || "new-website",
    layout: siteData.layout || [
      {
        id: "hero-1",
        type: "HeroSection",
        props: {
          title: `Welcome to ${siteData.name || "Our Store"}`,
          subtitle: "Discover handcrafted products and unique local offerings.",
          ctaText: "Explore Offers",
          ctaLink: "#catalog",
        },
        styles: { padding: "64px 24px", backgroundColor: "#1A1A1A", textColor: "#FFFFFF" },
      },
    ],
    theme: siteData.theme || { primaryColor: "#1A1A1A", secondaryColor: "#F7F6F3" },
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "businesses", businessId, "websites", newWebsiteId), payload);
  return payload;
}

export async function getWebsitePages(businessId, websiteId) {
  const schema = await fetchWebsiteSchema(businessId, websiteId);
  if (!schema) return [];
  return [
    {
      id: "home",
      name: "Home",
      slug: "/",
      layout: schema.layout || [],
    },
  ];
}

export async function getPage(businessId, websiteId, pageId) {
  const pages = await getWebsitePages(businessId, websiteId);
  return pages.find((p) => p.id === pageId) || pages[0] || null;
}

export async function createPage(businessId, websiteId, pageData) {
  return {
    id: pageData.id || `page-${Date.now()}`,
    name: pageData.name || "New Page",
    slug: pageData.slug || "/new-page",
    layout: pageData.layout || [],
  };
}
