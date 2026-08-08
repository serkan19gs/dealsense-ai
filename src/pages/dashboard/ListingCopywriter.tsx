import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { generateListingCopy, type ListingCopyResult } from "@/lib/ai";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { track } from "@/lib/track";

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "warm", label: "Warm & inviting" },
  { value: "luxury", label: "Luxury" },
  { value: "concise", label: "Concise" },
] as const;

export default function ListingCopywriter() {
  const { user } = useAuth();
  const [address, setAddress] = useState("");
  const [bullets, setBullets] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]["value"]>("professional");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ListingCopyResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const copy = await generateListingCopy({ address, bullets, tone });
      setResult(copy);
      if (user) {
        await supabase.from("analyses").insert({
          user_id: user.id,
          kind: "listing_copy",
          input: { address, bullets, tone },
          output: copy,
        });
      }
      await track("listing_copy_generated", { tone });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    if (!result) return;
    navigator.clipboard.writeText(`${result.headline}\n\n${result.description}`);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Listing Copywriter</h1>
        <p className="text-muted-foreground">Turn bullet points into an MLS-ready description.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Property facts</CardTitle>
            <CardDescription>List the key selling points, one per line.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bullets">Key facts</Label>
                <Textarea
                  id="bullets"
                  rows={6}
                  placeholder={"4 bed, 3 bath\nRenovated kitchen 2023\nBackyard with pool\nWalking distance to schools"}
                  value={bullets}
                  onChange={(e) => setBullets(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Writing…" : "Generate listing copy"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Generated copy</CardTitle>
              <CardDescription>Ready to paste into your MLS.</CardDescription>
            </div>
            {result && (
              <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!result && !loading && <p className="text-sm text-muted-foreground">Nothing generated yet.</p>}
            {loading && <p className="text-sm text-muted-foreground">Writing your listing…</p>}
            {result && (
              <div className="space-y-3">
                <h3 className="font-semibold">{result.headline}</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed">{result.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
