import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/blog";

// Technical SEO foundation, Phase 2 of the zero-budget distribution brief:
// testpass.me had no sitemap at all before this (confirmed 404 on
// /sitemap.xml during the Sept 2026 audit). Static marketing routes plus
// every published blog post; buyer/seller session routes stay out on
// purpose — those are already disallowed in robots.ts and are per-session,
// not content anyone should land on from search.

const BASE_URL = "https://testpass.me";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const postRoutes: MetadataRoute.Sitemap = getPublishedPosts().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.dateModified ?? post.datePublished,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes];
}
