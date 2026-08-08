export function Footer() {
  return (
    <footer className="border-t py-10">
      <div className="container flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
        <p>© {new Date().getFullYear()} DealSense AI. All rights reserved.</p>
        <div className="flex gap-6">
          <a href="/pricing" className="hover:text-foreground">
            Pricing
          </a>
          <a href="mailto:hello@dealsense.ai" className="hover:text-foreground">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
