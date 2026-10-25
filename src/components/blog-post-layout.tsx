import Link from "next/link";
import { BlogNewsletter } from "@/components/blog-newsletter";
import { JsonLd } from "@/components/json-ld";
import { PreviewCta } from "@/components/preview-cta";
import { BLOG_AUTHOR, blogPosts, longDate, postPath, type BlogPost } from "@/lib/blog";
import { siteUrl } from "@/lib/env";
import { GUIDES, guidePath } from "@/lib/guides";
import { PAGES, postPage } from "@/lib/pages";
import { SITE } from "@/lib/site";
import { breadcrumbs } from "@/lib/structured-data";

export function BlogPostLayout({ post, children }: { post: BlogPost; children: React.ReactNode }) {
  const base = siteUrl();
  const page = postPage(post);
  const url = `${base}${page.path}`;
  const others = blogPosts().filter((p) => p.slug !== post.slug);
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BlogPosting",
              "@id": `${url}#post`,
              headline: post.title,
              description: post.description,
              url,
              mainEntityOfPage: url,
              image: `${base}${page.image.url}`,
              datePublished: post.published,
              dateModified: post.updated,
              inLanguage: "en-GB",
              author: { "@type": "Person", name: BLOG_AUTHOR.name },
              publisher: { "@id": `${base}/#organization`, "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: `${base}/icons/icon-512.png` } },
            },
            breadcrumbs(base, [
              { name: "Blog", path: PAGES.blog.path },
              { name: post.title, path: page.path },
            ]),
          ],
        }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> <span aria-hidden="true">/</span>{" "}
        <Link href={PAGES.blog.path} className="hover:text-foreground">Blog</Link> <span aria-hidden="true">/</span> <span aria-current="page">{post.title}</span>
      </nav>
      <header className="mt-4 space-y-3">
        <h1 className="text-balance text-4xl font-semibold tracking-tight">{post.title}</h1>
        <p className="text-lg text-muted-foreground">{post.description}</p>
        <p className="text-xs text-muted-foreground" data-testid="byline">
          By <span>{BLOG_AUTHOR.name}</span>, founder of {SITE.name} <span aria-hidden="true">·</span> Published <time dateTime={post.published}>{longDate(post.published)}</time>
          {post.updated !== post.published ? (
            <>
              {" "}<span aria-hidden="true">·</span> Updated <time dateTime={post.updated}>{longDate(post.updated)}</time>
            </>
          ) : null}{" "}
          <span aria-hidden="true">·</span> {post.readingMinutes} min read
        </p>
      </header>
      <div className="mt-10 space-y-5 leading-relaxed [&_h2]:mt-10 [&_h2]:scroll-mt-20 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-6 [&_h3]:font-semibold [&_li]:text-muted-foreground [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-sm [&_:not(pre)>code]:text-foreground">
        {children}
      </div>
      <PreviewCta />
      <BlogNewsletter post={post} />
      <nav aria-label="More from LaunchLoop" className="mt-10 text-sm">
        <h2 className="font-medium">More from the blog</h2>
        <ul className="mt-2 space-y-1">
          {others.map((p) => (
            <li key={p.slug}>
              <Link href={postPath(p)} className="text-muted-foreground underline underline-offset-4 hover:text-foreground">{p.title}</Link>
            </li>
          ))}
          <li><Link href={PAGES.blog.path} className="text-muted-foreground underline underline-offset-4 hover:text-foreground">All blog posts</Link></li>
        </ul>
        <h2 className="mt-6 font-medium">Launch guides</h2>
        <ul className="mt-2 space-y-1">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={guidePath(g)} className="text-muted-foreground underline underline-offset-4 hover:text-foreground">{g.title}</Link>
            </li>
          ))}
          <li><Link href={PAGES.guides.path} className="text-muted-foreground underline underline-offset-4 hover:text-foreground">All launch guides</Link></li>
          <li><Link href={PAGES.tools.path} className="text-muted-foreground underline underline-offset-4 hover:text-foreground">Free launch tools</Link></li>
        </ul>
      </nav>
    </article>
  );
}
