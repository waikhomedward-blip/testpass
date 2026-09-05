// TestPass blog content loader — zero-cost Git-backed Markdown/MDX, per
// Phase 2 of the zero-budget distribution brief (Sept 2026). Articles live
// as frontmatter + Markdown files under content/blog/*.md; this file is the
// only place that reads them, so the rendering approach can change later
// without touching the pages that call it.
//
// A post with status other than "published" is never returned by
// getPublishedPosts() (used by the blog index and the sitemap), so drafting
// an article here does not publish it — publishing still goes through the
// GREATS gate and founder approval described in the distribution brief
// before a post's frontmatter status is flipped to "published".

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

export type BlogPostStatus = "draft" | "published";

export interface BlogPost {
  slug: string;
  title: string;
  metaTitle?: string;
  metaDescription: string;
  summary: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  category?: string;
  device?: string;
  contentType?: string;
  targetIntent?: string;
  primaryQuery?: string;
  supportingQueries?: string[];
  tags?: string[];
  canonical?: string;
  heroImage?: string;
  heroImageAlt?: string;
  status: BlogPostStatus;
  sourceNotes?: string;
  ctaTarget?: string;
  html: string;
}

function readAllPosts(): BlogPost[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const slug = file.replace(/\.md$/, "");
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf-8");
      const { data, content } = matter(raw);

      return {
        slug,
        title: data.title ?? slug,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription ?? data.summary ?? "",
        summary: data.summary ?? "",
        author: data.author ?? "TestPass",
        datePublished: data.datePublished ?? new Date().toISOString().slice(0, 10),
        dateModified: data.dateModified,
        category: data.category,
        device: data.device,
        contentType: data.contentType,
        targetIntent: data.targetIntent,
        primaryQuery: data.primaryQuery,
        supportingQueries: data.supportingQueries,
        tags: data.tags,
        canonical: data.canonical,
        heroImage: data.heroImage,
        heroImageAlt: data.heroImageAlt,
        status: (data.status as BlogPostStatus) ?? "draft",
        sourceNotes: data.sourceNotes,
        ctaTarget: data.ctaTarget,
        html: marked.parse(content, { async: false }) as string,
      };
    });
}

/** Every post, draft or published, newest first. Internal use only. */
export function getAllPosts(): BlogPost[] {
  return readAllPosts().sort((a, b) => (a.datePublished < b.datePublished ? 1 : -1));
}

/** Only posts whose frontmatter status is "published" — what the public site may ever show. */
export function getPublishedPosts(): BlogPost[] {
  return getAllPosts().filter((post) => post.status === "published");
}

/** A single post by slug, regardless of status — callers must check `.status` before rendering publicly. */
export function getPostBySlug(slug: string): BlogPost | undefined {
  return readAllPosts().find((post) => post.slug === slug);
}
