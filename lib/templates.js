export const templates = [
  {
    id: "artisanal-cafe",
    name: "Artisanal Cafe & Bakery",
    category: "Food & Dining",
    description: "Warm, inviting storefront designed for local coffee shops, bakeries, and roasteries.",
    theme: { primaryColor: "#2D241E", secondaryColor: "#F5EFEB" },
    layout: [
      {
        id: "nav-1",
        type: "NavbarSection",
        props: {
          brandName: "Artisan Roasters",
          links: [
            { label: "Menu", href: "#pricing" },
            { label: "Our Story", href: "#features" },
            { label: "Find Us", href: "#map" },
          ],
        },
        styles: { padding: "16px 24px", backgroundColor: "#FFFFFF", textColor: "#2D241E" },
      },
      {
        id: "hero-1",
        type: "HeroSection",
        props: {
          title: "Freshly Roasted Coffee & Artisan Bakes",
          subtitle: "Handcrafted daily using organic locally sourced beans and fresh ingredients.",
          ctaText: "Order Delivery",
          ctaLink: "#pricing",
        },
        styles: { padding: "72px 24px", backgroundColor: "#2D241E", textColor: "#F5EFEB" },
      },
      {
        id: "feat-1",
        type: "FeaturesSection",
        props: {
          heading: "Crafted With Care",
          subheading: "Why neighborhood regulars visit us every morning",
          items: [
            { icon: "star", title: "Single Origin Beans", description: "Directly imported and roasted in small batches daily." },
            { icon: "sparkles", title: "Fresh Bakes Daily", description: "Handmade sourdoughs, pastries, and artisanal desserts." },
            { icon: "truck", title: "Fast Express Pickup", description: "Order ahead online and skip the morning queue." },
          ],
        },
        styles: { padding: "56px 24px", backgroundColor: "#FFFFFF", textColor: "#2D241E" },
      },
      {
        id: "pricing-1",
        type: "PricingSection",
        props: {
          heading: "Popular Combos & Subscriptions",
          tiers: [
            {
              name: "Morning Starter Pack",
              price: "₹349",
              description: "Choice of Specialty Latte + Artisan Croissant.",
              features: ["Freshly Brewed", "Express Pickup"],
            },
            {
              name: "Weekly Bean Subscription",
              price: "₹899",
              description: "500g Freshly Roasted Beans delivered every Monday.",
              features: ["Custom Grind Size", "Free Doorstep Delivery", "Complimentary Tasting Sample"],
              popular: true,
            },
          ],
        },
        styles: { padding: "56px 24px", backgroundColor: "#FFFFFF", textColor: "#2D241E" },
      },
      {
        id: "map-1",
        type: "MapSection",
        props: {
          title: "Visit Our Bandra Outlet",
          address: "Hill Road, Bandra West, Mumbai 400050",
          phone: "+91 98200 12345",
          timing: "Open Daily: 7:30 AM - 10:30 PM",
        },
        styles: { padding: "56px 24px", backgroundColor: "#F5EFEB", textColor: "#2D241E" },
      },
      {
        id: "footer-1",
        type: "FooterSection",
        props: {
          tagline: "Brewing happiness in the neighborhood since 2018.",
          copyright: `© ${new Date().getFullYear()} Artisan Roasters. All rights reserved.`,
        },
        styles: { padding: "32px 24px", backgroundColor: "#2D241E", textColor: "#A09590" },
      },
    ],
  },
  {
    id: "luxury-boutique",
    name: "Luxury Fashion & Boutique",
    category: "Fashion",
    description: "Sleek noir design built for handcrafted clothing brands, jewelers, and designer stores.",
    theme: { primaryColor: "#1A1A1A", secondaryColor: "#F7F6F3" },
    layout: [
      {
        id: "nav-2",
        type: "NavbarSection",
        props: {
          brandName: "HAUTE & CO",
          links: [
            { label: "Collection", href: "#hero" },
            { label: "Exclusive Drop", href: "#pricing" },
            { label: "Showroom", href: "#map" },
          ],
        },
        styles: { padding: "16px 24px", backgroundColor: "#FFFFFF", textColor: "#1A1A1A" },
      },
      {
        id: "hero-2",
        type: "HeroSection",
        props: {
          title: "Timeless Elegance & Contemporary Design",
          subtitle: "Explore our limited edition seasonal wardrobe and handcrafted accessories.",
          ctaText: "View Collection",
          ctaLink: "#pricing",
        },
        styles: { padding: "80px 24px", backgroundColor: "#1A1A1A", textColor: "#FFFFFF" },
      },
      {
        id: "feat-2",
        type: "FeaturesSection",
        props: {
          heading: "The Haute Promise",
          subheading: "Uncompromising standards in sustainable luxury tailoring",
          items: [
            { icon: "star", title: "Handwoven Fabrics", description: "Pure silk, organic cotton, and ethically sourced textiles." },
            { icon: "sparkles", title: "Custom Bespoke Fits", description: "Tailored to your exact measurements by master couturiers." },
            { icon: "truck", title: "Global Insured Shipping", description: "Worldwide doorstep delivery with luxury gift wrapping." },
          ],
        },
        styles: { padding: "56px 24px", backgroundColor: "#FFFFFF", textColor: "#1A1A1A" },
      },
      {
        id: "pricing-2",
        type: "PricingSection",
        props: {
          heading: "Featured Collections",
          tiers: [
            {
              name: "Essential Edit",
              price: "₹2,499",
              description: "Versatile everyday luxury garments.",
              features: ["100% Organic Cotton", "Tailored Fit", "Free Alterations"],
            },
            {
              name: "Signature Runway Edition",
              price: "₹6,999",
              description: "Exclusive handcrafted designer piece with custom embroidery.",
              features: ["Bespoke Fitting Session", "Silk Presentation Box", "VIP Access to Drops"],
              popular: true,
            },
          ],
        },
        styles: { padding: "56px 24px", backgroundColor: "#FFFFFF", textColor: "#1A1A1A" },
      },
      {
        id: "footer-2",
        type: "FooterSection",
        props: {
          tagline: "Redefining modern Indian luxury couture.",
          copyright: `© ${new Date().getFullYear()} Haute & Co. All rights reserved.`,
        },
        styles: { padding: "32px 24px", backgroundColor: "#1A1A1A", textColor: "#888888" },
      },
    ],
  },
  {
    id: "wellness-spa",
    name: "Aura Wellness & Organic Spa",
    category: "Services",
    description: "Serene emerald palette perfect for wellness clinics, salons, ayurvedic spas, and yoga studios.",
    theme: { primaryColor: "#0F2C23", secondaryColor: "#F0F7F4" },
    layout: [
      {
        id: "nav-3",
        type: "NavbarSection",
        props: {
          brandName: "AURA WELLNESS",
          links: [
            { label: "Treatments", href: "#pricing" },
            { label: "Philosophy", href: "#features" },
            { label: "Book Appointment", href: "#map" },
          ],
        },
        styles: { padding: "16px 24px", backgroundColor: "#FFFFFF", textColor: "#0F2C23" },
      },
      {
        id: "hero-3",
        type: "HeroSection",
        props: {
          title: "Rejuvenate Mind, Body & Soul",
          subtitle: "Holistic ayurvedic therapies and luxury organic wellness treatments.",
          ctaText: "Book Your Session",
          ctaLink: "#pricing",
        },
        styles: { padding: "72px 24px", backgroundColor: "#0F2C23", textColor: "#F0F7F4" },
      },
      {
        id: "feat-3",
        type: "FeaturesSection",
        props: {
          heading: "Holistic Healing Excellence",
          subheading: "Certified therapists and 100% organic botanicals",
          items: [
            { icon: "sparkles", title: "Ayurvedic Oils", description: "Hand-pressed herbal oils formulated for deep relaxation." },
            { icon: "shield", title: "Certified Therapists", description: "Experienced practitioners with specialized wellness training." },
            { icon: "star", title: "Private Suite Sanctum", description: "Tranquil, soundproof therapy rooms with private steam showers." },
          ],
        },
        styles: { padding: "56px 24px", backgroundColor: "#FFFFFF", textColor: "#0F2C23" },
      },
      {
        id: "pricing-3",
        type: "PricingSection",
        props: {
          heading: "Popular Wellness Packages",
          tiers: [
            {
              name: "Stress Relief Therapy",
              price: "₹1,999",
              description: "60-min Deep Tissue Massage + Herbal Steam.",
              features: ["Aromatic Essential Oils", "Complimentary Herbal Tea"],
            },
            {
              name: "Royal Abhyanga Ritual",
              price: "₹3,999",
              description: "90-min Full Body Synchronized Massage + Organic Glow Facial.",
              features: ["Two Therapists Sync", "Custom Body Scrub", "Private Spa Suite"],
              popular: true,
            },
          ],
        },
        styles: { padding: "56px 24px", backgroundColor: "#FFFFFF", textColor: "#0F2C23" },
      },
      {
        id: "footer-3",
        type: "FooterSection",
        props: {
          tagline: "Your sanctuary for peaceful mindfulness and restoration.",
          copyright: `© ${new Date().getFullYear()} Aura Wellness Spa. All rights reserved.`,
        },
        styles: { padding: "32px 24px", backgroundColor: "#0F2C23", textColor: "#7DAE9A" },
      },
    ],
  },
  {
    id: "gadget-store",
    name: "TechPulse Electronics & Repair",
    category: "Electronics",
    description: "Modern high-contrast layout built for consumer tech stores, mobile shops, and repair centers.",
    theme: { primaryColor: "#111827", secondaryColor: "#F3F4F6" },
    layout: [
      {
        id: "nav-4",
        type: "NavbarSection",
        props: {
          brandName: "TechPulse Gear",
          links: [
            { label: "Gadgets", href: "#pricing" },
            { label: "Repairs", href: "#features" },
            { label: "Store Location", href: "#map" },
          ],
        },
        styles: { padding: "16px 24px", backgroundColor: "#FFFFFF", textColor: "#111827" },
      },
      {
        id: "hero-4",
        type: "HeroSection",
        props: {
          title: "Next-Gen Tech Gadgets & Express Repairs",
          subtitle: "Authorized dealer for premium smartphones, audio gear, and gaming accessories.",
          ctaText: "Shop Trending Gear",
          ctaLink: "#pricing",
        },
        styles: { padding: "72px 24px", backgroundColor: "#111827", textColor: "#FFFFFF" },
      },
      {
        id: "feat-4",
        type: "FeaturesSection",
        props: {
          heading: "Why TechPulse",
          subheading: "Trusted tech experts in your locality",
          items: [
            { icon: "shield", title: "100% Genuine Warranty", description: "All products come with manufacturer brand warranty." },
            { icon: "sparkles", title: "Express 30-Min Repair", description: "Screen and battery replacements done right in front of you." },
            { icon: "truck", title: "Same-Day City Delivery", description: "Order before 2 PM for doorstep delivery today." },
          ],
        },
        styles: { padding: "56px 24px", backgroundColor: "#FFFFFF", textColor: "#111827" },
      },
      {
        id: "pricing-4",
        type: "PricingSection",
        props: {
          heading: "Featured Deals",
          tiers: [
            {
              name: "Wireless Audio Pack",
              price: "₹1,499",
              description: "ANC Earbuds with 30-Hour Battery Life.",
              features: ["Active Noise Cancellation", "1-Year Warranty"],
            },
            {
              name: "Pro Gaming Bundle",
              price: "₹3,999",
              description: "Mechanical RGB Keyboard + 16,000 DPI Gaming Mouse + Headset.",
              features: ["Mechanical Switches", "Braided Cables", "Free Carrying Case"],
              popular: true,
            },
          ],
        },
        styles: { padding: "56px 24px", backgroundColor: "#FFFFFF", textColor: "#111827" },
      },
      {
        id: "footer-4",
        type: "FooterSection",
        props: {
          tagline: "Empowering your digital lifestyle.",
          copyright: `© ${new Date().getFullYear()} TechPulse Electronics. All rights reserved.`,
        },
        styles: { padding: "32px 24px", backgroundColor: "#111827", textColor: "#9CA3AF" },
      },
    ],
  },
];
