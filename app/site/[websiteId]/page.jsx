"use client";

import React, { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { componentRegistry } from "@/components/registry";
import { Loader2, Store } from "lucide-react";

export default function PublicWebsitePage({ params }) {
  const unwrappedParams = use(params);
  const targetId = unwrappedParams.websiteId;

  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId) return;

    const loadSite = async () => {
      setLoading(true);
      let foundData = null;

      try {
        // 1. Check published snapshot collection: public_websites/{targetId}
        const publicRef = doc(db, "public_websites", targetId);
        const publicSnap = await getDoc(publicRef);

        if (publicSnap.exists()) {
          foundData = publicSnap.data();
        } else {
          // 2. Check legacy top-level: websites/{targetId}
          const directRef = doc(db, "websites", targetId);
          const directSnap = await getDoc(directRef);

          if (directSnap.exists()) {
            foundData = directSnap.data();
          } else {
            // 3. Check business doc
            const busRef = doc(db, "businesses", targetId);
            const busSnap = await getDoc(busRef);

            if (busSnap.exists()) {
              const busData = busSnap.data();
              const activeSiteId = busData.activeWebsiteId;

              if (activeSiteId) {
                const subSiteRef = doc(db, "businesses", targetId, "websites", activeSiteId);
                const subSiteSnap = await getDoc(subSiteRef);
                if (subSiteSnap.exists()) {
                  foundData = subSiteSnap.data();
                }
              }

              if (!foundData) {
                const subColRef = collection(db, "businesses", targetId, "websites");
                const subColSnap = await getDocs(subColRef);
                if (!subColSnap.empty) {
                  const foundDoc = subColSnap.docs.find((d) => d.data().status === "published") || subColSnap.docs[0];
                  foundData = foundDoc.data();
                }
              }
            } else {
              // 4. Search across all business subcollections
              const allBusSnap = await getDocs(collection(db, "businesses"));
              for (const bDoc of allBusSnap.docs) {
                const subSiteRef = doc(db, "businesses", bDoc.id, "websites", targetId);
                const subSiteSnap = await getDoc(subSiteRef);
                if (subSiteSnap.exists()) {
                  foundData = subSiteSnap.data();
                  break;
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Error loading public site:", err);
      } finally {
        setSiteData(foundData);
        setLoading(false);
      }
    };

    loadSite();
  }, [targetId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1A1A1A] mb-3" />
        <p className="text-xs font-bold text-gray-500">Loading website...</p>
      </div>
    );
  }

  if (!siteData || !siteData.layout || siteData.layout.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F6F3] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] text-white flex items-center justify-center font-black text-xl mb-4">
          T
        </div>
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-2" style={{ fontFamily: "var(--font-heading)" }}>
          Store Site Not Found
        </h1>
        <p className="text-xs text-gray-500 max-w-sm">
          This store has not published its website layout yet or the URL is invalid.
        </p>
      </div>
    );
  }

  const layout = siteData.layout || [];
  const theme = siteData.theme || {};

  return (
    <div
      className="min-h-screen font-sans selection:bg-black selection:text-white"
      style={{
        backgroundColor: theme.secondaryColor || "#FFFFFF",
        color: theme.primaryColor || "#1A1A1A",
      }}
    >
      <main className="w-full space-y-4 py-4">
        {layout.map((block) => {
          const ComponentClass = componentRegistry[block.type];

          if (!ComponentClass) return null;

          return (
            <ComponentClass
              key={block.id}
              props={block.props}
              styles={block.styles}
              isSelected={false}
              isEditable={false}
            >
              {block.children &&
                block.children.map((childBlock) => {
                  const ChildComponent = componentRegistry[childBlock.type];
                  if (!ChildComponent) return null;
                  return (
                    <ChildComponent
                      key={childBlock.id}
                      props={childBlock.props}
                      styles={childBlock.styles}
                      isSelected={false}
                      isEditable={false}
                    />
                  );
                })}
            </ComponentClass>
          );
        })}
      </main>
    </div>
  );
}
