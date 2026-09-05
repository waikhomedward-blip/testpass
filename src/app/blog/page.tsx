import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Straight answers on buying and selling used phones, consoles, and laptops safely — from TestPass.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "TestPass Blog",
    description:
      "Straight answers on buying and selling used phones, consoles, and laptops safely — from TestPass.",
    url: "/blog",
  },
};

export default function BlogIndexPage() {
  const posts = getPublishedPosts();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="type-page-title">Blog</h1>
      <p className="mt-2 type-body text-ink-secondary">
        Straight answers on buying and selling used phones, consoles, and laptops safely.
      </p>

      {posts.length === 0 ? (
        <p className="mt-10 type-body text-ink-secondary">No posts yet — check back soon.</p>
      ) : (
        <ul className="mt-10 flex flex-col gap-8">
          {posts.map((post) => (
            <li key={post.slug} className="border-b border-border-subtle pb-8 last:border-none">
              <Link href={`/blog/${post.slug}`} className="type-section-title hover:text-signal">
                {post.title}
              </Link>
              <p className="mt-2 type-body text-ink-secondary">{post.summary}</p>
              <p className="mt-2 type-metadata text-ink-secondary">{post.datePublished}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
