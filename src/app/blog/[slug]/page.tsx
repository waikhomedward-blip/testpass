import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostBySlug, getPublishedPosts } from "@/lib/blog";

const SITE_URL = "https://testpass.me";

export function generateStaticParams() {
  return getPublishedPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(props: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);
  if (!post || post.status !== "published") return {};

  const url = post.canonical ?? `${SITE_URL}/blog/${post.slug}`;

  return {
    title: post.metaTitle ?? post.title,
    description: post.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.metaTitle ?? post.title,
      description: post.metaDescription,
      url,
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      images: post.heroImage ? [{ url: post.heroImage, alt: post.heroImageAlt ?? post.title }] : undefined,
    },
  };
}

export default async function BlogPostPage(props: PageProps<"/blog/[slug]">) {
  const { slug } = await props.params;
  const post = getPostBySlug(slug);
  if (!post || post.status !== "published") notFound();

  const url = post.canonical ?? `${SITE_URL}/blog/${post.slug}`;

  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.metaDescription,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "TestPass" },
    datePublished: post.datePublished,
    dateModified: post.dateModified ?? post.datePublished,
    mainEntityOfPage: url,
    ...(post.heroImage ? { image: post.heroImage } : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav className="type-metadata text-ink-secondary">
        <Link href="/blog" className="hover:text-signal">
          Blog
        </Link>
      </nav>
      <h1 className="mt-3 type-page-title">{post.title}</h1>
      <p className="mt-2 type-metadata text-ink-secondary">
        {post.datePublished}
        {post.dateModified ? ` · updated ${post.dateModified}` : ""}
      </p>

      <div className="article-body mt-8" dangerouslySetInnerHTML={{ __html: post.html }} />

      <div className="mt-12 rounded-lg border border-border-subtle p-5">
        <p className="type-body">
          Spotted something wrong, or have a question this article didn&apos;t answer?
        </p>
        <Link
          href="/contact"
          className="mt-3 inline-block rounded-lg bg-signal px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-signal-hover"
        >
          Tell us
        </Link>
      </div>
    </div>
  );
}
