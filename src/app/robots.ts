import type { MetadataRoute } from "next";

// Section 5 of the beta operating directive: session/result pages must
// never be indexed (they're per-transaction, often still-in-progress
// pages, not content anyone should land on from search) — and while in
// beta, BETA_NOINDEX_ALL lets the whole marketing surface be kept out of
// search too, without a code change, until the product is ready for
// organic discovery. Defense in depth alongside the per-page `robots`
// metadata on those routes (this stops crawling; that stops indexing a
// page that got linked to directly).
export default function robots(): MetadataRoute.Robots {
  if (process.env.BETA_NOINDEX_ALL === "true") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/buyer/session/", "/buyer/mine", "/seller/"],
    },
  };
}
