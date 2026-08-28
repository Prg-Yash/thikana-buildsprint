"use client";

import React from "react";
import Hero from "./Hero";
import Features from "./Features";
import StoreMap from "./Map";
import CTA from "./CTA";
import PricingCard from "./PricingCard";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ContainerBlock from "./Container";
import HeadingBlock from "./Heading";
import TextBlock from "./Text";
import IconBoxBlock from "./IconBox";

export const componentRegistry = {
  ContainerBlock,
  HeadingBlock,
  TextBlock,
  IconBoxBlock,
  HeroSection: Hero,
  FeaturesSection: Features,
  MapSection: StoreMap,
  CTASection: CTA,
  PricingSection: PricingCard,
  NavbarSection: Navbar,
  FooterSection: Footer,
};

export const defaultComponentProps = {
  ContainerBlock: {
    type: "ContainerBlock",
    name: "Flex / Grid Container",
    props: {
      layoutType: "flex",
      direction: "row",
      gap: "16px",
      columns: 2,
    },
    styles: {
      padding: "24px",
      backgroundColor: "TRANSPARENT",
    },
  },
  HeadingBlock: {
    type: "HeadingBlock",
    name: "Heading Widget",
    props: {
      text: "Custom Heading",
      tag: "h2",
    },
    styles: {
      padding: "8px 0",
      textAlign: "left",
    },
  },
  TextBlock: {
    type: "TextBlock",
    name: "Text Paragraph",
    props: {
      text: "Write compelling copy for your products and brand story here...",
    },
    styles: {
      padding: "4px 0",
      textAlign: "left",
    },
  },
  IconBoxBlock: {
    type: "IconBoxBlock",
    name: "Icon Feature Box",
    props: {
      icon: "star",
      title: "Feature Highlight",
      description: "Custom feature card with icon and description.",
    },
    styles: {
      padding: "20px",
      backgroundColor: "#F7F6F3",
    },
  },
  HeroSection: {
    type: "HeroSection",
    name: "Hero Banner",
    props: {
      title: "Welcome to Our Store",
      subtitle: "Discover handcrafted local products near you.",
      ctaText: "Shop Collection",
      ctaLink: "#products",
    },
    styles: {
      padding: "64px 24px",
      backgroundColor: "#1A1A1A",
      textColor: "#FFFFFF",
    },
  },
  FeaturesSection: {
    type: "FeaturesSection",
    name: "Features Grid",
    props: {
      heading: "Why Shop With Us",
      subheading: "Premium quality & authentic local service.",
      items: [
        { icon: "star", title: "Handcrafted Quality", description: "Every item is crafted with utmost precision." },
        { icon: "shield", title: "Verified Seller", description: "Trusted local business with authentic products." },
        { icon: "truck", title: "Fast Delivery", description: "Quick doorstep delivery across the city." },
      ],
    },
    styles: {
      padding: "48px 24px",
      backgroundColor: "#FFFFFF",
      textColor: "#1A1A1A",
    },
  },
  MapSection: {
    type: "MapSection",
    name: "Store Location & Hours",
    props: {
      title: "Visit Our Physical Store",
      address: "MG Road, Pune, Maharashtra 411001",
      phone: "+91 98765 43210",
      timing: "Mon - Sat: 10:00 AM - 9:00 PM",
    },
    styles: {
      padding: "48px 24px",
      backgroundColor: "#F7F6F3",
      textColor: "#1A1A1A",
    },
  },
  CTASection: {
    type: "CTASection",
    name: "Call To Action",
    props: {
      title: "Boost Your Store Today",
      subtitle: "Connect with thousands of local buyers in your city.",
      buttonText: "Explore Offers",
      buttonLink: "#catalog",
    },
    styles: {
      padding: "48px 24px",
      backgroundColor: "#1A1A1A",
      textColor: "#FFFFFF",
    },
  },
  PricingSection: {
    type: "PricingSection",
    name: "Pricing & Packages",
    props: {
      heading: "Product Packages",
      tiers: [
        {
          name: "Starter Pack",
          price: "₹499",
          description: "Essential local items for daily needs.",
          features: ["Standard Packaging", "Local Delivery"],
        },
        {
          name: "Premium Deluxe",
          price: "₹1,299",
          description: "Exclusive handcrafted collection.",
          features: ["Custom Packaging", "Same-Day Express Delivery", "Gift Box"],
          popular: true,
        },
      ],
    },
    styles: {
      padding: "48px 24px",
      backgroundColor: "#FFFFFF",
      textColor: "#1A1A1A",
    },
  },
  NavbarSection: {
    type: "NavbarSection",
    name: "Store Header Navigation",
    props: {
      brandName: "Thikana Store",
      links: [
        { label: "Home", href: "#hero" },
        { label: "Products", href: "#products" },
        { label: "Location", href: "#map" },
      ],
    },
    styles: {
      padding: "16px 24px",
      backgroundColor: "#FFFFFF",
      textColor: "#1A1A1A",
    },
  },
  FooterSection: {
    type: "FooterSection",
    name: "Footer Bar",
    props: {
      tagline: "Empowering local businesses with digital storefronts.",
      copyright: `© ${new Date().getFullYear()} Thikana Business. All rights reserved.`,
    },
    styles: {
      padding: "32px 24px",
      backgroundColor: "#1A1A1A",
      textColor: "#888888",
    },
  },
};
