import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import type { TablesInsert } from "../lib/database.types";
import {
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  AlertCircle,
  Settings,
  FileText,
  CheckSquare,
  Trophy,
  Users,
  GitBranch,
  Eye,
  EyeOff,
} from "lucide-react";

type StepType = "basic" | "content" | "rules" | "partners" | "community" | "github" | "checklist" | "schedule" | "speakers" | "credits" | "review";

const STEPS: { id: StepType; label: string }[] = [
  { id: "basic", label: "Basic Info" },
  { id: "content", label: "Content" },
  { id: "rules", label: "Rules" },
  { id: "partners", label: "Partners" },
  { id: "community", label: "Community" },
  { id: "github", label: "GitHub" },
  { id: "checklist", label: "Checklist" },
  { id: "schedule", label: "Schedule" },
  { id: "speakers", label: "Speakers" },
  { id: "credits", label: "Credits" },
  { id: "review", label: "Review" },
];

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function HackathonCreationPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<StepType>("basic");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    year: new Date().getFullYear(),
    start_date: formatDateForInput(new Date()),
    end_date: formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    program: "",
    challenge_description: "",
    rules: "",
    submission_rules: "",
    judging_criteria: "",
    welcome_message: "",
    partners: [] as { name: string; description: string; logo_url: string; website: string }[],
    prizes: [] as { name: string; description: string; amount: string; place: string }[],
    community_config: { discord_server_id: "", discord_invite_url: "", slack_channel: "", forum_url: "" },
    social_config: { twitter_handle: "", linkedin_url: "", instagram_handle: "", hashtag: "" },
    github_org: "",
    repo_visibility: "private" as "private" | "public",
    checklist_runbook: { reusable_steps: [] as string[], custom_steps: [] as { name: string; description: string; is_required: boolean }[] },
    event_schedule: { days: [] as { date: string; events: { time: string; title: string; description: string; meeting_link?: string }[] }[] },
    guest_speakers: [] as { name: string; title: string; bio: string; photo_url: string; session_time: string }[],
    credit_allocations: { enabled: false, partners: [] as { name: string; endpoint_url: string; api_key: string; credit_amount: number }[] },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const validateStep = (step: StepType): boolean => {
    const newErrors: Record<string, string> = {};
    switch (step) {
      case "basic":
        if (!formData.name.trim()) newErrors.name = "Name is required";
        if (!formData.slug.trim()) newErrors.slug = "Slug is required";
        if (!formData.year || formData.year < 2020 || formData.year > 2030) newErrors.year = "Valid year is required";
        if (!formData.start_date) newErrors.start_date = "Start date is required";
        if (!formData.end_date) newErrors.end_date = "End date is required";
        if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
          newErrors.end_date = "End date must be after start date";
        }
        break;
      case "content":
        if (!formData.program.trim()) newErrors.program = "Program is required";
        if (!formData.challenge_description.trim()) newErrors.challenge_description = "Challenge description is required";
        break;
      case "rules":
        if (!formData.rules.trim()) newErrors.rules = "Rules are required";
        if (!formData.submission_rules.trim()) newErrors.submission_rules = "Submission rules are required";
        if (!formData.judging_criteria.trim()) newErrors.judging_criteria = "Judging criteria are required";
        break;
      case "github":
        if (!formData.github_org.trim()) newErrors.github_org = "GitHub organization is required";
        break;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      const currentIndex = STEPS.findIndex(s => s.id === currentStep);
      if (currentIndex < STEPS.length - 1) setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    if (currentIndex > 0) setCurrentStep(STEPS[currentIndex - 1].id);
  };

  const handleStepClick = (step: StepType) => {
    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    const targetIndex = STEPS.findIndex(s => s.id === step);
    if (targetIndex <= currentIndex) setCurrentStep(step);
  };

  const handleSubmit = async () => {
    const allSteps = ["basic", "content", "rules", "github"] as StepType[];
    let isValid = true;
    for (const step of allSteps) {
      if (!validateStep(step)) { isValid = false; break; }
    }
    if (!isValid) { setSubmitError("Please fill in all required fields"); return; }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const hackathonData: TablesInsert<"hackathons"> = {
        name: formData.name,
        slug: formData.slug,
        year: formData.year,
        start_date: formData.start_date,
        end_date: formData.end_date,
        program: formData.program,
        challenge_description: formData.challenge_description,
        welcome_message: formData.welcome_message,
        github_org: formData.github_org,
        repo_visibility: formData.repo_visibility,
        rules: formData.rules as any,
        submission_rules: formData.submission_rules as any,
        judging_criteria: formData.judging_criteria as any,
        checklist_runbook: JSON.stringify(formData.checklist_runbook) as any,
        community_config: JSON.stringify(formData.community_config) as any,
        social_config: JSON.stringify(formData.social_config) as any,
        partners: JSON.stringify(formData.partners) as any,
        prizes: JSON.stringify(formData.prizes) as any,
        event_schedule: JSON.stringify(formData.event_schedule) as any,
        guest_speakers: JSON.stringify(formData.guest_speakers) as any,
        credit_allocations: JSON.stringify(formData.credit_allocations) as any,
      };

      const { data: hackathon, error: hackathonError } = await supabase
        .from("hackathons")
        .insert(hackathonData)
        .select()
        .single();

      if (hackathonError) throw new Error(`Failed to create hackathon: ${hackathonError.message}`);

      if (auth.user?.id) {
        const { data: organizer } = await supabase
          .from("organizers")
          .select("id")
          .eq("auth_user_id", auth.user.id)
          .single();
        if (organizer) {
          await supabase.from("organizer_hackathons").insert({
            hackathon_id: hackathon.id,
            organizer_id: organizer.id,
          });
        }
      }

      if (formData.checklist_runbook.reusable_steps.length > 0 || formData.checklist_runbook.custom_steps.length > 0) {
        const checklistItems = [
          ...formData.checklist_runbook.reusable_steps.map((step, index) => ({
            hackathon_id: hackathon.id,
            step_name: step,
            description: `Complete the ${step.toLowerCase()} step`,
            is_reusable: true,
            is_required: true,
            order_index: index,
          })),
          ...formData.checklist_runbook.custom_steps.map((step, index) => ({
            hackathon_id: hackathon.id,
            step_name: step.name,
            description: step.description,
            is_reusable: false,
            is_required: step.is_required,
            order_index: index + formData.checklist_runbook.reusable_steps.length,
          })),
        ];
        await supabase.from("hackathon_checklist_items").insert(checklistItems);
      }

      if (formData.event_schedule.days.length > 0) {
        const meetings = formData.event_schedule.days.flatMap(day =>
          day.events.map(event => ({
            hackathon_id: hackathon.id,
            title: event.title,
            description: event.description || null,
            start_time: `${day.date}T${event.time}:00`,
            end_time: null,
            meeting_link: event.meeting_link || null,
            is_required: true,
          }))
        );
        await supabase.from("event_meetings").insert(meetings);
      }

      if (formData.credit_allocations.enabled && formData.credit_allocations.partners.length > 0) {
        const partnerIntegrations = formData.credit_allocations.partners.map(partner => ({
          hackathon_id: hackathon.id,
          partner_name: partner.name,
          integration_type: "credit_allocation",
          endpoint_url: partner.endpoint_url || null,
          api_key: partner.api_key || null,
          credit_amount: partner.credit_amount,
          is_active: true,
        }));
        await supabase.from("partner_integrations").insert(partnerIntegrations);
      }

      setSubmitSuccess(true);
      setTimeout(() => navigate("/hackathons"), 2000);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create hackathon");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (auth.status === "unauthenticated") navigate("/", { replace: true });
    else if (auth.status === "authenticated" && auth.role !== "organizer") navigate("/wizard", { replace: true });
  }, [auth.status, auth.role, navigate]);

  if (auth.status === "loading") return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-accent animate-spin" />
    </div>
  );

  if (submitSuccess) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-muted/60 border border-border rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
          <Check className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Hackathon Created!</h1>
        <p className="text-foreground/60 mb-6">Redirecting to hackathon list...</p>
        <button onClick={() => navigate("/hackathons")} className="px-6 py-3 bg-accent text-background font-semibold rounded-xl hover:bg-accent/90 transition-all">Go to Hackathons</button>
      </div>
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case "basic": return <BasicStep data={formData} onChange={handleChange} errors={errors} />;
      case "content": return <ContentStep data={formData} onChange={handleChange} />;
      case "rules": return <RulesStep data={formData} onChange={handleChange} />;
      case "partners": return <PartnersStep data={formData} onChange={handleChange} />;
      case "community": return <CommunityStep data={formData} onChange={handleChange} />;
      case "github": return <GitHubStep data={formData} onChange={handleChange} errors={errors} />;
      case "checklist": return <ChecklistStep data={formData} onChange={handleChange} />;
      case "schedule": return <ScheduleStep data={formData} onChange={handleChange} />;
      case "speakers": return <SpeakersStep data={formData} onChange={handleChange} />;
      case "credits": return <CreditsStep data={formData} onChange={handleChange} />;
      case "review": return <ReviewStep data={formData} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => navigate("/hackathons")} className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted border border-border text-foreground/60 hover:text-foreground hover:bg-background transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="font-heading text-xl text-foreground tracking-wider uppercase">Create New Hackathon</h1>
          </div>
          <p className="text-foreground/50 text-sm">Fill in all the details to create a comprehensive hackathon experience</p>
        </div>

        {submitError && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 mb-6 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />{submitError}
          </div>
        )}

        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((step, index) => {
            const isActive = currentStep === step.id;
            const isCompleted = STEPS.findIndex(s => s.id === currentStep) > index;
            return (
              <div key={step.id} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-all ${isActive ? "bg-accent text-background" : isCompleted ? "bg-accent/20 text-foreground" : "bg-muted border border-border text-foreground/40"}`} onClick={() => handleStepClick(step.id)}>
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
            );
          })}
        </div>

        <div className="bg-muted/60 border border-border rounded-2xl p-6 md:p-8 mb-6">
          {renderStep()}
        </div>

        <div className="flex items-center justify-between gap-4">
          {currentStep !== "basic" && (
            <button type="button" onClick={handleBack} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground/70 hover:text-foreground hover:bg-muted transition-all">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
          <div className="flex-1" />
          {currentStep !== "review" ? (
            <button type="button" onClick={handleNext} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-background font-semibold hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled={Object.keys(errors).length > 0}>
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-background font-semibold hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Trophy className="w-4 h-4" /> Create Hackathon</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BasicStep({ data, onChange, errors }: { data: any; onChange: (field: string, value: any) => void; errors: Record<string, string> }) {
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    onChange("name", name);
    onChange("slug", generateSlug(name));
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Hackathon Name *</label>
        <input type="text" value={data.name} onChange={handleNameChange} placeholder="e.g., AI Builders Hackathon" className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Slug *</label>
          <div className="flex gap-2">
            <span className="px-3 py-3 bg-background border border-border rounded-l-xl text-foreground/60 text-sm">lablab.ai/</span>
            <input type="text" value={data.slug} onChange={(e) => onChange("slug", generateSlug(e.target.value))} placeholder="hackathon-name" className="flex-1 bg-muted border border-border rounded-r-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
          </div>
          {errors.slug && <p className="text-sm text-destructive mt-1">{errors.slug}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Year *</label>
          <input type="number" value={data.year} onChange={(e) => onChange("year", parseInt(e.target.value) || 0)} min={2020} max={2030} placeholder="2026" className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
          {errors.year && <p className="text-sm text-destructive mt-1">{errors.year}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Start Date *</label>
          <input type="date" value={data.start_date} onChange={(e) => onChange("start_date", e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
          {errors.start_date && <p className="text-sm text-destructive mt-1">{errors.start_date}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">End Date *</label>
          <input type="date" value={data.end_date} onChange={(e) => onChange("end_date", e.target.value)} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
          {errors.end_date && <p className="text-sm text-destructive mt-1">{errors.end_date}</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Welcome Message</label>
        <textarea value={data.welcome_message} onChange={(e) => onChange("welcome_message", e.target.value)} placeholder="Welcome participants..." rows={4} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all resize-none" />
      </div>
    </div>
  );
}

function ContentStep({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Program Overview *</label>
        <textarea value={data.program} onChange={(e) => onChange("program", e.target.value)} placeholder="Describe the hackathon program..." rows={6} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Challenge Description *</label>
        <textarea value={data.challenge_description} onChange={(e) => onChange("challenge_description", e.target.value)} placeholder="Detail the challenges..." rows={6} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all resize-none" />
      </div>
    </div>
  );
}

function RulesStep({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">General Rules *</label>
        <textarea value={data.rules} onChange={(e) => onChange("rules", e.target.value)} placeholder="List the general rules..." rows={5} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Submission Rules *</label>
        <textarea value={data.submission_rules} onChange={(e) => onChange("submission_rules", e.target.value)} placeholder="Describe submission requirements..." rows={5} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Judging Criteria *</label>
        <textarea value={data.judging_criteria} onChange={(e) => onChange("judging_criteria", e.target.value)} placeholder="List the judging criteria..." rows={5} className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all resize-none" />
      </div>
    </div>
  );
}

function PartnersStep({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  const addPartner = () => onChange("partners", [...data.partners, { name: "", description: "", logo_url: "", website: "" }]);
  const removePartner = (index: number) => { const newPartners = [...data.partners]; newPartners.splice(index, 1); onChange("partners", newPartners); };
  const updatePartner = (index: number, field: string, value: string) => { const newPartners = [...data.partners]; newPartners[index] = { ...newPartners[index], [field]: value }; onChange("partners", newPartners); };
  const addPrize = () => onChange("prizes", [...data.prizes, { name: "", description: "", amount: "", place: "" }]);
  const removePrize = (index: number) => { const newPrizes = [...data.prizes]; newPrizes.splice(index, 1); onChange("prizes", newPrizes); };
  const updatePrize = (index: number, field: string, value: string) => { const newPrizes = [...data.prizes]; newPrizes[index] = { ...newPrizes[index], [field]: value }; onChange("prizes", newPrizes); };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Partners</h3>
          <button type="button" onClick={addPartner} className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-xl text-accent text-sm font-medium hover:bg-accent/20">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        {data.partners.length === 0 ? <p className="text-foreground/50 text-sm text-center py-4">No partners added yet.</p> :
          <div className="space-y-4">
            {data.partners.map((p: any, i: number) => (
              <div key={i} className="bg-muted/60 border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-foreground">Partner {i + 1}</h4>
                  <button type="button" onClick={() => removePartner(i)} className="text-foreground/40 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="text" value={p.name} onChange={(e) => updatePartner(i, "name", e.target.value)} placeholder="Name" className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                  <input type="text" value={p.website} onChange={(e) => updatePartner(i, "website", e.target.value)} placeholder="Website" className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                  <input type="text" value={p.description} onChange={(e) => updatePartner(i, "description", e.target.value)} placeholder="Description" className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                  <input type="text" value={p.logo_url} onChange={(e) => updatePartner(i, "logo_url", e.target.value)} placeholder="Logo URL" className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                </div>
              </div>
            ))}
          </div>
        }
      </div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Prizes</h3>
          <button type="button" onClick={addPrize} className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-xl text-accent text-sm font-medium hover:bg-accent/20">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        {data.prizes.length === 0 ? <p className="text-foreground/50 text-sm text-center py-4">No prizes added yet.</p> :
          <div className="space-y-4">
            {data.prizes.map((p: any, i: number) => (
              <div key={i} className="bg-muted/60 border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-foreground">Prize {i + 1}</h4>
                  <button type="button" onClick={() => removePrize(i)} className="text-foreground/40 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input type="text" value={p.name} onChange={(e) => updatePrize(i, "name", e.target.value)} placeholder="Name" className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                  <input type="text" value={p.place} onChange={(e) => updatePrize(i, "place", e.target.value)} placeholder="Place" className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                  <input type="text" value={p.amount} onChange={(e) => updatePrize(i, "amount", e.target.value)} placeholder="Amount" className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                  <input type="text" value={p.description} onChange={(e) => updatePrize(i, "description", e.target.value)} placeholder="Description" className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

function CommunityStep({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Community Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Discord Server ID</label>
            <input type="text" value={data.community_config.discord_server_id} onChange={(e) => onChange("community_config", { ...data.community_config, discord_server_id: e.target.value })} placeholder="Server ID" className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Discord Invite URL</label>
            <input type="text" value={data.community_config.discord_invite_url} onChange={(e) => onChange("community_config", { ...data.community_config, discord_invite_url: e.target.value })} placeholder="https://discord.gg/..." className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Slack Channel</label>
            <input type="text" value={data.community_config.slack_channel} onChange={(e) => onChange("community_config", { ...data.community_config, slack_channel: e.target.value })} placeholder="#channel" className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Forum URL</label>
            <input type="text" value={data.community_config.forum_url} onChange={(e) => onChange("community_config", { ...data.community_config, forum_url: e.target.value })} placeholder="https://forum..." className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Social Media</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Twitter Handle</label>
            <input type="text" value={data.social_config.twitter_handle} onChange={(e) => onChange("social_config", { ...data.social_config, twitter_handle: e.target.value })} placeholder="@handle" className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">LinkedIn URL</label>
            <input type="text" value={data.social_config.linkedin_url} onChange={(e) => onChange("social_config", { ...data.social_config, linkedin_url: e.target.value })} placeholder="https://linkedin.com/..." className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Instagram Handle</label>
            <input type="text" value={data.social_config.instagram_handle} onChange={(e) => onChange("social_config", { ...data.social_config, instagram_handle: e.target.value })} placeholder="@handle" className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Hashtag</label>
            <input type="text" value={data.social_config.hashtag} onChange={(e) => onChange("social_config", { ...data.social_config, hashtag: e.target.value })} placeholder="#Hackathon2026" className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
}

function GitHubStep({ data, onChange, errors }: { data: any; onChange: (field: string, value: any) => void; errors: Record<string, string> }) {
  return (
    <div className="space-y-6">
      <div className="bg-muted/60 border border-border rounded-xl p-4">
        <p className="text-sm text-foreground/60"><strong className="text-foreground">Note:</strong> Using a GitHub Organization allows unlimited collaborators. Free accounts have a limit of 3 private collaborators per repository.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">GitHub Organization Name *</label>
        <div className="flex gap-2">
          <span className="px-3 py-3 bg-background border border-border rounded-l-xl text-foreground/60 text-sm">github.com/</span>
          <input type="text" value={data.github_org} onChange={(e) => onChange("github_org", e.target.value)} placeholder="org-name" className="flex-1 bg-muted border border-border rounded-r-xl px-4 py-3 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all" />
        </div>
        {errors.github_org && <p className="text-sm text-destructive mt-1">{errors.github_org}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Repository Visibility *</label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all bg-muted/60 border-border hover:bg-muted">
            <input type="radio" name="repo_visibility" value="private" checked={data.repo_visibility === "private"} onChange={(e) => onChange("repo_visibility", "private")} className="sr-only" />
            <EyeOff className="w-4 h-4 text-foreground/60" /><span className="text-sm text-foreground">Private</span>
          </label>
          <label className="flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-all bg-muted/60 border-border hover:bg-muted">
            <input type="radio" name="repo_visibility" value="public" checked={data.repo_visibility === "public"} onChange={(e) => onChange("repo_visibility", "public")} className="sr-only" />
            <Eye className="w-4 h-4 text-foreground/60" /><span className="text-sm text-foreground">Public</span>
          </label>
        </div>
        <p className="text-xs text-foreground/50 mt-2">Private repos are only visible to team members. Public repos are visible to everyone.</p>
      </div>
      <div className="bg-muted/60 border border-border rounded-xl p-4">
        <h4 className="font-medium text-foreground mb-2">Repository Naming Convention</h4>
        <p className="text-sm text-foreground/60">Team repositories will be named: <code className="bg-background px-2 py-1 rounded text-accent text-xs">{data.slug || "&lt;slug&gt;"}-&lt;team-name&gt;-{data.year || "&lt;year&gt;"}</code></p>
      </div>
    </div>
  );
}

function ChecklistStep({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  const reusableSteps = ["Join lablab Discord", "Join hackathon Discord", "Create GitHub account", "Link GitHub account", "AMD AI Developer Program", "Claim Fireworks credits", "Natively AI account", "Complete profile", "Accept code of conduct"];
  const toggleReusable = (step: string) => {
    const newSteps = data.checklist_runbook.reusable_steps.includes(step)
      ? data.checklist_runbook.reusable_steps.filter((s: string) => s !== step)
      : [...data.checklist_runbook.reusable_steps, step];
    onChange("checklist_runbook", { ...data.checklist_runbook, reusable_steps: newSteps });
  };
  const addCustom = () => onChange("checklist_runbook", { ...data.checklist_runbook, custom_steps: [...data.checklist_runbook.custom_steps, { name: "", description: "", is_required: true }] });
  const removeCustom = (i: number) => { const newSteps = [...data.checklist_runbook.custom_steps]; newSteps.splice(i, 1); onChange("checklist_runbook", { ...data.checklist_runbook, custom_steps: newSteps }); };
  const updateCustom = (i: number, field: string, value: any) => { const newSteps = [...data.checklist_runbook.custom_steps]; newSteps[i] = { ...newSteps[i], [field]: value }; onChange("checklist_runbook", { ...data.checklist_runbook, custom_steps: newSteps }); };

  return (
    <div className="space-y-6">
      <div className="bg-muted/60 border border-border rounded-xl p-4">
        <p className="text-sm text-foreground/60"><strong className="text-foreground">Reusable Steps:</strong> Common steps that can be reused across hackathons.</p>
      </div>
      <div>
        <h4 className="text-sm font-medium text-foreground mb-3">Select Reusable Steps</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {reusableSteps.map(step => (
            <label key={step} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${data.checklist_runbook.reusable_steps.includes(step) ? "bg-accent/10 border-accent/30" : "bg-muted/60 border-border hover:bg-muted"}`}>
              <input type="checkbox" checked={data.checklist_runbook.reusable_steps.includes(step)} onChange={() => toggleReusable(step)} className="sr-only" />
              <Check className={`w-4 h-4 shrink-0 ${data.checklist_runbook.reusable_steps.includes(step) ? "text-accent" : "text-foreground/40"}`} /><span className="text-sm">{step}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-foreground">Custom Steps</h4>
          <button type="button" onClick={addCustom} className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-lg text-accent text-xs font-medium hover:bg-accent/20"><Plus className="w-3 h-3" /> Add</button>
        </div>
        {data.checklist_runbook.custom_steps.length === 0 ? <p className="text-foreground/50 text-sm text-center py-4">No custom steps added.</p> :
          <div className="space-y-3">
            {data.checklist_runbook.custom_steps.map((s: any, i: number) => (
              <div key={i} className="bg-muted/60 border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-foreground">Step {i + 1}</h5>
                  <button type="button" onClick={() => removeCustom(i)} className="text-foreground/40 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="space-y-2">
                  <input type="text" value={s.name} onChange={(e) => updateCustom(i, "name", e.target.value)} placeholder="Name" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                  <textarea value={s.description} onChange={(e) => updateCustom(i, "description", e.target.value)} placeholder="Description" rows={2} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 resize-none" />
                  <label className="flex items-center gap-2 text-xs text-foreground/60 cursor-pointer"><input type="checkbox" checked={s.is_required} onChange={(e) => updateCustom(i, "is_required", e.target.checked)} className="w-3 h-3 rounded border-border text-accent focus:ring-accent" /> Required</label>
                </div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

function ScheduleStep({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  const addDay = () => onChange("event_schedule", { ...data.event_schedule, days: [...data.event_schedule.days, { date: "", events: [] }] });
  const removeDay = (i: number) => { const newDays = [...data.event_schedule.days]; newDays.splice(i, 1); onChange("event_schedule", { ...data.event_schedule, days: newDays }); };
  const updateDay = (i: number, field: string, value: string) => { const newDays = [...data.event_schedule.days]; newDays[i] = { ...newDays[i], [field]: value }; onChange("event_schedule", { ...data.event_schedule, days: newDays }); };
  const addEvent = (dayIndex: number) => { const newDays = [...data.event_schedule.days]; newDays[dayIndex] = { ...newDays[dayIndex], events: [...newDays[dayIndex].events, { time: "", title: "", description: "", meeting_link: "" }] }; onChange("event_schedule", { ...data.event_schedule, days: newDays }); };
  const removeEvent = (dayIndex: number, eventIndex: number) => { const newDays = [...data.event_schedule.days]; newDays[dayIndex].events.splice(eventIndex, 1); onChange("event_schedule", { ...data.event_schedule, days: newDays }); };
  const updateEvent = (dayIndex: number, eventIndex: number, field: string, value: string) => { const newDays = [...data.event_schedule.days]; newDays[dayIndex].events[eventIndex] = { ...newDays[dayIndex].events[eventIndex], [field]: value }; onChange("event_schedule", { ...data.event_schedule, days: newDays }); };

  return (
    <div className="space-y-6">
      <div className="bg-muted/60 border border-border rounded-xl p-4">
        <p className="text-sm text-foreground/60"><strong className="text-foreground">Note:</strong> Events with meeting links will send Google Calendar invites to participants.</p>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-foreground">Event Days</h4>
        <button type="button" onClick={addDay} className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-xl text-accent text-sm font-medium hover:bg-accent/20"><Plus className="w-4 h-4" /> Add Day</button>
      </div>
      {data.event_schedule.days.length === 0 ? <p className="text-foreground/50 text-sm text-center py-4">No days added.</p> :
        <div className="space-y-4">
          {data.event_schedule.days.map((day: any, dayIndex: number) => (
            <div key={dayIndex} className="bg-muted/60 border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <input type="date" value={day.date} onChange={(e) => updateDay(dayIndex, "date", e.target.value)} className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent/50" />
                </div>
                <button type="button" onClick={() => removeDay(dayIndex)} className="text-foreground/40 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium text-foreground">Events</h5>
                  <button type="button" onClick={() => addEvent(dayIndex)} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground/60 hover:text-foreground"><Plus className="w-3 h-3" /> Add</button>
                </div>
                {day.events.length === 0 ? <p className="text-foreground/50 text-xs text-center py-2">No events.</p> :
                  <div className="space-y-2">
                    {day.events.map((event: any, eventIndex: number) => (
                      <div key={eventIndex} className="bg-background border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <input type="time" value={event.time} onChange={(e) => updateEvent(dayIndex, eventIndex, "time", e.target.value)} className="bg-muted border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent/50 w-24" />
                          </div>
                          <button type="button" onClick={() => removeEvent(dayIndex, eventIndex)} className="text-foreground/40 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="space-y-1.5">
                          <input type="text" value={event.title} onChange={(e) => updateEvent(dayIndex, eventIndex, "title", e.target.value)} placeholder="Title" className="w-full bg-muted border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                          <textarea value={event.description} onChange={(e) => updateEvent(dayIndex, eventIndex, "description", e.target.value)} placeholder="Description" rows={2} className="w-full bg-muted border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 resize-none" />
                          <input type="text" value={event.meeting_link || ""} onChange={(e) => updateEvent(dayIndex, eventIndex, "meeting_link", e.target.value)} placeholder="Meeting link (Google Meet/Zoom)" className="w-full bg-muted border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                        </div>
                      </div>
                    ))}
                  </div>
                }
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

function SpeakersStep({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  const addSpeaker = () => onChange("guest_speakers", [...data.guest_speakers, { name: "", title: "", bio: "", photo_url: "", session_time: "" }]);
  const removeSpeaker = (i: number) => { const newSpeakers = [...data.guest_speakers]; newSpeakers.splice(i, 1); onChange("guest_speakers", newSpeakers); };
  const updateSpeaker = (i: number, field: string, value: string) => { const newSpeakers = [...data.guest_speakers]; newSpeakers[i] = { ...newSpeakers[i], [field]: value }; onChange("guest_speakers", newSpeakers); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Guest Speakers</h3>
        <button type="button" onClick={addSpeaker} className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-xl text-accent text-sm font-medium hover:bg-accent/20"><Plus className="w-4 h-4" /> Add</button>
      </div>
      {data.guest_speakers.length === 0 ? <p className="text-foreground/50 text-sm text-center py-4">No speakers added.</p> :
        <div className="space-y-4">
          {data.guest_speakers.map((s: any, i: number) => (
            <div key={i} className="bg-muted/60 border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-foreground">Speaker {i + 1}</h4>
                <button type="button" onClick={() => removeSpeaker(i)} className="text-foreground/40 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Name</label>
                  <input type="text" value={s.name} onChange={(e) => updateSpeaker(i, "name", e.target.value)} placeholder="Name" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Title</label>
                  <input type="text" value={s.title} onChange={(e) => updateSpeaker(i, "title", e.target.value)} placeholder="Title" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Photo URL</label>
                  <input type="text" value={s.photo_url} onChange={(e) => updateSpeaker(i, "photo_url", e.target.value)} placeholder="URL" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Session Time</label>
                  <input type="text" value={s.session_time} onChange={(e) => updateSpeaker(i, "session_time", e.target.value)} placeholder="e.g., Day 1, 2-3 PM" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-foreground/70 mb-1">Bio</label>
                  <textarea value={s.bio} onChange={(e) => updateSpeaker(i, "bio", e.target.value)} placeholder="Bio..." rows={3} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50 resize-none" />
                </div>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

function CreditsStep({ data, onChange }: { data: any; onChange: (field: string, value: any) => void }) {
  const addPartner = () => onChange("credit_allocations", { ...data.credit_allocations, partners: [...data.credit_allocations.partners, { name: "", endpoint_url: "", api_key: "", credit_amount: 0 }] });
  const removePartner = (i: number) => { const newPartners = [...data.credit_allocations.partners]; newPartners.splice(i, 1); onChange("credit_allocations", { ...data.credit_allocations, partners: newPartners }); };
  const updatePartner = (i: number, field: string, value: any) => { const newPartners = [...data.credit_allocations.partners]; newPartners[i] = { ...newPartners[i], [field]: value }; onChange("credit_allocations", { ...data.credit_allocations, partners: newPartners }); };

  return (
    <div className="space-y-6">
      <div className="bg-muted/60 border border-border rounded-xl p-4">
        <p className="text-sm text-foreground/60"><strong className="text-foreground">Automated Credit Allocation:</strong> Participants will automatically receive credits when they link their accounts.</p>
      </div>
      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" checked={data.credit_allocations.enabled} onChange={(e) => onChange("credit_allocations", { ...data.credit_allocations, enabled: e.target.checked })} className="sr-only peer" />
          <div className="w-11 h-6 bg-muted border border-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:border-accent" />
        </label>
        <span className="text-sm font-medium text-foreground">Enable Automated Credit Allocation</span>
      </div>
      {data.credit_allocations.enabled && (
        <div>
          <div className="flex items-center justify-between mb-4 mt-6">
            <h4 className="text-sm font-medium text-foreground">Partner Integrations</h4>
            <button type="button" onClick={addPartner} className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-xl text-accent text-sm font-medium hover:bg-accent/20"><Plus className="w-4 h-4" /> Add</button>
          </div>
          {data.credit_allocations.partners.length === 0 ? <p className="text-foreground/50 text-sm text-center py-4">No integrations configured.</p> :
            <div className="space-y-4">
              {data.credit_allocations.partners.map((p: any, i: number) => (
                <div key={i} className="bg-muted/60 border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-medium text-foreground">Partner {i + 1}</h5>
                    <button type="button" onClick={() => removePartner(i)} className="text-foreground/40 hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground/70 mb-1">Partner Name</label>
                      <input type="text" value={p.name} onChange={(e) => updatePartner(i, "name", e.target.value)} placeholder="e.g., Fireworks AI" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground/70 mb-1">Credit Amount ($)</label>
                      <input type="number" value={p.credit_amount} onChange={(e) => updatePartner(i, "credit_amount", parseInt(e.target.value) || 0)} placeholder="100" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-foreground/70 mb-1">API Endpoint URL</label>
                      <input type="text" value={p.endpoint_url} onChange={(e) => updatePartner(i, "endpoint_url", e.target.value)} placeholder="https://api.partner.com/allocate" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-foreground/70 mb-1">API Key</label>
                      <input type="password" value={p.api_key} onChange={(e) => updatePartner(i, "api_key", e.target.value)} placeholder="Enter API key" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-accent/50" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          }
        </div>
      )}
    </div>
  );
}

function ReviewStep({ data }: { data: any }) {
  const formatDate = (date: string) => new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      <div className="bg-muted/60 border border-border rounded-xl p-4">
        <p className="text-sm text-foreground/60">Review all information. Click "Create Hackathon" to finalize.</p>
      </div>
      <div className="space-y-4">
        <div className="bg-muted/60 border border-border rounded-xl p-5">
          <h3 className="font-heading text-sm tracking-wider text-accent uppercase mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><p className="text-foreground/40 uppercase tracking-wider text-xs mb-1">Name</p><p className="text-foreground">{data.name}</p></div>
            <div><p className="text-foreground/40 uppercase tracking-wider text-xs mb-1">Slug</p><p className="text-foreground">{data.slug}</p></div>
            <div><p className="text-foreground/40 uppercase tracking-wider text-xs mb-1">Year</p><p className="text-foreground">{data.year}</p></div>
            <div><p className="text-foreground/40 uppercase tracking-wider text-xs mb-1">Dates</p><p className="text-foreground">{formatDate(data.start_date)} - {formatDate(data.end_date)}</p></div>
          </div>
        </div>
        <div className="bg-muted/60 border border-border rounded-xl p-5">
          <h3 className="font-heading text-sm tracking-wider text-accent uppercase mb-4">GitHub Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><p className="text-foreground/40 uppercase tracking-wider text-xs mb-1">Organization</p><p className="text-foreground">{data.github_org || "Not specified"}</p></div>
            <div><p className="text-foreground/40 uppercase tracking-wider text-xs mb-1">Visibility</p><p className="text-foreground capitalize">{data.repo_visibility}</p></div>
          </div>
          <div className="mt-4 pt-4 border-t border-border/40">
            <p className="text-foreground/40 uppercase tracking-wider text-xs mb-2">Repo Naming</p>
            <p className="text-sm text-foreground"><code className="bg-background px-2 py-1 rounded text-accent">{data.slug}-&lt;team-name&gt;-{data.year}</code></p>
          </div>
        </div>
        {(data.partners.length > 0 || data.prizes.length > 0) && (
          <div className="bg-muted/60 border border-border rounded-xl p-5">
            <h3 className="font-heading text-sm tracking-wider text-accent uppercase mb-4">Partners & Prizes</h3>
            {data.partners.length > 0 && <div className="mb-4"><p className="text-foreground/40 uppercase tracking-wider text-xs mb-2">Partners</p><div className="flex flex-wrap gap-2">{data.partners.map((p: any, i: number) => <span key={i} className="px-3 py-1 bg-background border border-border rounded-full text-xs text-foreground">{p.name}</span>)}</div></div>}
            {data.prizes.length > 0 && <div><p className="text-foreground/40 uppercase tracking-wider text-xs mb-2">Prizes</p><div className="space-y-2">{data.prizes.map((p: any, i: number) => <div key={i} className="flex items-center gap-3 px-3 py-2 bg-background border border-border rounded-lg"><span className="text-xs font-medium text-foreground/60 w-16">{p.place}</span><span className="text-xs text-foreground/40">-</span><span className="text-sm font-medium text-foreground">{p.name}</span><span className="text-xs text-foreground/40">-</span><span className="text-sm text-foreground">{p.amount}</span></div>)}</div></div>}
          </div>
        )}
        {data.event_schedule.days.length > 0 && (
          <div className="bg-muted/60 border border-border rounded-xl p-5">
            <h3 className="font-heading text-sm tracking-wider text-accent uppercase mb-4">Event Schedule</h3>
            <div className="space-y-4">{data.event_schedule.days.map((day: any, di: number) => <div key={di}><p className="text-sm font-medium text-foreground mb-2">{formatDate(day.date)}</p><div className="space-y-2">{day.events.map((e: any, ei: number) => <div key={ei} className="px-3 py-2 bg-background border border-border rounded-lg"><div className="flex items-center gap-3"><span className="text-xs text-foreground/60 font-mono">{e.time}</span><span className="text-xs text-foreground/40">-</span><span className="text-sm font-medium text-foreground">{e.title}</span>{e.meeting_link && <span className="text-xs text-accent">Calendar invite</span>}</div>{e.description && <p className="text-xs text-foreground/50 mt-1">{e.description}</p>}</div>)}</div></div>}
          </div>
        )}
        {data.credit_allocations.enabled && data.credit_allocations.partners.length > 0 && (
          <div className="bg-muted/60 border border-border rounded-xl p-5">
            <h3 className="font-heading text-sm tracking-wider text-accent uppercase mb-4">Credit Allocations</h3>
            <p className="text-sm text-foreground/60 mb-4">Enabled for:</p>
            <div className="space-y-2">{data.credit_allocations.partners.map((p: any, i: number) => <div key={i} className="flex items-center justify-between px-3 py-2 bg-background border border-border rounded-lg"><div><p className="text-sm font-medium text-foreground">{p.name}</p><p className="text-xs text-foreground/50">${p.credit_amount} credits per participant</p></div><span className="text-xs text-foreground/40 font-mono">{p.endpoint_url ? "API configured" : "Manual"}</span></div>)}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
