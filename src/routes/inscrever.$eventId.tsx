import React from 'react';
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCPF, formatPhone } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/inscrever/$eventId")({
  head: () => ({
    meta: [
      { title: "Inscrição na lista VIP" },
      { name: "description", content: "Faça sua inscrição na lista de convidados do evento." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicSignupPage,
});

type PublicEvent = {
  id: string;
  name: string;
  event_date: string;
  event_time: string | null;
  location: string | null;
  description: string | null;
  status: string;
  public_signup_enabled: boolean;
  public_signup_requires_approval: boolean;
  flyer_url: string | null;
};

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome completo").max(120),
  cpf: z.string().trim().max(20).optional().or(z.literal("")),
  phone: z.string().trim().max(25).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").max(180).optional().or(z.literal("")),
  ticket_quantity: z.number().int().min(1).max(20),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

function PublicSignupPage() {
  const { eventId } = Route.useParams();
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, name, event_date, event_time, location, description, status, public_signup_enabled, public_signup_requires_approval, flyer_url",
        )
        .eq("id", eventId)
        .maybeSingle();
      if (!active) return;
      if (error || !data || !data.public_signup_enabled) {
        setEvent(null);
      } else {
        setEvent(data as PublicEvent);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [eventId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;

    const parsed = signupSchema.safeParse({
      full_name: fullName,
      cpf,
      phone,
      email,
      ticket_quantity: ticketQuantity,
      notes,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    setSubmitting(true);
    const status = event.public_signup_requires_approval ? "pending" : "approved";
    const { error } = await supabase.from("guests").insert({
      event_id: event.id,
      full_name: parsed.data.full_name,
      cpf: parsed.data.cpf || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      ticket_type: "pista", // Default, admin will change on approval
      ticket_quantity: parsed.data.ticket_quantity,
      notes: parsed.data.notes || null,
      status,
      source: "public_form",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Não foi possível enviar sua inscrição");
      return;
    }
    setSubmitted(true);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Carregando…
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-display font-bold mb-2">Inscrição indisponível</h1>
          <p className="text-sm text-muted-foreground">
            Este link de inscrição não existe ou foi desativado pelo organizador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-xl mx-auto px-5 py-10 md:py-14">
        {event.flyer_url && (
          <div className="mb-8 rounded-2xl overflow-hidden border border-border shadow-lg">
            <img 
              src={event.flyer_url} 
              alt="Flyer do evento" 
              className="w-full h-auto object-cover"
            />
          </div>
        )}
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
          <Sparkles className="size-3.5" /> Lista VIP
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">
          {event.name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {format(new Date(event.event_date + "T00:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", {
            locale: ptBR,
          })}
          {event.event_time ? ` · ${event.event_time.slice(0, 5)}` : ""}
          {event.location ? ` · ${event.location}` : ""}
        </p>
        {event.description && (
          <p className="mt-4 text-sm text-muted-foreground">{event.description}</p>
        )}

        {submitted ? (
          <div className="mt-8 rounded-2xl border border-success/30 bg-success/5 p-6 text-center">
            <CheckCircle2 className="size-10 text-success mx-auto" />
            <h2 className="mt-3 text-xl font-semibold">Inscrição enviada!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {event.public_signup_requires_approval
                ? "Sua inscrição foi recebida e está aguardando aprovação do organizador. Você receberá a confirmação em breve."
                : "Você está confirmado(a) na lista. Apresente seu nome ou documento na entrada do evento."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-border bg-[image:var(--gradient-surface)] p-6">
            <div>
              <Label htmlFor="full_name">Nome completo *</Label>
              <Input
                id="full_name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={120}
                placeholder="Seu nome como no documento"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  inputMode="tel"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                maxLength={180}
              />
            </div>
            <div className="max-w-[200px]">
              <Label htmlFor="qty">Quantidade de acompanhantes</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={20}
                value={ticketQuantity}
                onChange={(e) => setTicketQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Incluindo você.</p>
            </div>
            <div>
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Restrições alimentares, nomes dos acompanhantes, etc."
              />
            </div>

            {event.public_signup_requires_approval && (
              <p className="text-xs text-muted-foreground">
                Esta lista exige aprovação do organizador. Você será avisado quando sua inscrição for aprovada.
              </p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (<><Loader2 className="size-4 animate-spin" /> Enviando…</>) : "Enviar inscrição"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Seus dados serão usados apenas para controle de acesso ao evento.
        </p>
      </div>
    </div>
  );
}
